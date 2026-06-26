import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Integración de un "añadido" del médico a una nota SOAP que ya está revisando.
 *
 * DISEÑO — GARANTÍA ESTRUCTURAL DE "SOLO AÑADIR":
 * El modelo NO reescribe el SOAP. Recibe el SOAP actual SOLO como contexto y
 * devuelve únicamente { seccion, texto_a_anadir }. El append lo hace el cliente
 * de forma determinista. Como el modelo nunca devuelve las otras secciones, es
 * físicamente imposible que altere lo que el médico no pidió cambiar (Subjetivo,
 * Análisis, Plan, recetas, signos de alarma, CIE-10, seguimiento).
 *
 * Las recetas y la lógica de dosis NUNCA se tocan por esta vía: si el añadido es
 * sobre medicación, el texto va al Plan; la receta estructurada se edita solo por
 * su propio flujo (MedicamentoCard).
 */

export const INTEGRAR_ANADIDO_MODEL = "claude-sonnet-4-6";

export type SeccionSoap = "subjetivo" | "objetivo" | "analisis" | "plan";

export const INTEGRAR_ANADIDO_SYSTEM_PROMPT = `Eres un asistente de documentación clínica para médicos en Ecuador.

El médico está revisando una nota SOAP ya generada y quiere AÑADIR un dato que faltó (lo escribió o lo dictó). Tu única tarea: decidir a qué sección del SOAP pertenece ese añadido y redactarlo en formato clínico formal, en español latinoamericano, para que el médico lo inserte ahí.

═══ REGLAS ABSOLUTAS — NUNCA ROMPER ═══

1. SOLO AÑADIR. Devuelves únicamente el texto NUEVO a insertar y la sección destino. NO reescribes, resumes, corriges ni repites nada de lo que ya está en la nota. El SOAP actual es SOLO contexto para que elijas bien la sección.

2. NO INVENTES. Redacta únicamente lo que el médico expresó en su añadido. No agregues cifras, hallazgos, diagnósticos ni datos que no haya dicho. Si el añadido es ambiguo, incierto o inaudible, inclúyelo marcando el dato dudoso con [VERIFICAR] inmediatamente después.

3. NO TOQUES MEDICACIÓN ESTRUCTURADA. Si el añadido menciona un medicamento, dosis o cambio de tratamiento, redáctalo como texto y asígnalo a la sección "plan". NUNCA calcules dosis ni asumas que se modifica una receta: eso lo hace el médico por otro flujo.

4. Una sola sección. Elige la MÁS apropiada:
   - subjetivo: lo que refiere el paciente/acompañante (síntomas, evolución, antecedentes relatados).
   - objetivo: hallazgos del examen y signos vitales (temperatura, FC, FR, peso, SatO2, etc.).
   - analisis: razonamiento o impresión diagnóstica.
   - plan: tratamiento, indicaciones, medidas, seguimiento.

5. Redacción: una o pocas frases clínicas, sin encabezados ni viñetas decorativas, sin comillas. No incluyas el nombre de la sección dentro del texto.

═══ FORMATO DE RESPUESTA ═══

Responde EXCLUSIVAMENTE con JSON válido, sin texto antes ni después, sin markdown:

{
  "seccion": "subjetivo" | "objetivo" | "analisis" | "plan",
  "texto_a_anadir": "el texto clínico a insertar",
  "requiere_verificar": true | false
}

"requiere_verificar" es true si el texto contiene algún [VERIFICAR].`;

export const INTEGRAR_ANADIDO_SCHEMA = {
  type: "object",
  properties: {
    seccion: {
      type: "string",
      enum: ["subjetivo", "objetivo", "analisis", "plan"],
    },
    texto_a_anadir: { type: "string" },
    requiere_verificar: { type: "boolean" },
  },
  required: ["seccion", "texto_a_anadir", "requiere_verificar"],
  additionalProperties: false,
} as const;

export interface IntegrarAnadidoInput {
  /** Estado ACTUAL de la nota (lo que el médico tiene editado en pantalla). */
  soapActual: {
    subjetivo: string;
    objetivo: string;
    analisis: string;
    plan: string;
  };
  /** Texto que el médico escribió o dictó para añadir. */
  textoAnadido: string;
}

export interface IntegrarAnadidoResultado {
  seccion: SeccionSoap;
  textoAAnadir: string;
  requiereVerificar: boolean;
}

export class IntegrarAnadidoError extends Error {}

function buildUserPrompt(input: IntegrarAnadidoInput): string {
  const { soapActual, textoAnadido } = input;
  return `<nota_soap_actual_solo_contexto>
  <subjetivo>${soapActual.subjetivo}</subjetivo>
  <objetivo>${soapActual.objetivo}</objetivo>
  <analisis>${soapActual.analisis}</analisis>
  <plan>${soapActual.plan}</plan>
</nota_soap_actual_solo_contexto>

<anadido_del_medico>
${textoAnadido}
</anadido_del_medico>

Decide la sección destino y redacta SOLO el texto nuevo a insertar. Responde con JSON válido según el esquema.`;
}

/**
 * Llama al modelo para decidir sección + redactar el añadido. Devuelve solo el
 * delta; el append lo hace el cliente. Lanza IntegrarAnadidoError (sin PHI) si
 * algo falla.
 */
export async function integrarAnadido(
  input: IntegrarAnadidoInput
): Promise<IntegrarAnadidoResultado> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new IntegrarAnadidoError("ANTHROPIC_API_KEY no está configurada.");
  }
  if (!input.textoAnadido.trim()) {
    throw new IntegrarAnadidoError("El añadido está vacío.");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: INTEGRAR_ANADIDO_MODEL,
    temperature: 0.0,
    max_tokens: 1500,
    system: INTEGRAR_ANADIDO_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: INTEGRAR_ANADIDO_SCHEMA,
      },
    },
  });

  const bloque = response.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") {
    throw new IntegrarAnadidoError("Respuesta sin bloque de texto.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bloque.text);
  } catch {
    throw new IntegrarAnadidoError("Respuesta del modelo no es JSON válido.");
  }

  return normalizarResultado(parsed);
}

const SECCIONES_VALIDAS: ReadonlySet<string> = new Set([
  "subjetivo",
  "objetivo",
  "analisis",
  "plan",
]);

/** Valida defensivamente la salida del modelo. */
export function normalizarResultado(raw: unknown): IntegrarAnadidoResultado {
  if (typeof raw !== "object" || raw === null) {
    throw new IntegrarAnadidoError("Estructura de respuesta inválida.");
  }
  const obj = raw as Record<string, unknown>;

  const seccion = obj.seccion;
  if (typeof seccion !== "string" || !SECCIONES_VALIDAS.has(seccion)) {
    throw new IntegrarAnadidoError("Sección destino inválida.");
  }

  const textoAAnadir =
    typeof obj.texto_a_anadir === "string" ? obj.texto_a_anadir.trim() : "";
  if (!textoAAnadir) {
    throw new IntegrarAnadidoError("El modelo no devolvió texto a añadir.");
  }

  // Fuente de verdad del aviso: el propio marcador en el texto, no solo el flag.
  const requiereVerificar =
    obj.requiere_verificar === true || /\[VERIFICAR/i.test(textoAAnadir);

  return {
    seccion: seccion as SeccionSoap,
    textoAAnadir,
    requiereVerificar,
  };
}
