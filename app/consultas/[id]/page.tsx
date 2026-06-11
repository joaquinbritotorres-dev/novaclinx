import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import FacturacionSection from "./FacturacionSection";
import CrearReclamacionButton from "./CrearReclamacionButton";
import DescargasSection from "./DescargasSection";
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

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-8">
      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <Link
            href={paciente ? `/pacientes/${paciente.id}` : "/pacientes"}
            className="text-sm text-[#0F766E] hover:underline"
          >
            ← {paciente?.nombre ?? "Pacientes"}
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#0F172A]">
            {paciente?.nombre ?? "Consulta"}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {new Date(consulta.fecha).toLocaleDateString("es-EC", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* CIE-10 — solo si existe */}
        {consulta.cie10_codigo && (
          <div className="bg-[#F0FDFB] border border-[#99F6E4] rounded-lg px-4 py-2.5 mb-5 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-[#0F766E]">
              {consulta.cie10_codigo}
            </span>
            {consulta.cie10_descripcion && (
              <span className="text-sm text-[#134E4A]">
                {consulta.cie10_descripcion}
              </span>
            )}
          </div>
        )}

        {/* Nota SOAP por secciones */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-5 space-y-5">
          {secciones.length > 0 ? (
            secciones.map((sec) => (
              <div key={sec.key}>
                <p className="text-xs font-bold text-[#0F766E] uppercase tracking-wide mb-1">
                  {sec.label}
                </p>
                <p className="text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed">
                  {sec.content}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#64748B]">Nota no disponible.</p>
          )}
        </div>

        {/* Indicaciones — solo si existen */}
        {indicacionesParsed && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-5">
            <p className="text-xs font-bold text-[#0F766E] uppercase tracking-wide mb-3">
              {indicacionesParsed.tipo === "estructurado" ? "Medicamentos prescritos" : "Indicaciones al paciente"}
            </p>
            <ul className="space-y-2">
              {indicacionesParsed.tipo === "estructurado"
                ? indicacionesParsed.medicamentos.map((m, idx) => (
                    <li key={idx} className="text-sm text-[#0F172A]">
                      <span className="font-medium capitalize">{m.dci}</span>
                      {m.nombreComercial ? ` (${m.nombreComercial})` : ""}
                      {" "}{m.formaFarmaceutica} {m.concentracion}
                      <span className="text-[#64748B]">
                        {" — "}{m.dosis} · {m.frecuencia} · {m.duracionDias} días
                      </span>
                      {m.cantidadTexto && (
                        <span className="block text-xs text-[#0F766E] font-medium mt-0.5">
                          Cantidad: {m.cantidadTexto}
                        </span>
                      )}
                    </li>
                  ))
                : indicacionesParsed.indicaciones.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#0F172A]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0F766E] shrink-0" />
                      {item}
                    </li>
                  ))
              }
            </ul>
          </div>
        )}

        {/* Signos de alarma — solo si existen */}
        {signosAlarma && (
          <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-5 mb-4">
            <p className="text-xs font-bold text-[#C2410C] uppercase tracking-wide mb-3">
              Signos de alarma
            </p>
            <ul className="space-y-1.5">
              {signosAlarma.map((signo, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-[#7C2D12]"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#EA580C] shrink-0" />
                  {signo}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Seguimiento — solo si existe */}
        {tieneSeguimiento && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-5">
            <p className="text-xs font-bold text-[#0F766E] uppercase tracking-wide mb-3">
              Próximo control
            </p>
            <p className="text-sm font-medium text-[#0F172A]">
              {consulta.seguimiento_plazo}
            </p>
            {consulta.seguimiento_motivo && (
              <p className="text-sm text-[#475569] mt-1">
                {consulta.seguimiento_motivo}
              </p>
            )}
          </div>
        )}

        <FacturacionSection 
          consultaId={consulta.id} 
          facturaExistente={factura} 
          tieneIdentificacion={Boolean(paciente?.cedula || paciente?.identificacion)} 
        />

        {segurosPaciente && segurosPaciente.length > 0 && (
          <div className="mb-4">
            <CrearReclamacionButton consultaId={consulta.id} seguros={segurosPaciente as any} />
          </div>
        )}

        {/* Pedir reseña — solo si el médico configuró su enlace de Google */}
        {medico.google_review_url && paciente && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#475569]">
              ¿Consulta exitosa? Pide una reseña a tu paciente.
            </p>
            <BotonWhatsApp
              telefono={paciente.telefono}
              texto={`Hola ${paciente.nombre}, gracias por su visita. Si quedó conforme con la atención, ¿me ayudaría dejando una reseña? Solo toma un minuto: ${medico.google_review_url}`}
              tipo="resena"
              paciente_id={paciente.id}
              label="Pedir reseña"
            />
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 mb-4">
          Novaclinx genera borradores. La nota oficial y el criterio clínico son tuyos.
        </p>

        <DescargasSection
          consultaId={consulta.id}
          tieneFirma={Boolean(medico.firma_object_key)}
          tieneIndicaciones={Boolean(indicacionesParsed)}
          tieneDiagnostico={Boolean(consulta.cie10_codigo)}
          textoCopia={textoCopia}
        />
      </div>
    </main>
  );
}
