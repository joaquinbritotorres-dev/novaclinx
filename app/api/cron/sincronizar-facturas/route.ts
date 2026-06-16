import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { sincronizarFacturas } from "@/lib/facturacion/sincronizar-facturas";

// Este endpoint usa el cliente service-role y librerías de Node → runtime
// nodejs (NO edge). Nunca cachear ni prerenderizar: es un job disparado por
// Vercel Cron en cada invocación.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron de sincronización de facturas en 'procesando'.
 *
 * Protegido: Vercel Cron envía `Authorization: Bearer <CRON_SECRET>` en cada
 * invocación. Solo se ejecuta si el header coincide con process.env.CRON_SECRET.
 * Falla CERRADO: sin CRON_SECRET configurado, no ejecuta nada.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Sin secreto configurado → no ejecutar (fail closed). 500 genérico.
  if (!cronSecret) {
    console.error(
      "[cron/sincronizar-facturas] CRON_SECRET no está configurada; no se ejecuta el job."
    );
    return NextResponse.json(
      { error: "Configuración del servidor incompleta." },
      { status: 500 }
    );
  }

  // Autorización: header exacto `Bearer <CRON_SECRET>`.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resumen = await sincronizarFacturas();
    // El resumen son solo conteos (sin datos sensibles); útil en logs de Vercel.
    console.log(
      `[cron/sincronizar-facturas] ok revisadas=${resumen.revisadas} actualizadas=${resumen.actualizadas} autorizadas=${resumen.autorizadas} rechazadas=${resumen.rechazadas} sinCambio=${resumen.sinCambio} errores=${resumen.errores}`
    );
    return NextResponse.json(resumen, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/sincronizar-facturas] el job falló: ${message}`);
    return NextResponse.json(
      { error: "No se pudo completar la sincronización." },
      { status: 500 }
    );
  }
}
