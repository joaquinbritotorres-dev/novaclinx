import "server-only";

import {
  emitirFactura,
  descargarArchivoDocumento,
  AutorizadorECError,
} from "@/lib/facturacion/autorizadorec";
import { leerSkMedico } from "@/lib/facturacion/vault";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Factura una consulta real: emite la factura en AutorizadorEC, registra la
 * fila en `facturas` y respalda el XML autorizado en Storage.
 *
 * ⚠ SEGURIDAD (server-only): nunca se loguea el sk_. Los errores hacia afuera
 * llevan mensajes legibles sin credenciales.
 *
 * ⚠ RESILIENCIA: la fila en `facturas` se crea ANTES de emitir (estado
 * 'pendiente'), así que aunque la emisión falle o el SRI no responda, queda
 * registro. Un timeout deja la factura en 'procesando' (se sincroniza luego),
 * nunca se pierde.
 */

/**
 * Error de negocio: la consulta NO se puede facturar (ej. el paciente no tiene
 * una identificación válida — no se factura a Consumidor Final). El endpoint lo
 * captura y lo traduce a HTTP 422 con un mensaje claro para el médico.
 */
export class FacturacionBloqueadaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacturacionBloqueadaError";
  }
}

export interface FacturarConsultaParams {
  consultaId: string;
  monto: number; // el médico lo escribe
  descripcionServicio?: string; // default "Consulta médica"
  /** Defensa en profundidad: si se pasa, debe coincidir con el medico_id de la
   *  consulta (el endpoint ya verificó al dueño con el cliente SSR). */
  medicoIdEsperado?: string;
}

export interface FacturarConsultaResultado {
  facturaId: string;
  estado: string; // 'autorizada' | 'rechazada' | 'procesando' | 'fallida'
  claveAcceso: string | null;
  mensaje: string; // mensaje legible para el médico
}

type TipoIdent = "04" | "05" | "06" | "07";

/**
 * Normaliza el tipo de identificación del paciente al código SRI.
 * Heurística:
 *  - Si ya es "04"/"05"/"06"/"07" → se usa tal cual.
 *  - "ruc" → "04"; "cedula"/"cédula" → "05"; "pasaporte" → "06".
 *  - Si no, por longitud de la identificación: 13 dígitos → RUC "04",
 *    10 dígitos → cédula "05". En cualquier otro caso → null (no decidible).
 */
function normalizarTipoIdent(
  tipo: string | null | undefined,
  identificacion: string
): TipoIdent | null {
  const t = (tipo ?? "").trim().toLowerCase();
  if (t === "04" || t === "05" || t === "06" || t === "07") return t as TipoIdent;
  if (t === "ruc") return "04";
  if (t === "cedula" || t === "cédula") return "05";
  if (t === "pasaporte") return "06";

  const soloDigitos = identificacion.replace(/\D/g, "");
  if (soloDigitos.length === 13) return "04";
  if (soloDigitos.length === 10) return "05";
  return null;
}

interface Comprador {
  tipoIdentificacion: TipoIdent;
  identificacion: string;
  razonSocial: string;
  direccion?: string;
  email?: string;
}

