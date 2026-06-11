"use client";

import { useState, useEffect } from "react";
import ResultadoConsulta from "./ResultadoConsulta";
import type { MedicamentoPropuesto } from "@/lib/recetas/tipos";

interface SoapOutput {
  soap: {
    subjetivo: string;
    objetivo: string;
    analisis: string;
    plan: string;
  };
  cie10_codigo: string;
  cie10_descripcion: string;
  indicaciones: MedicamentoPropuesto[] | null;
  signos_alarma: string[];
  seguimiento_plazo: string | null;
  seguimiento_motivo: string | null;
  resumen_corto: string;
}

interface Props {
  pacienteId: string;
}

const LOADING_MESSAGES = [
  "Procesando...",
  "Estructurando SOAP...",
  "Casi listo...",
] as const;

const MIN_CHARS = 50;

export default function NuevaConsultaForm({ pacienteId }: Props) {
  const [descripcion, setDescripcion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SoapOutput | null>(null);

  const charCount = descripcion.length;
  const canGenerate = charCount >= MIN_CHARS && !isGenerating;

  // Cycle through loading messages every 2 seconds while generating
  useEffect(() => {
    if (!isGenerating) {
      setLoadingMsgIdx(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 2000);
    return () => clearInterval(id);
  }, [isGenerating]);

  async function handleGenerar() {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGenError(null);
    setResultado(null);

    try {
      const res = await fetch("/api/consultas/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paciente_id: pacienteId, descripcion }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : undefined
        );
      }

      const data: SoapOutput = await res.json();
      setResultado(data);
    } catch (err) {
      setGenError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos generar la nota. Intenta de nuevo."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDiscard() {
    setResultado(null);
    setGenError(null);
  }

  return (
    <div>
      {/* Input area — hidden while showing result */}
      {!resultado && (
        <div className="space-y-4">
          <div>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={isGenerating}
              rows={8}
              maxLength={4999}
              placeholder='Describe la consulta en tus palabras. Por ejemplo: paciente de 4 años con fiebre de 38.5 desde ayer, sin otros síntomas. Al examen faringe levemente eritematosa. Diagnóstico: faringoamigdalitis viral. Paracetamol 15mg/kg c/6h por 3 días si fiebre. Control en 5 días si no mejora.'
              className="w-full px-3 py-3 bg-white border border-[#D1D5DB] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50 resize-none"
            />
            <div className="flex justify-between items-center mt-1 px-1">
              <span
                className={`text-xs ${charCount < MIN_CHARS ? "text-[#94A3B8]" : "text-[#0F766E]"}`}
              >
                {charCount < MIN_CHARS
                  ? `Mínimo recomendado: ${MIN_CHARS} caracteres (${MIN_CHARS - charCount} restantes)`
                  : `${charCount} caracteres`}
              </span>
            </div>
          </div>

          {genError && (
            <div
              role="alert"
              className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2"
            >
              {genError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerar}
            disabled={!canGenerate}
            className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
          >
            {isGenerating ? LOADING_MESSAGES[loadingMsgIdx] : "Generar borrador"}
          </button>
        </div>
      )}

      {resultado && (
        <ResultadoConsulta
          soapOutput={resultado}
          pacienteId={pacienteId}
          inputMedico={descripcion}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}
