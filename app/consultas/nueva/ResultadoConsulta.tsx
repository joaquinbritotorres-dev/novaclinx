"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import type { MedicamentoPropuesto, Medicamento } from "@/lib/recetas/tipos";
import MedicamentoCard from "./MedicamentoCard";
import { contarVerificar } from "@/lib/recetas/gateDocumentos";

interface SoapSections {
  subjetivo: string;
  objetivo: string;
  analisis: string;
  plan: string;
}

interface SoapOutput {
  soap: SoapSections;
  cie10_codigo: string;
  cie10_descripcion: string;
  indicaciones: MedicamentoPropuesto[] | null;
  signos_alarma: string[];
  seguimiento_plazo: string | null;
  seguimiento_motivo: string | null;
  resumen_corto: string;
  tipo_consulta?: string;
}

interface Props {
  soapOutput: SoapOutput;
  pacienteId: string;
  inputMedico: string;
  onDiscard: () => void;
  /** true cuando la nota viene del scribe de voz: banner permanente de revisión */
  origenGrabacion?: boolean;
  /** hook post-guardado (scribe: vincular grabación y borrar audio) */
  onAprobada?: (consultaId: string) => Promise<void> | void;
}

const SOAP_META: { key: keyof SoapSections; label: string; rows: number }[] = [
  { key: "subjetivo", label: "S — Subjetivo", rows: 4 },
  { key: "objetivo",  label: "O — Objetivo",  rows: 4 },
  { key: "analisis",  label: "A — Análisis",  rows: 3 },
  { key: "plan",      label: "P — Plan",      rows: 7 },
];

const TEXTAREA =
  "w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] " +
  "leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] " +
  "disabled:opacity-50 resize-none";

