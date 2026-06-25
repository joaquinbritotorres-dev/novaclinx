"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CitaModal from "./CitaModal";
import BotonWhatsApp from "@/components/BotonWhatsApp";
import { citaToICS } from "@/lib/ics";

export type EstadoCita =
  | "programada"
  | "confirmada"
  | "cancelada"
  | "atendida"
  | "no_show";

export interface Cita {
  id: string;
  paciente_id: string | null;
  nombre_paciente: string | null;
  paciente_nombre: string | null;
  paciente_telefono: string | null;
  inicio: string;
  duracion_min: number;
  motivo: string | null;
  estado: EstadoCita;
  notas: string | null;
}

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const ESTADO_LABEL: Record<EstadoCita, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  atendida: "Atendida",
  no_show: "No asistió",
};

const ESTADO_STYLE: Record<EstadoCita, string> = {
  programada: "bg-[#DBEAFE] text-[#1E40AF]",
  confirmada: "bg-[#D1FAE5] text-[#065F46]",
  cancelada: "bg-[#FEE2E2] text-[#991B1B]",
  atendida: "bg-[#F0FDFB] text-[#0F766E]",
  no_show: "bg-[#FEF3C7] text-[#92400E]",
};

const ESTADO_DOT: Record<EstadoCita, string> = {
  programada: "bg-[#3B82F6]",
  confirmada: "bg-[#10B981]",
  cancelada: "bg-[#EF4444]",
  atendida: "bg-[#0F766E]",
  no_show: "bg-[#F59E0B]",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function utcDateToStr(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function addMonths(mesStr: string, delta: number): string {
  const [y, mo] = mesStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMesLabel(mesStr: string): string {
  const [y, m] = mesStr.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-EC", {
    month: "long",
  });
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${y}`;
}

function formatHora(inicioISO: string): string {
  return new Date(inicioISO).toLocaleTimeString("es-EC", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatFechaLarga(inicioISO: string): string {
  return new Date(inicioISO).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDiaPanel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgendaView({
  mes,
  hoy,
  citas,
}: {
  mes: string;
  hoy: string;
  citas: Cita[];
}) {
  const router = useRouter();

  // Default: hoy si cae en el mes visible; si no, el día 1
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    hoy.startsWith(mes) ? hoy : `${mes}-01`
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editCita, setEditCita] = useState<Cita | null>(null);
  const [cancelando, setCancelando] = useState<Set<string>>(new Set());
  const [confirmandoCancelar, setConfirmandoCancelar] = useState<string | null>(null);

  // ── Grid days (UTC arithmetic for stable weekday columns) ─────────────────
  const gridDays = useMemo<string[]>(() => {
    const [year, month] = mes.split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0));
    const offsetStart = firstDay.getUTCDay() === 0 ? 6 : firstDay.getUTCDay() - 1;
    const offsetEnd = lastDay.getUTCDay() === 0 ? 0 : 7 - lastDay.getUTCDay();
    const gridStart = new Date(Date.UTC(year, month - 1, 1 - offsetStart));
    const gridEnd = new Date(
      Date.UTC(year, month - 1, lastDay.getUTCDate() + offsetEnd)
    );
    const days: string[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      days.push(utcDateToStr(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return days;
  }, [mes]);

  // ── Group citas by Guayaquil date ─────────────────────────────────────────
  const citasByDate = useMemo(() => {
    const map = new Map<string, Cita[]>();
    for (const c of citas) {
      const k = new Date(c.inicio).toLocaleDateString("en-CA", {
        timeZone: "America/Guayaquil",
      });
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return map;
  }, [citas]);

  const citasDelDia = useMemo(() => {
    const arr = citasByDate.get(selectedDate) ?? [];
    return [...arr].sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    );
  }, [citasByDate, selectedDate]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function navMes(delta: number) {
    router.push(`/agenda?mes=${addMonths(mes, delta)}`);
  }

  function irHoy() {
    const mesHoy = new Date()
      .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
      .slice(0, 7);
    router.push(`/agenda?mes=${mesHoy}`);
  }

  function openCreate() {
    setEditCita(null);
    setModalOpen(true);
  }

  function openEdit(cita: Cita) {
    setEditCita(cita);
    setModalOpen(true);
  }

  function onModalClose(refresh?: boolean) {
    setModalOpen(false);
    if (refresh) router.refresh();
  }

  async function handleCancelar(id: string) {
    setConfirmandoCancelar(null);
    setCancelando((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/citas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelada" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setCancelando((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function descargarICS(cita: Cita) {
    const nombre =
      cita.paciente_nombre ?? cita.nombre_paciente ?? "Paciente";
    const ics = citaToICS({
      inicio: cita.inicio,
      duracionMin: cita.duracion_min,
      titulo: `Cita médica: ${nombre}`,
      descripcion: cita.motivo ?? undefined,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cita-${new Date(cita.inicio)
      .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-6">
      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-xl font-bold mr-2 bg-gradient-to-r from-[#0F172A] to-[#0F766E] bg-clip-text text-transparent xl:bg-none xl:bg-clip-border xl:text-[#0F172A]">
          Agenda
        </h1>

        <button
          type="button"
          onClick={() => navMes(-1)}
          aria-label="Mes anterior"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
        >
          ←
        </button>

        <span className="text-base font-semibold text-[#0F172A] min-w-[160px] text-center select-none">
          {formatMesLabel(mes)}
        </span>

        <button
          type="button"
          onClick={() => navMes(1)}
          aria-label="Mes siguiente"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
        >
          →
        </button>

        <button
          type="button"
          onClick={irHoy}
          className="ml-1 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors text-sm font-medium"
        >
          Hoy
        </button>
      </div>

      {/* ── Dos columnas: apiladas hasta xl (1280px) para que la grilla del
          mes tenga ancho de sobra; lado a lado solo en pantallas grandes. ── */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">

        {/* ── Grilla del mes ── */}
        <div className="flex-1 min-w-0 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          {/* Encabezado de días */}
          <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="h-10 flex items-center justify-center text-xs font-semibold text-[#64748B] uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7">
            {gridDays.map((dateStr) => {
              const inMonth = dateStr.slice(0, 7) === mes;
              const isToday = dateStr === hoy;
              const isSelected = dateStr === selectedDate;
              const cellCitas = citasByDate.get(dateStr) ?? [];
              const dots = cellCitas.slice(0, 4);
              const extra = cellCitas.length - 4;
              const dayNum = parseInt(dateStr.split("-")[2], 10);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={[
                    "min-h-20 sm:min-h-28 p-2 text-left flex flex-col border-r border-b border-[#E2E8F0]",
                    "transition-colors focus:outline-none focus:z-10",
                    inMonth
                      ? "bg-white hover:bg-[#F0FDFB]"
                      : "bg-[#F8FAFC] hover:bg-[#F0FDFB]/60",
                    isSelected ? "ring-2 ring-inset ring-[#0F766E]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={[
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium shrink-0",
                      isToday
                        ? "bg-[#0F766E] text-white"
                        : inMonth
                        ? "text-[#0F172A]"
                        : "text-[#CBD5E1]",
                    ].join(" ")}
                  >
                    {dayNum}
                  </span>

                  {cellCitas.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1.5 items-center">
                      {dots.map((c) => (
                        <span
                          key={c.id}
                          className={`w-2 h-2 rounded-full shrink-0 ${ESTADO_DOT[c.estado]}`}
                        />
                      ))}
                      {extra > 0 && (
                        <span className="text-[10px] leading-none text-[#64748B]">
                          +{extra}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Panel del día seleccionado ── */}
        <div className="w-full shrink-0 xl:w-[320px] xl:sticky xl:top-16">
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            {/* Cabecera del panel */}
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#0F172A] capitalize leading-tight">
                {formatDiaPanel(selectedDate)}
              </h2>
              <button
                type="button"
                onClick={openCreate}
                className="shrink-0 h-8 px-3 rounded-lg text-xs font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-1 bg-gradient-to-r from-[#0F766E] to-[#0E6A63] shadow-[0_4px_14px_-4px_rgba(15,118,110,0.5)] hover:shadow-[0_6px_16px_-4px_rgba(15,118,110,0.6)] xl:bg-none xl:bg-[#0F766E] xl:shadow-none xl:hover:bg-[#0F766E]/90"
              >
                + Nueva cita
              </button>
            </div>

            {/* Lista de citas */}
            <div className="divide-y divide-[#E2E8F0] xl:max-h-[calc(100dvh-14rem)] xl:overflow-y-auto">

              {citasDelDia.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-[#94A3B8]">Sin citas este día.</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-2 text-sm text-[#0F766E] hover:underline"
                  >
                    Crear la primera
                  </button>
                </div>
              ) : (
                citasDelDia.map((cita) => (
                  <div key={cita.id} className="px-4 py-3">
                    {/* Hora + duración + badge */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-[#0F172A] shrink-0">
                          {formatHora(cita.inicio)}
                        </span>
                        <span className="text-xs text-[#94A3B8] shrink-0">
                          {cita.duracion_min} min
                        </span>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTADO_STYLE[cita.estado]}`}
                      >
                        {ESTADO_LABEL[cita.estado]}
                      </span>
                    </div>

                    {/* Paciente */}
                    <p className="text-sm font-medium text-[#0F172A] truncate mb-0.5">
                      {cita.paciente_id && cita.paciente_nombre ? (
                        <Link
                          href={`/pacientes/${cita.paciente_id}`}
                          className="text-[#0F766E] hover:underline"
                        >
                          {cita.paciente_nombre}
                        </Link>
                      ) : (
                        cita.nombre_paciente ?? "Sin nombre"
                      )}
                    </p>

                    {/* Motivo */}
                    {cita.motivo && (
                      <p className="text-xs text-[#64748B] truncate mb-2">
                        {cita.motivo}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(cita)}
                        className="h-7 px-2.5 rounded border border-[#E2E8F0] text-xs text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                      >
                        Editar
                      </button>
                      {cita.estado !== "cancelada" &&
                        (confirmandoCancelar === cita.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-xs text-[#DC2626] font-medium">
                              ¿Cancelar?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelar(cita.id)}
                              disabled={cancelando.has(cita.id)}
                              className="h-7 px-2.5 rounded bg-[#DC2626] text-xs text-white font-medium hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
                            >
                              {cancelando.has(cita.id) ? "…" : "Sí"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmandoCancelar(null)}
                              className="h-7 px-2.5 rounded border border-[#E2E8F0] text-xs text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmandoCancelar(cita.id)}
                            disabled={cancelando.has(cita.id)}
                            className="h-7 px-2.5 rounded border border-[#FCA5A5] text-xs text-[#DC2626] hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                          >
                            {cancelando.has(cita.id) ? "…" : "Cancelar"}
                          </button>
                        ))}
                      {(cita.estado === "programada" ||
                        cita.estado === "confirmada") && (
                        <BotonWhatsApp
                          telefono={cita.paciente_id ? cita.paciente_telefono : null}
                          texto={`¡Hola ${cita.paciente_nombre ?? cita.nombre_paciente ?? ""}! Le recordamos que tiene una cita médica el ${formatFechaLarga(cita.inicio)} a las ${formatHora(cita.inicio)}. Por favor confirme su asistencia respondiendo a este mensaje. Si necesita reagendar, comuníquese con nosotros con anticipación. ¡Le esperamos!`}
                          tipo="recordatorio"
                          paciente_id={cita.paciente_id ?? undefined}
                          cita_id={cita.id}
                          label="Recordatorio"
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-[#A7F3D0] bg-[#ECFDF5] text-xs text-[#047857] font-medium hover:bg-[#D1FAE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      )}
                      {cita.estado !== "cancelada" && (
                        <button
                          type="button"
                          onClick={() => descargarICS(cita)}
                          title="Descargar .ics para Google/Apple/Outlook"
                          className="h-7 px-2.5 rounded border border-[#E2E8F0] text-xs text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                        >
                          Calendario
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <CitaModal
          fecha={selectedDate}
          fechaInicial={selectedDate}
          cita={editCita}
          onClose={onModalClose}
        />
      )}
    </main>
  );
}
