/**
 * Redondea un volumen en mL hacia arriba al múltiplo de 0.5 más cercano.
 * Las jeringas pediátricas están marcadas cada 0.5 mL; administrar menos
 * de la dosis calculada subodosiifica al paciente.
 *
 * Ejemplos exactos:
 *   9.0  → 9.0   (ya múltiplo, no cambia)
 *   9.1  → 9.5
 *   9.3  → 9.5
 *   9.5  → 9.5   (ya múltiplo, no cambia)
 *   9.6  → 10.0
 *   2.58 → 3.0
 *
 * La tolerancia de 1e-9 evita que 9.0 (representado como 8.9999999…
 * por punto flotante) ascienda erróneamente a 9.5.
 */
export function redondearMlJeringa(ml: number): number {
  const TOL = 1e-9;
  const multiplos = ml / 0.5;
  const techo = Math.ceil(multiplos - TOL);
  return techo * 0.5;
}

/**
 * Redondea el número de puffs/disparos de un inhalador al entero MÁS CERCANO,
 * con piso de 1. Un inhalador dispensa dosis discretas: no existe medio puff.
 *
 * A diferencia de los líquidos (redondeo SIEMPRE hacia arriba por la jeringa,
 * porque subdosificar un antibiótico es el peligro dominante), los inhaladores
 * se redondean al MÁS CERCANO: sobredosificar un broncodilatador o corticoide
 * inhalado tiene riesgo real (taquicardia, efectos adversos), simétrico al de
 * subdosificar. El piso de 1 evita prescribir 0 puffs ante datos incoherentes.
 *
 * Ejemplos:
 *   2.0 → 2   2.4 → 2   2.5 → 3   2.6 → 3   0.4 → 1   1.0 → 1
 */
export function redondearPuffEntero(puffs: number): number {
  return Math.max(1, Math.round(puffs));
}

export interface EntradaCalculadora {
  /** Dosis directa por toma en mg (alternativa a dosisMgKgDia+pesoKg) */
  dosisPorTomaMg?: number;
  /** Unidades de administración por toma ingresadas DIRECTAMENTE (ej. 2 puff).
   *  Si viene, es el volumen/unidades por toma tal cual — NO se divide por la
   *  concentración (la concentración solo documenta la dosis en mg). */
  unidadesPorTomaDirectas?: number;
  /** Dosis en mg/kg/día (requiere pesoKg) */
  dosisMgKgDia?: number;
  /** Peso del paciente en kg */
  pesoKg?: number;
  /** Concentración: mg/mL para líquidos, mg por unidad para sólidos */
  concentracion: number;
  /** Tomas por día (c/24h=1, c/12h=2, c/8h=3, c/6h=4) */
  tomasPorDia: number;
  /** Duración del tratamiento en días */
  diasTratamiento: number;
  /** Tamaño del envase: mL para líquidos, unidades para sólidos */
  tamanoEnvase: number;
  /** Medicación a demanda (PRN) — no se calcula cantidad automática */
  esPRN: boolean;
  /** true para líquidos: aplica redondeo al 0.5 mL superior en volumenOUnidadesPorToma */
  esLiquido?: boolean;
  /** true para inhaladores: redondea los puffs al entero más cercano (mín. 1).
   *  Excluyente con esLiquido; si ambos llegaran true, manda esLiquido. */
  esInhalador?: boolean;
}

export interface ResultadoCalculadora {
  dosisPorTomaMg: number;
  /** mL por toma (líquidos) o unidades por toma (sólidos) */
  volumenOUnidadesPorToma: number;
  /** Total de mL o unidades necesarios para el tratamiento completo */
  totalNecesario: number;
  /** Envases a dispensar = Math.ceil(totalNecesario / tamanoEnvase) */
  numEnvases: number;
  /** mL o unidades realmente dispensados (numEnvases × tamanoEnvase) */
  totalDispensado: number;
}

export type ResultadoCalculo =
  | { ok: true; resultado: ResultadoCalculadora }
  | { ok: false; requiereCantidadManual: true; razon: "PRN" }
  | { ok: false; requiereCantidadManual: false; razon: string };

export function calcularDispensacion(entrada: EntradaCalculadora): ResultadoCalculo {
  if (entrada.esPRN) {
    return { ok: false, requiereCantidadManual: true, razon: "PRN" };
  }

  if (entrada.tamanoEnvase <= 0) {
    return { ok: false, requiereCantidadManual: false, razon: "Tamaño de envase debe ser > 0" };
  }

  let dosisPorTomaMg: number;
  let volumenOUnidadesPorToma: number;

  if (entrada.unidadesPorTomaDirectas !== undefined) {
    // Modo DIRECTO: el médico ingresó las unidades de administración (ej. 2 puff).
    // NO se divide por la concentración; ese número ES el volumen/unidades por
    // toma. La concentración solo documenta la dosis equivalente en mg.
    const raw = entrada.unidadesPorTomaDirectas;
    volumenOUnidadesPorToma = entrada.esLiquido
      ? redondearMlJeringa(raw)
      : entrada.esInhalador
      ? redondearPuffEntero(raw)
      : raw;
    dosisPorTomaMg = volumenOUnidadesPorToma * entrada.concentracion;
  } else {
    // Modo por MASA: dosis en mg (directa o derivada de mg/kg/día) ÷ concentración.
    if (entrada.dosisPorTomaMg !== undefined) {
      dosisPorTomaMg = entrada.dosisPorTomaMg;
    } else if (entrada.dosisMgKgDia !== undefined && entrada.pesoKg !== undefined) {
      const dosisDiariaMg = entrada.dosisMgKgDia * entrada.pesoKg;
      dosisPorTomaMg = dosisDiariaMg / entrada.tomasPorDia;
    } else {
      return {
        ok: false,
        requiereCantidadManual: false,
        razon: "Debe proveer dosisPorTomaMg, unidadesPorTomaDirectas o dosisMgKgDia + pesoKg",
      };
    }

    if (entrada.concentracion <= 0) {
      return { ok: false, requiereCantidadManual: false, razon: "Concentración debe ser > 0" };
    }

    const rawVolumen = dosisPorTomaMg / entrada.concentracion;
    volumenOUnidadesPorToma = entrada.esLiquido
      ? redondearMlJeringa(rawVolumen)
      : entrada.esInhalador
      ? redondearPuffEntero(rawVolumen)
      : rawVolumen;
  }

  const totalNecesario = volumenOUnidadesPorToma * entrada.tomasPorDia * entrada.diasTratamiento;
  const numEnvases = Math.ceil(totalNecesario / entrada.tamanoEnvase);
  const totalDispensado = numEnvases * entrada.tamanoEnvase;

  return {
    ok: true,
    resultado: {
      dosisPorTomaMg,
      volumenOUnidadesPorToma,
      totalNecesario,
      numEnvases,
      totalDispensado,
    },
  };
}
