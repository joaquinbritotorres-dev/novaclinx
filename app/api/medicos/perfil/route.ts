import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import {
  createSupabaseServerClient,
  createSupabaseServerClientWithServiceRole,
} from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

const VALID_ESPECIALIDADES = [
  "pediatria",
  "ginecologia",
  "general",
  "cirugia",
  "otro",
] as const;

type Especialidad = (typeof VALID_ESPECIALIDADES)[number];

function isValidEspecialidad(value: unknown): value is Especialidad {
  return typeof value === "string" && (VALID_ESPECIALIDADES as readonly string[]).includes(value);
}

function toTextOrNull(val: unknown): string | null {
  return typeof val === "string" && val.trim() ? val.trim() : null;
}

/**
 * Resuelve colisiones de slug contra otros médicos (la RLS impide leer filas
 * ajenas con el cliente SSR, así que la verificación usa service role, solo
 * lectura de slugs). Si "dra-maria-perez" está tomado, prueba -2, -3, …
 */
async function resolverSlugUnico(
  slugBase: string,
  userId: string
): Promise<string | null> {
  const admin = createSupabaseServerClientWithServiceRole();
  for (let i = 0; i < 20; i++) {
    const candidato = i === 0 ? slugBase : `${slugBase}-${i + 1}`;
    const { data } = await admin
      .from("medicos")
      .select("id")
      .eq("slug", candidato)
      .neq("user_id", userId)
      .maybeSingle();
    if (!data) return candidato;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const parsed = body as Record<string, unknown>;

  if (
    typeof body !== "object" ||
    body === null ||
    !isValidEspecialidad(parsed.especialidad) ||
    typeof parsed.nombre !== "string" ||
    parsed.nombre.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const especialidad = parsed.especialidad as Especialidad;
  const nombre = (parsed.nombre as string).trim();

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medicos")
      .insert({
        user_id: user.id,
        nombre,
        especialidad,
        pais: "Ecuador",
        onboarding_completado: false,
        plan: "beta",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ perfil: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const parsed = body as Record<string, unknown>;

  if (
    typeof parsed.nombre !== "string" ||
    parsed.nombre.trim().length === 0 ||
    !isValidEspecialidad(parsed.especialidad)
  ) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const googleReviewUrl = toTextOrNull(parsed.google_review_url);
  if (googleReviewUrl !== null && !/^https?:\/\//i.test(googleReviewUrl)) {
    return NextResponse.json(
      { error: "El enlace de reseñas debe empezar con http:// o https://." },
      { status: 400 }
    );
  }

  const perfilPublico = parsed.perfil_publico === true;

  // Slug: normaliza lo enviado; si está activando el perfil público sin slug,
  // lo deriva del nombre. Resuelve colisiones con sufijo numérico.
  const slugBase = slugify(
    toTextOrNull(parsed.slug) ?? (perfilPublico ? parsed.nombre : "")
  );

  let slugFinal: string | null = null;
  if (slugBase) {
    slugFinal = await resolverSlugUnico(slugBase, user.id);
    if (!slugFinal) {
      return NextResponse.json(
        { error: "No se pudo asignar un enlace público. Prueba otro slug." },
        { status: 409 }
      );
    }
  }

  if (perfilPublico && !slugFinal) {
    return NextResponse.json(
      { error: "Define un slug para activar el perfil público." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medicos")
      .update({
        nombre: parsed.nombre.trim(),
        especialidad: parsed.especialidad as Especialidad,
        registro_acess: toTextOrNull(parsed.registro_acess),
        registro_senescyt: toTextOrNull(parsed.registro_senescyt),
        direccion_consultorio: toTextOrNull(parsed.direccion_consultorio),
        telefono_consultorio: toTextOrNull(parsed.telefono_consultorio),
        ruc: toTextOrNull(parsed.ruc),
        bio: toTextOrNull(parsed.bio),
        slug: slugFinal,
        perfil_publico: perfilPublico,
        google_review_url: googleReviewUrl,
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ perfil: data });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
