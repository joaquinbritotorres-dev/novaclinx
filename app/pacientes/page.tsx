import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BuscadorPacientes from "./BuscadorPacientes";
import Reveal from "./Reveal";

const SEXO_LABELS: Record<string, string> = { M: "Masculino", F: "Femenino", O: "Otro" };

/** Iniciales del paciente: primeras letras de las 2 primeras palabras ("EC"). */
function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "—";
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
    .select("id, nombre, edad, sexo, condicion_cronica, numero_historia")
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

  const totalLabel = `${lista.length} paciente${lista.length === 1 ? "" : "s"}`;

  return (
    <main className="min-h-screen bg-[#F7F7F4]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Cabecera */}
        <Reveal delay={0}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#1A1A18]">
                Pacientes
              </h1>
              <p className="mt-1.5 text-sm text-[#8A8780]">{totalLabel}</p>
            </div>
            <Link
              href="/pacientes/nuevo"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-medium text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Nuevo paciente
            </Link>
          </div>
        </Reveal>

        {/* Búsqueda */}
        <Reveal delay={70} className="mt-6">
          <BuscadorPacientes initialQ={busqueda} />
        </Reveal>

        {/* Lista */}
        <Reveal delay={140} className="mt-6">
          {lista.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E3DB] bg-white px-6 py-12 text-center">
              {busqueda ? (
                <p className="text-sm text-[#5C5A54]">
                  Sin resultados para «{busqueda}».
                </p>
              ) : (
                <>
                  <p className="text-base text-[#5C5A54]">Aún no tienes pacientes.</p>
                  <Link
                    href="/pacientes/nuevo"
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-medium text-white transition hover:brightness-95"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    Nuevo paciente
                  </Link>
                </>
              )}
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-[#E7E3DB] bg-white divide-y divide-[#E7E3DB]">
              {lista.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pacientes/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#F7F7F4] focus:outline-none focus:bg-[#F7F7F4]"
                  >
                    {/* Avatar con iniciales */}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F766E]/[0.08] text-sm font-medium text-[#0F766E]">
                      {iniciales(p.nombre)}
                    </span>

                    {/* Nombre + chip crónico + metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-medium text-[#1A1A18]">
                          {p.nombre}
                        </p>
                        {p.condicion_cronica && (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-[#9A6B12]/[0.10] px-2 py-0.5 text-xs font-medium text-[#9A6B12]">
                            {capitalizar(p.condicion_cronica)}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const meta = [
                          p.edad != null ? `${p.edad} años` : null,
                          p.sexo ? (SEXO_LABELS[p.sexo] ?? p.sexo) : null,
                          p.numero_historia ?? null,
                        ].filter(Boolean);
                        return meta.length > 0 ? (
                          <p className="mt-0.5 truncate text-sm text-[#8A8780]">
                            {meta.join(" · ")}
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {/* Última consulta + chevron */}
                    <div className="flex shrink-0 items-center gap-3">
                      {p.ultimaConsulta ? (
                        <span className="hidden text-sm text-[#8A8780] sm:inline">
                          {new Date(p.ultimaConsulta.fecha).toLocaleDateString("es-EC", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="hidden text-sm text-[#A8A49C] sm:inline">
                          Sin consultas
                        </span>
                      )}
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[#A8A49C]"
                        strokeWidth={1.75}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </main>
  );
}
