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

// ── PIEZA 1: crear empresa (gestión, auth "account") ───────────────────

/**
 * Plan de facturación a usar al crear empresas: 6 = "Bajo Demanda"
 * (payperuse), el plan actual de la cuenta Novaclinx en AutorizadorEC.
 */
const PLAN_ID_DEFAULT = 6;

/** Parámetros de negocio para dar de alta a un médico como empresa emisora. */
export interface CrearEmpresaParams {
  razonSocial: string;
  ruc: string;
  direccion: string;
  email: string;
  telefono?: string;
  establecimiento?: string; // default "001"
  ambiente?: "test" | "production"; // default "test"
  notificationEmail?: string;
}

/** Respuesta de AutorizadorEC al crear una empresa. */
export interface EmpresaCreada {
  id: number; // ID de la empresa en AutorizadorEC (= provider_company_id)
  accountId: number;
  name: string;
  ruc: string;
  apiKey: string; // sk_ — sensible; el caller lo guardará en el Vault
  env: string;
  status: string;
  establishment: string;
  billingStartDate?: string;
}

/**
 * Crea una empresa emisora en AutorizadorEC (POST /client/companies).
 * Usa auth "account" (el ak_ de la plataforma) porque es gestión.
 *
 * ⚠ La respuesta incluye `apiKey` (sk_), sensible. Esta función NO lo loguea
 * ni lo persiste: solo lo devuelve para que el caller lo guarde en el Vault.
 */
export async function crearEmpresa(
  params: CrearEmpresaParams
): Promise<EmpresaCreada> {
  const body = {
    planId: PLAN_ID_DEFAULT,
    name: params.razonSocial,
    ruc: params.ruc,
    address: params.direccion,
    email: params.email,
    phone: params.telefono,
    env: params.ambiente ?? "test",
    establishment: params.establecimiento ?? "001",
    notificationEmail: params.notificationEmail,
  };

  const empresa = await autorizadorecRequest<EmpresaCreada>({
    path: "/client/companies",
    method: "POST",
    auth: { type: "account" },
    body,
  });

  // Log de éxito sin credenciales: solo id y ruc, jamás el apiKey.
  console.log(
    `[facturacion/autorizadorec] empresa creada id=${empresa.id} ruc=${empresa.ruc}`
  );

  return empresa;
}

// ── Subir certificado (.p12) — multipart, auth "account" ───────────────

/** Respuesta de AutorizadorEC al subir un certificado .p12. */
export interface CertificadoSubido {
  certificate: {
    id: number;
    fileName: string;
    expiresAt: string;
    isCurrent: boolean;
    subjectCn: string;
  };
  validation: {
    subjectCn: string;
    issuerCn: string;
    validFrom: string;
    validTo: string;
    isExpired: boolean;
    daysUntilExpiry: number;
  };
}

/**
 * Sube el certificado .p12 de una empresa (POST .../certificates).
 * multipart/form-data: campo "file" (el .p12) y "password" (su clave).
 *
 * ⚠ SEGURIDAD: nunca se loguea la `password` ni el contenido del .p12.
 * El único log incluye companyId y la fecha de expiración.
 */
export async function subirCertificado(params: {
  companyId: number;
  p12: Blob;
  password: string;
}): Promise<CertificadoSubido> {
  const form = new FormData();
  // El boundary/Content-Type lo pone fetch solo (ver autorizadorecRequest).
  form.append("file", params.p12, "certificado.p12");
  form.append("password", params.password);

  const result = await autorizadorecRequest<CertificadoSubido>({
    path: `/client/companies/${params.companyId}/certificates`,
    method: "POST",
    auth: { type: "account" },
    body: form,
  });

  console.log(
    `[facturacion/autorizadorec] certificado subido company=${params.companyId} expiresAt=${result.certificate.expiresAt}`
  );

  return result;
}

// ── Habilitar tipos de documento — JSON, auth "account" ────────────────

/** Tipo de documento habilitado que devuelve AutorizadorEC. */
export interface TipoDocumentoHabilitado {
  id: number;
  companyId: number;
  code: string;
}

