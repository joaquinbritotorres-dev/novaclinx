import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { descargarArchivoDocumento } from "@/lib/facturacion/autorizadorec";
import { leerSkMedico } from "@/lib/facturacion/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Descarga el RIDE (PDF) de una factura autorizada.
 *
 * Auth: requireAuth + verificación de dueño con el cliente SSR/RLS. El sk_ se
 * usa server-side para pedir el binario a AutorizadorEC; nunca se loguea.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ facturaId: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { facturaId } = await params;

  const supabase = await createSupabaseServerClient();

  // Médico del usuario.
  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // Factura del médico (dueño).
  const { data: factura } = await supabase
    .from("facturas")
    .select("clave_acceso, estado, medico_id")
    .eq("id", facturaId)
    .eq("medico_id", medico.id)
    .maybeSingle();
  if (!factura) {
    return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 404 });
  }

  // Solo se puede pedir el RIDE de una factura autorizada con clave de acceso.
  if (factura.estado !== "autorizada" || !factura.clave_acceso) {
    return NextResponse.json(
      { error: "La factura aún no está disponible para descargar." },
      { status: 409 }
    );
  }

  // Credencial del médico (server-side; nunca se loguea).
  const sk = await leerSkMedico(medico.id);
  if (!sk) {
    console.error(`[facturas/ride] sin sk_ para medico=${medico.id} factura=${facturaId}`);
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }

  let pdf: Buffer | null;
  try {
    pdf = await descargarArchivoDocumento({
      sk,
      claveAcceso: factura.clave_acceso,
      fileType: "ride",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[facturas/ride] error al descargar RIDE factura=${facturaId}: ${message}`);
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // 404 en el proveedor: el RIDE aún no se generó.
  if (!pdf) {
    return NextResponse.json(
      { error: "El RIDE aún no está disponible, intenta en unos momentos." },
      { status: 409 }
    );
  }

  // inline: se abre en el navegador; el usuario puede descargar desde ahí.
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${factura.clave_acceso}.pdf"`,
    },
  });
}
