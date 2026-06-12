import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GRABACION_MAX_SEGUNDOS } from "@/lib/scribe/constantes";

/**
 * Marca la grabación como 'subida' tras el upload del audio.
 * Única transición permitida aquí: consentida → subida.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const { estado, duracion_segundos } = (body ?? {}) as Record<string, unknown>;

  if (estado !== "subida") {
    return NextResponse.json(
      { error: "Transición de estado no permitida." },
      { status: 400 }
    );
  }

  const duracion =
    typeof duracion_segundos === "number" &&
    Number.isFinite(duracion_segundos) &&
    duracion_segundos > 0 &&
    duracion_segundos <= GRABACION_MAX_SEGUNDOS
      ? Math.round(duracion_segundos)
      : null;

  if (duracion === null) {
    return NextResponse.json(
      { error: "duracion_segundos inválida." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: grabacion, error } = await supabase
    .from("grabaciones_consulta")
    .update({ estado: "subida", duracion_segundos: duracion })
    .eq("id", id)
    .eq("medico_id", medico.id)
    .eq("estado", "consentida")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      `[grabaciones] PATCH subida falló (grabacion ${id}): ${error.message}`
    );
    return NextResponse.json(
      { error: "No pudimos actualizar la grabación." },
      { status: 500 }
    );
  }
  if (!grabacion) {
    return NextResponse.json(
      { error: "Grabación no encontrada o en estado inválido." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
