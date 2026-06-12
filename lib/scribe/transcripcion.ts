// Parser de la respuesta de Deepgram → transcripción diarizada por turnos.
// Puro (sin I/O) para poder testearlo con mocks.

export interface DeepgramUtterance {
  speaker?: number;
  transcript?: string;
}

export interface TurnoTranscripcion {
  /** 1-based: "Hablante 1", "Hablante 2"… NO se asume cuál es el médico. */
  hablante: number;
  texto: string;
}

export interface TranscripcionDiarizada {
  turnos: TurnoTranscripcion[];
  /** Texto plano: "Hablante 1: …\nHablante 2: …" */
  texto: string;
}

/**
 * Agrupa utterances consecutivas del mismo speaker en un solo turno.
 * Speakers de Deepgram son 0-based → se exponen 1-based.
 */
export function parseUtterances(
  utterances: DeepgramUtterance[]
): TranscripcionDiarizada {
  const turnos: TurnoTranscripcion[] = [];

  for (const u of utterances) {
    const texto = (u.transcript ?? "").trim();
    if (!texto) continue;
    const hablante = (u.speaker ?? 0) + 1;
    const ultimo = turnos[turnos.length - 1];
    if (ultimo && ultimo.hablante === hablante) {
      ultimo.texto += " " + texto;
    } else {
      turnos.push({ hablante, texto });
    }
  }

  const texto = turnos
    .map((t) => `Hablante ${t.hablante}: ${t.texto}`)
    .join("\n");

  return { turnos, texto };
}
