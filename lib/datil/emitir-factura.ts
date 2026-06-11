import "server-only";

import { DatilFacturaRequest, DatilResult, DatilFacturaResponse } from "./types";
import { DATIL_API_KEY, DATIL_CERT_PASSWORD } from "./config";

export async function emitirFacturaDatil(
  payload: DatilFacturaRequest,
  idempotencyKey: string
): Promise<DatilResult> {
  if (!DATIL_API_KEY) {
    return { ok: false, status: 500, message: "API Key de Dátil no configurada." };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Key": DATIL_API_KEY,
    "Idempotency-key": idempotencyKey,
  };

  // X-Password solo se necesita para firma electrónica en producción
  if (DATIL_CERT_PASSWORD) {
    headers["X-Password"] = DATIL_CERT_PASSWORD;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://link.datil.co/invoices/issue", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMsg = `Error Dátil HTTP ${res.status}`;
      try {
        const errBody = await res.json() as Record<string, unknown>;
        if (typeof errBody.mensaje === "string") {
          errorMsg = errBody.mensaje;
        } else if (Array.isArray(errBody.errores) && errBody.errores.length > 0) {
          errorMsg = (errBody.errores as unknown[]).map(String).join(", ");
        } else {
          errorMsg = JSON.stringify(errBody);
        }
      } catch {
        errorMsg = await res.text().catch(() => errorMsg);
      }
      return { ok: false, status: res.status, message: errorMsg };
    }

    const data = await res.json() as DatilFacturaResponse;
    return { ok: true, data };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, status: 504, message: "Timeout conectando con Dátil." };
    }
    const msg = error instanceof Error ? error.message : "Error desconocido de red";
    return { ok: false, status: 500, message: `Error de red: ${msg}` };
  }
}