/**
 * Habilita tipos de documento para una empresa (PUT .../doc-types).
 * Ej.: codes ["01"] = Factura.
 */
export async function habilitarTiposDocumento(params: {
  companyId: number;
  codes: string[];
}): Promise<TipoDocumentoHabilitado[]> {
  return autorizadorecRequest<TipoDocumentoHabilitado[]>({
    path: `/client/companies/${params.companyId}/doc-types`,
    method: "PUT",
    auth: { type: "account" },
    body: { codes: params.codes },
  });
}

// ── Emitir factura (documento) — JSON, auth "company" (sk_) ────────────

/** Redondea a 2 decimales de forma estable (evita 0.1+0.2 ≠ 0.3). */
function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Un ítem de la factura. Por ahora solo soportamos IVA tarifa 0% (servicios
 * médicos). `codigoPorcentajeIva` queda preparado para otras tarifas en el
 * futuro, pero el default es "0" (0%).
 */
export interface ItemFactura {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** Código SRI del porcentaje de IVA. Default "0" = 0%. (Futuro: "4"=15%, etc.) */
  codigoPorcentajeIva?: string;
}

export interface EmitirFacturaParams {
  sk: string; // Company API Key del médico (de leerSkMedico)
  puntoEmision?: string; // default "001"
  comprador: {
    tipoIdentificacion: "04" | "05" | "06" | "07";
    identificacion: string;
    razonSocial: string;
    direccion?: string;
    email?: string;
  };
  items: ItemFactura[];
  idempotencyKey: string;
  obligadoContabilidad?: boolean; // default false → "NO"
  fechaEmision?: Date; // default hoy
}

/** Respuesta relevante de POST /documents/emit. */
export interface FacturaEmitida {
  id: number;
  secuencial: string;
  claveAcceso: string;
  estado: string; // AUTHORIZED / REJECTED / …
  importeTotal: number;
  procesamiento: {
    resultado: "authorized" | "rejected" | "failed";
    mensaje?: string;
    errores?: unknown[];
  };
  // La API puede incluir más campos; no los tipamos estrictamente.
  [key: string]: unknown;
}

/** Código SRI del impuesto IVA. */
const IVA_CODIGO = "2";

/** Fecha → "DD/MM/AAAA" (formato del SRI, con barras, no ISO). */
function formatFechaSRI(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aaaa = d.getFullYear();
  return `${dd}/${mm}/${aaaa}`;
}

/**
 * Emite una factura electrónica (POST /documents/emit). Síncrono: espera al
 * SRI (5–15 s), por eso timeoutMs 60 s. Usa la Company Key (sk_) del médico.
 *
 * La empresa está en accessKeyMode/sequentialMode "platform": AutorizadorEC
 * genera claveAcceso y secuencial; NO los enviamos.
 *
 * ⚠ El caller DEBE revisar `procesamiento.resultado`: si es "rejected" o
 * "failed", la factura NO quedó autorizada. Esta función no lanza error en ese
 * caso (devuelve la respuesta para que el caller decida).
 *
 * ⚠ SEGURIDAD: nunca se loguea el sk_.
 */
