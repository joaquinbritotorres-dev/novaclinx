"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Inline type — lib/prompts/generate-soap.ts is server-only
interface SoapOutput {
  soap: string;
  indicaciones: string[] | null;
  seguimiento_plazo: string | null;
  seguimiento_motivo: string | null;
  resumen_corto: string;
}

interface Props {
  soapOutput: SoapOutput;
  pacienteId: string;
  inputMedico: string;
  onDiscard: () => void;
}

export default function ResultadoConsulta({
  soapOutput,
  pacienteId,
  inputMedico,
  onDiscard,
}: Props) {
  const router = useRouter();

  const [soap, setSoap] = useState(soapOutput.soap);
  const [indicaciones, setIndicaciones] = useState<string[]>(
    soapOutput.indicaciones ?? []
  );
  const [seguimientoPlazo, setSeguimientoPlazo] = useState(
    soapOutput.seguimiento_plazo ?? ""
  );
  const [seguimientoMotivo, setSeguimientoMotivo] = useState(
    soapOutput.seguimiento_motivo ?? ""
  );
  const [resumenCorto] = useState(soapOutput.resumen_corto);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasIndicaciones = soapOutput.indicaciones !== null;
  const hasSeguimiento = soapOutput.seguimiento_plazo !== null;

  async function handleAprobar() {
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/consultas/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paciente_id: pacienteId,
          input_medico: inputMedico,
          soap,
          indicaciones: hasIndicaciones ? indicaciones : null,
          seguimiento_plazo: hasSeguimiento && seguimientoPlazo.trim()
            ? seguimientoPlazo.trim()
            : null,
          seguimiento_motivo: hasSeguimiento && seguimientoMotivo.trim()
            ? seguimientoMotivo.trim()
            : null,
          resumen_corto: resumenCorto,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      router.push(`/pacientes/${pacienteId}`);
    } catch {
      setSaveError("No pudimos guardar la consulta. Intenta de nuevo.");
      setSaving(false);
    }
  }

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(soap);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — no-op
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Badge IA */}
      <div
        className="rounded-lg px-4 py-3 text-sm font-medium text-[#4338CA]"
        style={{
          backgroundColor: "#EEF2FF",
          borderLeft: "3px solid #6366F1",
        }}
      >
        Borrador generado por IA
      </div>

      {/* Nota SOAP editable */}
      <div>
        <label
          htmlFor="soap-editor"
          className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1"
        >
          Nota SOAP
        </label>
        <textarea
          id="soap-editor"
          value={soap}
          onChange={(e) => setSoap(e.target.value)}
          disabled={saving}
          rows={12}
          className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50 resize-none"
        />
      </div>

      {/* Indicaciones — solo si la IA las generó */}
      {hasIndicaciones && (
        <div>
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-2">
            Indicaciones
          </p>
          <ul className="space-y-2">
            {indicaciones.map((item, idx) => (
              <li key={idx}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const next = [...indicaciones];
                    next[idx] = e.target.value;
                    setIndicaciones(next);
                  }}
                  disabled={saving}
                  className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Seguimiento — solo si la IA lo generó */}
      {hasSeguimiento && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
            Seguimiento
          </p>
          <input
            type="text"
            value={seguimientoPlazo}
            onChange={(e) => setSeguimientoPlazo(e.target.value)}
            disabled={saving}
            placeholder="Plazo"
            className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
          />
          <input
            type="text"
            value={seguimientoMotivo}
            onChange={(e) => setSeguimientoMotivo(e.target.value)}
            disabled={saving}
            placeholder="Motivo"
            className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
          />
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2">
        Novaclinx genera borradores. La nota oficial y el criterio clínico son tuyos.
      </p>

      {saveError && (
        <div role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={handleAprobar}
          disabled={saving || !soap.trim()}
          className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          {saving ? "Guardando..." : "Aprobar y guardar"}
        </button>

        <button
          type="button"
          onClick={handleCopiar}
          disabled={saving}
          className="w-full h-11 bg-white border border-[#D1D5DB] text-[#374151] text-sm font-medium rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          {copied ? "¡Copiado!" : "Copiar nota"}
        </button>

        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="w-full h-11 text-[#64748B] text-sm font-medium rounded-lg hover:bg-[#F1F5F9] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
