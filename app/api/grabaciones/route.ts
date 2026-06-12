import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BUCKET_AUDIOS,
  CONSENTIMIENTO_GRABACION_TEXTO,
} from "@/lib/scribe/constantes";

/**
 * Crea una grabación en estado 'consentida', registra el consentimiento en la
 * bitácora de comunicaciones y devuelve la signed upload URL del audio.
 * Cero PHI en logs: solo IDs y estados.
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const { paciente_id } = (body ?? {}) as Record<string, unknown>;
  if (typeof paciente_id !== "string" || !paciente_id.trim()) {
    return NextResponse.json(
      { error: "Se requiere paciente_id." },
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

  // Propiedad: el paciente debe pertenecer al médico
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", paciente_id)
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }

  const consentimientoAt = new Date().toISOString();

  const { data: grabacion, error: insertError } = await supabase
    .from("grabaciones_consulta")
    .insert({
      medico_id: medico.id,
      paciente_id,
      estado: "consentida",
      consentimiento_at: consentimientoAt,
    })
    .select("id")
    .single();

  if (insertError || !grabacion) {
    console.error(
      `[grabaciones] No se pudo crear la grabación (medico ${medico.id}): ${insertError?.message ?? "sin fila"}`
    );
    return NextResponse.json(
      { error: "No pudimos iniciar la grabación. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // Bitácora: constancia del consentimiento con timestamp (canal sistema)
  const { error: bitacoraError } = await supabase.from("comunicaciones").insert({
    medico_id: medico.id,
    paciente_id,
    tipo: "otro",
    canal: "sistema",
    contenido: `Consentimiento de grabación de consulta (${consentimientoAt}): ${CONSENTIMIENTO_GRABACION_TEXTO}`,
  });

  if (bitacoraError) {
    // El consentimiento DEBE quedar registrado antes de grabar: revertir.
    await supabase.from("grabaciones_consulta").delete().eq("id", grabacion.id);
    console.error(
      `[grabaciones] Bitácora de consentimiento falló (grabacion ${grabacion.id}): ${bitacoraError.message}`
    );
    return NextResponse.json(
      { error: "No pudimos registrar el consentimiento. Intenta de nuevo." },
      { status: 500 }
    );
  }

  const audioPath = `${medico.id}/${paciente_id}/${grabacion.id}.webm`;

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET_AUDIOS)
    .createSignedUploadUrl(audioPath);

  if (signError || !signed) {
    console.error(
      `[grabaciones] createSignedUploadUrl falló (grabacion ${grabacion.id}): ${signError?.message ?? "sin data"}`
    );
    return NextResponse.json(
      { error: "No pudimos preparar la subida del audio. Intenta de nuevo." },
      { status: 500 }
    );
  }

  await supabase
    .from("grabaciones_consulta")
    .update({ audio_path: audioPath })
    .eq("id", grabacion.id);

  return NextResponse.json(
    { grabacion_id: grabacion.id, path: signed.path, token: signed.token },
    { status: 201 }
  );
}
