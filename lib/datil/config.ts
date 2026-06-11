// lib/datil/config.ts
import "server-only";

import { DatilEmisor } from "./types";

// Verificamos que las variables esenciales existan
if (!process.env.DATIL_API_KEY) {
  console.warn("DATIL_API_KEY no está configurada.");
}
if (!process.env.DATIL_CERT_PASSWORD) {
  console.warn("DATIL_CERT_PASSWORD no está configurada.");
}

export const DATIL_API_KEY = process.env.DATIL_API_KEY ?? "";
export const DATIL_CERT_PASSWORD = process.env.DATIL_CERT_PASSWORD ?? "";
export const DATIL_AMBIENTE = parseInt(process.env.DATIL_AMBIENTE ?? "1", 10) as 1 | 2;

// Datos del emisor obtenidos de variables de entorno (seguro y flexible)
export const DATIL_EMISOR: DatilEmisor = {
  ruc: process.env.DATIL_EMISOR_RUC ?? "0000000000000",
  razon_social: process.env.DATIL_EMISOR_RAZON_SOCIAL ?? "Razon Social",
  nombre_comercial: process.env.DATIL_EMISOR_NOMBRE_COMERCIAL ?? "Nombre Comercial",
  direccion: process.env.DATIL_EMISOR_DIRECCION ?? "Direccion",
  obligado_contabilidad: process.env.DATIL_EMISOR_OBLIGADO_CONTABILIDAD === "true",
  contribuyente_especial: process.env.DATIL_EMISOR_CONTRIBUYENTE_ESPECIAL ?? "",
  establecimiento: {
    codigo: process.env.DATIL_EMISOR_ESTAB_CODIGO ?? "001",
    punto_emision: process.env.DATIL_EMISOR_PUNTO_EMISION ?? "001",
  },
};