export default function ResultadoConsulta({
  soapOutput,
  pacienteId,
  inputMedico,
  onDiscard,
  origenGrabacion = false,
  onAprobada,
}: Props) {
  const router = useRouter();

  const [subjetivo, setSubjetivo] = useState(soapOutput.soap.subjetivo);
  const [objetivo,  setObjetivo]  = useState(soapOutput.soap.objetivo);
  const [analisis,  setAnalisis]  = useState(soapOutput.soap.analisis);
  const [plan,      setPlan]      = useState(soapOutput.soap.plan);

  const [cie10Codigo,      setCie10Codigo]      = useState(soapOutput.cie10_codigo);
  const [cie10Descripcion, setCie10Descripcion] = useState(soapOutput.cie10_descripcion);

  const [medicamentos, setMedicamentos] = useState<MedicamentoPropuesto[]>(
    soapOutput.indicaciones ?? []
  );

  const [seguimientoPlazo,  setSeguimientoPlazo]  = useState(soapOutput.seguimiento_plazo  ?? "");
  const [seguimientoMotivo, setSeguimientoMotivo] = useState(soapOutput.seguimiento_motivo ?? "");
  const [signosAlarma,      setSignosAlarma]      = useState<string[]>(soapOutput.signos_alarma);

  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Aviso de [VERIFICAR] pendientes al aprobar la nota (registro honesto, pero
  // se confirma con el médico antes de guardar en la historia clínica).
  const [avisoVerificar, setAvisoVerificar] = useState<number | null>(null);

  const hasIndicaciones  = soapOutput.indicaciones !== null;
  const hasSeguimiento   = soapOutput.seguimiento_plazo !== null;
  const todosConfirmados = !hasIndicaciones || medicamentos.every((m) => m.confirmado === true);

  const soapSetters: Record<keyof SoapSections, (v: string) => void> = {
    subjetivo: setSubjetivo,
    objetivo:  setObjetivo,
    analisis:  setAnalisis,
    plan:      setPlan,
  };
  const soapValues: SoapSections = { subjetivo, objetivo, analisis, plan };

  function handleConfirmarMed(idx: number, confirmed: Medicamento) {
    setMedicamentos((prev) => {
      const next = [...prev];
      next[idx] = confirmed;
      return next;
    });
  }

  async function handleAprobar(omitirAvisoVerificar = false) {
    if (!todosConfirmados) return;

    // Aviso (no bloqueo) si quedan [VERIFICAR] en la nota al aprobar
    if (!omitirAvisoVerificar) {
      const pendientes = contarVerificar([subjetivo, objetivo, analisis, plan]);
      if (pendientes > 0) {
        setAvisoVerificar(pendientes);
        return;
      }
    }
    setAvisoVerificar(null);

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
          soap: { subjetivo, objetivo, analisis, plan },
          cie10_codigo: cie10Codigo.trim(),
          cie10_descripcion: cie10Descripcion.trim(),
          indicaciones: hasIndicaciones ? medicamentos : null,
          signos_alarma: signosAlarma.filter((s) => s.trim()),
          seguimiento_plazo:
            hasSeguimiento && seguimientoPlazo.trim() ? seguimientoPlazo.trim() : null,
          seguimiento_motivo:
            hasSeguimiento && seguimientoMotivo.trim() ? seguimientoMotivo.trim() : null,
          resumen_corto: soapOutput.resumen_corto,
          tipo_consulta: soapOutput.tipo_consulta,
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      if (onAprobada && typeof data.id === "string") {
        // La nota ya está guardada: un fallo aquí no debe bloquear al médico
        try {
          await onAprobada(data.id);
        } catch {
          // la purga manual cubre el remanente
        }
      }
      router.push(`/pacientes/${pacienteId}`);
    } catch {
      setSaveError("No pudimos guardar la consulta. Intenta de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      {/* IA badge */}
      {origenGrabacion ? (
        <div
          role="status"
          className="rounded-lg px-4 py-3 text-sm font-semibold text-[#9A3412]"
          style={{ backgroundColor: "#FFF7ED", borderLeft: "3px solid #EA580C" }}
        >
          Generada por IA a partir de grabación — revisión obligatoria
        </div>
      ) : (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium text-[#4338CA]"
          style={{ backgroundColor: "#EEF2FF", borderLeft: "3px solid #6366F1" }}
        >
          Borrador generado por IA — revisa y corrige antes de guardar
        </div>
      )}

      {/* CIE-10 */}
      {(cie10Codigo || cie10Descripcion) && (
        <div className="bg-[#F0FDFB] border border-[#99F6E4] rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wide mb-2">
            Diagnóstico CIE-10
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={cie10Codigo}
              onChange={(e) => setCie10Codigo(e.target.value)}
              disabled={saving}
              placeholder="Código"
              aria-label="Código CIE-10"
              className="w-24 h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
            <input
              type="text"
              value={cie10Descripcion}
              onChange={(e) => setCie10Descripcion(e.target.value)}
              disabled={saving}
              placeholder="Descripción"
              aria-label="Descripción CIE-10"
              className="flex-1 h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {/* SOAP sections */}
      {SOAP_META.map(({ key, label, rows }) => (
        <div key={key}>
          <label
            htmlFor={`soap-${key}`}
            className="block text-xs font-semibold text-[#0F766E] uppercase tracking-wide mb-1"
          >
            {label}
          </label>
          <textarea
            id={`soap-${key}`}
            value={soapValues[key]}
            onChange={(e) => soapSetters[key](e.target.value)}
            disabled={saving}
            rows={rows}
            className={TEXTAREA}
          />
        </div>
      ))}

      {/* Medicamentos — confirmar dosis */}
      {hasIndicaciones && (
        <div>
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-3">
            Medicamentos — confirmar dosis
          </p>
          <div className="space-y-3">
            {medicamentos.map((med, idx) => (
              <MedicamentoCard
                key={idx}
                med={med}
                index={idx}
                onConfirmar={(confirmed) => handleConfirmarMed(idx, confirmed)}
                disabled={saving}
              />
            ))}
          </div>
          {!todosConfirmados && (
            <p className="text-xs text-[#DC2626] mt-2">
              Confirma todos los medicamentos para poder guardar.
            </p>
          )}
        </div>
      )}

      {/* Signos de alarma — editables */}
      <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-[#C2410C] uppercase tracking-wide mb-2">
          Signos de alarma
        </p>
        {signosAlarma.length > 0 ? (
          <ul className="space-y-2 mb-2">
            {signosAlarma.map((signo, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] shrink-0" aria-hidden />
                <input
                  type="text"
                  value={signo}
                  onChange={(e) => {
                    const next = [...signosAlarma];
                    next[idx] = e.target.value;
                    setSignosAlarma(next);
                  }}
                  disabled={saving}
                  aria-label={`Signo de alarma ${idx + 1}`}
                  className="flex-1 px-2 py-1 bg-white border border-[#FED7AA] rounded-md text-sm text-[#7C2D12] placeholder-[#FCA57A] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setSignosAlarma((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={saving}
                  aria-label="Eliminar signo de alarma"
                  className="text-[#FCA57A] hover:text-[#DC2626] transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#D97706] mb-2">Sin signos de alarma documentados.</p>
        )}
        <button
          type="button"
          onClick={() => setSignosAlarma((prev) => [...prev, ""])}
          disabled={saving}
          className="flex items-center gap-1 text-xs font-medium text-[#EA580C] hover:text-[#C2410C] transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Añadir signo de alarma
        </button>
      </div>

      {/* Seguimiento */}
      {hasSeguimiento && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
            Próximo control
          </p>
          <input
            type="text"
            value={seguimientoPlazo}
            onChange={(e) => setSeguimientoPlazo(e.target.value)}
            disabled={saving}
            placeholder="Plazo (ej. 7 días)"
            className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
          />
          <input
            type="text"
            value={seguimientoMotivo}
            onChange={(e) => setSeguimientoMotivo(e.target.value)}
            disabled={saving}
            placeholder="Motivo del control"
            className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
          />
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2">
        Revisa la información antes de firmar. El criterio clínico y la decisión final son tuyos.
      </p>

      {saveError && (
        <div role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}

      {avisoVerificar !== null && (
        <div
          role="alert"
          className="text-sm text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-3 py-3 space-y-2"
        >
          <p>
            Queda{avisoVerificar === 1 ? "" : "n"} <strong>{avisoVerificar}</strong>{" "}
            dato{avisoVerificar === 1 ? "" : "s"} marcado{avisoVerificar === 1 ? "" : "s"}{" "}
            como <strong>[VERIFICAR]</strong> en la nota. ¿Aprobar igual?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAprobar(true)}
              disabled={saving}
              className="h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Aprobar igual"}
            </button>
            <button
              type="button"
              onClick={() => setAvisoVerificar(null)}
              disabled={saving}
              className="h-9 px-4 border border-[#E2E8F0] text-[#64748B] text-sm font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              Revisar
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="button"
          onClick={() => handleAprobar()}
          disabled={saving || !analisis.trim() || !todosConfirmados}
          className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          {saving ? "Guardando..." : "Aprobar y guardar"}
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
