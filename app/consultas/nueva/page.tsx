import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NuevaConsultaForm from "./NuevaConsultaForm";

/** Iniciales del paciente para el avatar (1-2 letras). */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const a = partes[0][0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export default async function NuevaConsultaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { paciente_id } = await searchParams;

  if (!paciente_id || typeof paciente_id !== "string") {
    redirect("/pacientes");
  }

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

  // Verify ownership before exposing any patient data
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, edad")
    .eq("id", paciente_id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!paciente) redirect("/pacientes");

  const { data: ultimaConsulta } = await supabase
    .from("consultas")
    .select("resumen_corto")
    .eq("paciente_id", paciente_id)
    .eq("aprobada_por_medico", true)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hoy = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Guayaquil",
  });

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 sm:px-6 py-6 sm:py-8">
      <div className="w-full max-w-4xl mx-auto motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <Link
          href={`/pacientes/${paciente.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#5C5A54] hover:text-[#0F172A] transition-colors mb-5"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Volver a {paciente.nombre.split(/\s+/)[0]}
        </Link>

        {/* Cabecera con identidad del paciente */}
        <div className="mb-6 flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F0FDFB] text-base font-semibold text-[#0F766E] ring-1 ring-[#0F766E]/15"
            aria-hidden
          >
            {iniciales(paciente.nombre)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-[-0.01em] text-[#0F172A] truncate">
              Nueva consulta
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5 truncate">
              <span className="text-[#0F172A] font-medium">{paciente.nombre}</span>
              {paciente.edad != null ? ` · ${paciente.edad} años` : ""}
              <span className="hidden sm:inline"> · <span className="capitalize">{hoy}</span></span>
            </p>
          </div>
        </div>

        {ultimaConsulta?.resumen_corto && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#E7E3DB] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#64748B]">
              <Clock className="h-[15px] w-[15px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8780]">
                Última consulta
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-[#475569]">
                {ultimaConsulta.resumen_corto}
              </p>
            </div>
          </div>
        )}

        <NuevaConsultaForm pacienteId={paciente.id} />
      </div>
    </main>
  );
}
