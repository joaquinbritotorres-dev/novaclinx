import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditarPacienteModal from "./EditarPacienteModal";
import ComunicacionesSection from "./ComunicacionesSection";

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

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/pacientes" className="text-sm text-[#0F766E] hover:underline">
            ← Pacientes
          </Link>
        </div>

        {/* Tarjeta del paciente */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-lg font-bold text-[#0F172A] leading-tight">
              {paciente.nombre}
            </h1>
            {paciente.numero_historia && (
              <span className="shrink-0 text-xs font-mono text-[#0F766E] bg-[#F0FDFB] border border-[#99F6E4] rounded px-2 py-0.5">
                {paciente.numero_historia}
              </span>
            )}
          </div>

          {/* Alergias — alerta clínica visible */}
          {paciente.alergias && (
            <div className="mb-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2">
              <p className="text-xs font-semibold text-[#991B1B] uppercase tracking-wide mb-0.5">
                Alergias
              </p>
              <p className="text-sm text-[#7F1D1D]">{paciente.alergias}</p>
            </div>
          )}

          {/* Grid de datos */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {paciente.cedula && (
              <>
                <dt className="text-xs text-[#94A3B8]">Cédula / Pasaporte</dt>
                <dd className="text-[#0F172A] font-medium">{paciente.cedula}</dd>
              </>
            )}

            {fechaNacimientoDisplay && (
              <>
                <dt className="text-xs text-[#94A3B8]">Fecha de nac.</dt>
                <dd className="text-[#0F172A]">{fechaNacimientoDisplay}</dd>
              </>
            )}

            {edadDisplay != null && (
              <>
                <dt className="text-xs text-[#94A3B8]">Edad</dt>
                <dd className="text-[#0F172A]">{edadDisplay} años</dd>
              </>
            )}

            {sexoLabel && (
              <>
                <dt className="text-xs text-[#94A3B8]">Sexo</dt>
                <dd className="text-[#0F172A]">{sexoLabel}</dd>
              </>
            )}

            {seguroLabel && seguroLabel !== "Sin seguro" && (
              <>
                <dt className="text-xs text-[#94A3B8]">Seguro</dt>
                <dd className="text-[#0F172A]">{seguroLabel}</dd>
              </>
            )}

            {paciente.telefono && (
              <>
                <dt className="text-xs text-[#94A3B8]">Teléfono</dt>
                <dd className="text-[#0F172A]">{paciente.telefono}</dd>
              </>
            )}

            {paciente.direccion && (
              <>
                <dt className="text-xs text-[#94A3B8] col-span-1">Dirección</dt>
                <dd className="text-[#0F172A] col-span-1">{paciente.direccion}</dd>
              </>
            )}

            {p.condicion_cronica && (
              <>
                <dt className="text-xs text-[#94A3B8]">Condición crónica</dt>
                <dd className="text-[#0F172A]">{p.condicion_cronica}</dd>
              </>
            )}

            {p.proximo_control && (
              <>
                <dt className="text-xs text-[#94A3B8]">Próximo control</dt>
                <dd className="text-[#0F172A]">
                  {new Date(p.proximo_control + "T00:00:00").toLocaleDateString(
                    "es-EC",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                </dd>
              </>
            )}

            <dt className="text-xs text-[#94A3B8]">Consentimiento LOPDP</dt>
            <dd>
              {p.consentimiento_datos_at ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#065F46] bg-[#D1FAE5] rounded-full px-2 py-0.5">
                  Otorgado {p.consentimiento_datos_version ?? ""} ·{" "}
                  {new Date(p.consentimiento_datos_at).toLocaleDateString("es-EC", {
                    timeZone: "America/Guayaquil",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-[#92400E] bg-[#FEF3C7] rounded-full px-2 py-0.5">
                  No registrado
                </span>
              )}
            </dd>
          </dl>
        </div>

        <Link
          href={`/consultas/nueva?paciente_id=${paciente.id}`}
          className="w-full h-11 mb-3 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0F766E]/90 transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          Nueva consulta
        </Link>

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

        <Link
          href={`/pacientes/${paciente.id}/historia`}
          className="w-full h-11 mt-2 border border-[#0F766E] text-[#0F766E] text-sm font-medium rounded-lg hover:bg-[#F0FDFB] transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          Historia clínica completa
        </Link>

        <div className="mb-6" />

        <h2 className="text-sm font-semibold text-[#374151] mb-3">
          Historial de consultas
        </h2>

        {!consultas || consultas.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
            <p className="text-sm text-[#64748B]">Sin consultas registradas.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {consultas.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/consultas/${c.id}`}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-4 block hover:border-[#0F766E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
                >
                  <p className="text-xs font-medium text-[#0F766E]">
                    {new Date(c.fecha).toLocaleDateString("es-EC", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {c.resumen_corto && (
                    <p className="text-sm text-[#374151] mt-1">{c.resumen_corto}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mb-6" />

        <h2 className="text-sm font-semibold text-[#374151] mb-3">
          Reclamaciones a aseguradoras
        </h2>

        {!reclamaciones || reclamaciones.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
            <p className="text-sm text-[#64748B]">Sin reclamaciones.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reclamaciones.map((r: any) => (
              <li key={r.id}>
                <Link
                  href={`/reclamaciones/${r.id}`}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-4 block hover:border-[#0F766E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#0F172A]">
                      {r.aseguradoras?.nombre ?? "Aseguradora"}
                    </p>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F1F5F9] text-[#475569] uppercase tracking-wide">
                      {r.estado}
                    </span>
                  </div>
                  {r.fecha_atencion && (
                    <p className="text-xs text-[#0F766E] mt-1">
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
            ))}
          </ul>
        )}

        <div className="mb-6" />

        <ComunicacionesSection pacienteId={paciente.id} />
      </div>
    </main>
  );
}
