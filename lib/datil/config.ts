// lib/datil/config.ts
import "server-only";

import { DatilEmisor } from "./types";

export const DATIL_API_KEY = process.env.DATIL_API_KEY ?? "";
export const DATIL_CERT_PASSWORD = process.env.DATIL_CERT_PASSWORD ?? "";

const VARS_OBLIGATORIAS = [
  "DATIL_API_KEY",
  "DATIL_AMBIENTE",
  "DATIL_EMISOR_RUC",
  "DATIL_EMISOR_RAZON_SOCIAL",
  "DATIL_EMISOR_DIRECCION",
  "DATIL_EMISOR_ESTAB_CODIGO",
  "DATIL_EMISOR_PUNTO_EMISION",
] as const;

/**
 * Fail-fast: devuelve la lista de variables faltantes o inválidas.
 * Lista vacía = configuración completa. Nunca asume valores: sin
 * DATIL_AMBIENTE explícita no se emite (jamás se asume pruebas).
 * DATIL_EMISOR_CONTRIBUYENTE_ESPECIAL puede ir vacía.
 */
export function validarConfigDatil(): string[] {
  const faltantes: string[] = VARS_OBLIGATORIAS.filter(
    (v) => !process.env[v]?.trim()
  );

  const ambiente = process.env.DATIL_AMBIENTE?.trim();
  if (ambiente && ambiente !== "1" && ambiente !== "2") {
    faltantes.push("DATIL_AMBIENTE (valor inválido: debe ser 1 o 2)");
  }
  if (ambiente === "2" && !process.env.DATIL_CERT_PASSWORD?.trim()) {
    faltantes.push("DATIL_CERT_PASSWORD (obligatoria en producción)");
  }

  return faltantes;
}

/** Solo llamar tras validarConfigDatil() sin faltantes. */
export function getDatilAmbiente(): 1 | 2 {
  return parseInt(process.env.DATIL_AMBIENTE ?? "", 10) as 1 | 2;
}

/** Solo llamar tras validarConfigDatil() sin faltantes. Sin placeholders. */
export function getDatilEmisor(): DatilEmisor {
  return {
    ruc: process.env.DATIL_EMISOR_RUC ?? "",
    razon_social: process.env.DATIL_EMISOR_RAZON_SOCIAL ?? "",
    nombre_comercial:
      process.env.DATIL_EMISOR_NOMBRE_COMERCIAL ??
      process.env.DATIL_EMISOR_RAZON_SOCIAL ??
      "",
    direccion: process.env.DATIL_EMISOR_DIRECCION ?? "",
    obligado_contabilidad:
      process.env.DATIL_EMISOR_OBLIGADO_CONTABILIDAD === "true",
    contribuyente_especial: process.env.DATIL_EMISOR_CONTRIBUYENTE_ESPECIAL ?? "",
    establecimiento: {
      codigo: process.env.DATIL_EMISOR_ESTAB_CODIGO ?? "",
      punto_emision: process.env.DATIL_EMISOR_PUNTO_EMISION ?? "",
    },
  };
}
