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

  const volumenOUnidadesPorToma = dosisPorTomaMg / entrada.concentracion;
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
