// Red de seguridad (sanity check) sobre el resultado YA CALCULADO de la receta.
//
// NO recalcula nada ni toca la fórmula: solo LEE el ResultadoCalculadora y avisa
// si un número es clínicamente IMPOSIBLE (producto de un error de dedo al elegir
// la unidad: mg↔mcg, mcg↔mcg/puff, etc.). Los umbrales son deliberadamente
// HOLGADOS: solo atrapan errores de orden de magnitud (10×/100×/1000×), nunca
// una dosis real por agresiva que sea.
//
// Discriminador principal: el valor POR TOMA (puffs/comprimidos/mL por toma).
// No depende de la duración del tratamiento — solo de dosis ÷ concentración —, así
// que un error de unidad lo dispara directamente. El número de envases es un
// respaldo con umbral muy alto, porque ESE sí escala con la duración (un crónico
// largo legítimo puede necesitar muchas cajas) y un umbral bajo lo castigaría.

import type { ResultadoCalculadora } from "./calcularDispensacion";
import type { UnidadDispensacion } from "./tipos";

/** Máximo POR TOMA tolerado antes de considerar el resultado imposible. */
export const MAX_POR_TOMA: Record<UnidadDispensacion, number> = {
  // Crisis asmática severa ambulatoria llega a 8-12 puffs/toma; 20 es ~2× eso.
  inhalador: 20,
  // Prednisona en dosis alta con comprimidos de 5 mg da 8-12 comp/toma (real);
  // 30 es 2.5× ese caso extremo legítimo.
  comprimido: 30,
  // Dosis pediátrica/adulto grande ~30 mL/toma; 60 mL (medio frasco de una vez)
  // no corresponde a ninguna pauta.
  liquido: 60,
};

/** Respaldo: nº de envases imposible. Muy alto a propósito (escala con duración). */
export const MAX_ENVASES = 500;

const TERMINO_POR_TOMA: Record<UnidadDispensacion, string> = {
  inhalador: "puffs por toma",
  comprimido: "comprimidos por toma",
  liquido: "mL por toma",
};

const TERMINO_ENVASE: Record<UnidadDispensacion, [string, string]> = {
  liquido: ["frasco", "frascos"],
  comprimido: ["envase", "envases"],
  inhalador: ["inhalador", "inhaladores"],
};

export interface ChequeoSanidad {
  /** true si el resultado pasa la cordura; false si es clínicamente imposible. */
  ok: boolean;
  /** Mensaje para el médico (presente solo cuando ok === false). No culpa: ayuda. */
  motivo?: string;
}

/** Quita la cola de float solo para el texto del mensaje (no afecta el cálculo). */
function fmtNum(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

/**
 * Mira el resultado calculado y la forma elegida; si el número es imposible,
 * devuelve ok:false con un mensaje que orienta al médico a revisar las medidas.
 * NUNCA bloquea una dosis real: los umbrales solo atrapan lo absurdo.
 */
export function chequearSanidad(
  resultado: ResultadoCalculadora,
  forma: UnidadDispensacion
): ChequeoSanidad {
  if (resultado.volumenOUnidadesPorToma > MAX_POR_TOMA[forma]) {
    return {
      ok: false,
      motivo:
        `Verifica la concentración y la dosis — el resultado calculado ` +
        `(${fmtNum(resultado.volumenOUnidadesPorToma)} ${TERMINO_POR_TOMA[forma]}) ` +
        `está fuera de lo esperado. Revisa que las medidas elegidas sean las correctas.`,
    };
  }

  if (resultado.numEnvases > MAX_ENVASES) {
    const [sing, plur] = TERMINO_ENVASE[forma];
    return {
      ok: false,
      motivo:
        `Verifica las medidas — el resultado calculado ` +
        `(${resultado.numEnvases} ${resultado.numEnvases === 1 ? sing : plur}) ` +
        `está fuera de lo esperado. Revisa la concentración, la dosis y el tamaño de envase.`,
    };
  }

  return { ok: true };
}
