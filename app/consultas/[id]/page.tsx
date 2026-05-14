import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CopiarNotaButton from "./CopiarNotaButton";
import CompartirNotaButton from "./CompartirNotaButton";

const SOAP_LABELS: Record<string, string> = {
  S: "Subjetivo",
  O: "Objetivo",
  A: "Análisis",
  P: "Plan",
};

function parseSoapSections(
  soap: string
): { key: string; label: string; content: string }[] {
  // Split on newlines immediately followed by a SOAP section letter and colon
  const parts = soap.split(/\n(?=[SOAP]:)/);
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

function parseIndicaciones(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    return null;
  } catch {
    return null;
  }
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
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  // Ownership check: query by both consulta id AND medico_id simultaneously
  const { data: consulta } = await supabase
    .from("consultas")
    .select(
      "id, fecha, nota_soap, indicaciones, seguimiento_plazo, seguimiento_motivo, paciente_id, pacientes(id, nombre)"
    )
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!consulta) notFound();

  const paciente = consulta.pacientes as unknown as { id: string; nombre: string } | null;
  const secciones = parseSoapSections(consulta.nota_soap ?? "");
  const indicaciones = parseIndicaciones(consulta.indicaciones);
  const tieneSeguimiento = typeof consulta.seguimiento_plazo === "string";

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-8">
      <div className="w-full max-w-lg mx-auto">
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

        {/* Nota SOAP por secciones */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-4 space-y-5">
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
        {indicaciones && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-4">
            <p className="text-xs font-bold text-[#0F766E] uppercase tracking-wide mb-3">
              Indicaciones
            </p>
            <ul className="space-y-1.5">
              {indicaciones.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-[#0F172A]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0F766E] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Seguimiento — solo si existe */}
        {tieneSeguimiento && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-4">
            <p className="text-xs font-bold text-[#0F766E] uppercase tracking-wide mb-3">
              Seguimiento
            </p>
            <p className="text-sm text-[#0F172A]">
              📅 {consulta.seguimiento_plazo}
            </p>
            {consulta.seguimiento_motivo && (
              <p className="text-sm text-[#475569] mt-1">
                {consulta.seguimiento_motivo}
              </p>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 mb-4">
          Novaclinx genera borradores. La nota oficial y el criterio clínico son tuyos.
        </p>

        {/* Acciones de nota */}
        <div className="flex flex-col gap-2">
          <a
            href={`/api/consultas/${consulta.id}/pdf`}
            download
            className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
              <path d="M12 3v13m0 0-4-4m4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Descargar PDF
          </a>
          <CopiarNotaButton texto={consulta.nota_soap ?? ""} />
          <CompartirNotaButton consultaId={consulta.id} texto={consulta.nota_soap ?? ""} />
        </div>
      </div>
    </main>
  );
}
