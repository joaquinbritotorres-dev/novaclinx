/**
 * EVAL DE GENERACIÓN — herramienta de regresión de prompts (standalone).
 *
 * Corre generarNotaSOAP REAL contra 6 casos fixture y valida invariantes.
 * NO se importa desde la app. Cómo correrlo:
 *
 *   node --conditions=react-server scripts/eval-generacion.ts
 *   EVAL_RUNS=2 node --conditions=react-server scripts/eval-generacion.ts
 *
 * (--conditions=react-server hace que "server-only" resuelva a su empty.js;
 *  Node ≥23 ejecuta TypeScript nativo.)
 */
import { readFileSync } from "node:fs";

// Cargar .env.local (ANTHROPIC_API_KEY) antes de importar el módulo
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const { generarNotaSOAP } = await import("../lib/prompts/novaclinx-prompts-v1.ts");
type NovaclinxInput = Parameters<typeof generarNotaSOAP>[0];

// ─── Casos fixture ────────────────────────────────────────────────────────────

interface Caso {
  id: string;
  descripcionCaso: string;
  /** true si el peso está disponible en el input (dictado o historial) */
  tienePeso: boolean;
  input: NovaclinxInput;
}

const CASOS: Caso[] = [
  {
    id: "ped-primera-peso",
    descripcionCaso: "Pediatría primera vez, peso verbalizado",
    tienePeso: true,
    input: {
      especialidad: "pediatria",
      tipo_consulta: "primera_vez",
      paciente: { nombre_completo: "Martín Salazar", edad_anos: 2, edad_meses: 6, sexo: "masculino", cedula: null },
      descripcion_libre_del_medico:
        "Niño de 2 años 6 meses, pesa 13 kilos. Fiebre de 38.5 desde hace dos días, se jala la oreja derecha, irritable. Al examen tímpano derecho abombado e hiperémico. Otitis media aguda derecha. Le doy amoxicilina a 90 por kilo al día cada 12 horas por 10 días en suspensión, y paracetamol 15 por kilo por dosis cada 6 horas si fiebre.",
    },
  },
  {
    id: "ped-emilia-historial",
    descripcionCaso: "Pediatría subsecuente, peso 22 kg SOLO en historial (caso Emilia)",
    tienePeso: true,
    input: {
      especialidad: "pediatria",
      tipo_consulta: "subsecuente",
      // peso_kg llega por el canal real (glue extrae 22 kg del historial)
      paciente: { nombre_completo: "Emilia Cordero", edad_anos: 4, edad_meses: 2, sexo: "femenino", cedula: "0954321098", peso_kg: 22 },
      resumen_longitudinal:
        "Paciente preescolar con cuadros respiratorios altos a repetición. Última consulta hace 3 semanas (control sano): peso 22 kg, talla 104 cm, desarrollo acorde. Esquema de vacunación completo para la edad. Sin alergias conocidas registradas.",
      descripcion_libre_del_medico:
        "Emilia viene con fiebre de 39 y dolor de garganta desde hace dos días. Al examen amígdalas hipertróficas con exudado purulento bilateral, adenopatías cervicales anteriores dolorosas, no tos. Faringoamigdalitis estreptocócica. Le doy amoxicilina a 50 miligramos por kilo al día, cada 12 horas, por 10 días, en suspensión de 250 en 5. Paracetamol si fiebre.",
    },
  },
  {
    id: "mg-adulto",
    descripcionCaso: "Medicina general, adulto, dosis fija",
    tienePeso: false,
    input: {
      especialidad: "medicina_general",
      tipo_consulta: "primera_vez",
      paciente: { nombre_completo: "Carlos Mejía", edad_anos: 45, edad_meses: 0, sexo: "masculino", cedula: "1712345678" },
      descripcion_libre_del_medico:
        "Paciente de 45 años con cefalea tensional de una semana, asociada a estrés laboral, sin signos de alarma. Examen neurológico normal, tensión 130 sobre 85. Indico paracetamol 500 miligramos cada 8 horas por 5 días e higiene del sueño.",
    },
  },
  {
    id: "ped-insuficiente",
    descripcionCaso: "Pediatría, datos insuficientes (sin peso, sin examen)",
    tienePeso: false,
    input: {
      especialidad: "pediatria",
      tipo_consulta: "primera_vez",
      paciente: { nombre_completo: "Joaquín Vera", edad_anos: 3, edad_meses: 0, sexo: "masculino", cedula: null },
      descripcion_libre_del_medico:
        "Niño con tos y mocos desde ayer. Le doy amoxicilina en suspensión.",
    },
  },
  {
    id: "mg-alergia",
    descripcionCaso: "Medicina general, alergia a penicilina declarada",
    tienePeso: true,
    input: {
      especialidad: "medicina_general",
      tipo_consulta: "primera_vez",
      paciente: { nombre_completo: "Lucía Andrade", edad_anos: 30, edad_meses: 0, sexo: "femenino", cedula: "0102030405" },
      descripcion_libre_del_medico:
        "Paciente de 30 años, 60 kilos, alérgica a la penicilina. Faringoamigdalitis bacteriana: fiebre 38.8, exudado amigdalino, adenopatías. Indico azitromicina 500 miligramos el primer día y 250 miligramos del día dos al cinco, una toma diaria.",
    },
  },
  {
    id: "mg-cronico",
    descripcionCaso: "Medicina general, medicamento crónico (control)",
    tienePeso: false,
    input: {
      especialidad: "medicina_general",
      tipo_consulta: "subsecuente",
      paciente: { nombre_completo: "Ramiro Paredes", edad_anos: 62, edad_meses: 0, sexo: "masculino", cedula: "1709876543" },
      resumen_longitudinal:
        "Hipertensión arterial esencial diagnosticada en 2024, en tratamiento con losartán 50 mg una vez al día con buena adherencia. Última TA registrada 135/82.",
      descripcion_libre_del_medico:
        "Control de hipertensión. Hoy tensión 128 sobre 80, asintomático, buena adherencia. Continúa losartán 50 miligramos una vez al día por 90 días. Control en 3 meses con química sanguínea.",
    },
  },
];

