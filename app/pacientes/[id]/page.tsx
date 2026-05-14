import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  // Verify ownership before reading any patient data
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, edad, sexo")
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!paciente) notFound();

  const { data: consultas } = await supabase
    .from("consultas")
    .select("id, fecha, resumen_corto")
    .eq("paciente_id", id)
    .eq("aprobada_por_medico", true)
    .order("fecha", { ascending: false });

  const sexoLabel =
    paciente.sexo === "M"
      ? "Masculino"
      : paciente.sexo === "F"
        ? "Femenino"
        : paciente.sexo === "O"
          ? "Otro"
          : null;

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-8">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/pacientes" className="text-sm text-[#0F766E] hover:underline">
            ← Pacientes
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-4">
          <h1 className="text-lg font-bold text-[#0F172A]">{paciente.nombre}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
            {paciente.edad != null && <span>{paciente.edad} años</span>}
            {sexoLabel && <span>{sexoLabel}</span>}
          </div>
        </div>

        <Link
          href={`/consultas/nueva?paciente_id=${paciente.id}`}
          className="w-full h-11 mb-6 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0F766E]/90 transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          Nueva consulta
        </Link>

        <h2 className="text-sm font-semibold text-[#374151] mb-3">
          Historial de consultas
        </h2>

        {!consultas || consultas.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
            <p className="text-sm text-[#64748B]">Sin consultas registradas.</p>
          </div>
        ) : (
          <ul className="space-y-2">
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
      </div>
    </main>
  );
}