export async function facturarConsulta(
  params: FacturarConsultaParams
): Promise<FacturarConsultaResultado> {
  const descripcionServicio = params.descripcionServicio ?? "Consulta médica";
  const supabase = createSupabaseServiceRoleClient();

  // ── 1) Consulta ────────────────────────────────────────────────────
  const { data: consulta, error: errConsulta } = await supabase
    .from("consultas")
    .select("id, medico_id, paciente_id")
    .eq("id", params.consultaId)
    .maybeSingle();
  if (errConsulta) {
    throw new Error(`No se pudo leer la consulta: ${errConsulta.message}`);
  }
  if (!consulta) {
    throw new Error(`No existe la consulta ${params.consultaId}.`);
  }
  const medicoId: string = consulta.medico_id;
  const pacienteId: string | null = consulta.paciente_id;

  // Defensa en profundidad: la consulta debe ser del médico esperado.
  if (params.medicoIdEsperado && params.medicoIdEsperado !== medicoId) {
    throw new Error("La consulta no pertenece al médico indicado.");
  }

  // ── 2) Config de facturación del médico (debe estar activa) ─────────
  const { data: config } = await supabase
    .from("config_facturacion")
    .select("provider_company_id, ambiente, estado")
    .eq("medico_id", medicoId)
    .maybeSingle();
  if (!config || config.estado !== "activo" || !config.provider_company_id) {
    throw new Error("Este médico no tiene facturación configurada o activa.");
  }
  const providerCompanyId: string = config.provider_company_id;
  const ambiente: string = config.ambiente;

  // ── 3) Credencial (sk_) del médico ──────────────────────────────────
  const sk = await leerSkMedico(medicoId);
  if (!sk) {
    throw new Error("No se encontró la credencial de facturación del médico.");
  }

  // ── 4) Comprador: paciente con identificación VÁLIDA ────────────────
  // Regla de negocio: NO se factura a Consumidor Final (07) ni sin
  // identificación. Una factura a Consumidor Final no le sirve al paciente para
  // reembolso de seguro/impuestos y desde 2026 es irreversible ante el SRI.
  // Se bloquea ANTES de insertar la fila o emitir (no deja registro ni emite).
  if (!pacienteId) {
    throw new FacturacionBloqueadaError(
      "La consulta no tiene un paciente asociado. Regístralo con su identificación antes de facturar."
    );
  }
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre, identificacion, tipo_identificacion, direccion, email")
    .eq("id", pacienteId)
    .maybeSingle();

  const ident = (paciente?.identificacion ?? "").trim();
  const tipo =
    paciente && ident ? normalizarTipoIdent(paciente.tipo_identificacion, ident) : null;
  if (!paciente || !ident || !tipo || tipo === "07") {
    throw new FacturacionBloqueadaError(
      "El paciente no tiene una identificación válida (cédula, RUC o pasaporte). Edítalo antes de facturar."
    );
  }
  const comprador: Comprador = {
    tipoIdentificacion: tipo,
    identificacion: ident,
    razonSocial: paciente.nombre ?? "",
    direccion: paciente.direccion ?? undefined,
    email: paciente.email ?? undefined,
  };

  // ── 5) idempotencyKey ───────────────────────────────────────────────
  const idempotencyKey = `nvclx-${params.consultaId}-${Date.now()}`;

  // ── 6) INSERT 'pendiente' ANTES de emitir (deja registro) ───────────
  const { data: filaCreada, error: errInsert } = await supabase
    .from("facturas")
    .insert({
      medico_id: medicoId,
      consulta_id: params.consultaId,
      paciente_id: pacienteId,
      provider_company_id: providerCompanyId,
      ambiente,
      razon_social_comprador: comprador.razonSocial,
      identificacion_comprador: comprador.identificacion,
      tipo_identificacion_comprador: comprador.tipoIdentificacion,
      importe_total: params.monto,
      descripcion_servicio: descripcionServicio,
      idempotency_key: idempotencyKey,
      moneda: "DOLAR",
      estado: "pendiente",
    })
    .select("id")
    .single();
  if (errInsert || !filaCreada) {
    throw new Error(
      `No se pudo registrar la factura: ${errInsert?.message ?? "sin id"}`
    );
  }
  const facturaId: string = filaCreada.id;

  // ── 7) Emitir ───────────────────────────────────────────────────────
  let emitida;
  try {
    emitida = await emitirFactura({
      sk,
      comprador,
      items: [
        {
          codigoPrincipal: "CONS",
          descripcion: descripcionServicio,
          cantidad: 1,
          precioUnitario: params.monto,
        },
      ],
      idempotencyKey,
      obligadoContabilidad: false,
    });
  } catch (err) {
    // Timeout/red: la factura se envió pero no se confirmó → 'procesando'.
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("facturas")
      .update({ estado: "procesando", errores: { mensaje: message } })
      .eq("id", facturaId);
    console.error(`[facturar-consulta] emisión sin confirmar factura=${facturaId}: ${message}`);
    return {
      facturaId,
      estado: "procesando",
      claveAcceso: null,
      mensaje:
        "La factura se envió pero no se confirmó (timeout). Se sincronizará más tarde.",
    };
  }

  const claveAcceso = emitida.claveAcceso ?? null;
  const resultado = emitida.procesamiento?.resultado;

  // ── 8) Persistir según resultado ────────────────────────────────────
  if (resultado === "authorized") {
    await supabase
      .from("facturas")
      .update({
        estado: "autorizada",
        clave_acceso: claveAcceso,
        secuencial: emitida.secuencial ?? null,
        numero_autorizacion:
          (emitida.numeroAutorizacion as string | undefined) ?? claveAcceso,
        fecha_autorizacion:
          (emitida.fechaAutorizacion as string | undefined) ?? null,
      })
      .eq("id", facturaId);

    // ── 9) Respaldar XML autorizado (best-effort, no rompe la factura) ─
    if (claveAcceso) {
      await respaldarXml({ supabase, sk, medicoId, claveAcceso, facturaId });
    }

    return {
      facturaId,
      estado: "autorizada",
      claveAcceso,
      mensaje: "Factura autorizada por el SRI.",
    };
  }

  if (resultado === "rejected") {
    const errores = emitida.procesamiento?.errores ?? [];
    const primerError = describirPrimerError(errores) ?? emitida.procesamiento?.mensaje ?? "motivo no especificado";
    await supabase
      .from("facturas")
      .update({
        estado: "rechazada",
        clave_acceso: claveAcceso,
        errores: { errores },
      })
      .eq("id", facturaId);
    return {
      facturaId,
      estado: "rechazada",
      claveAcceso,
      mensaje: `El SRI rechazó la factura: ${primerError}`,
    };
  }

  // "failed" o cualquier otro → 'procesando' (posible timeout del SRI).
  const errores = emitida.procesamiento?.errores ?? [];
  await supabase
    .from("facturas")
    .update({
      estado: "procesando",
      clave_acceso: claveAcceso,
      errores: { errores, mensaje: emitida.procesamiento?.mensaje },
    })
    .eq("id", facturaId);
  return {
    facturaId,
    estado: "procesando",
    claveAcceso,
    mensaje:
      "La factura quedó en procesamiento (el SRI no respondió aún). Se sincronizará más tarde.",
  };
}