// ─── Invariantes ─────────────────────────────────────────────────────────────

const CAMPOS_NARRATIVOS_PERMITIDOS = new Set([
  "soap.subjetivo",
  "soap.objetivo",
  "soap.analisis",
  "soap.plan",
  "seguimiento_motivo",
  "resumen_corto",
  "signos_alarma[]",
]);

const CORCHETE_RE = /\[[^\]]*\]/g;
const RANGO_DOSIS_RE = /\d+(?:[.,]\d+)?\s*[-–—]\s*\d+(?:[.,]\d+)?\s*(?:mg|mcg|ui)/i;

function esCorchetePermitido(token: string): boolean {
  if (token === "[NO REGISTRADO]") return true;
  if (/^\[VERIFICAR\s*[—-]\s*.+\]$/.test(token)) return true;
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validarCaso(caso: Caso, out: any): string[] {
  const fallos: string[] = [];

  // 1) Estructura completa de SoapOutput
  for (const k of ["soap", "cie10_codigo", "cie10_descripcion", "indicaciones", "signos_alarma", "seguimiento_plazo", "seguimiento_motivo", "resumen_corto"]) {
    if (!(k in (out ?? {}))) fallos.push(`estructura: falta campo '${k}'`);
  }
  for (const k of ["subjetivo", "objetivo", "analisis", "plan"]) {
    if (typeof out?.soap?.[k] !== "string" || !out.soap[k].trim()) {
      fallos.push(`estructura: soap.${k} vacío o no-string`);
    }
  }
  if (typeof out?.cie10_codigo !== "string" || !/^[A-Z][0-9]{2}(\.[0-9])?$/.test(out.cie10_codigo)) {
    fallos.push(`estructura: cie10_codigo inválido ('${out?.cie10_codigo}')`);
  }
  if (out?.indicaciones !== null && !Array.isArray(out?.indicaciones)) {
    fallos.push("estructura: indicaciones no es array ni null");
  }

  // Recolectar todos los strings con su ruta
  const campos: [string, string][] = [
    ["soap.subjetivo", out?.soap?.subjetivo ?? ""],
    ["soap.objetivo", out?.soap?.objetivo ?? ""],
    ["soap.analisis", out?.soap?.analisis ?? ""],
    ["soap.plan", out?.soap?.plan ?? ""],
    ["cie10_codigo", out?.cie10_codigo ?? ""],
    ["cie10_descripcion", out?.cie10_descripcion ?? ""],
    ["seguimiento_plazo", out?.seguimiento_plazo ?? ""],
    ["seguimiento_motivo", out?.seguimiento_motivo ?? ""],
    ["resumen_corto", out?.resumen_corto ?? ""],
  ];
  for (const s of out?.signos_alarma ?? []) campos.push(["signos_alarma[]", String(s)]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meds: any[] = Array.isArray(out?.indicaciones) ? out.indicaciones : [];
  meds.forEach((m, i) => {
    for (const k of ["dci", "nombreComercial", "formaFarmaceutica", "concentracion", "via", "dosis", "frecuencia", "indicacion"]) {
      if (typeof m?.[k] === "string") campos.push([`indicaciones[${i}].${k}`, m[k]]);
    }
  });

  // 2) Sin rangos en dosis estructurada cuando hay peso disponible
  if (caso.tienePeso) {
    meds.forEach((m, i) => {
      if (typeof m?.dosis === "string" && RANGO_DOSIS_RE.test(m.dosis)) {
        fallos.push(`rango con peso disponible: indicaciones[${i}].dosis = '${m.dosis}'`);
      }
    });
  }

  // 3) Vocabulario de corchetes
  for (const [ruta, texto] of campos) {
    const tokens = texto.match(CORCHETE_RE) ?? [];
    for (const t of tokens) {
      const esEstructuradoMed = ruta.startsWith("indicaciones[");
      if (esEstructuradoMed) {
        fallos.push(`corchete en campo estructurado de medicamento: ${ruta} contiene '${t}'`);
      } else if (!CAMPOS_NARRATIVOS_PERMITIDOS.has(ruta)) {
        fallos.push(`corchete fuera de campos narrativos: ${ruta} contiene '${t}'`);
      } else if (!esCorchetePermitido(t)) {
        fallos.push(`corchete fuera de vocabulario en ${ruta}: '${t}'`);
      }
    }
  }

  return fallos;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

const runs = parseInt(process.env.EVAL_RUNS ?? "1", 10);
let totalFallos = 0;

console.log(`# Eval de generación — ${CASOS.length} casos × ${runs} corrida(s)\n`);
console.log(`Fecha: ${new Date().toISOString()}\n`);

for (let run = 1; run <= runs; run++) {
  console.log(`## Corrida ${run}\n`);
  for (const caso of CASOS) {
    try {
      const out = await generarNotaSOAP(caso.input);
      const fallos = validarCaso(caso, out);
      if (fallos.length === 0) {
        console.log(`- ✅ ${caso.id} — ${caso.descripcionCaso}`);
      } else {
        totalFallos += fallos.length;
        console.log(`- ❌ ${caso.id} — ${caso.descripcionCaso}`);
        for (const f of fallos) console.log(`    - ${f}`);
      }
      if (caso.id === "ped-emilia-historial" && process.env.EVAL_DUMP_EMILIA) {
        console.log("\n### Borrador caso Emilia (dump completo)\n");
        console.log("```json\n" + JSON.stringify(out, null, 2) + "\n```\n");
      }
    } catch (err) {
      totalFallos += 1;
      console.log(`- 💥 ${caso.id} — excepción: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("");
}

console.log(`---\n**Total de violaciones: ${totalFallos}**`);
process.exit(totalFallos > 0 ? 1 : 0);
