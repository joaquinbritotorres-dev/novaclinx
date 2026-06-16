/**
 * SCRIPT TEMPORAL DE PRUEBA — facturar una consulta real.
 * NO es parte de la app. Emite la factura de una consulta existente, la
 * registra en `facturas` y respalda el XML autorizado.
 *
 * Cómo correrlo (carga .env.local, resuelve "@/…" y neutraliza "server-only"):
 *
 *   CONSULTA_ID_PRUEBA='<uuid-consulta>' MONTO_PRUEBA='30' \
 *     node --experimental-loader ./scripts/eval-loader.mjs \
 *          --conditions=react-server \
 *          scripts/probar-facturar-consulta.ts
 *
 * Para obtener un CONSULTA_ID real, búscalo tú con SQL en Supabase, ej.:
 *   SELECT id FROM consultas WHERE medico_id =
 *     '68e026cc-15b3-46fd-b06e-b178dbada693' ORDER BY fecha DESC LIMIT 5;
 */
import { readFileSync } from "node:fs";

// ── Cargar .env.local ANTES de importar cualquier módulo de la app ────────
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const consultaId = process.env.CONSULTA_ID_PRUEBA;
if (!consultaId) throw new Error("Falta CONSULTA_ID_PRUEBA en el entorno.");

const monto = Number(process.env.MONTO_PRUEBA ?? "30");
if (!Number.isFinite(monto) || monto <= 0) {
  throw new Error(`MONTO_PRUEBA inválido: "${process.env.MONTO_PRUEBA}".`);
}

async function main() {
  console.log("▶ Probando facturación de una consulta real…");
  console.log(`  consulta: ${consultaId}`);
  console.log(`  monto:    ${monto}`);

  const { facturarConsulta } = await import("../lib/facturacion/facturar-consulta.ts");

  const resultado = await facturarConsulta({ consultaId: consultaId!, monto });

  console.log("\n✓ RESUMEN");
  console.log(`  facturaId:   ${resultado.facturaId}`);
  console.log(`  estado:      ${resultado.estado}`);
  console.log(`  claveAcceso: ${resultado.claveAcceso ?? "(sin clave)"}`);
  console.log(`  mensaje:     ${resultado.mensaje}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ La facturación de prueba falló: ${message}`);
  process.exitCode = 1;
});
