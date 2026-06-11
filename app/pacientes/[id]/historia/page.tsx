import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseIndicaciones } from "@/lib/recetas/parseIndicaciones";
import ImprimirButton from "./ImprimirButton";

const SEXO_LABELS: Record<string, string> = { M: "Masculino", F: "Femenino", O: "Otro" };

interface SeccionSoap {
  label: string;
  content: string;
}

// Soporta el formato JSON estructurado y el legado "S: ...\nO: ..."
function parseSoap(notaSoap: string | null): SeccionSoap[] {
  if (!notaSoap) return [];
  try {
    const parsed = JSON.parse(notaSoap);
    if (parsed && typeof parsed === "object" && "subjetivo" in parsed) {
      return [
        { label: "S — Subjetivo", content: String(parsed.subjetivo ?? "") },
        { label: "O — Objetivo", content: String(parsed.objetivo ?? "") },
        { label: "A — Análisis", content: String(parsed.analisis ?? "") },
        { label: "P — Plan", content: String(parsed.plan ?? "") },
      ].filter((s) => s.content);
    }
  } catch {
    // formato legado
  }
  const labels: Record<string, string> = {
    S: "S — Subjetivo",
    O: "O — Objetivo",
    A: "A — Análisis",
    P: "P — Plan",
  };
  return notaSoap
    .split(/\n(?=[SOAP]:)/)
    .map((part) => {
      const match = part.match(/^([SOAP]):\s*([\s\S]*)/);
      if (!match) return null;
      return { label: labels[match[1]], content: match[2].trim() };
    })
    .filter((s): s is SeccionSoap => s !== null);
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HistoriaClinicaPage({
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
    .select("id, nombre, especialidad, registro_acess")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  const { data: paciente } = await supabase
    .from("pacientes")
    .select(
      "id, nombre, edad, sexo, fecha_nacimiento, identificacion, direccion, telefono, email, alergias, condicion_cronica, proximo_control, numero_historia, consentimiento_datos_at, consentimiento_datos_version, created_at"
    )
    .eq("id", id)
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!paciente) notFound();

  const { data: consultas } = await supabase
    .from("consultas")
    .select(
      "id, fecha, nota_soap, indicaciones, signos_alarma, cie10_codigo, cie10_descripcion, seguimiento_plazo, seguimiento_motivo"
    )
    .eq("paciente_id", id)
    .eq("medico_id", medico.id)
    .eq("aprobada_por_medico", true)
    .order("fecha", { ascending: true });

  const datos: { label: string; value: string | null }[] = [
    { label: "N.° de historia", value: paciente.numero_historia ?? null },
    { label: "Identificación", value: paciente.identificacion ?? null },
    {
      label: "Fecha de nacimiento",
      value: paciente.fecha_nacimiento ? formatFecha(paciente.fecha_nacimiento + "T12:00:00") : null,
    },
    { label: "Edad", value: paciente.edad != null ? `${paciente.edad} años` : null },
    { label: "Sexo", value: paciente.sexo ? (SEXO_LABELS[paciente.sexo] ?? paciente.sexo) : null },
    { label: "Teléfono", value: paciente.telefono ?? null },
    { label: "Correo", value: paciente.email ?? null },
    { label: "Dirección", value: paciente.direccion ?? null },
    { label: "Condición crónica", value: paciente.condicion_cronica ?? null },
    { label: "Paciente desde", value: formatFecha(paciente.created_at) },
  ];

  return (
    <main className="min-h-screen bg-white px-8 py-8 print:px-0 print:py-0">
      <div className="w-full max-w-4xl mx-auto">
        {/* Barra de acciones — no se imprime */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link
            href={`/pacientes/${paciente.id}`}
            className="text-sm text-[#0F766E] hover:underline"
          >
            ← Volver al paciente
          </Link>
          <ImprimirButton />
        </div>

        {/* Encabezado del documento */}
        <header className="border-b-2 border-[#0F766E] pb-4 mb-6">
          <h1 className="text-2xl font-bold text-[#0F172A]">Historia clínica</h1>
          <div className="flex items-start justify-between gap-4 mt-2">
            <div>
              <p className="text-lg font-semibold text-[#0F172A]">{paciente.nombre}</p>
              {paciente.numero_historia && (
                <p className="text-sm text-[#64748B] font-mono">{paciente.numero_historia}</p>
              )}
            </div>
            <div className="text-right text-sm text-[#475569]">
              <p className="font-medium">{medico.nombre}</p>
              {medico.registro_acess && <p>Registro ACESS: {medico.registro_acess}</p>}
              <p className="text-xs text-[#94A3B8] mt-1">
                Generado el {formatFecha(new Date().toISOString())}
              </p>
            </div>
          </div>
        </header>

        {/* Alergias destacadas */}
        {paciente.alergias && (
          <div className="border-2 border-[#DC2626] rounded-lg px-4 py-3 mb-6">
            <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wide">Alergias</p>
            <p className="text-sm text-[#0F172A] mt-1">{paciente.alergias}</p>
          </div>
        )}

        {/* Datos del paciente */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-[#0F766E] uppercase tracking-wide border-b border-[#E5E7EB] pb-1 mb-3">
            Datos del paciente
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {datos
              .filter((d) => d.value)
              .map((d) => (
                <div key={d.label} className="flex gap-2">
                  <dt className="text-[#64748B] shrink-0">{d.label}:</dt>
                  <dd className="text-[#0F172A] font-medium">{d.value}</dd>
                </div>
              ))}
            <div className="flex gap-2 col-span-2">
              <dt className="text-[#64748B] shrink-0">Consentimiento de datos (LOPDP):</dt>
              <dd className="text-[#0F172A] font-medium">
                {paciente.consentimiento_datos_at
                  ? `Otorgado el ${formatFecha(paciente.consentimiento_datos_at)} (versión ${paciente.consentimiento_datos_version ?? "—"})`
                  : "No registrado"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Consultas */}
        <section>
          <h2 className="text-sm font-bold text-[#0F766E] uppercase tracking-wide border-b border-[#E5E7EB] pb-1 mb-4">
            Consultas ({consultas?.length ?? 0})
          </h2>

          {!consultas || consultas.length === 0 ? (
            <p className="text-sm text-[#64748B]">Sin consultas aprobadas registradas.</p>
          ) : (
            <div className="space-y-6">
              {consultas.map((c) => {
                const secciones = parseSoap(c.nota_soap);
                const indicaciones = parseIndicaciones(c.indicaciones);
                let signos: string[] | null = null;
                if (c.signos_alarma) {
                  try {
                    const arr = JSON.parse(c.signos_alarma);
                    if (Array.isArray(arr) && arr.length > 0) signos = arr as string[];
                  } catch {
                    // sin signos válidos
                  }
                }

                return (
                  <article
                    key={c.id}
                    className="border border-[#E5E7EB] rounded-lg p-4 break-inside-avoid"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3 border-b border-[#F1F5F9] pb-2">
                      <p className="text-sm font-bold text-[#0F172A]">
                        {formatFecha(c.fecha)}
                      </p>
                      {c.cie10_codigo && (
                        <p className="text-xs text-[#0F766E] font-mono">
                          {c.cie10_codigo}
                          {c.cie10_descripcion ? ` — ${c.cie10_descripcion}` : ""}
                        </p>
                      )}
                    </div>

                    {secciones.map((s) => (
                      <div key={s.label} className="mb-2">
                        <p className="text-xs font-bold text-[#475569] uppercase">{s.label}</p>
                        <p className="text-sm text-[#0F172A] whitespace-pre-wrap">{s.content}</p>
                      </div>
                    ))}

                    {indicaciones && (
                      <div className="mb-2">
                        <p className="text-xs font-bold text-[#475569] uppercase">
                          {indicaciones.tipo === "estructurado"
                            ? "Medicamentos prescritos"
                            : "Indicaciones"}
                        </p>
                        <ul className="text-sm text-[#0F172A] list-disc pl-5">
                          {indicaciones.tipo === "estructurado"
                            ? indicaciones.medicamentos.map((m, i) => (
                                <li key={i}>
                                  <span className="capitalize">{m.dci}</span>
                                  {m.nombreComercial ? ` (${m.nombreComercial})` : ""}{" "}
                                  {m.formaFarmaceutica} {m.concentracion} — {m.dosis} ·{" "}
                                  {m.frecuencia} · {m.duracionDias} días
                                </li>
                              ))
                            : indicaciones.indicaciones.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                        </ul>
                      </div>
                    )}

                    {signos && (
                      <div className="mb-2">
                        <p className="text-xs font-bold text-[#475569] uppercase">
                          Signos de alarma
                        </p>
                        <ul className="text-sm text-[#0F172A] list-disc pl-5">
                          {signos.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.seguimiento_plazo && (
                      <p className="text-sm text-[#0F172A]">
                        <span className="text-xs font-bold text-[#475569] uppercase">
                          Próximo control:{" "}
                        </span>
                        {c.seguimiento_plazo}
                        {c.seguimiento_motivo ? ` — ${c.seguimiento_motivo}` : ""}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-8 pt-4 border-t border-[#E5E7EB] text-xs text-[#94A3B8]">
          Documento generado con Novaclinx para fines de registro clínico e inspección.
          Conservación de datos conforme a la LOPDP del Ecuador.
        </footer>
      </div>
    </main>
  );
}
