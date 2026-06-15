import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BuscadorPacientes from "./BuscadorPacientes";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q.trim() : "";

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

  let query = supabase
    .from("pacientes")
    .select("id, nombre, edad")
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  if (busqueda) {
    query = query.ilike("nombre", `%${busqueda}%`);
  }

  // Lista de pacientes y última consulta por paciente: independientes (solo
  // dependen de medico.id) → en paralelo. Se trae solo fecha (resumen_corto
  // no se muestra en la lista).
  const [{ data: pacientes }, { data: ultimasConsultas }] = await Promise.all([
    query,
    supabase
      .from("consultas")
      .select("paciente_id, fecha")
      .eq("medico_id", medico.id)
      .eq("aprobada_por_medico", true)
      .order("fecha", { ascending: false }),
  ]);

  // Build a map: paciente_id → fecha de la última consulta (DESC → primera gana)
  const ultimaMap = new Map<string, { fecha: string }>();
  for (const c of ultimasConsultas ?? []) {
    if (!ultimaMap.has(c.paciente_id)) {
      ultimaMap.set(c.paciente_id, { fecha: c.fecha });
    }
  }

  const lista = (pacientes ?? []).map((p) => ({
    ...p,
    ultimaConsulta: ultimaMap.get(p.id) ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-8">
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#0F172A]">Mis pacientes</h1>
          <Link
            href="/pacientes/nuevo"
            className="h-11 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
          >
            + Nuevo paciente
          </Link>
        </div>

        <BuscadorPacientes initialQ={busqueda} />

        {lista.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
            {busqueda ? (
              <p className="text-sm text-[#64748B]">
                No se encontraron pacientes con &quot;{busqueda}&quot;.
              </p>
            ) : (
              <>
                <p className="text-sm text-[#64748B]">Aún no tienes pacientes registrados.</p>
                <Link
                  href="/pacientes/nuevo"
                  className="mt-4 inline-flex items-center h-11 px-4 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0F766E]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
                >
                  Crear primer paciente
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-4">
            {lista.map((p) => (
              <li key={p.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/pacientes/${p.id}`}
                    className="flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 rounded"
                  >
                    <p className="text-sm font-semibold text-[#0F172A] truncate">{p.nombre}</p>
                    {p.edad != null && (
                      <p className="text-xs text-[#64748B] mt-0.5">{p.edad} años</p>
                    )}
                    {p.ultimaConsulta ? (
                      <p className="text-xs text-[#94A3B8] mt-1">
                        Última consulta:{" "}
                        {new Date(p.ultimaConsulta.fecha).toLocaleDateString("es-EC", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-[#94A3B8] mt-1">Sin consultas</p>
                    )}
                  </Link>
                  <Link
                    href={`/consultas/nueva?paciente_id=${p.id}`}
                    className="shrink-0 h-11 px-3 bg-[#F0FDFB] border border-[#0F766E] text-[#0F766E] text-xs font-medium rounded-lg hover:bg-[#CCFBF1] transition-colors inline-flex items-center focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
                  >
                    Nueva consulta
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
