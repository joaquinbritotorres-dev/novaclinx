import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  consultarDocumento,
  consultarDocumentoPorIdempotencyKey,
} from "@/lib/facturacion/autorizadorec";
import { leerSkMedico } from "@/lib/facturacion/vault";
import { respaldarXmlAutorizado } from "@/lib/facturacion/facturar-consulta";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sincroniza UNA factura en 'procesando' consultando su estado al SRI ahora
 * mismo (sin esperar al cron diario). Reusa las mismas primitivas de consulta
 * que el cron, sin modificarlo. Solo actúa sobre una factura del propio médico.
 *
 * ⚠ SEGURIDAD (server-only): nunca se loguea el sk_.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ facturaId: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { facturaId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // Factura del médico (RLS + filtro explícito).
  const { data: f } = await supabase
    .from("facturas")
    .select("id, estado, clave_acceso, secuencial, numero_autorizacion, idempotency_key")
    .eq("id", facturaId)
    .eq("medico_id", medico.id)
    .maybeSingle();
  if (!f) {
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
  }
  // Estados terminales: nada que sincronizar.
  if (f.estado !== "procesando" && f.estado !== "pendiente") {
    return NextResponse.json({ estado: f.estado }, { status: 200 });
  }

  try {
    const sk = await leerSkMedico(medico.id);
    if (!sk) {
      return NextResponse.json(
        { error: "No se encontró la credencial de facturación." },
        { status: 422 }
      );
    }

    let doc = null;
    if (f.clave_acceso) {
      doc = await consultarDocumento({ sk, claveAcceso: f.clave_acceso });
    } else if (f.idempotency_key) {
      doc = await consultarDocumentoPorIdempotencyKey({
        sk,
        idempotencyKey: f.idempotency_key,
      });
    }

    // Aún no existe en el proveedor / sin identificador → sigue en procesando.
    if (!doc) {
      return NextResponse.json({ estado: "procesando", cambio: false }, { status: 200 });
    }

    const estado = (doc.estado ?? "").toUpperCase();
    const claveAcceso = f.clave_acceso ?? doc.claveAcceso ?? null;
    const service = createSupabaseServiceRoleClient();

    if (estado === "AUTHORIZED") {
      await service
        .from("facturas")
        .update({
          estado: "autorizada",
          clave_acceso: claveAcceso,
          secuencial: doc.secuencial ?? f.secuencial ?? null,
          numero_autorizacion: doc.numeroAutorizacion ?? f.numero_autorizacion ?? claveAcceso,
          fecha_autorizacion: doc.fechaAutorizacion ?? null,
        })
        .eq("id", f.id);
      if (claveAcceso) {
        const path = await respaldarXmlAutorizado({
          supabase: service,
          sk,
          medicoId: medico.id,
          claveAcceso,
        });
        if (path) {
          await service.from("facturas").update({ xml_object_key: path }).eq("id", f.id);
        }
      }
      return NextResponse.json({ estado: "autorizada", cambio: true }, { status: 200 });
    }

    // Preserva TODO lo que devuelve el SRI para no perder el motivo real del
    // rechazo (a veces no viene en `errores`, sino en otros campos del doc).
    const erroresPayload = {
      errores: doc.errores ?? [],
      mensaje: typeof doc.mensaje === "string" ? doc.mensaje : null,
      detalle: doc,
    };

    if (estado === "REJECTED") {
      await service
        .from("facturas")
        .update({ estado: "rechazada", clave_acceso: claveAcceso, errores: erroresPayload })
        .eq("id", f.id);
      return NextResponse.json({ estado: "rechazada", cambio: true }, { status: 200 });
    }

    if (estado === "FAILED") {
      await service
        .from("facturas")
        .update({ estado: "fallida", clave_acceso: claveAcceso, errores: erroresPayload })
        .eq("id", f.id);
      return NextResponse.json({ estado: "fallida", cambio: true }, { status: 200 });
    }

    // PROCESSING / RECEIVED / no terminal: aún en proceso.
    return NextResponse.json({ estado: "procesando", cambio: false }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[facturas/sincronizar] factura=${facturaId}: ${message}`);
    return NextResponse.json(
      { error: "No pudimos consultar el estado en el SRI. Reintenta en unos segundos." },
      { status: 502 }
    );
  }
}
