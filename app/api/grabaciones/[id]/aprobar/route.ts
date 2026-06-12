import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BUCKET_AUDIOS } from "@/lib/scribe/constantes";

/**
 * Cierre del ciclo al aprobar la nota: vincula la consulta recién guardada,
 * borra el audio del bucket y anula la transcripción. La fila queda como
 * auditoría sin contenido clínico (consentimiento_at, duración, estados).
 */
export async function POST(
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

  const { consulta_id } = (body ?? {}) as Record<string, unknown>;
  if (typeof consulta_id !== "string" || !consulta_id.trim()) {
    return NextResponse.json(
      { error: "Se requiere consulta_id." },
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

  const { data: grabacion } = await supabase
    .from("grabaciones_consulta")
    .select("id, estado, audio_path, paciente_id")
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!grabacion) {
    return NextResponse.json({ error: "Grabación no encontrada." }, { status: 404 });
  }
  if (grabacion.estado !== "nota_generada") {
    return NextResponse.json(
      { error: "La grabación no está lista para aprobarse." },
      { status: 409 }
    );
  }

  // La consulta debe ser del médico y del mismo paciente de la grabación
  const { data: consulta } = await supabase
    .from("consultas")
    .select("id")
    .eq("id", consulta_id)
    .eq("medico_id", medico.id)
    .eq("paciente_id", grabacion.paciente_id)
    .maybeSingle();

  if (!consulta) {
    return NextResponse.json({ error: "Consulta no encontrada." }, { status: 404 });
  }

  // Borrar el audio primero: si falla, no se marca aprobada (reintentable;
  // la purga manual detecta remanentes por estado no terminal).
  if (grabacion.audio_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_AUDIOS)
      .remove([grabacion.audio_path]);
    if (storageError) {
      console.error(
        `[grabaciones/aprobar] No se pudo borrar el audio (grabacion ${id}): ${storageError.message}`
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
      estado: "aprobada",
      consulta_id,
      transcripcion: null,
      audio_path: null,
      error_detalle: null,
    })
    .eq("id", grabacion.id);

  if (updateError) {
    console.error(
      `[grabaciones/aprobar] update falló (grabacion ${id}): ${updateError.message}`
    );
    return NextResponse.json(
      { error: "No pudimos cerrar la grabación. Reintenta." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
