"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Mic,
  Square,
  Loader2,
  Undo2,
  Sparkles,
  WandSparkles,
  Stethoscope,
  Pill,
  AlertTriangle,
  CalendarClock,
  Check,
  ShieldCheck,
} from "lucide-react";
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

const SOAP_META: {
  key: keyof SoapSections;
  inicial: string;
  nombre: string;
  minRows: number;
}[] = [
  { key: "subjetivo", inicial: "S", nombre: "Subjetivo", minRows: 3 },
  { key: "objetivo", inicial: "O", nombre: "Objetivo", minRows: 3 },
  { key: "analisis", inicial: "A", nombre: "Análisis", minRows: 2 },
  { key: "plan", inicial: "P", nombre: "Plan", minRows: 5 },
];

/** label legible de una sección, para el aviso de integración. */
const NOMBRE_SECCION: Record<keyof SoapSections, string> = {
  subjetivo: "Subjetivo",
  objetivo: "Objetivo",
  analisis: "Análisis",
  plan: "Plan",
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Textarea que crece con su contenido — el documento fluye sin scroll interno. */
function AutoTextarea({
  id,
  value,
  onChange,
  disabled,
  minRows = 3,
  placeholder,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  minRows?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={minRows}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[15px] leading-[1.75] text-[#1A1A18] placeholder-[#94A3B8] focus:outline-none focus:ring-0 disabled:opacity-50"
    />
  );
}

/** Encabezado de sección con ícono en cuadrito — da ritmo y jerarquía. */
function SeccionTitulo({
  icon: Icon,
  children,
  tone = "teal",
  right,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
  tone?: "teal" | "amber";
  right?: React.ReactNode;
}) {
  const toneCls =
    tone === "amber" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#F0FDFB] text-[#0F766E]";
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneCls}`}>
        <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
      </span>
      <h2 className="text-sm font-semibold text-[#0F172A]">{children}</h2>
      {right ? <div className="ml-auto">{right}</div> : null}
    </div>
  );
}

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
  const numConfirmados   = medicamentos.filter((m) => m.confirmado === true).length;

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

      const label = NOMBRE_SECCION[seccion] ?? seccion;
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

  const puedeAprobar = !saving && !ocupadoAnadido && Boolean(analisis.trim()) && todosConfirmados;

  return (
    <div className="mt-6 space-y-6 pb-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
      {/* ── Documento clínico: cabecera + diagnóstico + SOAP ── */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3DB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {/* Cabecera del documento */}
        <div className="flex items-center justify-between gap-2 border-b border-[#F1F0EC] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F0FDFB] text-[#0F766E]">
              <Stethoscope className="h-[15px] w-[15px]" strokeWidth={2} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A8780]">
              Nota clínica
            </span>
          </div>
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              origenGrabacion
                ? "bg-[#FFF7ED] text-[#9A3412]"
                : "bg-[#EEF2FF] text-[#4338CA]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${origenGrabacion ? "bg-[#EA580C]" : "bg-[#6366F1]"}`}
              aria-hidden
            />
            {origenGrabacion ? "IA · grabación — revisa" : "IA · borrador — revisa"}
          </span>
        </div>

        {/* Diagnóstico CIE-10 */}
        {(cie10Codigo || cie10Descripcion) && (
          <div className="border-b border-[#F1F0EC] bg-[#FBFBFA] px-5 py-4 sm:px-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#0F766E]">
              Diagnóstico CIE-10
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={cie10Codigo}
                onChange={(e) => setCie10Codigo(e.target.value)}
                disabled={saving}
                placeholder="Código"
                aria-label="Código CIE-10"
                className="h-11 w-full sm:w-28 rounded-lg border border-[#D1D5DB] bg-white px-3 font-mono text-[15px] font-semibold text-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
              />
              <input
                type="text"
                value={cie10Descripcion}
                onChange={(e) => setCie10Descripcion(e.target.value)}
                disabled={saving}
                placeholder="Descripción del diagnóstico"
                aria-label="Descripción CIE-10"
                className="h-11 flex-1 rounded-lg border border-[#D1D5DB] bg-white px-3 text-[15px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Secciones SOAP */}
        {SOAP_META.map(({ key, inicial, nombre, minRows }) => {
          const resaltada = seccionResaltada === key;
          return (
            <div
              key={key}
              className={`border-b border-[#F1F0EC] px-5 py-5 transition-colors last:border-b-0 sm:px-6 sm:py-6 ${
                resaltada ? "bg-[#F0FDFB]" : ""
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F766E] text-sm font-bold text-white"
                  aria-hidden
                >
                  {inicial}
                </span>
                <label
                  htmlFor={`soap-${key}`}
                  className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0F766E]"
                >
                  {nombre}
                </label>
                {resaltada && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#0F766E]/10 px-2 py-0.5 text-[11px] font-medium text-[#0F766E]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    Añadido
                  </span>
                )}
              </div>
              <AutoTextarea
                id={`soap-${key}`}
                value={soapValues[key]}
                onChange={(v) => handleSoapChange(key, v)}
                disabled={saving}
                minRows={minRows}
              />
            </div>
          );
        })}
      </div>

      {/* ── Medicamentos — confirmar dosis ── */}
      {hasIndicaciones && (
        <div>
          <SeccionTitulo
            icon={Pill}
            right={
              medicamentos.length > 0 ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    todosConfirmados
                      ? "bg-[#F0FDF4] text-[#15803D]"
                      : "bg-[#FEF3C7] text-[#B45309]"
                  }`}
                >
                  {todosConfirmados && <Check className="h-3 w-3" strokeWidth={3} />}
                  {numConfirmados}/{medicamentos.length} confirmados
                </span>
              ) : null
            }
          >
            Medicamentos
          </SeccionTitulo>
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
            <p className="mt-2 text-xs text-[#DC2626]">
              Confirma todos los medicamentos para poder guardar.
            </p>
          )}
        </div>
      )}

      {/* ── Signos de alarma — editables ── */}
      <div className="rounded-2xl border border-[#FED7AA] bg-[#FFFBF5] px-4 py-4 sm:px-5">
        <SeccionTitulo icon={AlertTriangle} tone="amber">
          Signos de alarma
        </SeccionTitulo>
        {signosAlarma.length > 0 ? (
          <ul className="mb-2 space-y-2">
            {signosAlarma.map((signo, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#EA580C]" aria-hidden />
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
                  className="h-9 flex-1 rounded-md border border-[#FED7AA] bg-white px-2.5 text-sm text-[#7C2D12] placeholder-[#FCA57A] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setSignosAlarma((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={saving}
                  aria-label="Eliminar signo de alarma"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#FCA57A] transition-colors hover:bg-white hover:text-[#DC2626] disabled:opacity-50"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-xs text-[#D97706]">Sin signos de alarma documentados.</p>
        )}
        <button
          type="button"
          onClick={() => setSignosAlarma((prev) => [...prev, ""])}
          disabled={saving}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#EA580C] transition-colors hover:text-[#C2410C] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Añadir signo de alarma
        </button>
      </div>

      {/* ── Seguimiento ── */}
      {hasSeguimiento && (
        <div className="rounded-2xl border border-[#E7E3DB] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-5">
          <SeccionTitulo icon={CalendarClock}>Próximo control</SeccionTitulo>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={seguimientoPlazo}
              onChange={(e) => setSeguimientoPlazo(e.target.value)}
              disabled={saving}
              placeholder="Plazo (ej. 7 días)"
              className="h-10 w-full sm:w-40 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
            <input
              type="text"
              value={seguimientoMotivo}
              onChange={(e) => setSeguimientoMotivo(e.target.value)}
              disabled={saving}
              placeholder="Motivo del control"
              className="h-10 flex-1 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {/* ── Añadir algo que faltó — texto o voz ── */}
      <div className="rounded-2xl border border-[#99F6E4] bg-[#F0FDFB] px-4 py-4 sm:px-5">
        <SeccionTitulo icon={WandSparkles}>Añadir algo que faltó</SeccionTitulo>
        <p className="-mt-1.5 mb-3 pl-[2.375rem] text-xs leading-relaxed text-[#5C5A54]">
          Escribe o dicta el dato; la IA lo redacta y lo coloca en la sección correcta. Solo añade — no toca el resto.
        </p>

        <div className="flex items-start gap-2">
          <textarea
            value={textoAnadido}
            onChange={(e) => setTextoAnadido(e.target.value)}
            disabled={saving || ocupadoAnadido}
            rows={2}
            placeholder="Ej: se me olvidó que el niño también tiene fiebre de 38.5"
            aria-label="Texto a añadir"
            className="w-full flex-1 resize-none rounded-lg border border-[#99F6E4] bg-white px-3 py-2 text-sm leading-relaxed text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:border-[#0F766E] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleGrabacion}
            disabled={saving || transcribiendo || integrando}
            aria-label={grabando ? "Detener grabación" : "Grabar por voz"}
            title={grabando ? "Detener" : "Grabar por voz"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
              grabando
                ? "animate-pulse border-[#DC2626] bg-[#DC2626] text-white"
                : "border-[#99F6E4] bg-white text-[#0F766E] hover:border-[#0F766E]"
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
          <p className="mt-2 text-xs text-[#DC2626]">Grabando… toca el cuadro rojo para detener.</p>
        )}
        {transcribiendo && (
          <p className="mt-2 text-xs text-[#0F766E]">Transcribiendo el audio…</p>
        )}

        <button
          type="button"
          onClick={integrarAnadidoIA}
          disabled={saving || ocupadoAnadido || !textoAnadido.trim()}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0F766E]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {integrando ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          )}
          {integrando ? "Integrando…" : "Integrar con IA"}
        </button>

        {anadidoError && (
          <p role="alert" className="mt-2 text-xs text-[#DC2626]">{anadidoError}</p>
        )}

        {anadidoAviso && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#99F6E4] bg-white px-3 py-2">
            <p className="text-xs text-[#0F766E]">{anadidoAviso}</p>
            {ultimaIntegracion && (
              <button
                type="button"
                onClick={deshacerIntegracion}
                disabled={saving}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#64748B] transition-colors hover:text-[#DC2626] disabled:opacity-50"
              >
                <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
                Deshacer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="flex items-center gap-1.5 px-1 text-xs text-[#8A8780]">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        Revisa la información antes de firmar. El criterio clínico y la decisión final son tuyos.
      </p>

      {/* ── Dock de acciones — sticky, siempre visible ── */}
      <div className="sticky bottom-3 z-10 sm:bottom-4">
        <div className="rounded-2xl border border-[#E7E3DB] bg-white p-2.5 shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
          {saveError && (
            <div role="alert" className="mb-2.5 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">
              {saveError}
            </div>
          )}

          {avisoVerificar !== null ? (
            <div
              role="alert"
              className="space-y-2.5 rounded-lg border border-[#FDE68A] bg-[#FEF3C7] px-3 py-3 text-sm text-[#92400E]"
            >
              <p>
                Queda{avisoVerificar === 1 ? "" : "n"} <strong>{avisoVerificar}</strong>{" "}
                dato{avisoVerificar === 1 ? "" : "s"} marcado{avisoVerificar === 1 ? "" : "s"}{" "}
                como <strong>[VERIFICAR]</strong> en la nota. ¿Aprobar igual?
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => handleAprobar(true)}
                  disabled={saving}
                  className="h-10 w-full sm:w-auto rounded-lg bg-[#0F766E] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0F766E]/90 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Aprobar igual"}
                </button>
                <button
                  type="button"
                  onClick={() => setAvisoVerificar(null)}
                  disabled={saving}
                  className="h-10 w-full sm:w-auto rounded-lg border border-[#E2E8F0] px-4 text-sm font-medium text-[#64748B] transition-colors hover:bg-white disabled:opacity-50"
                >
                  Revisar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onDiscard}
                disabled={saving}
                className="h-11 rounded-lg px-4 text-sm font-medium text-[#64748B] transition-colors hover:bg-[#F1F5F9] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 sm:w-auto"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => handleAprobar()}
                disabled={!puedeAprobar}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0F766E] text-sm font-medium text-white transition-colors hover:bg-[#0F766E]/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    Aprobar y guardar
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
