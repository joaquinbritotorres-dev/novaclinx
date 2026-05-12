import { redirect } from "next/navigation";
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
    .select("nombre, especialidad")
    .eq("user_id", user.id)
    .maybeSingle();

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
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#0F766E]" />
            <span className="text-xs font-semibold text-[#0F766E] uppercase tracking-wide">
              Fase 2 completa
            </span>
          </div>
          <p className="text-sm text-[#475569]">
            Dashboard de Novaclinx — Fase 2 completa. Aquí irán tus consultas y seguimientos.
          </p>
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
