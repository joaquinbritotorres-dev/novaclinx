import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getDeepgramApiKey, DEEPGRAM_LISTEN_URL } from "@/lib/deepgram/config";
import { parseUtterances, type DeepgramUtterance } from "@/lib/scribe/transcripcion";

// Clip corto de "se me olvidó X"; no necesita los 300 s del scribe.
export const maxDuration = 60;

// Tope defensivo para un clip corto (el scribe largo va por otro flujo).
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Transcribe un clip de audio CORTO del médico (un añadido a la nota que está
 * revisando). Reusa la MISMA infraestructura Deepgram del scribe (config + URL +
 * parseUtterances), pero NO persiste el audio: se recibe en memoria, se manda a
 * Deepgram y se descarta. Política más estricta que el scribe (que sí lo guarda
 * temporal y lo borra al aprobar/descartar). Cero PHI en logs.
 *
 * Devuelve el texto plano (sin etiquetas "Hablante N:"): el añadido es del médico.
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    console.error(
      "[transcribir-anadido] DEEPGRAM_API_KEY no está configurada — transcripción deshabilitada."
    );
    return NextResponse.json(
      { error: "La transcripción no está disponible en este momento." },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") || "audio/webm";
  if (!contentType.startsWith("audio/")) {
    return NextResponse.json(
      { error: "Formato de audio no válido." },
      { status: 400 }
    );
  }

  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) {
    return NextResponse.json(
      { error: "No se recibió audio." },
      { status: 400 }
    );
  }
  if (audio.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "El audio es demasiado largo. Graba un mensaje corto." },
      { status: 413 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let res: Response;
    try {
      res = await fetch(DEEPGRAM_LISTEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audio,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`[transcribir-anadido] Deepgram HTTP ${res.status}`);
      return NextResponse.json(
        { error: "La transcripción falló. Reintenta o escribe el texto." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      results?: { utterances?: DeepgramUtterance[] };
    };
    const utterances = data.results?.utterances ?? [];
    const transcripcion = parseUtterances(utterances);

    // Un solo hablante (el médico): texto plano sin prefijos "Hablante N:".
    const texto = transcripcion.turnos.map((t) => t.texto).join(" ").trim();

    if (!texto) {
      return NextResponse.json(
        { error: "No se detectó voz. Reintenta o escribe el texto." },
        { status: 422 }
      );
    }

    return NextResponse.json({ texto });
  } catch (err) {
    const detalle =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout transcribiendo con Deepgram."
        : "Error de red transcribiendo.";
    console.error(`[transcribir-anadido] ${detalle}`);
    return NextResponse.json(
      { error: "La transcripción falló. Reintenta o escribe el texto." },
      { status: 502 }
    );
  }
}