/** Extrae un texto legible del primer error del SRI (forma desconocida). */
function describirPrimerError(errores: unknown[]): string | null {
  if (!Array.isArray(errores) || errores.length === 0) return null;
  const e = errores[0];
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    const msg = obj.mensaje ?? obj.message ?? obj.error;
    if (typeof msg === "string") return msg;
    return JSON.stringify(e);
  }
  return String(e);
}

/**
 * Descarga el XML autorizado y lo sube al bucket 'facturas-xml' en la ruta
 * `${medicoId}/${claveAcceso}.xml`. Devuelve el object key, o null si el XML
 * aún no está disponible (404) o algo falla. Best-effort: NUNCA lanza, para no
 * romper una factura ya autorizada. NO actualiza la fila (eso lo hace el caller).
 *
 * Reutilizada por facturarConsulta y por el job sincronizarFacturas.
 *
 * ⚠ SEGURIDAD: nunca se loguea el sk_.
 */
export async function respaldarXmlAutorizado(args: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  sk: string;
  medicoId: string;
  claveAcceso: string;
}): Promise<string | null> {
  const { supabase, sk, medicoId, claveAcceso } = args;
  try {
    const xml = await descargarArchivoDocumento({
      sk,
      claveAcceso,
      fileType: "authorized_xml",
    });
    if (!xml) {
      console.log(
        `[facturacion] XML aún no disponible clave=${claveAcceso}; se sincronizará después.`
      );
      return null;
    }
    const path = `${medicoId}/${claveAcceso}.xml`;
    const { error: upErr } = await supabase.storage
      .from("facturas-xml")
      .upload(path, xml, { contentType: "application/xml", upsert: true });
    if (upErr) {
      console.error(`[facturacion] no se pudo subir XML clave=${claveAcceso}: ${upErr.message}`);
      return null;
    }
    return path;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[facturacion] respaldo XML falló clave=${claveAcceso}: ${message}`);
    return null; // no relanzar: la factura ya está autorizada
  }
}

/**
 * Wrapper para facturarConsulta: respalda el XML y actualiza xml_object_key.
 */
async function respaldarXml(args: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  sk: string;
  medicoId: string;
  claveAcceso: string;
  facturaId: string;
}): Promise<void> {
  const { supabase, facturaId, ...rest } = args;
  const path = await respaldarXmlAutorizado({ supabase, ...rest });
  if (path) {
    await supabase.from("facturas").update({ xml_object_key: path }).eq("id", facturaId);
  }
}
