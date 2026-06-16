/**
 * SCRIPT TEMPORAL DE PRUEBA — onboarding de facturación (AutorizadorEC).
 * NO es parte de la app ni se importa desde ella. Da de alta a un médico de
 * PRUEBA de punta a punta (crear empresa → certificado → factura → Vault).
 *
 * Cómo correrlo (carga .env.local, resuelve "@/…" y neutraliza "server-only"):
 *
 *   P12_PASSWORD_PRUEBA='clave-del-p12' MEDICO_ID_PRUEBA='<uuid-medico>' \
 *     node --experimental-loader ./scripts/eval-loader.mjs \
 *          --conditions=react-server \
 *          scripts/probar-onboarding.ts
 *
 * Notas:
 *  - --conditions=react-server → "server-only" resuelve a su empty.js (no
 *    rompe la protección de producción; solo permite ejecutarlo por CLI).
 *  - --experimental-loader ./scripts/eval-loader.mjs → resuelve los imports
 *    "@/…" de los módulos de la app.
 *  - Node ≥23 ejecuta TypeScript nativo.
 *  - AUTORIZADOREC_ACCOUNT_KEY, NEXT_PUBLIC_SUPABASE_URL y
 *    SUPABASE_SERVICE_ROLE_KEY se leen de .env.local.
 */
import { readFileSync } from "node:fs";

// ── Cargar .env.local ANTES de importar cualquier módulo de la app ────────
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

// ── Entradas sensibles desde el entorno (NO hardcodeadas) ─────────────────
const password = process.env.P12_PASSWORD_PRUEBA;
const medicoId = process.env.MEDICO_ID_PRUEBA;
if (!password) throw new Error("Falta P12_PASSWORD_PRUEBA en el entorno.");
if (!medicoId) throw new Error("Falta MEDICO_ID_PRUEBA en el entorno.");

// ── Datos REALES de la médica (van en facturas; no son secretos) ──────────
// Defaults = datos reales de la Dra. Torres Avila para que el SRI autorice
// (el RUC debe existir en el SRI y coincidir con el certificado .p12).
// Se pueden sobreescribir por variable de entorno.
const DATOS_PRUEBA = {
  razonSocial: process.env.RAZON_SOCIAL_PRUEBA ?? "Janina Viviana Torres Avila",
  ruc: process.env.RUC_PRUEBA ?? "0104499736001",
  nombreComercial:
    process.env.NOMBRE_COMERCIAL_PRUEBA ?? "Consultorio Dra. Torres Avila",
  direccion:
    process.env.DIRECCION_PRUEBA ?? "Calle 1 de septiembre y canton gualaquiza",
  email: process.env.EMAIL_PRUEBA ?? "joaquinbritotorres@gmail.com",
  // Nota: "obligado contabilidad" (false) es un dato de EMISIÓN (lo recibe
  // emitirFactura por factura), no del onboarding; no se pasa aquí.
};

const P12_PATH = new URL("../.secrets-prueba/firma-mama.p12", import.meta.url);

async function main() {
  console.log("▶ Probando onboarding de facturación (AutorizadorEC)…");
  console.log(`  médico de prueba: ${medicoId}`);
  console.log(`  RUC de prueba:    ${DATOS_PRUEBA.ruc}`);

  // Leer el .p12 y convertirlo a Blob.
  const p12Buf = readFileSync(P12_PATH);
  const p12 = new Blob([new Uint8Array(p12Buf)]);
  console.log(`  .p12 cargado:     ${p12Buf.byteLength} bytes\n`);

  // Import dinámico DESPUÉS de cargar el entorno (módulos server-only).
  const { darDeAltaMedico } = await import("../lib/facturacion/onboarding.ts");

  // darDeAltaMedico imprime su propio progreso 1/5 … 5/5.
  const resultado = await darDeAltaMedico({
    medicoId: medicoId!,
    razonSocial: DATOS_PRUEBA.razonSocial,
    ruc: DATOS_PRUEBA.ruc,
    nombreComercial: DATOS_PRUEBA.nombreComercial,
    direccion: DATOS_PRUEBA.direccion,
    email: DATOS_PRUEBA.email,
    p12,
    passwordP12: password!,
    ambiente: "pruebas",
  });

  console.log("\n✓ RESUMEN");
  console.log(`  providerCompanyId:        ${resultado.providerCompanyId}`);
  console.log(`  certificadoVigenciaHasta: ${resultado.certificadoVigenciaHasta}`);
  console.log("  (el sk_ quedó cifrado en el Vault; no se imprime)");
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ El onboarding de prueba falló: ${message}`);
  process.exitCode = 1;
});
