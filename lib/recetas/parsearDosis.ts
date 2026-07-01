import type { UnidadDispensacion } from "./tipos";

/** Parses concentración string to mg/mL (liquid) or mg/unit (solid).
 *  "250 mg/5 mL" → 50 | "100 mg/mL" → 100 | "500 mg" → 500 */
export function parsearConcentracionMgMl(concentracion: string): number | null {
  const frac = concentracion.match(/(\d+(?:\.\d+)?)\s*mg\s*\/\s*(\d+(?:\.\d+)?)\s*mL/i);
  if (frac) return parseFloat(frac[1]) / parseFloat(frac[2]);
  const porMl = concentracion.match(/(\d+(?:\.\d+)?)\s*mg\s*\/\s*mL/i);
  if (porMl) return parseFloat(porMl[1]);
  const solido = concentracion.match(/^(\d+(?:\.\d+)?)\s*mg/i);
  if (solido) return parseFloat(solido[1]);
  return null;
}

/** Parses frecuencia string to tomas per day.
 *  "c/12h" → 2 | "c/8h" → 3 | "c/24h" → 1 */
export function parsearTomasPorDia(frecuencia: string): number {
  const f = frecuencia.toLowerCase();
  if (/c\/?4h|cada\s*4/.test(f)) return 6;
  if (/c\/?6h|cada\s*6/.test(f)) return 4;
  if (/c\/?8h|cada\s*8/.test(f)) return 3;
  if (/c\/?12h|cada\s*12/.test(f)) return 2;
  if (/c\/?24h|cada\s*24|1\s*vez|una\s*vez|diaria/.test(f)) return 1;
  if (/dosis\s*[úu]nica/.test(f)) return 1;
  return 2;
}

export interface DosisParsed {
  dosisMgKgDia: number | null;
  dosisPorTomaMg: number | null;
  esPorPeso: boolean;
}

/** Parses dosis string. Extracts mg/kg/día (por peso) or mg/toma (fija).
 *  "80-90 mg/kg/día" uses the upper bound. "[REQUIERE PESO]" leaves values null. */
export function parsearDosis(dosis: string): DosisParsed {
  const d = dosis.toLowerCase();
  // "80-90 mg/kg" → use max
  const rango = d.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*mg\s*\/\s*kg/);
  if (rango) return { dosisMgKgDia: parseFloat(rango[2]), dosisPorTomaMg: null, esPorPeso: true };
  // "50 mg/kg"
  const porPeso = d.match(/(\d+(?:\.\d+)?)\s*mg\s*\/\s*kg/);
  if (porPeso) return { dosisMgKgDia: parseFloat(porPeso[1]), dosisPorTomaMg: null, esPorPeso: true };
  // Fixed: "500 mg"
  const fija = dosis.match(/(\d+(?:\.\d+)?)\s*mg/);
  if (fija) return { dosisMgKgDia: null, dosisPorTomaMg: parseFloat(fija[1]), esPorPeso: false };
  return { dosisMgKgDia: null, dosisPorTomaMg: null, esPorPeso: false };
}

const LETRAS: Record<number, string> = {
  1: "un", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco",
  6: "seis", 7: "siete", 8: "ocho", 9: "nueve", 10: "diez",
  11: "once", 12: "doce", 14: "catorce", 15: "quince",
  20: "veinte", 21: "veintiún", 24: "veinticuatro", 28: "veintiocho", 30: "treinta",
  40: "cuarenta", 50: "cincuenta", 60: "sesenta", 100: "cien",
};

function toLetras(n: number): string {
  return LETRAS[n] ?? String(n);
}

/** Formats quantity for prescription (AM 00031-2020 format).
 *  Liquid:    "2 (dos) frascos de 150 mL"
 *  Solid:     "30 (treinta) comprimidos"
 *  Inhalador: "1 (un) inhalador de 200 dosis"
 *  Tópico:    "1 (un) tubo de 30 g" */
export function buildCantidadTexto(
  numEnvases: number,
  tamano: number,
  unidad: UnidadDispensacion
): string {
  if (unidad === "liquido") {
    const l = toLetras(numEnvases);
    return `${numEnvases} (${l}) frasco${numEnvases > 1 ? "s" : ""} de ${tamano} mL`;
  }
  if (unidad === "inhalador") {
    const l = toLetras(numEnvases);
    return `${numEnvases} (${l}) inhalador${numEnvases > 1 ? "es" : ""} de ${tamano} dosis`;
  }
  if (unidad === "topico") {
    const l = toLetras(numEnvases);
    return `${numEnvases} (${l}) tubo${numEnvases > 1 ? "s" : ""} de ${tamano} g`;
  }
  const total = numEnvases * tamano;
  const l = toLetras(total);
  return `${total} (${l}) comprimido${total > 1 ? "s" : ""}`;
}
