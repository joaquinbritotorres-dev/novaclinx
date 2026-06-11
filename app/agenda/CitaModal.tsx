"use client";

import { useState, useEffect, useRef } from "react";
import type { Cita } from "./AgendaView";

const DURACIONES = [15, 20, 30, 45, 60, 90];
const ESTADOS = [
  { value: "programada", label: "Programada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "atendida", label: "Atendida" },
  { value: "no_show", label: "No asistió" },
];

interface Paciente {
  id: string;
  nombre: string;
}

interface Props {
  fecha: string;
  fechaInicial?: string;
  cita: Cita | null;
  onClose: (refresh?: boolean) => void;
}

export default function CitaModal({ fecha, fechaInicial, cita, onClose }: Props) {
  const isEdit = !!cita;

  const [pacienteBusqueda, setPacienteBusqueda] = useState("");
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [sugerencias, setSugerencias] = useState<Paciente[]>([]);
  const [nombreLibre, setNombreLibre] = useState("");
  const [inicio, setInicio] = useState(`${fechaInicial ?? fecha}T09:00`);
  const [duracion, setDuracion] = useState(30);
  const [motivo, setMotivo] = useState("");
  const [estado, setEstado] = useState("programada");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cita) return;
    if (cita.paciente_id && cita.paciente_nombre) {
      setPacienteSeleccionado({ id: cita.paciente_id, nombre: cita.paciente_nombre });
      setPacienteBusqueda(cita.paciente_nombre);
    } else {
      setNombreLibre(cita.nombre_paciente ?? "");
    }
    // Convert TIMESTAMPTZ → datetime-local in Guayaquil
    const local = new Date(cita.inicio)
      .toLocaleString("sv-SE", { timeZone: "America/Guayaquil" })
      .replace(" ", "T")
      .slice(0, 16);
    setInicio(local);
    setDuracion(cita.duracion_min);
    setMotivo(cita.motivo ?? "");
    setEstado(cita.estado);
    setNotas(cita.notas ?? "");
  }, [cita]);

  // Debounced patient search
  useEffect(() => {
    if (pacienteSeleccionado) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!pacienteBusqueda.trim()) {
      setSugerencias([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/pacientes/buscar?q=${encodeURIComponent(pacienteBusqueda)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSugerencias(data.pacientes ?? []);
        }
      } catch {
        // silent
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pacienteBusqueda, pacienteSeleccionado]);

  function selectPaciente(p: Paciente) {
    setPacienteSeleccionado(p);
    setPacienteBusqueda(p.nombre);
    setSugerencias([]);
    setNombreLibre("");
  }

  function clearPaciente() {
    setPacienteSeleccionado(null);
    setPacienteBusqueda("");
    setSugerencias([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pacienteSeleccionado && !nombreLibre.trim()) {
      setError("Ingresa el nombre del paciente.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        // Append Guayaquil offset so Postgres stores the right UTC instant
        inicio: inicio + ":00-05:00",
        duracion_min: duracion,
        motivo: motivo.trim() || null,
        notas: notas.trim() || null,
        estado,
        paciente_id: pacienteSeleccionado?.id ?? null,
        nombre_paciente: pacienteSeleccionado ? null : nombreLibre.trim(),
      };

      const url = isEdit ? `/api/citas/${cita!.id}` : "/api/citas";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "No se pudo guardar la cita."
        );
      }

      onClose(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la cita."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelarCita() {
    if (!cita) return;
    setCancelLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/citas/${cita.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelada" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "No se pudo cancelar la cita."
        );
      }
      onClose(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cancelar la cita."
      );
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Modal header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A]">
            {isEdit ? "Editar cita" : "Nueva cita"}
          </h2>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Patient */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Paciente
            </label>
            <div className="relative">
              <input
                type="text"
                value={pacienteBusqueda}
                onChange={(e) => {
                  setPacienteBusqueda(e.target.value);
                  if (pacienteSeleccionado) clearPaciente();
                }}
                placeholder="Buscar paciente registrado…"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              />
              {pacienteSeleccionado && (
                <button
                  type="button"
                  onClick={clearPaciente}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] text-xs"
                >
                  ✕
                </button>
              )}
              {sugerencias.length > 0 && !pacienteSeleccionado && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[#E2E8F0] shadow-lg overflow-hidden">
                  {sugerencias.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectPaciente(p)}
                        className="w-full text-left px-3 py-2 text-sm text-[#0F172A] hover:bg-[#F0FDFB] transition-colors"
                      >
                        {p.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!pacienteSeleccionado && (
              <input
                type="text"
                value={nombreLibre}
                onChange={(e) => setNombreLibre(e.target.value)}
                placeholder="O escribe un nombre (sin cuenta)"
                className="mt-2 w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              />
            )}
          </div>

          {/* Date/time + duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Fecha y hora
              </label>
              <input
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Duración
              </label>
              <select
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              >
                {DURACIONES.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Motivo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo de la consulta"
              maxLength={200}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
            />
          </div>

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              >
                {ESTADOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Notas internas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas opcionales…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 resize-none"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {isEdit && cita!.estado !== "cancelada" &&
              (confirmandoCancelar ? (
                <span className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelarCita}
                    disabled={cancelLoading}
                    className="h-10 px-3 rounded-lg bg-[#DC2626] text-white text-sm font-medium hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
                  >
                    {cancelLoading ? "..." : "Sí, cancelar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoCancelar(false)}
                    disabled={cancelLoading}
                    className="h-10 px-3 rounded-lg border border-[#E2E8F0] text-[#475569] text-sm font-medium hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoCancelar(true)}
                  disabled={cancelLoading}
                  className="h-10 px-3 rounded-lg border border-[#FCA5A5] text-[#DC2626] text-sm font-medium hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                >
                  Cancelar cita
                </button>
              ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onClose()}
              className="h-10 px-4 rounded-lg border border-[#E2E8F0] text-[#64748B] text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
