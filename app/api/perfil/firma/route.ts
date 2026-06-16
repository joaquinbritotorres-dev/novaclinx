import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import forge from "node-forge";
import { requireAuth } from "@/lib/auth-guard";
import {
  createSupabaseServerClient,
  createSupabaseServerClientWithServiceRole,
} from "@/lib/supabase/server";
import { cifrar } from "@/lib/firma/cifrado";
import { activarFacturacionMedico } from "@/lib/facturacion/onboarding";

const BUCKET = "firmas-electronicas";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// ─── GET: estado público de la firma (titular + validez) ─────────────────────

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const supabase = await createSupabaseServerClient();
  const { data: medico } = await supabase
    .from("medicos")
    .select("firma_object_key, firma_titular, firma_valida_hasta")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  return NextResponse.json({
    tiene: !!medico.firma_object_key,
    titular: medico.firma_titular ?? null,
    valida_hasta: medico.firma_valida_hasta ?? null,
  });
}

// ─── POST: subir / reemplazar el .p12 ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const archivo = formData.get("archivo");
  const password = formData.get("password");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo .p12." }, { status: 400 });
  }
  if (typeof password !== "string" || !password) {
    return NextResponse.json(
      { error: "Falta la contraseña del certificado." },
      { status: 400 }
    );
  }
  if (archivo.size === 0 || archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo debe pesar entre 1 byte y 2 MB." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await archivo.arrayBuffer());

  // ── Validar el PKCS#12 server-side ────────────────────────────────────────
  let titular: string;
  let validaHasta: string;
  try {
    const p12Asn1 = forge.asn1.fromDer(bytes.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBags = bags[forge.pki.oids.certBag] ?? [];
    if (certBags.length === 0 || !certBags[0].cert) {
      throw new Error("Sin certificado en el .p12.");
    }
    const cert = certBags[0].cert;
    const cnField = cert.subject.getField({ shortName: "CN" });
    titular = cnField ? String(cnField.value) : "Sin nombre";
    validaHasta = cert.validity.notAfter.toISOString().slice(0, 10);
  } catch (err) {
    console.error("[firma POST] validación PKCS#12:", err);
    return NextResponse.json(
      { error: "La contraseña no abre el certificado, o no es un .p12 válido." },
      { status: 400 }
    );
  }

  // ── Medico id ─────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // ── Subir al bucket privado (service role) ────────────────────────────────
  const objectKey = `${medico.id}/firma.p12`;
  const supabaseService = await createSupabaseServerClientWithServiceRole();
  const { error: uploadError } = await supabaseService.storage
    .from(BUCKET)
    .upload(objectKey, bytes, {
      contentType: "application/x-pkcs12",
      upsert: true,
    });

  if (uploadError) {
    console.error("[firma POST] upload storage:", uploadError);
    return NextResponse.json(
      { error: "No pudimos guardar el certificado. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // ── Cifrar la contraseña ──────────────────────────────────────────────────
  let cipherParts: ReturnType<typeof cifrar>;
  try {
    cipherParts = cifrar(password);
  } catch (err) {
    console.error("[firma POST] cifrado:", err);
    await supabaseService.storage.from(BUCKET).remove([objectKey]);
    return NextResponse.json(
      { error: "Error de configuración del servidor. Contacta al administrador." },
      { status: 500 }
    );
  }

  // ── Guardar metadatos en medicos ──────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("medicos")
    .update({
      firma_object_key: objectKey,
      firma_password_cipher: cipherParts.cipher,
      firma_password_iv: cipherParts.iv,
      firma_password_tag: cipherParts.tag,
      firma_titular: titular,
      firma_valida_hasta: validaHasta,
      firma_subida_en: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[firma POST] update medicos:", updateError);
    await supabaseService.storage.from(BUCKET).remove([objectKey]);
    return NextResponse.json(
      { error: "No pudimos guardar el certificado. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // ── Activar facturación electrónica (BEST-EFFORT; NO afecta la firma) ─────
  // La firma de PDFs YA quedó guardada arriba. Pase lo que pase aquí, el éxito
  // de la firma se mantiene: nunca cambiamos ni bloqueamos esa respuesta.
  let facturacionActivada = false;
  try {
    const r = await activarFacturacionMedico({
      medicoId: medico.id,
      p12: new Blob([new Uint8Array(bytes)]),
      passwordP12: password,
      email: user.email ?? undefined,
    });
    facturacionActivada = r.activada;
    console.log(
      `[firma POST] facturación activada=${r.activada}${r.motivo ? ` motivo=${r.motivo}` : ""} medico=${medico.id}`
    );
  } catch (err) {
    // Defensa extra: activarFacturacionMedico no debería lanzar, pero por si
    // acaso, no afectamos la firma ya guardada.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[firma POST] activación facturación falló (no afecta firma): ${message}`);
  }

  // Solo se devuelve información no sensible
  return NextResponse.json({
    titular,
    valida_hasta: validaHasta,
    facturacion_activada: facturacionActivada,
  });
}

// ─── DELETE: borrar el .p12 y limpiar columnas ───────────────────────────────

export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const supabase = await createSupabaseServerClient();
  const { data: medico } = await supabase
    .from("medicos")
    .select("id, firma_object_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (medico.firma_object_key) {
    try {
      const supabaseService = await createSupabaseServerClientWithServiceRole();
      await supabaseService.storage.from(BUCKET).remove([medico.firma_object_key]);
    } catch {
      // Fallo silencioso en el borrado del objeto; seguimos limpiando la BD.
    }
  }

  const { error: updateError } = await supabase
    .from("medicos")
    .update({
      firma_object_key: null,
      firma_password_cipher: null,
      firma_password_iv: null,
      firma_password_tag: null,
      firma_titular: null,
      firma_valida_hasta: null,
      firma_subida_en: null,
    })
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "No pudimos eliminar el certificado. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
