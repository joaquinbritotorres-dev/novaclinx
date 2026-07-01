// Unidades de medida de los valores clínicos que el médico ingresa en la receta.
//
// El médico ELIGE la unidad de cada número; la calculadora recibe el valor ya
// NORMALIZADO a la unidad base que la fórmula espera (NO se toca la fórmula).
// Cada factor es un hecho métrico exacto (potencia de 10) o la división por el
// volumen de referencia (mg/5 mL = ÷5). Ninguna conversión depende de criterio
// clínico. Gotas/gtt se excluyen a propósito por conversión ambigua.
//
// Unidades base de calcularDispensacion:
//   - concentración: mg/mL (líquido), mg/comprimido (sólido), mg/puff (inhalador)
//   - dosis por toma: mg
//   - dosis por peso: mg/kg/día

import type { UnidadDispensacion } from "./tipos";

// ─── Tipos de unidad ──────────────────────────────────────────────────────────

export type UnidadConcentracion =
  | "mcg/mL"
  | "mg/mL"
  | "mg/2 mL"
  | "mg/5 mL"
  | "mg/10 mL"
  | "mcg"
  | "mg"
  | "g"
  | "mcg/puff"
  | "mg/puff"
  | "mg/g"
  | "%";

/** Dosis por MASA: se normaliza a mg y la calculadora la divide por la
 *  concentración para obtener las unidades de administración. */
export type UnidadDosisMasa = "mcg" | "mg" | "g";
/** Dosis DIRECTA en la unidad de administración: el médico dice cuántas por toma
 *  (ej. 2 puff, 5 mL, 1 tableta, 1 aplicación) y NO se divide por concentración. */
export type UnidadDosisDirecta = "puff" | "mL" | "tableta" | "aplicacion";
export type UnidadDosis = UnidadDosisMasa | UnidadDosisDirecta;

/** Dosis por peso. "…/día" = dosis DIARIA por kilo (se divide entre las tomas);
 *  "…/dosis" = dosis POR TOMA por kilo (NO se divide). El factor de masa (mg/mcg)
 *  es el mismo; solo cambia si se reparte entre las tomas o no. */
export type UnidadDosisPeso =
  | "mg/kg/día"
  | "mcg/kg/día"
  | "mg/kg/dosis"
  | "mcg/kg/dosis";

// ─── Factores exactos a la unidad base ───────────────────────────────────────

/** Concentración → unidad base de la forma (mg/mL, mg/comprimido o mg/puff). */
export const FACTOR_CONCENTRACION: Record<UnidadConcentracion, number> = {
  "mcg/mL": 0.001,
  "mg/mL": 1,
  "mg/2 mL": 0.5, // ÷2: 50 mg/2 mL = 25 mg/mL
  "mg/5 mL": 0.2, // ÷5: 250 mg/5 mL = 50 mg/mL
  "mg/10 mL": 0.1, // ÷10
  mcg: 0.001,
  mg: 1,
  g: 1000,
  "mcg/puff": 0.001, // 100 mcg/puff = 0.1 mg/puff
  "mg/puff": 1,
  // Tópicos: solo documentan la concentración; la cantidad (tubos) es manual,
  // así que estos factores no intervienen en ningún cálculo de dispensación.
  "mg/g": 1,
  "%": 10, // 1% p/p = 10 mg/g (exacto)
};

/** Dosis por toma (por masa) → mg. */
export const FACTOR_DOSIS: Record<UnidadDosisMasa, number> = {
  mcg: 0.001,
  mg: 1,
  g: 1000,
};

/** Dosis por peso → masa base (mg/kg). El factor solo convierte la masa; que sea
 *  por día o por dosis lo decide esDosisPesoPorToma(). */
export const FACTOR_DOSIS_PESO: Record<UnidadDosisPeso, number> = {
  "mg/kg/día": 1,
  "mcg/kg/día": 0.001,
  "mg/kg/dosis": 1,
  "mcg/kg/dosis": 0.001,
};

