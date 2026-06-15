import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import FacturacionSection from "./FacturacionSection";
import CrearReclamacionButton from "./CrearReclamacionButton";
import DescargasSection from "./DescargasSection";
import NotaSoap from "./NotaSoap";
import { parseIndicaciones } from "@/lib/recetas/parseIndicaciones";
import BotonWhatsApp from "@/components/BotonWhatsApp";

const SOAP_LABELS: Record<string, string> = {
  S: "Subjetivo",
  O: "Objetivo",
  A: "Análisis",
  P: "Plan",
};

function parseSoapSections(
  notaSoap: string
): { key: string; label: string; content: string }[] {
  // New structured JSON format
  try {
    const parsed = JSON.parse(notaSoap);
    if (parsed && typeof parsed === "object" && "subjetivo" in parsed) {
      return (
        [
          { key: "S", label: "S — Subjetivo", content: String(parsed.subjetivo ?? "") },
          { key: "O", label: "O — Objetivo", content: String(parsed.objetivo ?? "") },
          { key: "A", label: "A — Análisis", content: String(parsed.analisis ?? "") },
          { key: "P", label: "P — Plan", content: String(parsed.plan ?? "") },
        ] as { key: string; label: string; content: string }[]
      ).filter((s) => s.content);
    }
  } catch {
    // fall through to legacy parser
  }

  // Legacy flat string format: "S: ...\nO: ...\nA: ...\nP: ..."
  const parts = notaSoap.split(/\n(?=[SOAP]:)/);
  return parts
    .map((part) => {
      const match = part.match(/^([SOAP]):\s*([\s\S]*)/);
      if (!match) return null;
      const key = match[1];
      return {
        key,
        label: `${key} — ${SOAP_LABELS[key] ?? ""}`,
        content: match[2].trim(),
      };
    })
    .filter((p): p is { key: string; label: string; content: string } => p !== null);
}

function parseJsonArray(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    return null;
  } catch {
    return null;
  }
}

function buildNoteText(notaSoap: string): string {
  try {
    const parsed = JSON.parse(notaSoap);
    if (parsed && typeof parsed === "object" && "subjetivo" in parsed) {
      return [
        `S — SUBJETIVO\n${parsed.subjetivo}`,
        `O — OBJETIVO\n${parsed.objetivo}`,
        `A — ANÁLISIS\n${parsed.analisis}`,
        `P — PLAN\n${parsed.plan}`,
      ]
        .filter((s) => s.split("\n")[1])
        .join("\n\n");
    }
  } catch {
    // fall through
  }
  return notaSoap;
}

// ─── Presentación (solo visual) ──────────────────────────────────────────────

/** Eyebrow de sección del documento ("S — SUBJETIVO"). */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]">
      {children}
    </p>
  );
}

