import "server-only";

import {
  consultarDocumento,
  consultarDocumentoPorIdempotencyKey,
  type DocumentoEstado,
} from "@/lib/facturacion/autorizadorec";
import { leerSkMedico } from "@/lib/facturacion/vault";
import { respaldarXmlAutorizado } from "@/lib/facturacion/facturar-consulta";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Job de sincronización de facturas en estado 'procesando'.
 *
 * Cuando el SRI está caído/lento, facturarConsulta deja la factura en
 * 'procesando' (con clave_acceso y/o idempotency_key). El SRI puede autorizarla
 * minutos/horas después. Este job revisa esas facturas y actualiza su estado
 * consultando a AutorizadorEC. Diseñado para envolverse en un Vercel Cron.
 *
 * ⚠ SEGURIDAD (server-only): nunca se loguea el sk_.
 * ⚠ RESILIENCIA: cada factura va en su propio try/catch; un fallo en una no
 * tumba el job completo.
 */

export interface SincronizarResultado {
  revisadas: number;
  actualizadas: number; // cuántas cambiaron de estado (autorizada/rechazada/fallida)
  autorizadas: number;
  rechazadas: number;
  sinCambio: number;
  errores: number; // cuántas fallaron al consultar
}

export async function sincronizarFacturas(opciones?: {
  limite?: number;
}): Promise<SincronizarResultado> {
  const limite = opciones?.limite ?? 50;
  const supabase = createSupabaseServiceRoleClient();

  const resultado: SincronizarResultado = {
    revisadas: 0,
    actualizadas: 0,
    autorizadas: 0,
    rechazadas: 0,
    sinCambio: 0,
    errores: 0,
  };

  // 1) Facturas en 'procesando' (las más antiguas primero).
  const { data: facturas, error } = await supabase
    .from("facturas")
    .select(
      "id, medico_id, clave_acceso, secuencial, numero_autorizacion, idempotency_key"
    )
    .eq("estado", "procesando")
    .order("creado_en", { ascending: true })
    .limit(limite);
  if (error) {
    throw new Error(`No se pudieron leer las facturas en procesando: ${error.message}`);
  }
  if (!facturas || facturas.length === 0) return resultado;

  // 2) Revisar cada una (aislada en try/catch).
  for (const f of facturas) {
    resultado.revisadas++;
    try {
      // a) sk_ del médico.
      const sk = await leerSkMedico(f.medico_id);
      if (!sk) {
        console.error(`[sincronizar] sin sk_ para medico=${f.medico_id} factura=${f.id}`);
        resultado.errores++;
        continue;
      }

      // b) Consultar estado (por clave de acceso, o por idempotencyKey).
      let doc: DocumentoEstado | null = null;
      if (f.clave_acceso) {
        doc = await consultarDocumento({ sk, claveAcceso: f.clave_acceso });
      } else if (f.idempotency_key) {
        doc = await consultarDocumentoPorIdempotencyKey({
          sk,
          idempotencyKey: f.idempotency_key,
        });
      } else {
        console.error(`[sincronizar] factura=${f.id} sin clave_acceso ni idempotency_key`);
        resultado.errores++;
        continue;
      }

      // c) 404 en el proveedor: aún no existe el doc → sigue en 'procesando'.
      if (!doc) {
        console.log(`[sincronizar] factura=${f.id} no encontrada en proveedor; sigue en procesando.`);
        resultado.sinCambio++;
        continue;
      }

      // d) Decidir según el estado del proveedor.
      const estado = (doc.estado ?? "").toUpperCase();
      const claveAcceso = f.clave_acceso ?? doc.claveAcceso ?? null;

      if (estado === "AUTHORIZED") {
        await supabase
          .from("facturas")
          .update({
            estado: "autorizada",
            clave_acceso: claveAcceso,
            secuencial: doc.secuencial ?? f.secuencial ?? null,
            numero_autorizacion:
              doc.numeroAutorizacion ?? f.numero_autorizacion ?? claveAcceso,
            fecha_autorizacion: doc.fechaAutorizacion ?? null,
          })
          .eq("id", f.id);

        // Respaldo XML best-effort (404/fallo no rompe).
        if (claveAcceso) {
          const path = await respaldarXmlAutorizado({
            supabase,
            sk,
            medicoId: f.medico_id,
            claveAcceso,
          });
          if (path) {
            await supabase.from("facturas").update({ xml_object_key: path }).eq("id", f.id);
          }
        }

        console.log(`[sincronizar] factura=${f.id} → autorizada clave=${claveAcceso}`);
        resultado.autorizadas++;
        resultado.actualizadas++;
      } else if (estado === "REJECTED") {
        await supabase
          .from("facturas")
          .update({
            estado: "rechazada",
            clave_acceso: claveAcceso,
            errores: { errores: doc.errores ?? [] },
          })
          .eq("id", f.id);
        console.log(`[sincronizar] factura=${f.id} → rechazada`);
        resultado.rechazadas++;
        resultado.actualizadas++;
      } else if (estado === "FAILED") {
        await supabase
          .from("facturas")
          .update({
            estado: "fallida",
            clave_acceso: claveAcceso,
            errores: { errores: doc.errores ?? [] },
          })
          .eq("id", f.id);
        console.log(`[sincronizar] factura=${f.id} → fallida`);
        resultado.actualizadas++;
      } else {
        // PROCESSING / RECEIVED / cualquier estado aún no terminal.
        console.log(`[sincronizar] factura=${f.id} estado=${estado || "?"}; sigue en procesando.`);
        resultado.sinCambio++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[sincronizar] error con factura=${f.id}: ${message}`);
      resultado.errores++;
    }
  }

  return resultado;
}