export async function emitirFactura(
  params: EmitirFacturaParams
): Promise<FacturaEmitida> {
  const fecha = params.fechaEmision ?? new Date();

  // ── Detalles + totales (IVA 0%) ────────────────────────────────────
  // Para cada ítem: precioTotalSinImpuesto = cantidad * precioUnitario (2 dec).
  // Con IVA 0%, el valor del impuesto es 0 y la baseImponible es ese subtotal.
  const detalles = params.items.map((item) => {
    const precioTotalSinImpuesto = redondear2(item.cantidad * item.precioUnitario);
    const codigoPorcentaje = item.codigoPorcentajeIva ?? "0";
    return {
      codigoPrincipal: item.codigoPrincipal,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: 0.0,
      precioTotalSinImpuesto,
      impuestos: [
        {
          codigo: IVA_CODIGO,
          codigoPorcentaje,
          tarifa: 0,
          baseImponible: precioTotalSinImpuesto,
          valor: 0.0,
        },
      ],
    };
  });

  // totalSinImpuestos = suma de subtotales (redondeada).
  const totalSinImpuestos = redondear2(
    detalles.reduce((acc, d) => acc + d.precioTotalSinImpuesto, 0)
  );
  const totalDescuento = 0.0;
  // IVA 0% no suma nada → importeTotal = totalSinImpuestos - descuentos.
  const importeTotal = redondear2(totalSinImpuestos - totalDescuento);

  const body = {
    tipoDocumento: "01", // Factura
    fechaEmision: formatFechaSRI(fecha),
    puntoEmision: params.puntoEmision ?? "001",
    tipoIdentificacionComprador: params.comprador.tipoIdentificacion,
    razonSocialComprador: params.comprador.razonSocial,
    identificacionComprador: params.comprador.identificacion,
    direccionComprador: params.comprador.direccion,
    totalSinImpuestos,
    totalDescuento,
    totalConImpuestos: [
      {
        codigo: IVA_CODIGO,
        codigoPorcentaje: "0",
        baseImponible: totalSinImpuestos,
        valor: 0.0,
      },
    ],
    importeTotal,
    moneda: "DOLAR",
    pagos: [{ formaPago: "01", total: importeTotal }], // 01 = efectivo
    detalles,
    obligadoContabilidad: params.obligadoContabilidad ? "SI" : "NO",
    idempotencyKey: params.idempotencyKey,
  };

  const factura = await autorizadorecRequest<FacturaEmitida>({
    path: "/documents/emit",
    method: "POST",
    auth: { type: "company", sk: params.sk },
    body,
    timeoutMs: 60_000,
  });

  // Log no sensible: clave de acceso y estado (jamás el sk_).
  console.log(
    `[facturacion/autorizadorec] factura emitida clave=${factura.claveAcceso} estado=${factura.estado} resultado=${factura.procesamiento?.resultado}`
  );

  return factura;
}

// ── Crear punto de emisión — JSON, auth "company" (sk_) ────────────────

/** Punto de emisión de una empresa (ej. "001"). */
export interface PuntoEmision {
  id: number;
  code: string;
  description: string;
  isActive: boolean;
}

/**
 * Crea un punto de emisión para la empresa autenticada con su sk_
 * (POST /company/emission-points). `code` debe ser 3 dígitos.
 *
 * Nota: crearEmpresa NO crea el punto automáticamente; hay que crearlo aquí.
 * Si el code ya existe, la API devuelve error (manéjalo en el caller).
 *
 * ⚠ SEGURIDAD: nunca se loguea el sk_. Solo se loguea el code creado.
 */
export async function crearPuntoEmision(params: {
  sk: string;
  code?: string; // default "001", 3 dígitos
  descripcion?: string; // default "Punto de emisión principal"
}): Promise<PuntoEmision> {
  const code = params.code ?? "001";

  const punto = await autorizadorecRequest<PuntoEmision>({
    path: "/company/emission-points",
    method: "POST",
    auth: { type: "company", sk: params.sk },
    body: {
      code,
      description: params.descripcion ?? "Punto de emisión principal",
    },
  });

  console.log(`[facturacion/autorizadorec] punto de emisión creado code=${punto.code}`);

  return punto;
}

// ── Listar empresas — JSON, auth "account" ─────────────────────────────

/** Empresa tal como la devuelve GET /client/companies. */
export interface EmpresaAutorizadorEC {
  id: number;
  ruc: string;
  name: string;
  env: string;
  status: string;
  apiKey: string; // sk_ — sensible; nunca loguear
  docTypes?: TipoDocumentoHabilitado[];
  emissionPoints?: PuntoEmision[];
  certificates?: CertificadoSubido["certificate"][];
  // La API puede incluir más campos; no los tipamos estrictamente.
  [key: string]: unknown;
}

/**
 * Lista las empresas de la cuenta (GET /client/companies, auth account).
 *
 * ⚠ Cada empresa incluye `apiKey` (sk_), sensible: no loguear la respuesta.
 */
export async function listarEmpresas(): Promise<EmpresaAutorizadorEC[]> {
  return autorizadorecRequest<EmpresaAutorizadorEC[]>({
    path: "/client/companies",
    method: "GET",
    auth: { type: "account" },
  });
}

