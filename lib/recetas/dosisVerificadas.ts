/**
 * Tabla de dosis verificadas por el equipo médico.
 *
 * REGLAS DE INTEGRIDAD:
 * - NO añadir entradas sin fuente bibliográfica verificada.
 * - Para cualquier fármaco no presente, el sistema emite una entrada con
 *   estado "PENDIENTE_VERIFICACION_MEDICA" que el médico completa.
 * - El LLM nunca escribe directamente en esta tabla.
 */

export type Poblacion = "adulto" | "pediatrico_por_peso";
export type EstadoVerificacion = "verificado" | "PENDIENTE_VERIFICACION_MEDICA";

export interface Presentacion {
  concentracion: number;           // mg/mL (líquidos) o mg/unidad (sólidos)
  esLiquido: boolean;
  descripcionConcentracion: string; // "250 mg/5 mL"
  /** Tamaños disponibles en Ecuador: mL para líquidos, unidades para sólidos */
  tamanos: number[];
}

export interface EntradaDosis {
  /** Slug único para lookup. Nunca cambia una vez publicado. */
  id: string;

  dci: string;
  indicacion: string;
  poblacion: Poblacion;

  /** mg/kg/día mínimo. null si dosisFijaMg está definida. */
  dosisMgKgDiaMin: number | null;
  /** mg/kg/día máximo (igual a Min si no es rango). null si dosisFijaMg. */
  dosisMgKgDiaMax: number | null;
  /** Dosis fija en mg/toma (adultos con dosis no peso-dependiente). null si por_peso. */
  dosisFijaMg: number | null;

  /** Texto para mostrar en UI y receta: "c/12h o c/24h" */
  frecuencia: string;
  /** Valor numérico por defecto para la calculadora */
  tomasPorDia: number;

  /** Máximo por toma en mg. null si depende del peso × frecuencia elegida. */
  dosisMaxPorTomaMg: number | null;
  /** Máximo diario en mg. null si depende del peso (ej. OMA). */
  dosisMaxDiariaMg: number | null;
  /** Techo absoluto en mg/día (independiente de peso) */
  techoAbsolutoMgDia: number | null;

  duracionTipicaDias: number;
  presentaciones: Presentacion[];

  fuente: string;
  /** Fecha de última revisión — formato ISO YYYY-MM-DD */
  fecha: string;
  estado: EstadoVerificacion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabla (solo entradas verificadas médicamente)
// ─────────────────────────────────────────────────────────────────────────────

export const DOSIS_VERIFICADAS: ReadonlyArray<EntradaDosis> = [
  {
    id: "amoxicilina-faringoamigdalitis-ped",
    dci: "amoxicilina",
    indicacion: "faringoamigdalitis estreptocócica",
    poblacion: "pediatrico_por_peso",

    dosisMgKgDiaMin: 50,
    dosisMgKgDiaMax: 50,
    dosisFijaMg: null,

    frecuencia: "c/12h o c/24h",
    tomasPorDia: 2, // default c/12h; médico puede seleccionar c/24h (1 toma/día)

    // Con c/12h y máx diario 1 000 mg → max 500 mg/toma
    // Con c/24h y máx diario 1 000 mg → max 1 000 mg/toma
    // Se deriva en runtime: dosisMaxDiariaMg / tomasPorDia elegido
    dosisMaxPorTomaMg: 500,      // asume c/12h (tomasPorDia = 2)
    dosisMaxDiariaMg: 1000,
    techoAbsolutoMgDia: 1000,

    duracionTipicaDias: 10,

    presentaciones: [
      {
        concentracion: 50,         // 250 mg / 5 mL = 50 mg/mL
        esLiquido: true,
        descripcionConcentracion: "250 mg/5 mL",
        tamanos: [60, 100, 150],   // mL — tamaños comunes en Ecuador
      },
      {
        concentracion: 100,        // 500 mg / 5 mL = 100 mg/mL
        esLiquido: true,
        descripcionConcentracion: "500 mg/5 mL",
        tamanos: [60, 100],
      },
    ],

    fuente: "IDSA 2012 / AAP Red Book",
    fecha: "2026-06-05",
    estado: "verificado",
  },

  {
    id: "amoxicilina-oma-ped",
    dci: "amoxicilina",
    indicacion: "otitis media aguda",
    poblacion: "pediatrico_por_peso",

    dosisMgKgDiaMin: 80,
    dosisMgKgDiaMax: 90,
    dosisFijaMg: null,

    frecuencia: "c/12h",
    tomasPorDia: 2,

    // Máximo diario depende del peso → no se puede fijar un número absoluto
    // La calculadora aplica techoAbsolutoMgDia como límite de seguridad
    dosisMaxPorTomaMg: null,
    dosisMaxDiariaMg: null,
    techoAbsolutoMgDia: 4000,    // máx absoluto amoxicilina (GPC MSP Ecuador / AAP)

    duracionTipicaDias: 10,

    presentaciones: [
      {
        concentracion: 50,
        esLiquido: true,
        descripcionConcentracion: "250 mg/5 mL",
        tamanos: [60, 100, 150],
      },
      {
        concentracion: 100,
        esLiquido: true,
        descripcionConcentracion: "500 mg/5 mL",
        tamanos: [60, 100],
      },
    ],

    fuente: "AAP Clinical Practice Guideline for AOM (Lieberthal et al. 2013)",
    fecha: "2026-06-05",
    estado: "verificado",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Funciones de lookup
// ─────────────────────────────────────────────────────────────────────────────

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Busca una entrada por DCI + indicación exacta (insensible a tildes y mayúsculas). */
export function buscarDosis(dci: string, indicacion: string): EntradaDosis | null {
  const dciN = normalizar(dci);
  const indN = normalizar(indicacion);
  return (
    DOSIS_VERIFICADAS.find(
      (e) => normalizar(e.dci) === dciN && normalizar(e.indicacion) === indN
    ) ?? null
  );
}

/** Devuelve todas las entradas para un DCI (distintas indicaciones). */
export function buscarDosisPorDci(dci: string): EntradaDosis[] {
  const dciN = normalizar(dci);
  return DOSIS_VERIFICADAS.filter((e) => normalizar(e.dci) === dciN);
}

/**
 * Para fármacos fuera de la tabla: genera una entradaPlaceholder que el médico debe completar.
 * Esta función NO escribe en la tabla — devuelve un objeto en memoria para guiar la UI.
 */
export function crearEntradaPendiente(
  dci: string,
  indicacion: string
): EntradaDosis {
  return {
    id: `pendiente-${normalizar(dci)}-${Date.now()}`,
    dci,
    indicacion,
    poblacion: "adulto",
    dosisMgKgDiaMin: null,
    dosisMgKgDiaMax: null,
    dosisFijaMg: null,
    frecuencia: "",
    tomasPorDia: 1,
    dosisMaxPorTomaMg: null,
    dosisMaxDiariaMg: null,
    techoAbsolutoMgDia: null,
    duracionTipicaDias: 7,
    presentaciones: [],
    fuente: "",
    fecha: new Date().toISOString().split("T")[0],
    estado: "PENDIENTE_VERIFICACION_MEDICA",
  };
}
