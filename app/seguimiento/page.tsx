import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SeguimientoView, { type PacienteCronico } from "./SeguimientoView";

function fechaHoyGuayaquil(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}

export default async function SeguimientoPage() {
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
    .from("pacientes")
    .select("id, nombre, telefono, condicion_cronica, proximo_control")
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .not("condicion_cronica", "is", null)
    .order("proximo_control", { ascending: true, nullsFirst: false });

  const pacientes: PacienteCronico[] = (rows ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono ?? null,
    condicion_cronica: p.condicion_cronica ?? "",
    proximo_control: p.proximo_control ?? null,
  }));

  return <SeguimientoView pacientes={pacientes} hoy={fechaHoyGuayaquil()} />;
}
