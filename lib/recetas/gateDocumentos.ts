// Gate de documentos legales: garantía dura en el RENDER, independiente de los
// prompts. Ningún corchete ni rango sin resolver puede llegar a una receta o
// certificado; la dosis confirmada se imprime en números y letras (AM 00031-2020).

// ─── Detección de placeholders / rangos sin resolver ──────────────────────────

const CORCHETE_RE = /\[[^\]]*\]/g;
// Rango numérico de dosis: "50-90 mg/kg/día", "500–1000 mg", "10 a 15 mg/kg"
const RANGO_DOSIS_RE =
  /\d+(?:[.,]\d+)?\s*(?:[-–—]|a)\s*\d+(?:[.,]\d+)?\s*(?:mg|mcg|ml|ui|g)\b/i;

export interface HallazgoGate {
  corchetes: string[];
  rangos: string[];
}

/** Devuelve corchetes y rangos de dosis encontrados en los textos dados. */
export function detectarPlaceholders(textos: (string | null | undefined)[]): HallazgoGate {
  const corchetes: string[] = [];
  const rangos: string[] = [];
  for (const t of textos) {
    if (!t) continue;
    const c = t.match(CORCHETE_RE);
    if (c) corchetes.push(...c);
    const r = t.match(RANGO_DOSIS_RE);
    if (r) rangos.push(r[0]);
  }
  return { corchetes, rangos };
}

/** true si el documento es apto para emitir (sin corchetes ni rangos). */
export function documentoLimpio(hallazgo: HallazgoGate): boolean {
  return hallazgo.corchetes.length === 0 && hallazgo.rangos.length === 0;
}

/**
 * Normaliza la familia [NO REGISTRADO …] / [NO REGISTRADO: …] al token exacto
 * [NO REGISTRADO]. El qualifier ("en esta consulta", etc.) es redundante y el
 * modelo lo añade de forma no determinista en notas subsecuentes; colapsarlo
 * mantiene el vocabulario estricto sin perder significado.
 */
export function normalizarNoRegistrado(texto: string): string {
  return texto.replace(/\[\s*NO REGISTRADO[^\]]*\]/gi, "[NO REGISTRADO]");
}

/** Cuenta los marcadores [VERIFICAR …] en los textos (para el aviso al aprobar nota). */
export function contarVerificar(textos: (string | null | undefined)[]): number {
  let n = 0;
  for (const t of textos) {
    if (!t) continue;
    const m = t.match(/\[VERIFICAR[^\]]*\]/gi);
    if (m) n += m.length;
  }
  return n;
}

// ─── Números a letras (cardinal español, 0–9999) ──────────────────────────────
// El módulo de dispensación usa un lookup disperso para envases pequeños; aquí
// se necesita cobertura de cientos/miles para las dosis en mg (máx 4000 mg/día).

const UNIDADES = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho",
  "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis",
  "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós",
  "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function menorA100(n: number): string {
  if (n < 30) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
}

function menorA1000(n: number): string {
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const cent = CENTENAS[c];
  if (resto === 0) return cent;
  return cent ? `${cent} ${menorA100(resto)}` : menorA100(resto);
}

/** Cardinal en español de un entero 0–9999. */
export function numeroALetras(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  const entero = Math.round(n);
  if (entero < 1000) return menorA1000(entero);
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;
  const prefijo = miles === 1 ? "mil" : `${menorA1000(miles)} mil`;
  return resto === 0 ? prefijo : `${prefijo} ${menorA1000(resto)}`;
}

// ─── Formato de dosis confirmada (números y letras, AM 00031-2020) ────────────

/** "c/12h" → "cada 12 horas"; "dosis única" → "dosis única". */
export function frecuenciaEnPalabras(frecuencia: string): string {
  const f = frecuencia.toLowerCase();
  if (/dosis\s*[úu]nica/.test(f)) return "dosis única";
  const horas = f.match(/c\/?\s*(\d+)\s*h|cada\s*(\d+)/);
  if (horas) {
    const h = horas[1] ?? horas[2];
    return `cada ${h} horas`;
  }
  if (/1\s*vez|una\s*vez|diaria/.test(f)) return "una vez al día";
  return frecuencia;
}

export interface DosisConfirmada {
  dosisPorTomaMg: number;
  /** mL/toma (líquido) o comprimidos/toma (sólido) */
  volumenOUnidadesPorToma: number;
  esLiquido: boolean;
  /** Texto de concentración tal cual ("250 mg/5 mL") */
  concentracion: string;
  formaFarmaceutica: string;
  frecuencia: string;
}

/**
 * Formato objetivo AM 00031-2020:
 * "550 mg (quinientos cincuenta miligramos) = 11 mL de suspensión 250 mg/5 mL, cada 12 horas"
 */
export function formatearDosisConfirmada(d: DosisConfirmada): string {
  const mg = Math.round(d.dosisPorTomaMg * 100) / 100;
  const mgEntero = Number.isInteger(mg) ? mg : Math.round(mg);
  const letras = numeroALetras(mgEntero);
  const cabeza = `${mg} mg (${letras} miligramos)`;

  const freq = frecuenciaEnPalabras(d.frecuencia);

  if (d.esLiquido) {
    const ml = Math.round(d.volumenOUnidadesPorToma * 100) / 100;
    return `${cabeza} = ${ml} mL de ${d.formaFarmaceutica} ${d.concentracion}, ${freq}`;
  }
  const u = Math.round(d.volumenOUnidadesPorToma * 100) / 100;
  const unidad = u === 1 ? "comprimido" : "comprimidos";
  return `${cabeza} = ${u} ${unidad} de ${d.concentracion}, ${freq}`;
}
