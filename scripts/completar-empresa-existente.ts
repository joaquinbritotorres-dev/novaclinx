/**
 * SCRIPT TEMPORAL — completar y usar una empresa que YA existe en AutorizadorEC
 * (no se pueden borrar empresas por API). Caso: la médica tiene la empresa con
 * RUC real (id objetivo, ej. 32) que solo le falta habilitar la factura "01";
 * config_facturacion apunta por error a otra empresa (RUC falso). Este script
 * habilita la factura, REDIRIGE config_facturacion a la empresa objetivo y
 * guarda su sk_ en el Vault.
 * NO es parte de la app.
 *
 * Cómo correrlo (carga .env.local, resuelve "@/…" y neutraliza "server-only"):
 *
 *   MEDICO_ID_PRUEBA='<uuid-del-medico>' COMPANY_ID_OBJETIVO='32' \
 *     node --experimental-loader ./scripts/eval-loader.mjs \
 *          --conditions=react-server \
 *          scripts/completar-empresa-existente.ts
 */
import { readFileSync } from "node:fs";

// ── Cargar .env.local ANTES de importar cualquier módulo de la app ────────
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const medicoId = process.env.MEDICO_ID_PRUEBA;
const companyIdRaw = process.env.COMPANY_ID_OBJETIVO;
if (!medicoId) throw new Error("Falta MEDICO_ID_PRUEBA en el entorno.");
if (!companyIdRaw) throw new Error("Falta COMPANY_ID_OBJETIVO en el entorno.");

const companyIdObjetivo = Number(companyIdRaw);
if (!Number.isInteger(companyIdObjetivo)) {
  throw new Error(`COMPANY_ID_OBJETIVO no es un entero válido: "${companyIdRaw}".`);
}

// Datos reales esperados de la médica (validación de seguridad).
const RUC_ESPERADO = "0104499736001";
const RAZON_SOCIAL = "Janina Viviana Torres Avila";
const NOMBRE_COMERCIAL = "Consultorio Dra. Torres Avila";

/** ISO datetime/date → "YYYY-MM-DD". */
function aFechaISO(s: string): string {
  return new Date(s).toISOString().slice(0, 10);
}

async function main() {
  console.log("▶ Completando empresa existente en AutorizadorEC…");
  console.log(`  médico:           ${medicoId}`);
  console.log(`  empresa objetivo: ${companyIdObjetivo}`);

  // Imports dinámicos DESPUÉS de cargar el entorno (módulos server-only).
  const { listarEmpresas, habilitarTiposDocumento, AutorizadorECError } =
    await import("../lib/facturacion/autorizadorec.ts");
  const { guardarSkMedico } = await import("../lib/facturacion/vault.ts");
  const { createSupabaseServiceRoleClient } = await import(
    "../lib/supabase/service-role.ts"
  );

  // ── 1) Listar empresas y localizar la objetivo ──────────────────────
  console.log("\n  1/4 listando empresas y localizando la objetivo…");
  const empresas = await listarEmpresas();
  const empresa = empresas.find((e) => e.id === companyIdObjetivo);
  if (!empresa) {
    throw new Error(
      `No se encontró ninguna empresa con id ${companyIdObjetivo} en la cuenta.`
    );
  }

  // RUC no es secreto: lo imprimo para confirmación visual.
  console.log(`  ✓ empresa encontrada: id=${empresa.id} ruc=${empresa.ruc} name=${empresa.name} env=${empresa.env} status=${empresa.status}`);

  // Validación de seguridad: no configurar la empresa equivocada.
  if (empresa.ruc !== RUC_ESPERADO) {
    throw new Error(
      `ABORTADO: el RUC de la empresa ${empresa.id} es "${empresa.ruc}", se esperaba "${RUC_ESPERADO}". No se configura nada.`
    );
  }

  // sk_ en memoria — NUNCA se imprime.
  const sk = empresa.apiKey;
  if (!sk) {
    throw new Error(`La empresa ${empresa.id} no trae apiKey (sk_) en la respuesta.`);
  }

  // Certificado vigente → fecha de expiración (YYYY-MM-DD), si existe.
  const certActual =
    empresa.certificates?.find((c) => c.isCurrent) ?? empresa.certificates?.[0];
  const certificadoVigenciaHasta = certActual
    ? aFechaISO(certActual.expiresAt)
    : null;
  console.log(`  vigencia certificado: ${certificadoVigenciaHasta ?? "(sin certificado)"}`);

  // ── 2) Habilitar factura "01" (tolerante a "ya existe") ─────────────
  console.log("\n  2/4 habilitando factura (código 01)…");
  try {
    await habilitarTiposDocumento({ companyId: empresa.id, codes: ["01"] });
    console.log("  ✓ factura habilitada");
  } catch (err) {
    const yaExiste =
      err instanceof AutorizadorECError &&
      (err.statusCode === 409 ||
        /ya existe|already exist|duplicad|duplicate/i.test(err.message));
    if (yaExiste) {
      console.log("  ✓ la factura ya estaba habilitada; se continúa");
    } else {
      throw err;
    }
  }

  // ── 3) Redirigir config_facturacion a la empresa objetivo ───────────
  console.log("\n  3/4 redirigiendo config_facturacion a la empresa objetivo…");
  const supabase = createSupabaseServiceRoleClient();
  const { error: upsertError } = await supabase
    .from("config_facturacion")
    .upsert(
      {
        medico_id: medicoId,
        ruc: empresa.ruc,
        razon_social: RAZON_SOCIAL,
        nombre_comercial: NOMBRE_COMERCIAL,
        provider_company_id: String(companyIdObjetivo),
        ambiente: "pruebas",
        certificado_vigencia_hasta: certificadoVigenciaHasta,
        estado: "activo",
      },
      { onConflict: "medico_id" }
    );
  if (upsertError) {
    throw new Error(`upsert config_facturacion: ${upsertError.message}`);
  }
  console.log("  ✓ config_facturacion apunta ahora a la empresa objetivo");

  // ── 4) Guardar el sk_ de la empresa objetivo en el Vault ────────────
  console.log("\n  4/4 guardando sk_ en el Vault…");
  await guardarSkMedico(medicoId!, sk);
  console.log("  ✓ sk_ guardado en Vault (no se muestra)");

  console.log("\n✓ RESUMEN");
  console.log(`  provider_company_id: ${companyIdObjetivo}`);
  console.log(`  ruc:                 ${empresa.ruc}`);
  console.log(`  razon_social:        ${RAZON_SOCIAL}`);
  console.log(`  estado:              activo`);
  console.log(`  vigencia:            ${certificadoVigenciaHasta ?? "(sin certificado)"}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ No se pudo completar la empresa: ${message}`);
  process.exitCode = 1;
});
