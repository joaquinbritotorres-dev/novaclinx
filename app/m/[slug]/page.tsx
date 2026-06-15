import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClientWithServiceRole } from "@/lib/supabase/server";

const ESPECIALIDAD_LABELS: Record<string, string> = {
  pediatria: "Pediatría",
  ginecologia: "Ginecología y Obstetricia",
  general: "Medicina General",
  cirugia: "Cirugía",
  otro: "Especialista",
};

interface MedicoPublico {
  nombre: string;
  especialidad: string;
  bio: string | null;
  direccion_consultorio: string | null;
  telefono_consultorio: string | null;
  registro_acess: string | null;
  slug: string;
}

// Página pública SIN auth. Usa service role pero selecciona EXCLUSIVAMENTE
// campos públicos y filtra por perfil_publico = true. Nunca agregar aquí
// email, ruc, user_id, firma_* ni ningún dato privado.
const getMedicoPublico = cache(
  async (slug: string): Promise<MedicoPublico | null> => {
    const supabase = createSupabaseServerClientWithServiceRole();
    const { data } = await supabase
      .from("medicos")
      .select(
        "nombre, especialidad, bio, direccion_consultorio, telefono_consultorio, registro_acess, slug"
      )
      .eq("slug", slug)
      .eq("perfil_publico", true)
      .maybeSingle();
    return (data as MedicoPublico | null) ?? null;
  }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const medico = await getMedicoPublico(slug);
  if (!medico) return { title: "Perfil no encontrado — Novaclinx" };

  const especialidad =
    ESPECIALIDAD_LABELS[medico.especialidad] ?? "Especialista";
  const title = `${medico.nombre} — ${especialidad}`;
  const description =
    medico.bio ??
    `${medico.nombre}, ${especialidad.toLowerCase()} en Ecuador.${
      medico.direccion_consultorio ? ` Consultorio: ${medico.direccion_consultorio}.` : ""
    }`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/m/${medico.slug}`,
    },
  };
}

export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const medico = await getMedicoPublico(slug);
  if (!medico) notFound();

  const especialidad =
    ESPECIALIDAD_LABELS[medico.especialidad] ?? "Especialista";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: medico.nombre,
    medicalSpecialty: especialidad,
    ...(medico.direccion_consultorio
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: medico.direccion_consultorio,
            addressCountry: "EC",
          },
        }
      : {}),
    ...(medico.telefono_consultorio
      ? { telephone: medico.telefono_consultorio }
      : {}),
  };

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-12">
      <script
        type="application/ld+json"
        // Escape de '<' para que un valor
        // controlado por el médico (nombre/bio/dirección) no pueda romper el
        // tag </script> e inyectar XSS en esta página pública sin login.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          {/* Cabecera */}
          <div className="bg-[#0F766E] px-8 py-10">
            <h1 className="text-2xl font-bold text-white">{medico.nombre}</h1>
            <p className="text-sm text-[#99F6E4] mt-1">{especialidad}</p>
            {medico.registro_acess && (
              <p className="text-xs text-white/80 mt-3">
                Registro ACESS: {medico.registro_acess}
              </p>
            )}
          </div>

          <div className="px-8 py-8 space-y-6">
            {medico.bio && (
              <div>
                <h2 className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
                  Sobre mí
                </h2>
                <p className="text-sm text-[#0F172A] leading-relaxed whitespace-pre-wrap">
                  {medico.bio}
                </p>
              </div>
            )}

            {(medico.direccion_consultorio || medico.telefono_consultorio) && (
              <div>
                <h2 className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
                  Consultorio
                </h2>
                <dl className="space-y-1.5 text-sm">
                  {medico.direccion_consultorio && (
                    <div className="flex gap-2">
                      <dt className="text-[#64748B] shrink-0">Dirección:</dt>
                      <dd className="text-[#0F172A]">{medico.direccion_consultorio}</dd>
                    </div>
                  )}
                  {medico.telefono_consultorio && (
                    <div className="flex gap-2">
                      <dt className="text-[#64748B] shrink-0">Teléfono:</dt>
                      <dd className="text-[#0F172A]">{medico.telefono_consultorio}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Footer mínimo */}
        <p className="text-center text-xs text-[#94A3B8] mt-6">
          Página creada con{" "}
          <span className="font-semibold text-[#0F766E]">Novaclinx</span>
        </p>
      </div>
    </main>
  );
}
