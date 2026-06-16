import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Plus,
  Stethoscope,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CountUp from "./CountUp";
import Reveal from "./Reveal";
import RecordatorioFirmaOverlay from "./RecordatorioFirmaOverlay";

// ─── Helpers de fecha (zona Guayaquil) ───────────────────────────────────────

function hoyGuayaquil(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}

function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

function diasHasta(hoy: string, fecha: string): number {
  const a = new Date(hoy + "T00:00:00Z").getTime();
  const b = new Date(fecha + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatFechaCorta(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
  });
}

// ─── Estados de cita → badge apagado on-palette ──────────────────────────────

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  programada: { label: "Programada", cls: "bg-[#0F766E]/[0.08] text-[#0F766E]" },
  confirmada: { label: "Confirmada", cls: "bg-[#3F7A5E]/[0.12] text-[#3F7A5E]" },
  atendida: { label: "Atendida", cls: "bg-[#8A8780]/[0.14] text-[#5C5A54]" },
  no_show: { label: "No asistió", cls: "bg-[#9A6B12]/[0.12] text-[#9A6B12]" },
  cancelada: { label: "Cancelada", cls: "bg-[#B91C1C]/[0.08] text-[#B91C1C]" },
};

const EYEBROW = "text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]";

interface CitaHoy {
  id: string;
  inicio: string;
  motivo: string | null;
  estado: string;
  paciente_id: string | null;
  nombre_paciente: string | null;
  pacientes: { nombre: string } | null;
}

