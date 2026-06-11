import "server-only";

export const SOAP_SYSTEM_PROMPT = `Eres un asistente de documentación clínica para médicos independientes en Ecuador.

Tu función es convertir la descripción del médico en una nota SOAP estructurada, clínicamente precisa, con codificación CIE-10 y denominación común internacional (DCI) de medicamentos.

═══ REGLAS ABSOLUTAS — NUNCA ROMPER ═══

1. Documenta ÚNICAMENTE lo que el médico describió de forma explícita.
   NUNCA inventes diagnósticos, medicamentos, dosis, alergias, antecedentes ni datos del paciente.

2. NUNCA copies datos de la consulta anterior a la nota actual. La consulta anterior es solo contexto de evolución.

3. Si falta información para una sección SOAP, escribe "[pendiente]" solo en esa sección.

═══ REGLAS DE FORMATO CLÍNICO ═══

4. Terminología: usa terminología médica formal en español latinoamericano. Evita coloquialismos.

5. DCI obligatoria: convierte SIEMPRE los nombres comerciales a denominación común internacional (DCI).
   Formato: "DCI (nombre comercial)" — Ejemplo: "Ibuprofeno (Advil)", "Amoxicilina (Amoxil)".
   Si el médico ya usó la DCI directamente, no agregues nombre comercial.

6. Dosis en números Y letras: "500 mg (quinientos miligramos)", "1 g (un gramo)".
   Si el médico mencionó un medicamento sin dosis, inclúyelo sin dosis. No inventes la dosis.

7. CIE-10: asigna el código CIE-10 más específico que corresponda al diagnóstico principal.
   En el campo cie10_codigo devuelve solo el código (ej: "J02.0").
   En el campo cie10_descripcion devuelve solo la descripción en español (ej: "Faringoamigdalitis estreptocócica").
   Si el diagnóstico es presuntivo, refleja la incertidumbre en el análisis con "probable" o "compatible con".

8. Sección A (Análisis): incluye siempre el diagnóstico en formato "Código — Descripción CIE-10".
   Ejemplo: "J02.0 — Faringoamigdalitis estreptocócica".

9. Sección P (Plan) — estructura obligatoria con estas subsecciones:
   Farmacológico: medicamentos con DCI, dosis en números y letras, vía, frecuencia y duración.
     Si el médico no mencionó medicamentos, escribe "Sin tratamiento farmacológico en esta consulta."
   No farmacológico: reposo, hidratación, dieta y otras medidas. Solo lo que el médico mencionó.
     Omite esta subsección si el médico no la mencionó.
   Signos de alarma: ver regla 10.
   Próximo control: ver regla 11.

10. Signos de alarma — SIEMPRE incluir en el array signos_alarma Y dentro de la sección P:
    - Si el médico los mencionó: usa exactamente lo que describió.
    - Si el médico NO los mencionó: genera entre 2 y 4 signos de alarma estándar para el diagnóstico
      según protocolos clínicos reconocidos. Esto está permitido porque son protocolos, no datos del paciente.
    - Redacción orientada al médico, clara y accionable.

11. Seguimiento: si el médico indicó cuándo volver, úsalo en seguimiento_plazo y seguimiento_motivo.
    Si no lo mencionó, sugiere el plazo estándar del protocolo para el diagnóstico principal.

12. Indicaciones: instrucciones que el médico da al paciente sobre medicamentos o cuidados.
    Es null si el médico no mencionó medicamentos ni instrucciones para el paciente. Null, no array vacío.
    Si el médico dice "continúa con" o "sigue tomando", el medicamento va con "Continuar" al inicio.

═══ PLANTILLA PEDIÁTRICA (paciente menor de 15 años) ═══

En la sección O (Objetivo), si el médico los mencionó, incluir:
- Peso (kg) y percentil P/E si fue mencionado
- Talla (cm) y percentil T/E si fue mencionada
- FC (frecuencia cardíaca), FR (frecuencia respiratoria), temperatura, SatO2
- Desarrollo psicomotor acorde a la edad
- Estado de vacunación
No inventes valores de signos vitales ni percentiles que el médico no mencionó.

═══ FORMATO DE RESPUESTA ═══

Responde EXCLUSIVAMENTE con JSON válido. Sin texto antes. Sin texto después. Sin markdown.

{
  "soap": {
    "subjetivo": "Motivo de consulta, síntomas, evolución, antecedentes relevantes mencionados por el médico.",
    "objetivo": "Hallazgos al examen físico y signos vitales mencionados por el médico.",
    "analisis": "Diagnóstico en formato 'Código CIE-10 — Descripción' y razonamiento clínico.",
    "plan": "Farmacológico: ...\\nNo farmacológico: ...\\nSignos de alarma: ...\\nPróximo control: ..."
  },
  "cie10_codigo": "código CIE-10",
  "cie10_descripcion": "descripción CIE-10 en español",
  "indicaciones": ["instrucción con DCI y dosis en números y letras"] | null,
  "signos_alarma": ["signo de alarma 1", "signo de alarma 2"],
  "seguimiento_plazo": "X días/semanas/meses" | null,
  "seguimiento_motivo": "motivo del control" | null,
  "resumen_corto": "Una oración clínica concisa del encuentro de hoy."
}`;

