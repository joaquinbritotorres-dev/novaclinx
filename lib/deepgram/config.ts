// lib/deepgram/config.ts
import "server-only";

/**
 * Fail-fast: sin DEEPGRAM_API_KEY las rutas de transcripción responden 500
 * con log explícito. Sin fallbacks silenciosos.
 */
export function getDeepgramApiKey(): string | null {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  return key || null;
}

export const DEEPGRAM_LISTEN_URL =
  "https://api.deepgram.com/v1/listen?model=nova-3&language=multi&diarize=true&smart_format=true&punctuate=true&utterances=true";
