import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (
    typeof body !== "object" ||
    body === null ||
    !isValidEspecialidad((body as Record<string, unknown>).especialidad)
  ) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const especialidad = (body as { especialidad: Especialidad }).especialidad;

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const nombre =
      (authUser?.user_metadata?.full_name as string | undefined) ??
      (authUser?.user_metadata?.name as string | undefined) ??
      "Médico";

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