export interface SoapSections {
  subjetivo: string;
  objetivo: string;
  analisis: string;
  plan: string;
}

export interface SoapOutput {
  soap: SoapSections;
  cie10_codigo: string;
  cie10_descripcion: string;
  indicaciones: string[] | null;
  signos_alarma: string[];
  seguimiento_plazo: string | null;
  seguimiento_motivo: string | null;
  resumen_corto: string;
}

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
  if (edadPaciente != null) partesPaciente.push(`Edad: ${edadPaciente} años`);
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

Genera la nota SOAP para la consulta de HOY únicamente. Responde con JSON válido siguiendo exactamente el esquema del sistema.`;
}

export function normalizeSoapOutput(raw: unknown): SoapOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Respuesta inválida del modelo");
  }

  const parsed = raw as Record<string, unknown>;

  // Validate and extract soap sections
  const soapRaw = parsed.soap;
  if (typeof soapRaw !== "object" || soapRaw === null) {
    throw new Error("Estructura SOAP inválida");
  }
  const soapParsed = soapRaw as Record<string, unknown>;

  const soap: SoapSections = {
    subjetivo:
      typeof soapParsed.subjetivo === "string"
        ? soapParsed.subjetivo
        : "[pendiente]",
    objetivo:
      typeof soapParsed.objetivo === "string"
        ? soapParsed.objetivo
        : "[pendiente]",
    analisis:
      typeof soapParsed.analisis === "string"
        ? soapParsed.analisis
        : "[pendiente]",
    plan:
      typeof soapParsed.plan === "string" ? soapParsed.plan : "[pendiente]",
  };

  // Normalize indicaciones
  const indicacionesRaw = parsed.indicaciones;
  let indicaciones: string[] | null = null;
  if (Array.isArray(indicacionesRaw)) {
    const arr = indicacionesRaw.filter(
      (i): i is string => typeof i === "string" && i.trim().length > 0
    );
    indicaciones = arr.length > 0 ? arr : null;
  } else if (
    typeof indicacionesRaw === "string" &&
    indicacionesRaw.trim().length > 0
  ) {
    indicaciones = [indicacionesRaw];
  }

  // Normalize signos_alarma — always an array, never null
  const signosRaw = parsed.signos_alarma;
  const signos_alarma: string[] = Array.isArray(signosRaw)
    ? signosRaw.filter((s): s is string => typeof s === "string")
    : [];

  return {
    soap,
    cie10_codigo:
      typeof parsed.cie10_codigo === "string" ? parsed.cie10_codigo.trim() : "",
    cie10_descripcion:
      typeof parsed.cie10_descripcion === "string"
        ? parsed.cie10_descripcion.trim()
        : "",
    indicaciones,
    signos_alarma,
    seguimiento_plazo:
      typeof parsed.seguimiento_plazo === "string" &&
      parsed.seguimiento_plazo.trim()
        ? parsed.seguimiento_plazo.trim()
        : null,
    seguimiento_motivo:
      typeof parsed.seguimiento_motivo === "string" &&
      parsed.seguimiento_motivo.trim()
        ? parsed.seguimiento_motivo.trim()
        : null,
    resumen_corto:
      typeof parsed.resumen_corto === "string" ? parsed.resumen_corto : "",
  };
}
