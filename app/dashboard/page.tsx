import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: medico } = await supabase
    .from("medicos")
    .select("id, nombre, especialidad")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: seguimientos } = medico
    ? await supabase
        .from("consultas")
        .select(
          "id, seguimiento_plazo, seguimiento_motivo, paciente_id, pacientes(id, nombre)"
        )
        .eq("medico_id", medico.id)
        .not("seguimiento_plazo", "is", null)
        .order("fecha", { ascending: false })
        .limit(5)
    : { data: null };

  return (
    <main className="min-h-screen bg-[#F7F7F4] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-[#0F172A]">
          {medico?.nombre ? `Hola, ${medico.nombre}` : "Bienvenido a Novaclinx"}
        </h1>

        {medico?.especialidad && (
          <p className="mt-1 text-xs text-[#94A3B8] capitalize">{medico.especialidad}</p>
        )}

        <div className="mt-6 bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm text-left">
          <p className="text-sm text-[#475569] mb-4">
            Registra pacientes, genera notas SOAP y descarga PDFs de tus consultas.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/pacientes"
              className="h-11 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
            >
              Ver mis pacientes
            </Link>
            <Link
              href="/pacientes"
              className="h-11 px-4 bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#374151] text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
            >
              Nueva consulta
            </Link>
          </div>
        </div>

        {/* Seguimientos pendientes */}
        <div className="mt-6 bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm text-left">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📅</span>
            <span className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
              Seguimientos registrados
            </span>
          </div>
          {!seguimientos || seguimientos.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">Sin seguimientos pendientes por ahora.</p>
          ) : (
            <ul className="space-y-3">
              {seguimientos.map((s) => {
                const paciente = s.pacientes as unknown as { id: string; nombre: string } | null;
                return (
                  <li key={s.id}>
                    <Link
                      href={paciente ? `/pacientes/${paciente.id}` : "/pacientes"}
                      className="block rounded-lg hover:bg-[#F0FDFB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 -mx-1 px-1 py-1"
                    >
                      <p className="text-sm font-medium text-[#0F172A]">
                        {paciente?.nombre ?? "Paciente"}
                      </p>
                      <p className="text-xs text-[#0F766E] mt-0.5">{s.seguimiento_plazo}</p>
                      {s.seguimiento_motivo && (
                        <p className="text-xs text-[#64748B] mt-0.5">{s.seguimiento_motivo}</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="h-11 px-6 bg-white border border-[#E5E7EB] hover:bg-[#F1F5F9] text-[#475569] text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
