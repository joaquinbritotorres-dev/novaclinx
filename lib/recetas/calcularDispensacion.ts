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

export interface EntradaCalculadora {
  /** Dosis directa por toma en mg (alternativa a dosisMgKgDia+pesoKg) */
  dosisPorTomaMg?: number;
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

  let dosisPorTomaMg: number;

  if (entrada.dosisPorTomaMg !== undefined) {
    dosisPorTomaMg = entrada.dosisPorTomaMg;
  } else if (entrada.dosisMgKgDia !== undefined && entrada.pesoKg !== undefined) {
    const dosisDiariaMg = entrada.dosisMgKgDia * entrada.pesoKg;
    dosisPorTomaMg = dosisDiariaMg / entrada.tomasPorDia;
  } else {
    return {
      ok: false,
      requiereCantidadManual: false,
      razon: "Debe proveer dosisPorTomaMg o dosisMgKgDia + pesoKg",
    };
  }

  if (entrada.concentracion <= 0) {
    return { ok: false, requiereCantidadManual: false, razon: "Concentración debe ser > 0" };
  }
  if (entrada.tamanoEnvase <= 0) {
    return { ok: false, requiereCantidadManual: false, razon: "Tamaño de envase debe ser > 0" };
  }

  const rawVolumen = dosisPorTomaMg / entrada.concentracion;
  const volumenOUnidadesPorToma = entrada.esLiquido
    ? redondearMlJeringa(rawVolumen)
    : rawVolumen;
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
