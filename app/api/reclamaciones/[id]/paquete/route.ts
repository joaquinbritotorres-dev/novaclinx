import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import {
  createSupabaseServerClient,
  createSupabaseServerClientWithServiceRole,
} from "@/lib/supabase/server";
import {
  armarPaqueteReclamacion,
  RideNoDisponibleError,
} from "@/lib/pdf/paqueteReclamacion";
import { firmarPdf } from "@/lib/firma/firmar";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const firmar = request.nextUrl.searchParams.get("firmar") === "1";

  try {
    const supabase = await createSupabaseServerClient();
    const serviceClient = await createSupabaseServerClientWithServiceRole();

    // Verificar que la reclamación existe y pertenece al médico autenticado
    const { data: medico } = await supabase
      .from("medicos")
      .select("id, firma_object_key, firma_titular, firma_valida_hasta")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!medico) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (firmar) {
      if (!medico.firma_object_key) {
        return NextResponse.json(
          { error: "No tienes una firma electrónica configurada. Ve a Mi perfil para subir tu certificado." },
          { status: 400 }
        );
      }
      if (medico.firma_valida_hasta) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vence = new Date(medico.firma_valida_hasta + "T00:00:00");
        if (vence < hoy) {
          return NextResponse.json(
            { error: "Tu firma electrónica está vencida. Renueva tu certificado en Mi perfil." },
            { status: 400 }
          );
        }
      }
    }

    const { data: reclamacion } = await supabase
      .from("reclamaciones")
      .select("id")
      .eq("id", id)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!reclamacion) {
      return NextResponse.json(
        { error: "Reclamación no encontrada." },
        { status: 404 }
      );
    }

    const fechaFirmaHoy = firmar
      ? new Date().toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "America/Guayaquil",
        })
      : undefined;

    const firmaOpts =
      firmar && medico.firma_titular && fechaFirmaHoy
        ? { firmante: medico.firma_titular, fechaFirma: fechaFirmaHoy }
        : undefined;

    const { bytes, filename } = await armarPaqueteReclamacion(
      id,
      supabase,
      serviceClient,
      firmaOpts
    );

    const finalBytes = firmar
      ? new Uint8Array(await firmarPdf(Buffer.from(bytes), medico.id))
      : new Uint8Array(bytes);

    return new Response(finalBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    // RIDE no disponible: la factura existe pero su PDF no se pudo traer del
    // proveedor. Es transitorio (502) y mostramos el mensaje al médico.
    if (err instanceof RideNoDisponibleError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    // Cualquier otro error → 500 con mensaje fijo (el detalle solo en server,
    // para no filtrar mensajes internos al usuario).
    console.error(
      `[reclamaciones/paquete] error inesperado: ${err instanceof Error ? err.message : String(err)}`
    );
    return NextResponse.json(
      { error: "No pudimos generar el paquete. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
