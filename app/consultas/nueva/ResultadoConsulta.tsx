"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Mic, Square, Loader2, Undo2, Sparkles } from "lucide-react";
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

  // ── "Añadir algo que faltó" (texto o voz) ──────────────────────────────────
  const [textoAnadido,   setTextoAnadido]   = useState("");
  const [grabando,       setGrabando]       = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [integrando,     setIntegrando]     = useState(false);
  const [anadidoError,   setAnadidoError]   = useState<string | null>(null);
  const [anadidoAviso,   setAnadidoAviso]   = useState<string | null>(null);
  // Para resaltar y poder DESHACER la última integración (regla: el médico
  // siempre puede revertir antes de guardar). Solo válido hasta la próxima
  // edición manual de un campo SOAP.
  const [seccionResaltada,  setSeccionResaltada]  = useState<keyof SoapSections | null>(null);
  const [ultimaIntegracion, setUltimaIntegracion] = useState<{
    seccion: keyof SoapSections;
    valorPrevio: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);

  const ocupadoAnadido = grabando || transcribiendo || integrando;

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

  // Edición manual de un campo SOAP: invalida el "Deshacer" pendiente para que
  // un undo tardío no borre lo que el médico escribió a mano después.
  function handleSoapChange(key: keyof SoapSections, value: string) {
    soapSetters[key](value);
    if (ultimaIntegracion) setUltimaIntegracion(null);
    if (seccionResaltada) setSeccionResaltada(null);
    if (anadidoAviso) setAnadidoAviso(null);
  }

  // ── Voz: graba un clip corto y lo transcribe (reusa Deepgram del scribe) ────
  async function toggleGrabacion() {
    if (grabando) {
      mediaRecorderRef.current?.stop(); // el resto ocurre en onstop
      return;
    }
    setAnadidoError(null);
    setAnadidoAviso(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        await transcribirAnadido(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setGrabando(true);
    } catch {
      setAnadidoError("No pudimos acceder al micrófono. Revisa los permisos o escribe el texto.");
    }
  }

  async function transcribirAnadido(blob: Blob) {
    setGrabando(false);
    setTranscribiendo(true);
    setAnadidoError(null);
    try {
      const res = await fetch("/api/consultas/transcribir-anadido", {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm" },
        credentials: "include",
        body: blob,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.texto !== "string") {
        setAnadidoError(data.error || "No pudimos transcribir el audio.");
        return;
      }
      // Anexar al texto existente (por si el médico ya había escrito algo).
      setTextoAnadido((prev) => (prev.trim() ? `${prev.trim()} ${data.texto}` : data.texto));
    } catch {
      setAnadidoError("Error de conexión al transcribir. Reintenta o escribe el texto.");
    } finally {
      setTranscribiendo(false);
    }
  }

  // ── Integración: la IA decide la sección y redacta; el append es local ──────
  async function integrarAnadidoIA() {
    const texto = textoAnadido.trim();
    if (!texto || integrando) return;
    setIntegrando(true);
    setAnadidoError(null);
    setAnadidoAviso(null);
    try {
      const res = await fetch("/api/consultas/integrar-anadido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          // Estado ACTUAL editado por el médico, no el prop original.
          soap: { subjetivo, objetivo, analisis, plan },
          texto_anadido: texto,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnadidoError(data.error || "No pudimos integrar el añadido.");
        return;
      }
      const seccion = data.seccion as keyof SoapSections;
      const textoAAnadir = typeof data.texto_a_anadir === "string" ? data.texto_a_anadir.trim() : "";
      if (!seccion || !(seccion in soapSetters) || !textoAAnadir) {
        setAnadidoError("La IA no devolvió un resultado válido. Reintenta.");
        return;
      }

      const valorPrevio = soapValues[seccion];
      const nuevo = valorPrevio.trim() ? `${valorPrevio}\n${textoAAnadir}` : textoAAnadir;
      soapSetters[seccion](nuevo);
      setUltimaIntegracion({ seccion, valorPrevio });
      setSeccionResaltada(seccion);

      const label = SOAP_META.find((m) => m.key === seccion)?.label ?? seccion;
      setAnadidoAviso(
        data.requiere_verificar
          ? `Añadido a ${label} con un dato marcado [VERIFICAR]. Revísalo.`
          : `Añadido a ${label}. Revisa el resultado.`
      );
      setTextoAnadido("");
    } catch {
      setAnadidoError("Error de conexión al integrar. Reintenta.");
    } finally {
      setIntegrando(false);
    }
  }

  function deshacerIntegracion() {
    if (!ultimaIntegracion) return;
    soapSetters[ultimaIntegracion.seccion](ultimaIntegracion.valorPrevio);
    setUltimaIntegracion(null);
    setSeccionResaltada(null);
    setAnadidoAviso(null);
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
            onChange={(e) => handleSoapChange(key, e.target.value)}
            disabled={saving}
            rows={rows}
            className={`${TEXTAREA}${
              seccionResaltada === key
                ? " ring-2 ring-[#0F766E]/60 border-[#0F766E]"
                : ""
            }`}
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

      {/* Añadir algo que faltó — texto o voz */}
      <div className="bg-[#F0FDFB] border border-[#99F6E4] rounded-lg px-4 py-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wide">
            Añadir algo que faltó
          </p>
          <p className="text-xs text-[#5C5A54] mt-0.5">
            Escribe o dicta el dato; la IA lo redacta y lo coloca en la sección correcta. Solo añade — no toca el resto.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <textarea
            value={textoAnadido}
            onChange={(e) => setTextoAnadido(e.target.value)}
            disabled={saving || ocupadoAnadido}
            rows={2}
            placeholder="Ej: se me olvidó que el niño también tiene fiebre de 38.5"
            className={`${TEXTAREA} flex-1`}
            aria-label="Texto a añadir"
          />
          <button
            type="button"
            onClick={toggleGrabacion}
            disabled={saving || transcribiendo || integrando}
            aria-label={grabando ? "Detener grabación" : "Grabar por voz"}
            title={grabando ? "Detener" : "Grabar por voz"}
            className={`shrink-0 h-11 w-11 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
              grabando
                ? "bg-[#DC2626] border-[#DC2626] text-white animate-pulse"
                : "bg-white border-[#D1D5DB] text-[#0F766E] hover:border-[#0F766E]"
            }`}
          >
            {transcribiendo ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : grabando ? (
              <Square className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>

        {grabando && (
          <p className="text-xs text-[#DC2626]">Grabando… toca el cuadro rojo para detener.</p>
        )}
        {transcribiendo && (
          <p className="text-xs text-[#0F766E]">Transcribiendo el audio…</p>
        )}

        <button
          type="button"
          onClick={integrarAnadidoIA}
          disabled={saving || ocupadoAnadido || !textoAnadido.trim()}
          className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {integrando ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          )}
          {integrando ? "Integrando…" : "Integrar con IA"}
        </button>

        {anadidoError && (
          <p role="alert" className="text-xs text-[#DC2626]">{anadidoError}</p>
        )}

        {anadidoAviso && (
          <div className="flex items-center justify-between gap-3 bg-white border border-[#99F6E4] rounded-lg px-3 py-2">
            <p className="text-xs text-[#0F766E]">{anadidoAviso}</p>
            {ultimaIntegracion && (
              <button
                type="button"
                onClick={deshacerIntegracion}
                disabled={saving}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#DC2626] transition-colors shrink-0 disabled:opacity-50"
              >
                <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
                Deshacer
              </button>
            )}
          </div>
        )}
      </div>

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
          disabled={saving || ocupadoAnadido || !analisis.trim() || !todosConfirmados}
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
