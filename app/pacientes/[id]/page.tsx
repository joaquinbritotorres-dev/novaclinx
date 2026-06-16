import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditarPacienteModal from "./EditarPacienteModal";
import ComunicacionesSection from "./ComunicacionesSection";
import PacienteTabs from "./PacienteTabs";
import Reveal from "./Reveal";

const EYEBROW = "text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]";

const RECLAMACION_BADGE: Record<string, string> = {
  borrador: "bg-[#8A8780]/[0.14] text-[#5C5A54]",
  enviada: "bg-[#0F766E]/[0.08] text-[#0F766E]",
  pagada: "bg-[#3F7A5E]/[0.12] text-[#3F7A5E]",
  glosada: "bg-[#9A6B12]/[0.12] text-[#9A6B12]",
  rechazada: "bg-[#B91C1C]/[0.08] text-[#B91C1C]",
};

const SEGURO_LABELS: Record<string, string> = {
  ninguno: "Sin seguro",
  iess: "IESS",
  issfa: "ISSFA",
  privado: "Privado",
};

function calcularEdad(fechaStr: string): number {
  const hoy = new Date();
  const nac = new Date(fechaStr + "T00:00:00");
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return Math.max(0, edad);
}

export default async function PacientePerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  // Verify ownership before reading any patient data. Las tres consultas son
  // independientes (dependen solo de id + medico.id) y la RLS protege cada
  // tabla, así que van en paralelo en vez de en cascada (evita el waterfall).
  const [
    { data: paciente },
    { data: consultas },
    { data: reclamaciones },
  ] = await Promise.all([
    supabase
      .from("pacientes")
      .select(
        "id, nombre, edad, sexo, cedula, fecha_nacimiento, direccion, telefono, tipo_seguro, alergias, numero_historia, identificacion, tipo_identificacion, email, condicion_cronica, proximo_control, consentimiento_datos_at, consentimiento_datos_version"
      )
      .eq("id", id)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("consultas")
      .select("id, fecha, resumen_corto")
      .eq("paciente_id", id)
      .eq("aprobada_por_medico", true)
      .order("fecha", { ascending: false }),
    supabase
      .from("reclamaciones")
      .select("id, estado, fecha_atencion, aseguradoras ( nombre )")
      .eq("paciente_id", id)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (!paciente) notFound();

  type PacienteRow = typeof paciente & {
    identificacion: string | null;
    tipo_identificacion: string | null;
    email: string | null;
    condicion_cronica: string | null;
    proximo_control: string | null;
    consentimiento_datos_at: string | null;
    consentimiento_datos_version: string | null;
  };
  const p = paciente as PacienteRow;

  const sexoLabel =
    paciente.sexo === "M"
      ? "Masculino"
      : paciente.sexo === "F"
        ? "Femenino"
        : paciente.sexo === "O"
          ? "Otro"
          : null;

  const edadDisplay =
    paciente.fecha_nacimiento != null
      ? calcularEdad(paciente.fecha_nacimiento)
      : paciente.edad;

  const fechaNacimientoDisplay =
    paciente.fecha_nacimiento != null
      ? new Date(paciente.fecha_nacimiento + "T00:00:00").toLocaleDateString(
          "es-EC",
          { day: "numeric", month: "long", year: "numeric" }
        )
      : null;

  const seguroLabel =
    paciente.tipo_seguro != null
      ? (SEGURO_LABELS[paciente.tipo_seguro] ?? paciente.tipo_seguro)
      : null;

  const consentimientoLabel = p.consentimiento_datos_at
    ? `Otorgado · ${new Date(p.consentimiento_datos_at).toLocaleDateString("es-EC", {
        timeZone: "America/Guayaquil",
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    : null;

  // ── Contenido de tabs (server-renderizado, pasado como nodes) ──
  const historial =
    !consultas || consultas.length === 0 ? (
      <p className="text-sm text-[#8A8780]">Sin consultas registradas.</p>
    ) : (
      <ul className="divide-y divide-[#E7E3DB]">
        {consultas.map((c) => (
          <li key={c.id}>
            <Link
              href={`/consultas/${c.id}`}
              className="block -mx-2 rounded-lg px-2 py-3.5 transition-colors hover:bg-[#F7F7F4]"
            >
              <p className="text-xs font-medium text-[#0F766E]">
                {new Date(c.fecha).toLocaleDateString("es-EC", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {c.resumen_corto && (
                <p className="mt-1 text-base leading-6 text-[#1A1A18]">{c.resumen_corto}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    );

  const reclamacionesNode =
    !reclamaciones || reclamaciones.length === 0 ? (
      <p className="text-sm text-[#8A8780]">Sin reclamaciones a aseguradoras.</p>
    ) : (
      <ul className="divide-y divide-[#E7E3DB]">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {reclamaciones.map((r: any) => {
          const estado = String(r.estado ?? "").toLowerCase();
          const badge = RECLAMACION_BADGE[estado] ?? "bg-[#8A8780]/[0.14] text-[#5C5A54]";
          return (
            <li key={r.id}>
              <Link
                href={`/reclamaciones/${r.id}`}
                className="block -mx-2 rounded-lg px-2 py-3.5 transition-colors hover:bg-[#F7F7F4]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base text-[#1A1A18]">
                    {r.aseguradoras?.nombre ?? "Aseguradora"}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${badge}`}
                  >
                    {r.estado}
                  </span>
                </div>
                {r.fecha_atencion && (
                  <p className="mt-0.5 text-sm text-[#8A8780]">
                    {new Date(r.fecha_atencion).toLocaleDateString("es-EC", {
                      timeZone: "UTC",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );

  return (
    <main className="min-h-screen bg-[#F7F7F4]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <Link
          href="/pacientes"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#5C5A54] transition-colors hover:text-[#1A1A18]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Pacientes
        </Link>

        {/* ── Cabecera de identidad ── */}
        <Reveal delay={0}>
          <header>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#1A1A18]">
                {paciente.nombre}
              </h1>
              {paciente.numero_historia && (
                <span className="font-mono text-sm text-[#8A8780]">
                  {paciente.numero_historia}
                </span>
              )}
            </div>

            {/* Ficha primaria escaneable */}
            <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#E7E3DB] pt-5">
              {edadDisplay != null && (
                <Dato label="Edad" valor={`${edadDisplay} años`} />
              )}
              {sexoLabel && <Dato label="Sexo" valor={sexoLabel} />}
              {seguroLabel && <Dato label="Seguro" valor={seguroLabel} />}
              {paciente.telefono && <Dato label="Teléfono" valor={paciente.telefono} />}
            </div>

            {/* Datos secundarios */}
            <dl className="mt-4 grid grid-cols-2 gap-x-7 gap-y-2.5 border-t border-[#E7E3DB] pt-4 sm:grid-cols-3">
              {paciente.cedula && <DatoGrid label="Cédula / Pasaporte" valor={paciente.cedula} />}
              {fechaNacimientoDisplay && (
                <DatoGrid label="Fecha de nacimiento" valor={fechaNacimientoDisplay} />
              )}
              {paciente.direccion && <DatoGrid label="Dirección" valor={paciente.direccion} />}
              {p.condicion_cronica && (
                <DatoGrid label="Condición crónica" valor={p.condicion_cronica} />
              )}
              {p.proximo_control && (
                <DatoGrid
                  label="Próximo control"
                  valor={new Date(p.proximo_control + "T00:00:00").toLocaleDateString("es-EC", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
              )}
              <div>
                <dt className={EYEBROW}>Consentimiento LOPDP</dt>
                <dd
                  className={`mt-1 text-sm ${
                    consentimientoLabel ? "text-[#3F7A5E]" : "text-[#A8A49C]"
                  }`}
                >
                  {consentimientoLabel ?? "No registrado"}
                </dd>
              </div>
            </dl>

            {/* Alergias — sobrio, sin caja roja */}
            <div className="mt-4 border-t border-[#E7E3DB] pt-4">
              <p className={EYEBROW}>Alergias</p>
              {paciente.alergias ? (
                <p className="mt-1 flex items-center gap-2 text-base text-[#1A1A18]">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#9A6B12]" strokeWidth={1.75} />
                  {paciente.alergias}
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#A8A49C]">Sin alergias registradas.</p>
              )}
            </div>
          </header>
        </Reveal>

        {/* ── Acciones ── */}
        <Reveal delay={70}>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/consultas/nueva?paciente_id=${paciente.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-medium text-white transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Nueva consulta
            </Link>
            <Link
              href={`/pacientes/${paciente.id}/historia`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E7E3DB] px-4 text-sm font-medium text-[#5C5A54] transition-colors hover:bg-[#F7F7F4] hover:text-[#1A1A18]"
            >
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              Historia clínica
            </Link>
            <div className="flex-1" />
            <EditarPacienteModal
              paciente={{
                id: p.id,
                nombre: p.nombre,
                edad: p.edad ?? null,
                sexo: p.sexo ?? null,
                cedula: p.cedula ?? null,
                fecha_nacimiento: p.fecha_nacimiento ?? null,
                direccion: p.direccion ?? null,
                telefono: p.telefono ?? null,
                tipo_seguro: p.tipo_seguro ?? null,
                alergias: p.alergias ?? null,
                identificacion: p.identificacion,
                tipo_identificacion: p.tipo_identificacion,
                email: p.email,
                condicion_cronica: p.condicion_cronica,
                proximo_control: p.proximo_control,
                consentimiento_datos_at: p.consentimiento_datos_at,
              }}
            />
          </div>
        </Reveal>

        {/* ── Tabs ── */}
        <Reveal delay={140} className="mt-9">
          <PacienteTabs
            historial={historial}
            reclamaciones={reclamacionesNode}
            comunicaciones={<ComunicacionesSection pacienteId={paciente.id} />}
          />
        </Reveal>
      </div>
    </main>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8A8780]">
        {label}
      </span>
      <span className="text-sm text-[#1A1A18]">{valor}</span>
    </div>
  );
}

function DatoGrid({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8A8780]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#1A1A18]">{valor}</dd>
    </div>
  );
}