interface Cronico {
  id: string;
  nombre: string;
  condicion_cronica: string | null;
  proximo_control: string | null;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: medico } = await supabase
    .from("medicos")
    .select("id, nombre, especialidad, registro_acess, firma_object_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  // Recordatorio de firma: se muestra solo si el médico aún no tiene .p12.
  const mostrarRecordatorioFirma = !medico.firma_object_key;

  const hoy = hoyGuayaquil();
  const finVentana = sumarDias(hoy, 14);

  // Queries independientes en paralelo (RLS por medico_id)
  const [citasRes, cronicosRes, facturasRes] = await Promise.all([
    supabase
      .from("citas")
      .select("id, inicio, motivo, estado, paciente_id, nombre_paciente, pacientes(nombre)")
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .gte("inicio", `${hoy}T00:00:00-05:00`)
      .lte("inicio", `${hoy}T23:59:59.999-05:00`)
      .order("inicio", { ascending: true }),
    supabase
      .from("pacientes")
      .select("id, nombre, condicion_cronica, proximo_control")
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .not("condicion_cronica", "is", null)
      .gte("proximo_control", hoy)
      .lte("proximo_control", finVentana)
      .order("proximo_control", { ascending: true }),
    supabase
      .from("facturas")
      .select("id", { count: "exact", head: true })
      .eq("medico_id", medico.id)
      .eq("estado", "pendiente"),
  ]);

  const citasHoy = (citasRes.data ?? []) as unknown as CitaHoy[];
  const cronicos = (cronicosRes.data ?? []) as unknown as Cronico[];

  const totalCitasHoy = citasHoy.length;
  const porAtender = citasHoy.filter(
    (c) => c.estado === "programada" || c.estado === "confirmada"
  ).length;
  const cronicosPorVencer = cronicos.filter(
    (c) => c.proximo_control != null && diasHasta(hoy, c.proximo_control) <= 7
  ).length;
  const facturasPendientes = facturasRes.count ?? 0;

  const metricas = [
    { valor: totalCitasHoy, label: "Citas hoy" },
    { valor: porAtender, label: "Por atender" },
    { valor: cronicosPorVencer, label: "Crónicos ≤ 7 días" },
    { valor: facturasPendientes, label: "Facturas pendientes" },
  ];

  const primerNombre = medico.nombre?.split(" ")[0] ?? medico.nombre;

  return (
    <main className="min-h-screen bg-[#F7F7F4]">
      {mostrarRecordatorioFirma && <RecordatorioFirmaOverlay />}
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* ── Header ── */}
        <Reveal delay={0}>
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className={`${EYEBROW} mb-2`}>Resumen del día</p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#1A1A18]">
                Hola, {primerNombre ?? "doctor"}
              </h1>
              {medico.especialidad && (
                <p className="mt-1.5 text-sm text-[#5C5A54] capitalize">
                  {medico.especialidad}
                </p>
              )}
            </div>
          </header>
        </Reveal>

        {/* ── Aviso de perfil incompleto (discreto) ── */}
        {!medico.registro_acess && (
          <Reveal delay={70}>
            <Link
              href="/perfil"
              className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[#E7D9C4] bg-[#FBF4E9] px-4 py-3 transition-colors hover:bg-[#F7ECD9]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#5A4A33]">
                  Completa tu perfil profesional
                </p>
                <p className="text-xs text-[#8A7A5C] mt-0.5">
                  Agrega tu registro ACESS y SENESCYT para que aparezcan en notas y recetas.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#9A6B12]" strokeWidth={1.75} />
            </Link>
          </Reveal>
        )}

        {/* ── Métricas ── */}
        <Reveal delay={140}>
          <section className="mt-8 rounded-2xl border border-[#E7E3DB] bg-white">
            <div className="grid grid-cols-2 divide-x divide-y divide-[#E7E3DB] md:grid-cols-4 md:divide-y-0">
              {metricas.map((m) => (
                <div key={m.label} className="px-6 py-6">
                  <p className="text-3xl font-semibold tracking-tight text-[#1A1A18] tabular-nums">
                    <CountUp value={m.valor} />
                  </p>
                  <p className={`${EYEBROW} mt-1.5`}>{m.label}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ── Accesos rápidos ── */}
        <Reveal delay={210}>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pacientes"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-medium text-white transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Nueva consulta
            </Link>
            <Link
              href="/agenda"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#E7E3DB] bg-white px-5 text-sm font-medium text-[#5C5A54] transition-colors hover:bg-[#F7F7F4] hover:text-[#1A1A18]"
            >
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              Agenda
            </Link>
            <Link
              href="/pacientes"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#E7E3DB] bg-white px-5 text-sm font-medium text-[#5C5A54] transition-colors hover:bg-[#F7F7F4] hover:text-[#1A1A18]"
            >
              <Stethoscope className="h-4 w-4" strokeWidth={1.75} />
              Pacientes
            </Link>
          </div>
        </Reveal>

        {/* ── Dos columnas: citas de hoy + crónicos ── */}
        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:items-start">
          {/* Citas de hoy */}
          <Reveal delay={280}>
            <section className="rounded-2xl border border-[#E7E3DB] bg-white px-6 py-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <p className={EYEBROW}>Citas de hoy</p>
                <Link
                  href="/agenda"
                  className="inline-flex items-center gap-1 text-sm text-[#0F766E] hover:underline"
                >
                  Ver agenda
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>
              </div>

              {citasHoy.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-base text-[#5C5A54]">No tienes citas hoy.</p>
                  <Link
                    href="/agenda"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[#0F766E]/30 px-4 text-sm font-medium text-[#0F766E] transition-colors hover:bg-[#0F766E]/[0.06]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    Agendar una cita
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[#E7E3DB]">
                  {citasHoy.map((c) => {
                    const badge = ESTADO_BADGE[c.estado] ?? {
                      label: c.estado,
                      cls: "bg-[#8A8780]/[0.12] text-[#5C5A54]",
                    };
                    const nombre =
                      c.pacientes?.nombre ?? c.nombre_paciente ?? "Sin nombre";
                    const fila = (
                      <div className="flex items-center gap-4 py-3.5">
                        <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-[#1A1A18]">
                          {formatHora(c.inicio)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base text-[#1A1A18]">{nombre}</p>
                          {c.motivo && (
                            <p className="truncate text-sm text-[#8A8780]">{c.motivo}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                    return (
                      <li key={c.id}>
                        {c.paciente_id ? (
                          <Link
                            href={`/pacientes/${c.paciente_id}`}
                            className="block -mx-2 rounded-lg px-2 transition-colors hover:bg-[#F7F7F4]"
                          >
                            {fila}
                          </Link>
                        ) : (
                          fila
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </Reveal>

          {/* Crónicos por vencer */}
          <Reveal delay={350} className="mt-6 lg:mt-0">
            <section className="rounded-2xl border border-[#E7E3DB] bg-white px-6 py-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <p className={EYEBROW}>Crónicos por vencer</p>
                <Link
                  href="/seguimiento"
                  className="inline-flex items-center gap-1 text-sm text-[#0F766E] hover:underline"
                >
                  Ver todos
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>
              </div>

              {cronicos.length === 0 ? (
                <p className="py-6 text-sm text-[#8A8780]">
                  Sin controles próximos en los siguientes 14 días.
                </p>
              ) : (
                <ul className="divide-y divide-[#E7E3DB]">
                  {cronicos.map((c) => {
                    const dias =
                      c.proximo_control != null ? diasHasta(hoy, c.proximo_control) : null;
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/pacientes/${c.id}`}
                          className="block -mx-2 rounded-lg px-2 py-3 transition-colors hover:bg-[#F7F7F4]"
                        >
                          <p className="truncate text-base text-[#1A1A18]">{c.nombre}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-sm text-[#8A8780]">
                            {c.condicion_cronica && (
                              <span className="truncate">{c.condicion_cronica}</span>
                            )}
                            {c.proximo_control && (
                              <>
                                <span className="text-[#D8D3C9]">·</span>
                                <span className="shrink-0">
                                  {formatFechaCorta(c.proximo_control)}
                                  {dias != null && (
                                    <span className={dias <= 7 ? "text-[#9A6B12]" : ""}>
                                      {" "}
                                      ({dias === 0 ? "hoy" : `${dias} d`})
                                    </span>
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
