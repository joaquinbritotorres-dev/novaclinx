import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createSupabaseServerClient,
  createSupabaseServerClientWithServiceRole,
} from "@/lib/supabase/server";
import PerfilForm from "./PerfilForm";
import FirmaElectronicaSection from "./FirmaElectronicaSection";
import LogoSection from "./LogoSection";

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: medico } = await supabase
    .from("medicos")
    .select(
      "id, nombre, especialidad, registro_acess, registro_senescyt, direccion_consultorio, telefono_consultorio, ruc, firma_object_key, firma_titular, firma_valida_hasta, logo_object_key"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  let logoPreviewUrl: string | null = null;
  if (medico.logo_object_key) {
    const supabaseAdmin = await createSupabaseServerClientWithServiceRole();
    const { data: signedData } = await supabaseAdmin.storage
      .from("logos-medicos")
      .createSignedUrl(medico.logo_object_key, 3600);
    logoPreviewUrl = signedData?.signedUrl ?? null;
  }

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-[#0F766E] hover:underline">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-xl font-bold text-[#0F172A] mb-1">Mi perfil profesional</h1>
        <p className="text-sm text-[#64748B] mb-6">
          Estos datos aparecen en tus notas y recetas médicas.
        </p>
        <PerfilForm medico={medico} />
        <LogoSection
          tieneLogoActual={!!medico.logo_object_key}
          logoPreviewUrl={logoPreviewUrl}
        />
        <FirmaElectronicaSection
          firmaInfo={{
            tiene: !!medico.firma_object_key,
            titular: medico.firma_titular ?? null,
            valida_hasta: medico.firma_valida_hasta ?? null,
          }}
        />
      </div>
    </main>
  );
}
