/**
 * SCRIPT TEMPORAL DE PRUEBA — emisión de factura (AutorizadorEC).
 * NO es parte de la app. Emite una factura de PRUEBA simple usando el sk_ que
 * el médico ya tiene guardado en el Vault (de la empresa creada en onboarding).
 *
 * Cómo correrlo (carga .env.local, resuelve "@/…" y neutraliza "server-only"):
 *
 *   MEDICO_ID_PRUEBA='<uuid-del-medico>' \
 *     node --experimental-loader ./scripts/eval-loader.mjs \
 *          --conditions=react-server \
 *          scripts/probar-emision.ts
 *
 * (--conditions=react-server → "server-only" resuelve a empty.js;
 *  el loader resuelve los imports "@/…"; Node ≥23 ejecuta TS nativo.)
 */
import { readFileSync } from "node:fs";

// ── Cargar .env.local ANTES de importar cualquier módulo de la app ────────
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const medicoId = process.env.MEDICO_ID_PRUEBA;
if (!medicoId) throw new Error("Falta MEDICO_ID_PRUEBA en el entorno.");

async function main() {
  console.log("▶ Probando emisión de factura (AutorizadorEC)…");
  console.log(`  médico de prueba: ${medicoId}`);

  // Imports dinámicos DESPUÉS de cargar el entorno (módulos server-only).
  const { leerSkMedico } = await import("../lib/facturacion/vault.ts");
  const { emitirFactura } = await import("../lib/facturacion/autorizadorec.ts");

  // 1/2 — Leer el sk_ del médico desde el Vault.
  console.log("  1/2 leyendo sk_ del Vault…");
  const sk = await leerSkMedico(medicoId!);
  if (!sk) {
    throw new Error(
      `El médico ${medicoId} no tiene sk_ guardado en el Vault (¿corriste el onboarding?).`
    );
  }
  console.log("  ✓ sk_ obtenido (no se imprime)");

  // 2/2 — Emitir factura de prueba: 1 consulta médica, $30.00, IVA 0%.
  console.log("  2/2 emitiendo factura de prueba…");
  const factura = await emitirFactura({
    sk,
    comprador: {
      tipoIdentificacion: "07", // Consumidor final
      identificacion: "9999999999999",
      razonSocial: "CONSUMIDOR FINAL",
    },
    items: [
      {
        codigoPrincipal: "CONSULTA",
        descripcion: "Consulta médica",
        cantidad: 1,
        precioUnitario: 30.0,
      },
    ],
    idempotencyKey: `prueba-${medicoId}-${Date.now()}`,
  });

  console.log("\n✓ RESUMEN");
  console.log(`  claveAcceso:  ${factura.claveAcceso}`);
  console.log(`  secuencial:   ${factura.secuencial}`);
  console.log(`  estado:       ${factura.estado}`);
  console.log(`  importeTotal: ${factura.importeTotal}`);
  console.log(`  resultado:    ${factura.procesamiento?.resultado}`);
  if (factura.procesamiento?.mensaje) {
    console.log(`  mensaje:      ${factura.procesamiento.mensaje}`);
  }
  const errores = factura.procesamiento?.errores ?? [];
  if (errores.length > 0) {
    console.log("  errores:");
    for (const e of errores) console.log(`    - ${JSON.stringify(e)}`);
  }

  if (factura.procesamiento?.resultado !== "authorized") {
    console.log("\n⚠ La factura NO quedó autorizada (revisa resultado/errores arriba).");
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ La emisión de prueba falló: ${message}`);
  process.exitCode = 1;
});
