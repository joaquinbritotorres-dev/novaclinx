/**
 * SCRIPT TEMPORAL DE PRUEBA — sincronizar facturas en estado 'procesando'.
 * NO es parte de la app. Corre el job una vez e imprime el resumen.
 *
 * Cómo correrlo (carga .env.local, resuelve "@/…" y neutraliza "server-only"):
 *
 *   node --experimental-loader ./scripts/eval-loader.mjs \
 *        --conditions=react-server \
 *        scripts/probar-sincronizacion.ts
 *
 * Opcional: LIMITE_PRUEBA='100' para cambiar cuántas revisa (default 50).
 */
import { readFileSync } from "node:fs";

// ── Cargar .env.local ANTES de importar cualquier módulo de la app ────────
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const limiteRaw = process.env.LIMITE_PRUEBA;
const limite = limiteRaw ? Number(limiteRaw) : undefined;
if (limiteRaw && (!Number.isInteger(limite) || (limite as number) <= 0)) {
  throw new Error(`LIMITE_PRUEBA inválido: "${limiteRaw}".`);
}

async function main() {
  console.log("▶ Sincronizando facturas en 'procesando'…");
  if (limite) console.log(`  límite: ${limite}`);

  const { sincronizarFacturas } = await import(
    "../lib/facturacion/sincronizar-facturas.ts"
  );

  const r = await sincronizarFacturas(limite ? { limite } : undefined);

  console.log("\n✓ RESUMEN");
  console.log(`  revisadas:    ${r.revisadas}`);
  console.log(`  actualizadas: ${r.actualizadas}`);
  console.log(`  autorizadas:  ${r.autorizadas}`);
  console.log(`  rechazadas:   ${r.rechazadas}`);
  console.log(`  sinCambio:    ${r.sinCambio}`);
  console.log(`  errores:      ${r.errores}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ La sincronización falló: ${message}`);
  process.exitCode = 1;
});
