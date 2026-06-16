import "server-only";

import {
  crearEmpresa,
  crearPuntoEmision,
  subirCertificado,
  habilitarTiposDocumento,
  AutorizadorECError,
} from "@/lib/facturacion/autorizadorec";
import { guardarSkMedico } from "@/lib/facturacion/vault";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Onboarding de facturación electrónica de un médico, de punta a punta:
 * crea la empresa en AutorizadorEC, sube su certificado .p12, habilita la
 * factura, persiste la config y guarda el sk_ en el Vault.
 *
 * ⚠ SEGURIDAD (server-only): nunca se loguea el apiKey (sk_) ni la
 * passwordP12. Los logs incluyen solo medico_id, company_id, paso y fechas.
 */

export interface DarDeAltaParams {
  medicoId: string; // uuid del médico en nuestra tabla `medicos`
  razonSocial: string;
  ruc: string;
  direccion: string;
  email: string;
  nombreComercial?: string;
  telefono?: string;
  p12: Blob;
  passwordP12: string;
  ambiente?: "pruebas" | "produccion"; // default "pruebas"
}

export interface DarDeAltaResultado {
  providerCompanyId: number;
  certificadoVigenciaHasta: string;
}

/**
 * Heurística para detectar "el punto de emisión ya existe" y tolerarlo en
 * reintentos. La API no expone un código estable, así que revisamos el status
 * (409 Conflict) y palabras clave del mensaje.
 */
function esPuntoYaExiste(err: AutorizadorECError): boolean {
  if (err.statusCode === 409) return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("ya existe") ||
    msg.includes("already exist") ||
    msg.includes("duplicad") ||
    msg.includes("duplicate")
  );
}

export async function darDeAltaMedico(
  params: DarDeAltaParams
): Promise<DarDeAltaResultado> {
  const ambiente = params.ambiente ?? "pruebas";
  // Nuestra columna usa "pruebas"/"produccion"; la API usa "test"/"production".
  const env: "test" | "production" =
    ambiente === "produccion" ? "production" : "test";

  const supabase = createSupabaseServiceRoleClient();

  // Paso actual: da contexto a los errores (sin filtrar credenciales).
  let paso = "crear empresa";

  try {
    // ── a) Crear empresa en AutorizadorEC ──────────────────────────────
    console.log(`[onboarding] 1/5 creando empresa (medico=${params.medicoId})…`);
    const empresa = await crearEmpresa({
      razonSocial: params.razonSocial,
      ruc: params.ruc,
      direccion: params.direccion,
      email: params.email,
      telefono: params.telefono,
      ambiente: env,
    });
    if (!empresa.apiKey) {
      throw new Error(
        "AutorizadorEC no devolvió apiKey (sk_) al crear la empresa."
      );
    }
    const companyId = empresa.id;

    // ── b) Crear punto de emisión "001" ────────────────────────────────
    // crearEmpresa NO lo crea automáticamente; sin él, emitir falla con
    // "El punto de emisión 001 no existe". Usa el sk_ recién devuelto.
    paso = "crear punto de emisión";
    console.log(`[onboarding] 2/5 creando punto de emisión (company=${companyId})…`);
    try {
      await crearPuntoEmision({ sk: empresa.apiKey, code: "001" });
    } catch (err) {
      // Tolerante a reintentos: si el punto ya existe, no es fatal → seguimos.
      if (err instanceof AutorizadorECError && esPuntoYaExiste(err)) {
        console.log(`[onboarding] punto de emisión "001" ya existía; se continúa.`);
      } else {
        throw err;
      }
    }

    // ── c) Subir el certificado .p12 ───────────────────────────────────
    paso = "subir certificado";
    console.log(`[onboarding] 3/5 subiendo certificado (company=${companyId})…`);
    const cert = await subirCertificado({
      companyId,
      p12: params.p12,
      password: params.passwordP12,
    });
    const certificadoVigenciaHasta = cert.certificate.expiresAt;

    // ── d) Habilitar Factura (código "01") ─────────────────────────────
    paso = "habilitar tipos de documento";
    console.log(`[onboarding] 4/5 habilitando factura (company=${companyId})…`);
    await habilitarTiposDocumento({ companyId, codes: ["01"] });

    // ── e) Persistir config + guardar sk_ en el Vault ──────────────────
    // El RPC guardar_sk_medico EXIGE que la fila ya exista en
    // config_facturacion, por eso el upsert va ANTES de guardar el secreto.
    paso = "guardar configuración";
    console.log(`[onboarding] 5/5 guardando configuración y credencial…`);

    const { error: upsertError } = await supabase
      .from("config_facturacion")
      .upsert(
        {
          medico_id: params.medicoId,
          ruc: params.ruc,
          razon_social: params.razonSocial,
          nombre_comercial: params.nombreComercial ?? null,
          provider_company_id: String(companyId), // columna TEXT
          ambiente,
          certificado_vigencia_hasta: certificadoVigenciaHasta,
          estado: "activo",
        },
        { onConflict: "medico_id" }
      );
    if (upsertError) {
      throw new Error(`upsert config_facturacion: ${upsertError.message}`);
    }

    // Guardar el sk_ cifrado en el Vault (nunca se loguea).
    await guardarSkMedico(params.medicoId, empresa.apiKey);

    console.log(
      `[onboarding] ✓ alta completa medico=${params.medicoId} company=${companyId} vigencia=${certificadoVigenciaHasta}`
    );

    return { providerCompanyId: companyId, certificadoVigenciaHasta };
  } catch (err) {
    // Best-effort: si la fila ya existe, marcarla en 'error'. Si aún no
    // existe (falló antes del upsert), el UPDATE no afecta filas (sin daño).
    //
    // ⚠ LIMITACIÓN CONOCIDA: un fallo a mitad puede dejar una empresa creada
    // en AutorizadorEC sin completar (certificado/doc-types/vault). Por ahora
    // NO hacemos rollback en el proveedor; se manejará después (reconciliación
    // o reintento idempotente del onboarding).
    try {
      await supabase
        .from("config_facturacion")
        .update({ estado: "error" })
        .eq("medico_id", params.medicoId);
    } catch {
      // No enmascarar el error original si el marcado de estado falla.
    }

    const message = err instanceof Error ? err.message : String(err);
    // Log sin credenciales: medico, paso y mensaje.
    console.error(
      `[onboarding] ✗ falló en "${paso}" medico=${params.medicoId}: ${message}`
    );
    throw new Error(`Onboarding falló en "${paso}": ${message}`);
  }
}
