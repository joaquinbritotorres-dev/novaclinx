import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EspecialidadForm from "./EspecialidadForm";

export default async function OnboardingEspecialidadPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (medico) {
    redirect("/dashboard");
  }

  return <EspecialidadForm />;
}
