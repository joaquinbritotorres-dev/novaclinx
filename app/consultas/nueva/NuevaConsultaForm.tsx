"use client";

import { useState, useEffect } from "react";
import { Pencil, Mic, Sparkles } from "lucide-react";
import ResultadoConsulta from "./ResultadoConsulta";
import GrabarConsulta, { type NotaGenerada } from "./GrabarConsulta";
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
  const [modo, setModo] = useState<"escribir" | "grabar">("escribir");
  const [descripcion, setDescripcion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SoapOutput | null>(null);
  const [grabacion, setGrabacion] = useState<NotaGenerada | null>(null);

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

  function handleNotaGenerada(nota: NotaGenerada) {
    setGrabacion(nota);
    setResultado(nota.soapOutput as SoapOutput);
  }

  async function handleAprobadaGrabacion(consultaId: string) {
    if (!grabacion) return;
    // Vincular consulta + borrar audio/transcripción (la nota ya está guardada)
    await fetch(`/api/grabaciones/${grabacion.grabacionId}/aprobar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ consulta_id: consultaId }),
    });
  }

  async function handleDiscardGrabacion() {
    if (grabacion) {
      await fetch(`/api/grabaciones/${grabacion.grabacionId}/descartar`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {
        // la purga manual cubre huérfanos
      });
    }
    setGrabacion(null);
    setResultado(null);
    setModo("escribir");
  }

  const progreso = Math.min(100, Math.round((charCount / MIN_CHARS) * 100));
  const minAlcanzado = charCount >= MIN_CHARS;

  return (
    <div>
      {/* Selector de modo — tarjetas; oculto al mostrar resultado */}
      {!resultado && (
        <>
          <p className="text-sm font-medium text-[#475569] mb-3">
            ¿Cómo quieres documentar esta consulta?
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5"
            role="tablist"
            aria-label="Modo de captura de la consulta"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modo === "escribir"}
              onClick={() => setModo("escribir")}
              className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2 ${
                modo === "escribir"
                  ? "border-[#0F766E] bg-[#F0FDFB] ring-1 ring-[#0F766E]/15 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                  : "border-[#E7E3DB] bg-white hover:border-[#0F766E]/40 hover:bg-[#FBFBFA]"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  modo === "escribir"
                    ? "bg-[#0F766E] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] group-hover:text-[#0F766E]"
                }`}
              >
                <Pencil className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#0F172A]">Escribir</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#64748B]">
                  Redacta la consulta en tus palabras y la IA arma el borrador.
                </span>
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={modo === "grabar"}
              onClick={() => setModo("grabar")}
              className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2 ${
                modo === "grabar"
                  ? "border-[#0F766E] bg-[#F0FDFB] ring-1 ring-[#0F766E]/15 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                  : "border-[#E7E3DB] bg-white hover:border-[#0F766E]/40 hover:bg-[#FBFBFA]"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  modo === "grabar"
                    ? "bg-[#0F766E] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] group-hover:text-[#0F766E]"
                }`}
              >
                <Mic className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#0F172A]">Grabar consulta</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#64748B]">
                  Habla durante la consulta y la IA transcribe y estructura.
                </span>
              </span>
            </button>
          </div>
        </>
      )}

      {/* Modo Grabar */}
      {!resultado && modo === "grabar" && (
        <GrabarConsulta
          pacienteId={pacienteId}
          onVolverEscribir={() => setModo("escribir")}
          onNotaGenerada={handleNotaGenerada}
        />
      )}

      {/* Modo Escribir — tarjeta con cabecera, contador con progreso y CTA */}
      {!resultado && modo === "escribir" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#E7E3DB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow focus-within:border-[#0F766E] focus-within:ring-2 focus-within:ring-[#0F766E]/15">
            <div className="flex items-center justify-between border-b border-[#F1F0EC] px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8780]">
                En tus palabras
              </span>
              <span className="text-[11px] text-[#94A3B8]">Borrador con IA · tú revisas y apruebas</span>
            </div>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={isGenerating}
              rows={8}
              maxLength={4999}
              placeholder='Describe la consulta en tus palabras. Por ejemplo: paciente de 4 años con fiebre de 38.5 desde ayer, sin otros síntomas. Al examen faringe levemente eritematosa. Diagnóstico: faringoamigdalitis viral. Paracetamol 15mg/kg c/6h por 3 días si fiebre. Control en 5 días si no mejora.'
              className="w-full resize-none border-0 bg-transparent px-4 py-3.5 text-sm leading-relaxed text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-0 disabled:opacity-50"
            />

            <div className="flex items-center gap-3 border-t border-[#F1F0EC] px-4 py-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                <div
                  className="h-full rounded-full bg-[#0F766E] transition-all duration-300 ease-out"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <span
                className={`shrink-0 text-xs font-medium ${minAlcanzado ? "text-[#0F766E]" : "text-[#94A3B8]"}`}
              >
                {minAlcanzado
                  ? `Listo · ${charCount} caracteres`
                  : `Faltan ${MIN_CHARS - charCount}`}
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
            className="inline-flex w-full items-center justify-center gap-2 h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
          >
            {isGenerating ? (
              LOADING_MESSAGES[loadingMsgIdx]
            ) : (
              <>
                <Sparkles className="h-4 w-4" strokeWidth={2} />
                Generar borrador
              </>
            )}
          </button>
        </div>
      )}

      {resultado && (
        <ResultadoConsulta
          soapOutput={resultado}
          pacienteId={pacienteId}
          inputMedico={grabacion ? grabacion.descripcion : descripcion}
          onDiscard={grabacion ? handleDiscardGrabacion : handleDiscard}
          origenGrabacion={!!grabacion}
          onAprobada={grabacion ? handleAprobadaGrabacion : undefined}
        />
      )}
    </div>
  );
}
