/**
 * SCRIPT TEMPORAL — crear el punto de emisión "001" de una empresa que ya
 * existe sin él (ej. la empresa 33 de prueba creada antes de este fix).
 * NO es parte de la app.
 *
 * Cómo correrlo (carga .env.local, resuelve "@/…" y neutraliza "server-only"):
 *
 *   MEDICO_ID_PRUEBA='<uuid-del-medico>' \
 *     node --experimental-loader ./scripts/eval-loader.mjs \
 *          --conditions=react-server \
 *          scripts/crear-punto-emision.ts
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
  console.log("▶ Creando punto de emisión '001'…");
  console.log(`  médico de prueba: ${medicoId}`);

  // Imports dinámicos DESPUÉS de cargar el entorno (módulos server-only).
  const { leerSkMedico } = await import("../lib/facturacion/vault.ts");
  const { crearPuntoEmision } = await import("../lib/facturacion/autorizadorec.ts");

  // 1/2 — Leer el sk_ del médico desde el Vault.
  console.log("  1/2 leyendo sk_ del Vault…");
  const sk = await leerSkMedico(medicoId!);
  if (!sk) {
    throw new Error(
      `El médico ${medicoId} no tiene sk_ guardado en el Vault (¿corriste el onboarding?).`
    );
  }
  console.log("  ✓ sk_ obtenido (no se imprime)");

  // 2/2 — Crear el punto de emisión.
  console.log("  2/2 creando punto de emisión 001…");
  const punto = await crearPuntoEmision({ sk, code: "001" });

  console.log("\n✓ RESUMEN");
  console.log(`  id:          ${punto.id}`);
  console.log(`  code:        ${punto.code}`);
  console.log(`  description: ${punto.description}`);
  console.log(`  isActive:    ${punto.isActive}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ No se pudo crear el punto de emisión: ${message}`);
  process.exitCode = 1;
});