/** true si la dosis por peso es POR TOMA (mg/kg/dosis): la dosis por toma es
 *  valor × peso, SIN dividir entre las tomas del día. false si es POR DÍA
 *  (mg/kg/día): la dosis diaria se reparte entre las tomas. */
export function esDosisPesoPorToma(unidad: UnidadDosisPeso): boolean {
  return unidad === "mg/kg/dosis" || unidad === "mcg/kg/dosis";
}

// ─── Opciones de cada selector ───────────────────────────────────────────────
// El médico elige la medida de UN desplegable con TODOS los tipos, agrupados.
// La forma (líquido/comprimido/inhalador) se DERIVA de la medida elegida — el
// médico no la elige aparte. La IA nunca preselecciona: el selector arranca en
// "Elige la medida".

export interface GrupoConcentracion {
  label: string;
  unidades: UnidadConcentracion[];
}

export const CONCENTRACION_GRUPOS: GrupoConcentracion[] = [
  { label: "Líquido (por mL)", unidades: ["mcg/mL", "mg/mL", "mg/2 mL", "mg/5 mL", "mg/10 mL"] },
  { label: "Comprimido / cápsula (por unidad)", unidades: ["mcg", "mg", "g"] },
  { label: "Inhalador (por puff)", unidades: ["mcg/puff", "mg/puff"] },
  { label: "Crema / tópico", unidades: ["mg/g", "%"] },
];

/** Forma de dispensación implícita en la unidad de concentración elegida. */
const FORMA_DE_CONCENTRACION: Record<UnidadConcentracion, UnidadDispensacion> = {
  "mcg/mL": "liquido",
  "mg/mL": "liquido",
  "mg/2 mL": "liquido",
  "mg/5 mL": "liquido",
  "mg/10 mL": "liquido",
  mcg: "comprimido",
  mg: "comprimido",
  g: "comprimido",
  "mcg/puff": "inhalador",
  "mg/puff": "inhalador",
  "mg/g": "topico",
  "%": "topico",
};

export function formaDeUnidadConcentracion(u: UnidadConcentracion): UnidadDispensacion {
  return FORMA_DE_CONCENTRACION[u];
}

export const DOSIS_OPCIONES: UnidadDosis[] = ["mcg", "mg", "g"];
export const DOSIS_PESO_OPCIONES: UnidadDosisPeso[] = [
  "mg/kg/día",
  "mcg/kg/día",
  "mg/kg/dosis",
  "mcg/kg/dosis",
];

/**
 * Unidades de dosis por toma disponibles según la forma:
 *  - Inhalador → "puff" (directa; el médico prescribe en disparos).
 *  - Líquido / comprimido → masa (mcg/mg/g), que se convierte por concentración.
 */
export function dosisOpcionesPorForma(forma: UnidadDispensacion): UnidadDosis[] {
  if (forma === "inhalador") return ["puff"];
  if (forma === "topico") return ["aplicacion"];
  if (forma === "liquido") return ["mcg", "mg", "g", "mL"];
  return ["mcg", "mg", "g", "tableta"]; // comprimido
}

/** true si la dosis se ingresa DIRECTA en unidades de administración (no masa). */
export function esUnidadDosisDirecta(u: UnidadDosis): u is UnidadDosisDirecta {
  return u === "puff" || u === "mL" || u === "tableta" || u === "aplicacion";
}

// ─── Limpieza de float ───────────────────────────────────────────────────────

/**
 * Elimina la cola de punto flotante binario SIN perder precisión real: redondea
 * a 12 cifras significativas (la cola aparece tras ~15-16). A diferencia del
 * fmt de 2 decimales del display, esto preserva dosis sub-miligramo (1 mcg =
 * 0.001 mg no debe colapsar a 0).
 *   100 × 0.001 = 0.1 (no 0.10000000000000002)
 *   250 × 0.2   = 50
 */
