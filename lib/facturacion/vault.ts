import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Capa server-only sobre las funciones de Supabase Vault que custodian el
 * "Company API Key" (sk_) de facturación de cada médico (proveedor
 * AutorizadorEC).
 *
 * ⚠ SEGURIDAD
 * - Estas funciones SOLO deben llamarse desde el servidor. El cliente
 *   service-role bypassa RLS, y los RPC subyacentes (guardar/leer/borrar)
 *   tienen EXECUTE concedido únicamente a service_role.
 * - NUNCA se loguea el sk_ ni el secreto descifrado. Ante un error solo se
 *   registra el medico_id y el mensaje del error, jamás la credencial.
 * - El sk_ nunca toca nuestra base en texto plano: vive cifrado en el Vault;
 *   en config_facturacion solo guardamos el UUID de referencia.
 */

/**
 * Guarda (crea o actualiza) el sk_ del médico en el Vault.
 * Devuelve el UUID del secreto en vault.secrets.
 */
export async function guardarSkMedico(
  medicoId: string,
  sk: string
): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase.rpc("guardar_sk_medico", {
    p_medico_id: medicoId,
    p_sk: sk,
  });

  if (error || data == null) {
    // Solo medico_id y mensaje — nunca el sk_.
    console.error(
      `[facturacion/vault] guardar_sk_medico falló para medico ${medicoId}: ${
        error?.message ?? "devolvió null"
      }`
    );
    throw new Error("No pudimos guardar la credencial de facturación.");
  }

  return data as string;
}

/**
 * Devuelve el sk_ descifrado del médico, o null si aún no tiene credencial.
 */
export async function leerSkMedico(medicoId: string): Promise<string | null> {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase.rpc("leer_sk_medico", {
    p_medico_id: medicoId,
  });

  if (error) {
    // No logueamos `data`: contendría el secreto descifrado.
    console.error(
      `[facturacion/vault] leer_sk_medico falló para medico ${medicoId}: ${error.message}`
    );
    throw new Error("No pudimos leer la credencial de facturación.");
  }

  // El RPC devuelve text o NULL.
  return (data as string | null) ?? null;
}

/**
 * Borra el secreto del Vault (si existe) y limpia la referencia en
 * config_facturacion. Idempotente: si el médico no tiene secreto, no falla.
 */
export async function borrarSkMedico(medicoId: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase.rpc("borrar_sk_medico", {
    p_medico_id: medicoId,
  });

  if (error) {
    console.error(
      `[facturacion/vault] borrar_sk_medico falló para medico ${medicoId}: ${error.message}`
    );
    throw new Error("No pudimos borrar la credencial de facturación.");
  }
}
