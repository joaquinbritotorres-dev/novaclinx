import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import {
  integrarAnadido,
  IntegrarAnadidoError,
} from "@/lib/prompts/integrar-anadido";

const MAX_ANADIDO = 2000;
const MAX_SECCION = 8000;

/**
 * Integra un "añadido" del médico a la nota SOAP que está revisando.
 *
 * El modelo SOLO decide la sección destino y redacta el texto nuevo; el append
 * lo hace el cliente. No se persiste nada aquí: el médico revisa el resultado en
 * pantalla y guarda por el flujo normal (Aprobar y guardar). Cero PHI en logs.
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const { soap, texto_anadido } = body as Record<string, unknown>;

  if (typeof texto_anadido !== "string" || !texto_anadido.trim()) {
    return NextResponse.json(
      { error: "Escribe o dicta lo que quieres añadir." },
      { status: 400 }
    );
  }
  if (texto_anadido.length > MAX_ANADIDO) {
    return NextResponse.json(
      { error: "El texto a añadir es demasiado largo." },
      { status: 400 }
    );
  }

  if (typeof soap !== "object" || soap === null) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }
  const soapObj = soap as Record<string, unknown>;
  const claves = ["subjetivo", "objetivo", "analisis", "plan"] as const;
  const soapActual = {
    subjetivo: "",
    objetivo: "",
    analisis: "",
    plan: "",
  };
  for (const k of claves) {
    const v = soapObj[k];
    if (typeof v !== "string" || v.length > MAX_SECCION) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 400 }
      );
    }
    soapActual[k] = v;
  }

  try {
    const resultado = await integrarAnadido({
      soapActual,
      textoAnadido: texto_anadido,
    });

    return NextResponse.json({
      seccion: resultado.seccion,
      texto_a_anadir: resultado.textoAAnadir,
      requiere_verificar: resultado.requiereVerificar,
    });
  } catch (err) {
    if (err instanceof IntegrarAnadidoError) {
      console.error(`[integrar-anadido] ${err.message}`);
      return NextResponse.json(
        { error: "No pudimos integrar el añadido. Intenta de nuevo." },
        { status: 502 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[integrar-anadido] error inesperado: ${message}`);
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
