import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BUCKET_AUDIOS } from "@/lib/scribe/constantes";

/**
 * Descarta la grabación: borra el audio del bucket, anula la transcripción
 * y deja la fila como auditoría sin contenido (estado 'descartada').
 * Permitido desde cualquier estado no terminal.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: grabacion } = await supabase
    .from("grabaciones_consulta")
    .select("id, estado, audio_path")
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!grabacion) {
    return NextResponse.json({ error: "Grabación no encontrada." }, { status: 404 });
  }
  if (["aprobada", "descartada"].includes(grabacion.estado)) {
    return NextResponse.json(
      { error: "La grabación ya está cerrada." },
      { status: 409 }
    );
  }

  // Borrar el audio primero: si falla, NO se marca descartada (sin huérfanos
  // fantasma — la purga manual los detecta por estado no terminal).
  if (grabacion.audio_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_AUDIOS)
      .remove([grabacion.audio_path]);
    if (storageError) {
      console.error(
        `[grabaciones/descartar] No se pudo borrar el audio (grabacion ${id}): ${storageError.message}`
      );
      return NextResponse.json(
        { error: "No pudimos eliminar el audio. Reintenta." },
        { status: 500 }
      );
    }
  }

  const { error: updateError } = await supabase
    .from("grabaciones_consulta")
    .update({
      estado: "descartada",
      transcripcion: null,
      audio_path: null,
      error_detalle: null,
    })
    .eq("id", grabacion.id);

  if (updateError) {
    console.error(
      `[grabaciones/descartar] update falló (grabacion ${id}): ${updateError.message}`
    );
    return NextResponse.json(
      { error: "No pudimos descartar la grabación. Reintenta." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
