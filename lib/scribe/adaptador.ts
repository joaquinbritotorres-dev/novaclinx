// Adaptador: transcripción diarizada → descripción clínica condensada con el
// MISMO contrato de entrada del modo escrito (descripcion: string 10–4999).
// NO toca el módulo SOAP: produce el texto que ese módulo ya sabe consumir.
import "server-only";

import Anthropic from "@anthropic-ai/sdk";

export const ADAPTADOR_MODEL = "claude-sonnet-4-6";

export const ADAPTADOR_SYSTEM_PROMPT = `Eres un condensador clínico para consultas médicas en Ecuador.

Recibes la transcripción diarizada de una consulta médica grabada, con turnos marcados como "Hablante 1:", "Hablante 2:", etc. Los números NO indican roles: identifica por el CONTENIDO de lo dicho quién es el médico (pregunta, examina, indica tratamiento) y quién el paciente o acompañante (relata síntomas, responde).

Tu única tarea: redactar la descripción condensada de la consulta tal como la escribiría el médico al documentarla, en español, en prosa clínica breve.

Reglas estrictas:
1. Extrae SOLO lo dicho en la conversación. No inventes NADA: ni síntomas, ni cifras, ni hallazgos, ni dosis, ni diagnósticos que no se hayan mencionado.
2. Todo dato dudoso, inaudible o ambiguo va marcado con [VERIFICAR] inmediatamente después del dato.
3. Estructura natural del modo escrito: motivo de consulta y evolución, hallazgos del examen referidos, impresión diagnóstica si se mencionó, plan/medicación con las dosis EXACTAS que se dijeron, indicaciones y seguimiento.
4. Omite saludos, charla social y repeticiones.
5. Salida: SOLO el texto de la descripción, sin encabezados, sin comillas, sin comentarios. Máximo 4500 caracteres.`;

/** Mínimo del contrato del modo escrito (descripcion.trim().length >= 10). */
const MIN_SALIDA = 10;
const MAX_SALIDA = 4999;

export class AdaptadorError extends Error {}

/**
 * Convierte la transcripción diarizada en la `descripcion` del modo escrito.
 * Lanza AdaptadorError con mensaje técnico (sin PHI) si algo falla.
 */
export async function adaptarTranscripcion(
  textoDiarizado: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AdaptadorError("ANTHROPIC_API_KEY no está configurada.");
  }
  if (!textoDiarizado.trim()) {
    throw new AdaptadorError("Transcripción vacía.");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: ADAPTADOR_MODEL,
    max_tokens: 2000,
    system: ADAPTADOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `<transcripcion>\n${textoDiarizado}\n</transcripcion>`,
      },
    ],
  });

  const bloque = response.content.find((b) => b.type === "text");
  const descripcion = (bloque && "text" in bloque ? bloque.text : "").trim();

  if (descripcion.length < MIN_SALIDA) {
    throw new AdaptadorError(
      "El adaptador no produjo una descripción utilizable."
    );
  }

  return descripcion.slice(0, MAX_SALIDA);
}
