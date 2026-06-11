import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AgendaView, { type Cita } from "./AgendaView";

function mesHoyGuayaquil(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
    .slice(0, 7);
}

function fechaHoyGuayaquil(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}

function utcDateToStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes =
    typeof mesParam === "string" && /^\d{4}-\d{2}$/.test(mesParam)
      ? mesParam
      : mesHoyGuayaquil();

  const hoy = fechaHoyGuayaquil();

  // Compute grid range: Monday of week containing day 1 → Sunday of week containing last day
  const [y, m] = mes.split("-").map(Number);
  const firstDay = new Date(Date.UTC(y, m - 1, 1));
  const lastDay = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day
  const offsetStart = firstDay.getUTCDay() === 0 ? 6 : firstDay.getUTCDay() - 1;
  const offsetEnd = lastDay.getUTCDay() === 0 ? 0 : 7 - lastDay.getUTCDay();
  const gridStart = new Date(Date.UTC(y, m - 1, 1 - offsetStart));
  const gridEnd = new Date(Date.UTC(y, m - 1, lastDay.getUTCDate() + offsetEnd));
  const desde = utcDateToStr(gridStart);
  const hasta = utcDateToStr(gridEnd);

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

  const { data: rows } = await supabase
    .from("citas")
    .select(
      "id, paciente_id, nombre_paciente, inicio, duracion_min, motivo, estado, notas, pacientes(nombre, telefono)"
    )
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .gte("inicio", `${desde}T00:00:00-05:00`)
    .lte("inicio", `${hasta}T23:59:59.999-05:00`)
    .order("inicio");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citas: Cita[] = (rows ?? []).map((c: any) => ({
    id: c.id,
    paciente_id: c.paciente_id ?? null,
    nombre_paciente: c.nombre_paciente ?? null,
    paciente_nombre:
      (c.pacientes as { nombre: string } | null)?.nombre ?? null,
    paciente_telefono:
      (c.pacientes as { telefono: string | null } | null)?.telefono ?? null,
    inicio: c.inicio,
    duracion_min: c.duracion_min,
    motivo: c.motivo ?? null,
    estado: c.estado,
    notas: c.notas ?? null,
  }));

  // key={mes} forces AgendaView to remount on month change, resetting selectedDate
  return <AgendaView key={mes} mes={mes} hoy={hoy} citas={citas} />;
}
