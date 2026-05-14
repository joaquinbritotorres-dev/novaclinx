import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NuevaConsultaForm from "./NuevaConsultaForm";

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

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-8">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-5">
          <Link
            href={`/pacientes/${paciente.id}`}
            className="text-sm text-[#0F766E] hover:underline"
          >
            ← {paciente.nombre}
          </Link>
        </div>

        <div className="mb-5">
          <h1 className="text-xl font-bold text-[#0F172A]">Nueva consulta</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {paciente.nombre}
            {paciente.edad != null ? ` · ${paciente.edad} años` : ""}
          </p>
        </div>

        {ultimaConsulta?.resumen_corto && (
          <div className="mb-5 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">
              Última consulta
            </p>
            <p className="text-sm text-[#475569]">{ultimaConsulta.resumen_corto}</p>
          </div>
        )}

        <NuevaConsultaForm pacienteId={paciente.id} />
      </div>
    </main>
  );
}