export function limpiarFloat(n: number): number {
  if (!Number.isFinite(n) || n === 0) return n;
  return parseFloat(n.toPrecision(12));
}

// ─── Normalización (valor × factor, sin cola de float) ───────────────────────

export function normalizarConcentracion(valor: number, unidad: UnidadConcentracion): number {
  return limpiarFloat(valor * FACTOR_CONCENTRACION[unidad]);
}

export function normalizarDosis(valor: number, unidad: UnidadDosisMasa): number {
  return limpiarFloat(valor * FACTOR_DOSIS[unidad]);
}

export function normalizarDosisPeso(valor: number, unidad: UnidadDosisPeso): number {
  return limpiarFloat(valor * FACTOR_DOSIS_PESO[unidad]);
}

// ─── Parseo del string de la IA → unidad (DEFAULT del selector) ──────────────
// Si NO se reconoce una unidad de la tabla, devuelve null: el componente arranca
// SIN unidad seleccionada y bloquea "Confirmar" — NUNCA se asume mg por default.

/** Detecta la unidad de concentración rotulada por la IA. null si no la conoce. */
export function parsearUnidadConcentracion(concentracion: string): UnidadConcentracion | null {
  const s = concentracion.toLowerCase();

  // Inhalador (puff/dosis/disparo)
  if (/\d\s*mcg\s*\/\s*(puff|dosis|disparo|inhalaci)/.test(s)) return "mcg/puff";
  if (/\d\s*mg\s*\/\s*(puff|dosis|disparo|inhalaci)/.test(s)) return "mg/puff";

  // Líquido con volumen de referencia: "mg/5 mL", "mg/mL", etc.
  const frac = s.match(/\d\s*mg\s*\/\s*(\d+)\s*ml/);
  if (frac) {
    const div = parseInt(frac[1], 10);
    if (div === 1) return "mg/mL";
    if (div === 2) return "mg/2 mL";
    if (div === 5) return "mg/5 mL";
    if (div === 10) return "mg/10 mL";
    return null; // otro divisor fuera de la tabla → el médico elige
  }
  if (/\d\s*mcg\s*\/\s*ml/.test(s)) return "mcg/mL";
  if (/\d\s*mg\s*\/\s*ml/.test(s)) return "mg/mL";

  // Masa por unidad (comprimido), sin "/" después
  if (/\d\s*mcg\b(?!\s*\/)/.test(s)) return "mcg";
  if (/\d\s*mg\b(?!\s*\/)/.test(s)) return "mg";
  if (/\d\s*g\b(?!\s*\/)/.test(s)) return "g";

  return null;
}

/** Valor numérico TAL CUAL del string de concentración (250 de "250 mg/5 mL"). */
export function parsearValorConcentracion(concentracion: string): number | null {
  const m = concentracion.match(/(\d+(?:[.,]\d+)?)\s*(?:mcg|mg|g)\b/i);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

/** Detecta la unidad de la dosis por toma (masa). El lookahead evita mg/kg, mcg/puff. */
export function parsearUnidadDosis(dosis: string): UnidadDosis | null {
  const m = dosis.match(/\d\s*(mcg|mg|g)(?![\/a-záéíóú])/i);
  if (!m) return null;
  const u = m[1].toLowerCase();
  return u === "mcg" ? "mcg" : u === "g" ? "g" : "mg";
}

/** Valor numérico de la dosis por toma (200 de "200 mcg"). */
export function parsearValorDosis(dosis: string): number | null {
  const m = dosis.match(/(\d+(?:[.,]\d+)?)\s*(?:mcg|mg|g)(?![\/a-záéíóú])/i);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

/** Detecta la unidad de la dosis por peso. */
export function parsearUnidadDosisPeso(dosis: string): UnidadDosisPeso | null {
  const s = dosis.toLowerCase();
  if (/\d\s*mcg\s*\/\s*kg/.test(s)) return "mcg/kg/día";
  if (/\d\s*mg\s*\/\s*kg/.test(s)) return "mg/kg/día";
  return null;
}
