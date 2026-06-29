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
  | "mg/mL"
  | "mg/5 mL"
  | "mcg/mL"
  | "mg"
  | "mcg"
  | "g"
  | "mcg/puff"
  | "mg/puff";

export type UnidadDosis = "mg" | "mcg" | "g";

export type UnidadDosisPeso = "mg/kg/día" | "mcg/kg/día";

// ─── Factores exactos a la unidad base ───────────────────────────────────────

/** Concentración → unidad base de la forma (mg/mL, mg/comprimido o mg/puff). */
export const FACTOR_CONCENTRACION: Record<UnidadConcentracion, number> = {
  "mg/mL": 1,
  "mg/5 mL": 0.2, // ÷5: 250 mg/5 mL = 50 mg/mL
  "mcg/mL": 0.001,
  mg: 1,
  mcg: 0.001,
  g: 1000,
  "mcg/puff": 0.001, // 100 mcg/puff = 0.1 mg/puff
  "mg/puff": 1,
};

/** Dosis por toma → mg. */
export const FACTOR_DOSIS: Record<UnidadDosis, number> = {
  mg: 1,
  mcg: 0.001,
  g: 1000,
};

/** Dosis por peso → mg/kg/día. */
export const FACTOR_DOSIS_PESO: Record<UnidadDosisPeso, number> = {
  "mg/kg/día": 1,
  "mcg/kg/día": 0.001,
};

// ─── Opciones de cada selector ───────────────────────────────────────────────
// Las unidades de concentración DEPENDEN de la forma (ofrecer "mg/mL" para un
// comprimido sería absurdo y peligroso). La dosis es masa pura, independiente.

export const CONCENTRACION_POR_FORMA: Record<UnidadDispensacion, UnidadConcentracion[]> = {
  liquido: ["mg/mL", "mg/5 mL", "mcg/mL"],
  comprimido: ["mg", "mcg", "g"],
  inhalador: ["mcg/puff", "mg/puff"],
};

export const DOSIS_OPCIONES: UnidadDosis[] = ["mg", "mcg", "g"];
export const DOSIS_PESO_OPCIONES: UnidadDosisPeso[] = ["mg/kg/día", "mcg/kg/día"];

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

export function normalizarDosis(valor: number, unidad: UnidadDosis): number {
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

  // Líquido con volumen de referencia: "mg/5 mL", "mg/mL"
  const frac = s.match(/\d\s*mg\s*\/\s*(\d+)\s*ml/);
  if (frac) {
    const div = parseInt(frac[1], 10);
    if (div === 1) return "mg/mL";
    if (div === 5) return "mg/5 mL";
    return null; // "/10 mL" u otros: fuera de la tabla aprobada → el médico elige
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
