import type { MedicamentoPropuesto } from "./tipos";

export type ResultadoParseIndicaciones =
  | { tipo: "estructurado"; medicamentos: MedicamentoPropuesto[] }
  | { tipo: "legado"; indicaciones: string[] }
  | null;

/**
 * Detecta el formato de la columna `consultas.indicaciones` (TEXT → JSON).
 * - Array de objetos con clave "dci" → formato estructurado (MedicamentoPropuesto[])
 * - Array de strings → formato legado
 */
export function parseIndicaciones(raw: string | null): ResultadoParseIndicaciones {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const first = parsed[0];
  if (typeof first === "object" && first !== null && "dci" in first) {
    return { tipo: "estructurado", medicamentos: parsed as MedicamentoPropuesto[] };
  }
  if (typeof first === "string") {
    return { tipo: "legado", indicaciones: parsed as string[] };
  }
  return null;
}
