import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emitirFactura } from "@/lib/facturacion/autorizadorec";
import { leerSkMedico } from "@/lib/facturacion/vault";
import { respaldarXmlAutorizado } from "@/lib/facturacion/facturar-consulta";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-dispara la verificación de una factura que quedó en TIMEOUT del SRI.
 *
 * A diferencia de "consultar" (GET, solo lee el estado guardado), aquí se
 * RE-ENVÍA la emisión con el MISMO idempotencyKey. AutorizadorEC, por
 * idempotencia, NO crea un documento nuevo: reusa la misma clave de acceso y
 * vuelve a preguntar al SRI. Así, si el SRI ya respondió (o responde ahora), la
 * factura se autoriza sin riesgo de duplicado.
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

  // Factura del médico + datos para reconstruir la emisión idéntica.
  const { data: f } = await supabase
    .from("facturas")
    .select(
      "id, estado, paciente_id, razon_social_comprador, identificacion_comprador, tipo_identificacion_comprador, importe_total, descripcion_servicio, idempotency_key"
    )
    .eq("id", facturaId)
    .eq("medico_id", medico.id)
    .maybeSingle();
  if (!f) {
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
  }
  if (f.estado === "autorizada") {
    return NextResponse.json({ estado: "autorizada" }, { status: 200 });
  }
  if (!f.idempotency_key || !f.identificacion_comprador || !f.tipo_identificacion_comprador) {
    return NextResponse.json(
      { error: "Esta factura no se puede reverificar; usa 'Reintentar'." },
      { status: 422 }
    );
  }

  try {
    const sk = await leerSkMedico(medico.id);
    if (!sk) {
      return NextResponse.json(
        { error: "No se encontró la credencial de facturación." },
        { status: 422 }
      );
    }

    // Dirección/email del comprador = las del paciente (el pagador convive con él).
    let direccion: string | undefined;
    let email: string | undefined;
    if (f.paciente_id) {
      const { data: pac } = await supabase
        .from("pacientes")
        .select("direccion, email")
        .eq("id", f.paciente_id)
        .maybeSingle();
      direccion = pac?.direccion?.trim() || undefined;
      email = pac?.email?.trim() || undefined;
    }

    // Re-emisión IDÉNTICA con el mismo idempotencyKey → AutorizadorEC reusa el
    // documento (misma clave de acceso) y vuelve a consultar el SRI.
    const emitida = await emitirFactura({
      sk,
      comprador: {
        tipoIdentificacion: f.tipo_identificacion_comprador as "04" | "05" | "06" | "07",
        identificacion: f.identificacion_comprador,
        razonSocial: f.razon_social_comprador ?? "",
        direccion,
        email,
      },
      items: [
        {
          codigoPrincipal: "CONS",
          descripcion: f.descripcion_servicio ?? "Consulta médica",
          cantidad: 1,
          precioUnitario: Number(f.importe_total),
        },
      ],
      idempotencyKey: f.idempotency_key,
      obligadoContabilidad: false,
    });

    const resultado = emitida.procesamiento?.resultado;
    const claveAcceso = emitida.claveAcceso ?? null;
    const service = createSupabaseServiceRoleClient();

    if (resultado === "authorized") {
      await service
        .from("facturas")
        .update({
          estado: "autorizada",
          clave_acceso: claveAcceso,
          secuencial: emitida.secuencial ?? null,
          numero_autorizacion:
            (emitida.numeroAutorizacion as string | undefined) ?? claveAcceso,
          fecha_autorizacion: (emitida.fechaAutorizacion as string | undefined) ?? null,
        })
        .eq("id", f.id);
      if (claveAcceso) {
        const path = await respaldarXmlAutorizado({ supabase: service, sk, medicoId: medico.id, claveAcceso });
        if (path) await service.from("facturas").update({ xml_object_key: path }).eq("id", f.id);
      }
      return NextResponse.json({ estado: "autorizada", cambio: true }, { status: 200 });
    }

    if (resultado === "rejected") {
      const errores = emitida.procesamiento?.errores ?? [];
      await service
        .from("facturas")
        .update({ estado: "rechazada", clave_acceso: claveAcceso, errores: { errores } })
        .eq("id", f.id);
      return NextResponse.json({ estado: "rechazada", cambio: true }, { status: 200 });
    }

    // "failed" u otro: el SRI sigue sin responder. Queda en procesando para
    // volver a intentar (el documento sigue en el SRI con su misma clave).
    await service
      .from("facturas")
      .update({
        estado: "procesando",
        clave_acceso: claveAcceso,
        errores: { errores: emitida.procesamiento?.errores ?? [], mensaje: emitida.procesamiento?.mensaje ?? null },
      })
      .eq("id", f.id);
    return NextResponse.json(
      { estado: "procesando", cambio: true, estadoSri: emitida.estado ?? "sin respuesta del SRI" },
      { status: 200 }
    );
  } catch (err) {
    // Timeout de nuevo: el SRI sigue lento. No cambia el estado; se reintenta.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[facturas/reverificar] factura=${facturaId}: ${message}`);
    return NextResponse.json(
      {
        estado: "procesando",
        cambio: false,
        error:
          "El SRI de pruebas sigue sin responder a tiempo. Tu factura está en cola; vuelve a intentar en unos minutos.",
      },
      { status: 200 }
    );
  }
}