export default async function ConsultaPage({
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
    .select("id, firma_object_key, google_review_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  // Ownership check: query by both consulta id AND medico_id simultaneously
  const { data: consulta } = await supabase
    .from("consultas")
    .select(
      "id, fecha, nota_soap, indicaciones, signos_alarma, cie10_codigo, cie10_descripcion, seguimiento_plazo, seguimiento_motivo, paciente_id, pacientes(id, nombre, cedula, identificacion, tipo_identificacion, telefono)"
    )
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!consulta) notFound();

  const paciente = consulta.pacientes as unknown as {
    id: string;
    nombre: string;
    cedula: string | null;
    identificacion: string | null;
    tipo_identificacion: string | null;
    telefono: string | null;
  } | null;

  const { data: factura } = await supabase
    .from("facturas")
    .select("id, estado, datil_id, clave_acceso, error_mensaje")
    .eq("consulta_id", consulta.id)
    .maybeSingle();

  const { data: segurosPaciente } = await supabase
    .from("paciente_seguros")
    .select("id, tipo_cobertura, aseguradoras(nombre)")
    .eq("paciente_id", paciente?.id ?? "")
    .is("deleted_at", null);

  const secciones = parseSoapSections(consulta.nota_soap ?? "");
  const indicacionesParsed = parseIndicaciones(consulta.indicaciones);
  const signosAlarma = parseJsonArray(consulta.signos_alarma);
  const tieneSeguimiento = typeof consulta.seguimiento_plazo === "string";
  const textoCopia = buildNoteText(consulta.nota_soap ?? "");

  // Nombres de medicamentos para la banda de resumen (solo formato estructurado).
  const medsNombres =
    indicacionesParsed?.tipo === "estructurado"
      ? indicacionesParsed.medicamentos.map(
          (m) => m.dci.charAt(0).toUpperCase() + m.dci.slice(1)
        )
      : [];

  const fechaLarga = new Date(consulta.fecha).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#F7F7F4]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Volver */}
        <Link
          href={paciente ? `/pacientes/${paciente.id}` : "/pacientes"}
          className="inline-flex items-center gap-1.5 text-sm text-[#5C5A54] hover:text-[#1A1A18] transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {paciente?.nombre ?? "Pacientes"}
        </Link>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-10 lg:items-start">
          {/* ── Documento clínico ── */}
          <article className="rounded-2xl bg-white border border-[#E7E3DB] px-7 py-9 md:px-10 md:py-11">
            {/* Cabecera del documento */}
            <header>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780] mb-3">
                Nota clínica
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#1A1A18]">
                {paciente?.nombre ?? "Consulta"}
              </h1>
              <p className="mt-2 text-sm text-[#5C5A54] first-letter:uppercase">
                {fechaLarga}
              </p>

              {/* Banda de resumen escaneable — diagnóstico · medicamentos · alarma */}
              {(consulta.cie10_codigo || medsNombres.length > 0 || signosAlarma) && (
                <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#E7E3DB] pt-5">
                  {consulta.cie10_codigo && (
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8A8780] shrink-0">
                        Diagnóstico
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#0F766E] shrink-0">
                        {consulta.cie10_codigo}
                      </span>
                      {consulta.cie10_descripcion && (
                        <span className="truncate text-sm text-[#1A1A18]">
                          {consulta.cie10_descripcion}
                        </span>
                      )}
                    </div>
                  )}
                  {medsNombres.length > 0 && (
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8A8780] shrink-0">
                        Medicamentos
                      </span>
                      <span className="text-sm text-[#1A1A18]">
                        {medsNombres.join(" · ")}
                      </span>
                    </div>
                  )}
                  {signosAlarma && (
                    <span className="inline-flex items-center gap-1.5 text-[#9A6B12]">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="text-[11px] font-medium uppercase tracking-[0.1em]">
                        Signos de alarma
                      </span>
                    </span>
                  )}
                </div>
              )}
            </header>

            {/* Nota SOAP — acordeón por sección (S/O colapsadas, A/P abiertas) */}
            <div className="mt-8">
              <NotaSoap secciones={secciones} />
            </div>

            {/* Indicaciones */}
            {indicacionesParsed && (
              <section className="border-t border-[#E7E3DB] pt-7 mt-10">
                <div className="mb-4">
                  <Eyebrow>
                    {indicacionesParsed.tipo === "estructurado"
                      ? "Medicamentos prescritos"
                      : "Indicaciones al paciente"}
                  </Eyebrow>
                </div>
                {indicacionesParsed.tipo === "estructurado" ? (
                  <ul className="divide-y divide-[#E7E3DB]">
                    {indicacionesParsed.medicamentos.map((m, idx) => (
                      <li key={idx} className="py-3 first:pt-0">
                        <p className="text-base leading-6 text-[#1A1A18]">
                          <span className="font-medium capitalize">{m.dci}</span>
                          {m.nombreComercial ? ` (${m.nombreComercial})` : ""}{" "}
                          {m.formaFarmaceutica} {m.concentracion}
                        </p>
                        <p className="mt-0.5 text-sm text-[#5C5A54]">
                          {m.dosis} · {m.frecuencia} · {m.duracionDias} días
                        </p>
                        {m.cantidadTexto && (
                          <p className="mt-1 text-sm font-medium text-[#0F766E]">
                            Cantidad: {m.cantidadTexto}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2.5 max-w-[68ch]">
                    {indicacionesParsed.indicaciones.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-base leading-7 text-[#1A1A18]"
                      >
                        <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F766E]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Signos de alarma — bloque contenido, tono clínico cálido */}
            {signosAlarma && (
              <section className="mt-10 rounded-xl border border-[#E7D9C4] bg-[#FBF4E9] px-5 py-5">
                <Eyebrow>Signos de alarma</Eyebrow>
                <ul className="mt-3.5 space-y-2 max-w-[68ch]">
                  {signosAlarma.map((signo, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-base leading-7 text-[#5A4A33]"
                    >
                      <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#B45309]" />
                      <span>{signo}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Seguimiento */}
            {tieneSeguimiento && (
              <section className="border-t border-[#E7E3DB] pt-7 mt-10">
                <Eyebrow>Próximo control</Eyebrow>
                <p className="mt-3 text-base leading-7 font-medium text-[#1A1A18]">
                  {consulta.seguimiento_plazo}
                </p>
                {consulta.seguimiento_motivo && (
                  <p className="mt-1 text-base leading-7 text-[#5C5A54] max-w-[68ch]">
                    {consulta.seguimiento_motivo}
                  </p>
                )}
              </section>
            )}

            {/* Disclaimer */}
            <p className="mt-10 border-t border-[#E7E3DB] pt-6 text-xs leading-5 text-[#A8A49C]">
              Novaclinx genera borradores. La nota oficial y el criterio clínico son tuyos.
            </p>
          </article>

          {/* ── Panel de acciones operativas ── */}
          <aside className="mt-8 lg:mt-0 lg:sticky lg:top-8 space-y-6">
            <FacturacionSection
              consultaId={consulta.id}
              facturaExistente={factura}
              tieneIdentificacion={Boolean(paciente?.cedula || paciente?.identificacion)}
            />

            {segurosPaciente && segurosPaciente.length > 0 && (
              <CrearReclamacionButton consultaId={consulta.id} seguros={segurosPaciente as never} />
            )}

            {medico.google_review_url && paciente && (
              <section className="rounded-xl border border-[#E7E3DB] bg-white p-5">
                <Eyebrow>Reputación</Eyebrow>
                <p className="mt-3 mb-4 text-sm leading-6 text-[#5C5A54]">
                  ¿Consulta exitosa? Pide una reseña a tu paciente.
                </p>
                <BotonWhatsApp
                  telefono={paciente.telefono}
                  texto={`Hola ${paciente.nombre}, gracias por su visita. Si quedó conforme con la atención, ¿me ayudaría dejando una reseña? Solo toma un minuto: ${medico.google_review_url}`}
                  tipo="resena"
                  paciente_id={paciente.id}
                  label="Pedir reseña"
                />
              </section>
            )}

            <DescargasSection
              consultaId={consulta.id}
              tieneFirma={Boolean(medico.firma_object_key)}
              tieneIndicaciones={Boolean(indicacionesParsed)}
              tieneDiagnostico={Boolean(consulta.cie10_codigo)}
              textoCopia={textoCopia}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
