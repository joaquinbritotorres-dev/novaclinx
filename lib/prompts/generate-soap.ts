import "server-only";

export const SOAP_SYSTEM_PROMPT = `Eres un asistente de documentación clínica para médicos independientes en Latinoamérica.

Tu función es convertir la descripción del médico en una nota clínica estructurada en formato SOAP.

REGLAS QUE NUNCA PUEDES ROMPER:

1. Documenta ÚNICAMENTE lo que el médico dijo de forma explícita. No completes con protocolos, estándares clínicos ni inferencias.

2. La sección P del SOAP contiene SOLO las acciones que el médico mencionó. Sin recomendaciones genéricas, sin educación al paciente no mencionada, sin indicaciones de alimentación, actividad física, higiene ni hábitos que el médico no haya dicho.

3. El campo "indicaciones" es null si el médico no mencionó medicamentos, dosis ni instrucciones para el paciente. Null. No array vacío. No "manejo habitual". Null.

4. El campo "indicaciones" es SIEMPRE un array de strings o null. Nunca un string simple.
   Correcto: ["Paracetamol para la fiebre"]
   Correcto: null
   Incorrecto: "Paracetamol"

5. Si el médico menciona que el paciente "continúa con", "sigue tomando" o "mantiene" un medicamento, ese medicamento va en indicaciones con la palabra "Continuar" al inicio. Ejemplo: ["Continuar hierro 300mg", "Continuar ácido fólico"]

6. Si el médico mencionó un medicamento sin dosis, incluye el medicamento sin dosis. No inventes la dosis.

7. Los campos "seguimiento_plazo" y "seguimiento_motivo" son null si el médico no mencionó cuándo debe volver el paciente ni por qué.

8. NUNCA copies medicamentos, dosis, exámenes ni tratamientos de la CONSULTA ANTERIOR a la nota actual. La nota actual documenta solo la consulta de hoy.

9. Si falta información para una sección SOAP, escribe [pendiente] solo en esa sección.

10. No agregues si el médico no los mencionó: medicamentos, suplementos, vitaminas, exámenes, derivaciones, recomendaciones de dieta, ejercicio, reposo ni educación al paciente.

11. Los diagnósticos usan marcador presuntivo cuando el médico no estableció diagnóstico definitivo.

12. Responde exclusivamente con JSON válido. Sin texto antes. Sin texto después. Sin markdown.`;

export interface BuildUserPromptParams {
  inputMedico: string;
  nombrePaciente: string;
  edadPaciente?: number | null;
  sexoPaciente?: string | null;
  consultaAnteriorResumen?: string | null;
}

export function buildUserPrompt({
  inputMedico,
  nombrePaciente,
  edadPaciente,
  sexoPaciente,
  consultaAnteriorResumen,
}: BuildUserPromptParams): string {
  const partesPaciente: string[] = [`Paciente: ${nombrePaciente}`];
  if (edadPaciente) partesPaciente.push(`Edad: ${edadPaciente} años`);
  if (sexoPaciente) {
    const sexoLabel =
      sexoPaciente === "M"
        ? "Masculino"
        : sexoPaciente === "F"
          ? "Femenino"
          : "Otro";
    partesPaciente.push(`Sexo: ${sexoLabel}`);
  }

  const contextoPaciente = partesPaciente.join(", ");

  let consultaAnteriorBloque = "";
  if (consultaAnteriorResumen) {
    consultaAnteriorBloque = `\n\nCONSULTA ANTERIOR (SOLO CONTEXTO — NO COPIAR A LA NOTA ACTUAL):\n${consultaAnteriorResumen}`;
  }

  return `${contextoPaciente}${consultaAnteriorBloque}

DESCRIPCIÓN DEL MÉDICO:
${inputMedico}

Genera la nota SOAP para la consulta de HOY únicamente. Responde con JSON válido siguiendo exactamente este formato:
{
  "soap": "S: ...\\nO: ...\\nA: ...\\nP: ...",
  "indicaciones": ["texto"] | null,
  "seguimiento_plazo": "X semanas/meses" | null,
  "seguimiento_motivo": "motivo" | null,
  "resumen_corto": "una oración máximo"
}`;
}

export interface SoapOutput {
  soap: string;
  indicaciones: string[] | null;
  seguimiento_plazo: string | null;
  seguimiento_motivo: string | null;
  resumen_corto: string;
}

export function normalizeSoapOutput(raw: unknown): SoapOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Respuesta inválida del modelo");
  }

  const parsed = raw as Record<string, unknown>;

  const indicacionesRaw = parsed.indicaciones;
  let indicaciones: string[] | null = null;
  if (Array.isArray(indicacionesRaw)) {
    indicaciones = indicacionesRaw.filter(
      (i): i is string => typeof i === "string"
    );
    if (indicaciones.length === 0) indicaciones = null;
  } else if (typeof indicacionesRaw === "string" && indicacionesRaw.trim()) {
    indicaciones = [indicacionesRaw];
  }

  return {
    soap:
      typeof parsed.soap === "string"
        ? parsed.soap
        : "[Error: nota no generada]",
    indicaciones,
    seguimiento_plazo:
      typeof parsed.seguimiento_plazo === "string"
        ? parsed.seguimiento_plazo
        : null,
    seguimiento_motivo:
      typeof parsed.seguimiento_motivo === "string"
        ? parsed.seguimiento_motivo
        : null,
    resumen_corto:
      typeof parsed.resumen_corto === "string" ? parsed.resumen_corto : "",
  };
}
