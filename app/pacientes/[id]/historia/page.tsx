import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseIndicaciones } from "@/lib/recetas/parseIndicaciones";
import ImprimirButton from "./ImprimirButton";
import ConsultaColapsable from "./ConsultaColapsable";

const SEXO_LABELS: Record<string, string> = { M: "Masculino", F: "Femenino", O: "Otro" };
const EYEBROW = "text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]";

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

/** Atenúa [NO REGISTRADO]/[VERIFICAR …] dentro del texto corrido del SOAP. */
function conAtenuados(texto: string, keyBase: string) {
  const partes = texto.split(/(\[NO REGISTRADO\]|\[VERIFICAR[^\]]*\])/g);
  return partes.map((p, i) =>
    /^\[(NO REGISTRADO|VERIFICAR)/.test(p) ? (
      <span key={`${keyBase}-${i}`} className="text-[#A8A49C]">
        {p}
      </span>
    ) : (
      <span key={`${keyBase}-${i}`}>{p}</span>
    )
  );
}

/** Resumen de una línea para la cabecera colapsada de la consulta. */
function resumenConsulta(secciones: SeccionSoap[]): string | null {
  const primera = secciones[0]?.content?.split(/\n+/).map((l) => l.trim()).find(Boolean);
  if (!primera) return null;
  return primera.length > 110 ? primera.slice(0, 110) + "…" : primera;
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

  // Más reciente primero para la línea de tiempo (solo presentación).
  const consultasDesc = [...(consultas ?? [])].reverse();

  const consentimientoTexto = paciente.consentimiento_datos_at
    ? `Otorgado el ${formatFecha(paciente.consentimiento_datos_at)} (versión ${paciente.consentimiento_datos_version ?? "—"})`
    : "No registrado";

  const sexoLabel = paciente.sexo ? (SEXO_LABELS[paciente.sexo] ?? paciente.sexo) : null;

  return (
    <main className="min-h-screen bg-[#F7F7F4] print:bg-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 print:px-0 print:py-0">
        {/* Barra de acciones — no se imprime */}
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link
            href={`/pacientes/${paciente.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#5C5A54] transition-colors hover:text-[#1A1A18]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Volver al paciente
          </Link>
          <ImprimirButton />
        </div>

        {/* Documento */}
        <article className="rounded-2xl border border-[#E7E3DB] bg-white px-8 py-9 print:rounded-none print:border-0 print:px-0 print:py-0">
          {/* Encabezado del documento (legal) */}
          <header className="border-b border-[#E7E3DB] pb-6">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className={`${EYEBROW} mb-2`}>Historia clínica</p>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A18]">
                  {paciente.nombre}
                </h1>
                {paciente.numero_historia && (
                  <p className="mt-1 font-mono text-sm text-[#8A8780]">
                    {paciente.numero_historia}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right text-sm text-[#5C5A54]">
                <p className="font-medium text-[#1A1A18]">{medico.nombre}</p>
                {medico.registro_acess && (
                  <p className="text-xs">Registro ACESS: {medico.registro_acess}</p>
                )}
                <p className="mt-1 text-xs text-[#A8A49C]">
                  Generado el {formatFecha(new Date().toISOString())}
                </p>
              </div>
            </div>
          </header>

          {/* Ficha del paciente */}
          <section className="border-b border-[#E7E3DB] py-6">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {paciente.identificacion && (
                <Dato label="Identificación" valor={paciente.identificacion} />
              )}
              {paciente.edad != null && <Dato label="Edad" valor={`${paciente.edad} años`} />}
              {sexoLabel && <Dato label="Sexo" valor={sexoLabel} />}
              {paciente.telefono && <Dato label="Teléfono" valor={paciente.telefono} />}
              <Dato label="Paciente desde" valor={formatFecha(paciente.created_at)} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-7 gap-y-2.5 border-t border-[#E7E3DB] pt-4 sm:grid-cols-3">
              {paciente.fecha_nacimiento && (
                <DatoGrid
                  label="Fecha de nacimiento"
                  valor={formatFecha(paciente.fecha_nacimiento + "T12:00:00")}
                />
              )}
              {paciente.direccion && <DatoGrid label="Dirección" valor={paciente.direccion} />}
              {paciente.email && <DatoGrid label="Correo" valor={paciente.email} />}
              {paciente.condicion_cronica && (
                <DatoGrid label="Condición crónica" valor={paciente.condicion_cronica} />
              )}
              <DatoGrid label="Consentimiento LOPDP" valor={consentimientoTexto} />
            </dl>

            {/* Alergias — sobrio */}
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
          </section>

          {/* Línea de tiempo de consultas */}
          <section className="pt-6">
            <p className={`${EYEBROW} mb-1`}>
              Consultas ({consultasDesc.length})
            </p>

            {consultasDesc.length === 0 ? (
              <p className="mt-4 text-sm text-[#8A8780]">
                Sin consultas aprobadas registradas.
              </p>
            ) : (
              <div>
                {consultasDesc.map((c) => {
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
                    <ConsultaColapsable
                      key={c.id}
                      fecha={formatFecha(c.fecha)}
                      cie10Codigo={c.cie10_codigo ?? null}
                      cie10Descripcion={c.cie10_descripcion ?? null}
                      resumen={resumenConsulta(secciones)}
                    >
                      <div className="space-y-5">
                        {secciones.map((s) => (
                          <div key={s.label}>
                            <p className={EYEBROW}>{s.label}</p>
                            <p className="mt-1.5 max-w-[68ch] whitespace-pre-wrap text-base leading-7 text-[#1A1A18]">
                              {conAtenuados(s.content, `${c.id}-${s.label}`)}
                            </p>
                          </div>
                        ))}

                        {indicaciones && (
                          <div>
                            <p className={EYEBROW}>
                              {indicaciones.tipo === "estructurado"
                                ? "Medicamentos prescritos"
                                : "Indicaciones"}
                            </p>
                            <ul className="mt-2 max-w-[68ch] space-y-1.5">
                              {indicaciones.tipo === "estructurado"
                                ? indicaciones.medicamentos.map((m, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-3 text-base leading-7 text-[#1A1A18]"
                                    >
                                      <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F766E]" />
                                      <span>
                                        <span className="capitalize">{m.dci}</span>
                                        {m.nombreComercial ? ` (${m.nombreComercial})` : ""}{" "}
                                        {m.formaFarmaceutica} {m.concentracion} — {m.dosis} ·{" "}
                                        {m.frecuencia} · {m.duracionDias} días
                                      </span>
                                    </li>
                                  ))
                                : indicaciones.indicaciones.map((item, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-3 text-base leading-7 text-[#1A1A18]"
                                    >
                                      <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F766E]" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                            </ul>
                          </div>
                        )}

                        {signos && (
                          <div>
                            <p className={EYEBROW}>Signos de alarma</p>
                            <ul className="mt-2 max-w-[68ch] space-y-1.5">
                              {signos.map((s, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-3 text-base leading-7 text-[#5A4A33]"
                                >
                                  <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#B45309]" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {c.seguimiento_plazo && (
                          <div>
                            <p className={EYEBROW}>Próximo control</p>
                            <p className="mt-1.5 max-w-[68ch] text-base leading-7 text-[#1A1A18]">
                              {c.seguimiento_plazo}
                              {c.seguimiento_motivo ? ` — ${c.seguimiento_motivo}` : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </ConsultaColapsable>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="mt-8 border-t border-[#E7E3DB] pt-5 text-xs leading-5 text-[#A8A49C]">
            Documento generado con Novaclinx para fines de registro clínico e inspección.
            Conservación de datos conforme a la LOPDP del Ecuador.
          </footer>
        </article>
      </div>
    </main>
  );
}
