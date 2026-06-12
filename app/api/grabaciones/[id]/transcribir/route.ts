import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDeepgramApiKey, DEEPGRAM_LISTEN_URL } from "@/lib/deepgram/config";
import { parseUtterances, type DeepgramUtterance } from "@/lib/scribe/transcripcion";
import { BUCKET_AUDIOS } from "@/lib/scribe/constantes";

// La transcripción de audios largos puede tomar minutos
export const maxDuration = 300;

/**
 * Transcribe el audio con Deepgram (diarizado). Transiciones:
 * subida|error → transcribiendo → transcrita|error. Reintentable.
 * Cero PHI en logs: jamás loguear transcripciones ni URLs firmadas.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    console.error(
      "[grabaciones/transcribir] DEEPGRAM_API_KEY no está configurada — transcripción deshabilitada."
    );
    return NextResponse.json(
      { error: "La transcripción no está disponible en este momento." },
      { status: 500 }
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

  // Propiedad vía RLS + filtro explícito; estados reintentables: subida|error
  const { data: grabacion } = await supabase
    .from("grabaciones_consulta")
    .select("id, estado, audio_path")
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!grabacion) {
    return NextResponse.json({ error: "Grabación no encontrada." }, { status: 404 });
  }
  if (!["subida", "error"].includes(grabacion.estado) || !grabacion.audio_path) {
    return NextResponse.json(
      { error: "La grabación no está lista para transcribir." },
      { status: 409 }
    );
  }

  await supabase
    .from("grabaciones_consulta")
    .update({ estado: "transcribiendo", error_detalle: null })
    .eq("id", grabacion.id);

  async function marcarError(detalle: string) {
    await supabase
      .from("grabaciones_consulta")
      .update({ estado: "error", error_detalle: detalle })
      .eq("id", id);
  }

  try {
    // URL firmada de lectura, vida corta (60 s): solo para que Deepgram la consuma
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET_AUDIOS)
      .createSignedUrl(grabacion.audio_path, 60);

    if (signError || !signed?.signedUrl) {
      await marcarError("No se pudo generar la URL de lectura del audio.");
      console.error(
        `[grabaciones/transcribir] createSignedUrl falló (grabacion ${id})`
      );
      return NextResponse.json(
        { error: "No pudimos acceder al audio. Reintenta." },
        { status: 500 }
      );
    }

    // Si la calidad en español decepciona con nova-3/multi, fallback probado:
    // model=nova-2&language=es (cambiar en DEEPGRAM_LISTEN_URL).
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240_000);

    let res: Response;
    try {
      res = await fetch(DEEPGRAM_LISTEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: signed.signedUrl }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const detalle = `Deepgram HTTP ${res.status}`;
      await marcarError(detalle);
      console.error(
        `[grabaciones/transcribir] ${detalle} (grabacion ${id})`
      );
      return NextResponse.json(
        { error: "La transcripción falló. Reintenta." },
        { status: 502 }
      );
    }

    const body = (await res.json()) as {
      results?: { utterances?: DeepgramUtterance[] };
    };
    const utterances = body.results?.utterances ?? [];
    const transcripcion = parseUtterances(utterances);

    if (transcripcion.turnos.length === 0) {
      await marcarError("Deepgram no devolvió contenido transcribible.");
      return NextResponse.json(
        { error: "No se detectó voz en la grabación. Reintenta o usa el modo Escribir." },
        { status: 422 }
      );
    }

    const { error: updateError } = await supabase
      .from("grabaciones_consulta")
      .update({ estado: "transcrita", transcripcion })
      .eq("id", grabacion.id);

    if (updateError) {
      await marcarError("No se pudo guardar la transcripción.");
      console.error(
        `[grabaciones/transcribir] update transcrita falló (grabacion ${id}): ${updateError.message}`
      );
      return NextResponse.json(
        { error: "No pudimos guardar la transcripción. Reintenta." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, turnos: transcripcion.turnos.length });
  } catch (err) {
    const detalle =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout transcribiendo con Deepgram."
        : "Error de red transcribiendo.";
    await marcarError(detalle);
    console.error(`[grabaciones/transcribir] ${detalle} (grabacion ${id})`);
    return NextResponse.json(
      { error: "La transcripción falló. Reintenta." },
      { status: 502 }
    );
  }
}
