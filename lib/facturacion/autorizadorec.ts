import "server-only";

/**
 * Cliente base de AutorizadorEC (proveedor de facturación electrónica SRI).
 *
 * Esta PIEZA 0 solo contiene los cimientos: base URL, lectura de la Account
 * Key, tipos/clase de error comunes y la función central `autorizadorecRequest`
 * que todas las piezas futuras (crear empresa, subir certificado, emitir, …)
 * usarán. Las funciones de negocio NO van aquí todavía.
 *
 * ⚠ SEGURIDAD
 * - `import "server-only"`: maneja credenciales (ak_/sk_), nunca debe llegar
 *   al bundle del cliente.
 * - Ningún log incluye jamás el ak_, el sk_ ni los headers completos: solo
 *   path, método y statusCode/mensaje.
 *
 * AUTH (AutorizadorEC es multi-empresa, hay dos tipos de llave):
 * - Account Key (ak_…): gestiona empresas/certificados (/client/companies/*).
 *   Una sola para toda la plataforma, vive en el env. Header "X-Account-Key".
 * - Company Key (sk_…): emite documentos de UNA empresa (/documents/*). Una
 *   por médico, se lee del Vault. Header "X-API-Key".
 */

export const AUTORIZADOREC_BASE_URL = "https://api.autorizadorec.com/api/v1";

/** Timeout por defecto: emitir espera al SRI (5–15 s), damos margen. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Lee la Account Key (ak_) de la plataforma desde el entorno del servidor.
 * Lanza un error claro si falta, para evitar fallos silenciosos.
 */
export function getAccountKey(): string {
  const key = process.env.AUTORIZADOREC_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "Falta AUTORIZADOREC_ACCOUNT_KEY en las variables de entorno del servidor."
    );
  }
  return key;
}

/**
 * Forma del cuerpo de error que devuelve la API de AutorizadorEC.
 * Flexible: `statusCode` y `message` son los campos garantizados, pero la API
 * a veces incluye detalle extra, que dejamos pasar sin tiparlo estrictamente.
 */
export interface AutorizadorECApiError {
  statusCode: number;
  message: string;
  // Campos extra opcionales que la API pueda incluir (errores de validación,
  // códigos, etc.). Se acepta cualquier valor adicional sin romper el tipo.
  [key: string]: unknown;
}

/**
 * Error tipado para fallos de AutorizadorEC. Lleva el `statusCode` real para
 * que las piezas aguas arriba puedan distinguir un error de la API (4xx/5xx)
 * de un error de red/timeout (statusCode 0) o de cualquier otro Error.
 */
export class AutorizadorECError extends Error {
  /** statusCode de la API; 0 cuando es error de red o timeout (sin respuesta). */
  readonly statusCode: number;
  /** Cuerpo de error crudo de la API, si se pudo parsear. */
  readonly apiError?: AutorizadorECApiError;

  constructor(
    message: string,
    statusCode: number,
    apiError?: AutorizadorECApiError
  ) {
    super(message);
    this.name = "AutorizadorECError";
    this.statusCode = statusCode;
    this.apiError = apiError;
  }
}

type AuthMode = { type: "account" } | { type: "company"; sk: string };

/**
 * Función central de request a AutorizadorEC. Todas las piezas la usan.
 *
 * - Soporta body JSON (objeto) o multipart (FormData, para certificados).
 * - Auth por header según `auth.type`.
 * - Timeout vía AbortController (default 30 s).
 * - Errores de la API → AutorizadorECError con statusCode y message reales.
 * - Errores de red/timeout → AutorizadorECError con statusCode 0.
 * - 204 → devuelve undefined (tipado como T).
 *
 * Nota: descargas binarias se manejarán aparte; aquí se asume respuesta JSON.
 */
export async function autorizadorecRequest<T>(params: {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  auth: AuthMode;
  body?: unknown;
  timeoutMs?: number;
}): Promise<T> {
  const { path, method, auth, body, timeoutMs = DEFAULT_TIMEOUT_MS } = params;

  const url = `${AUTORIZADOREC_BASE_URL}${path}`;

  // ── Headers de auth (nunca se loguean) ──────────────────────────────
  const headers: Record<string, string> = {};
  if (auth.type === "account") {
    headers["X-Account-Key"] = getAccountKey();
  } else {
    headers["X-API-Key"] = auth.sk;
  }

  // ── Body: FormData (multipart) vs JSON ──────────────────────────────
  // fetch acepta FormData | string como BodyInit.
  let fetchBody: BodyInit | undefined;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (isFormData) {
    // No setear Content-Type: fetch añade el boundary multipart correcto.
    fetchBody = body as FormData;
  } else if (body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  // ── Timeout vía AbortController ──────────────────────────────────────
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: fetchBody,
      signal: controller.signal,
    });
  } catch (err) {
    // Error de red o abort (timeout). Sin respuesta → statusCode 0.
    const aborted = err instanceof Error && err.name === "AbortError";
    const message = aborted
      ? `Timeout al contactar AutorizadorEC tras ${timeoutMs} ms.`
      : "Error de red al contactar AutorizadorEC.";
    // Log seguro: solo método y path, jamás credenciales.
    console.error(`[facturacion/autorizadorec] ${method} ${path}: ${message}`);
    throw new AutorizadorECError(message, 0);
  } finally {
    clearTimeout(timeout);
  }

  // ── Error de la API (status >= 400) ─────────────────────────────────
  if (!res.ok) {
    let apiError: AutorizadorECApiError | undefined;
    try {
      apiError = (await res.json()) as AutorizadorECApiError;
    } catch {
      // Cuerpo no era JSON parseable; usamos fallback con el status real.
    }

    const statusCode = apiError?.statusCode ?? res.status;
    const message =
      apiError?.message ??
      `AutorizadorEC respondió ${res.status} ${res.statusText}.`;

    console.error(
      `[facturacion/autorizadorec] ${method} ${path} → ${statusCode}: ${message}`
    );
    throw new AutorizadorECError(message, statusCode, apiError);
  }

  // ── Respuesta OK ────────────────────────────────────────────────────
  // 204 No Content: no hay cuerpo que parsear.
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