// ── Descargar archivos de un documento (binario) — auth "company" ──────

/**
 * Descarga un archivo de un documento emitido (GET
 * /documents/{claveAcceso}/files/{fileType}). La respuesta es BINARIA, no JSON,
 * por eso NO usa autorizadorecRequest (que siempre hace res.json()): hace fetch
 * directo reusando la base URL y el header X-API-Key.
 *
 * - 200 → Buffer con el archivo.
 * - 404 → null (el archivo aún no existe; no es error).
 * - otro status → AutorizadorECError.
 *
 * ⚠ SEGURIDAD: nunca se loguea el sk_.
 */
export async function descargarArchivoDocumento(params: {
  sk: string;
  claveAcceso: string;
  fileType: "signed_xml" | "authorized_xml" | "ride";
}): Promise<Buffer | null> {
  const path = `/documents/${params.claveAcceso}/files/${params.fileType}`;
  const url = `${AUTORIZADOREC_BASE_URL}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { "X-API-Key": params.sk }, // jamás se loguea
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    const message = aborted
      ? `Timeout al descargar ${params.fileType} de AutorizadorEC.`
      : "Error de red al descargar archivo de AutorizadorEC.";
    console.error(`[facturacion/autorizadorec] GET ${path}: ${message}`);
    throw new AutorizadorECError(message, 0);
  } finally {
    clearTimeout(timeout);
  }

  // 404: el archivo aún no existe (p. ej. authorized_xml antes de autorizar).
  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    let apiError: AutorizadorECApiError | undefined;
    try {
      apiError = (await res.json()) as AutorizadorECApiError;
    } catch {
      // Cuerpo no JSON; fallback con el status real.
    }
    const statusCode = apiError?.statusCode ?? res.status;
    const message =
      apiError?.message ??
      `AutorizadorEC respondió ${res.status} ${res.statusText} al descargar ${params.fileType}.`;
    console.error(`[facturacion/autorizadorec] GET ${path} → ${statusCode}: ${message}`);
    throw new AutorizadorECError(message, statusCode, apiError);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Consultar estado de un documento — JSON, auth "company" ────────────

/** Estado de un documento devuelto por GET /documents/... */
export interface DocumentoEstado {
  id?: number;
  estado: string; // AUTHORIZED / REJECTED / PROCESSING / FAILED / RECEIVED / …
  claveAcceso?: string;
  secuencial?: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  errores?: unknown[];
  // La API puede incluir más campos; no los tipamos estrictamente.
  [key: string]: unknown;
}

/**
 * Consulta un documento por su clave de acceso (GET /documents/{claveAcceso}).
 * Devuelve null si la API responde 404 (no existe). Auth company.
 *
 * ⚠ SEGURIDAD: nunca se loguea el sk_.
 */
export async function consultarDocumento(params: {
  sk: string;
  claveAcceso: string;
}): Promise<DocumentoEstado | null> {
  try {
    return await autorizadorecRequest<DocumentoEstado>({
      path: `/documents/${encodeURIComponent(params.claveAcceso)}`,
      method: "GET",
      auth: { type: "company", sk: params.sk },
    });
  } catch (err) {
    if (err instanceof AutorizadorECError && err.statusCode === 404) return null;
    throw err;
  }
}

/**
 * Consulta un documento por su idempotencyKey (GET
 * /documents/by-idempotency-key/{key}). Útil cuando el emit hizo timeout sin
 * devolver la claveAcceso. Devuelve null si la API responde 404. Auth company.
 *
 * ⚠ SEGURIDAD: nunca se loguea el sk_.
 */
export async function consultarDocumentoPorIdempotencyKey(params: {
  sk: string;
  idempotencyKey: string;
}): Promise<DocumentoEstado | null> {
  try {
    return await autorizadorecRequest<DocumentoEstado>({
      path: `/documents/by-idempotency-key/${encodeURIComponent(params.idempotencyKey)}`,
      method: "GET",
      auth: { type: "company", sk: params.sk },
    });
  } catch (err) {
    if (err instanceof AutorizadorECError && err.statusCode === 404) return null;
    throw err;
  }
}
