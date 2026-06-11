import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import {
  createSupabaseServerClient,
  createSupabaseServerClientWithServiceRole,
} from "@/lib/supabase/server";

// Magic bytes para cada MIME permitido
// Orden: los más específicos primero (PNG tiene 8 bytes únicos, JPEG 3, PDF 4)
const MAGIC_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/png",      bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg",     bytes: [0xff, 0xd8, 0xff] },
  { mime: "application/pdf",bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

async function verificarMagicBytes(objectKey: string): Promise<string | null> {
  const serviceClient = await createSupabaseServerClientWithServiceRole();
  const { data, error } = await serviceClient.storage
    .from("soportes-reclamaciones")
    .createSignedUrl(objectKey, 30); // 30 s, solo uso interno — nunca expuesto al cliente

  if (error || !data?.signedUrl) return null;

  let res: Response;
  try {
    res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-7" } });
    if (!res.ok) return null;
  } catch {
    return null;
  }

  const buf = new Uint8Array(await res.arrayBuffer());

  for (const { mime, bytes } of MAGIC_SIGNATURES) {
    if (bytes.every((b, i) => buf[i] === b)) return mime;
  }
  return null;
}

async function borrarObjeto(objectKey: string): Promise<void> {
  try {
    const serviceClient = await createSupabaseServerClientWithServiceRole();
    await serviceClient.storage
      .from("soportes-reclamaciones")
      .remove([objectKey]);
  } catch {
    // Loggear internamente si hubiera sistema de logs; no exponer al cliente.
  }
}

// ─── GET: listar documentos de una reclamación ───────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id: reclamacionId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: reclamacion } = await supabase
    .from("reclamaciones")
    .select("id")
    .eq("id", reclamacionId)
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!reclamacion) {
    return NextResponse.json(
      { error: "Reclamación no encontrada." },
      { status: 404 }
    );
  }

  const { data: documentos } = await supabase
    .from("documentos")
    .select("id, tipo, nombre_archivo, mime, size_bytes, created_at")
    .eq("reclamacion_id", reclamacionId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ documentos: documentos ?? [] });
}

// ─── POST: registrar documento tras subida del browser ───────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id: reclamacionId } = await params;

  let body: {
    object_key: string;
    nombre_archivo: string;
    mime: string;
    size_bytes: number;
    hash_sha256: string;
    tipo: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const { object_key, nombre_archivo, mime, size_bytes, hash_sha256, tipo } =
    body;

  if (!object_key || !nombre_archivo || !mime || !size_bytes || !hash_sha256 || !tipo) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios." },
      { status: 400 }
    );
  }

  const TIPOS_VALIDOS = ["factura", "examen", "informe", "receta", "otro"];
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json(
      { error: "Tipo de documento no válido." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // Verificar que la ruta pertenece a este médico y a esta reclamación
  const segments = object_key.split("/");
  if (segments[0] !== medico.id) {
    return NextResponse.json(
      { error: "Ruta de archivo no válida." },
      { status: 403 }
    );
  }
  if (segments[1] !== reclamacionId) {
    return NextResponse.json(
      { error: "El archivo no corresponde a esta reclamación." },
      { status: 403 }
    );
  }

  // Verificar ownership de la reclamación
  const { data: reclamacion } = await supabase
    .from("reclamaciones")
    .select("id")
    .eq("id", reclamacionId)
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!reclamacion) {
    await borrarObjeto(object_key);
    return NextResponse.json(
      { error: "Reclamación no encontrada." },
      { status: 404 }
    );
  }

  // Verificación real del tipo por magic bytes — el servidor manda, no el browser
  const detectedMime = await verificarMagicBytes(object_key);

  if (!detectedMime) {
    await borrarObjeto(object_key);
    return NextResponse.json(
      { error: "El archivo no pudo verificarse o no es un tipo permitido." },
      { status: 400 }
    );
  }

  if (detectedMime !== mime) {
    await borrarObjeto(object_key);
    return NextResponse.json(
      { error: "El tipo declarado no coincide con el contenido real del archivo." },
      { status: 400 }
    );
  }

  // Insertar en documentos; si falla, limpiar el objeto de Storage
  const { data: documento, error: insertError } = await supabase
    .from("documentos")
    .insert({
      reclamacion_id: reclamacionId,
      medico_id: medico.id,
      tipo,
      object_key,
      nombre_archivo,
      mime: detectedMime,
      size_bytes,
      hash_sha256,
    })
    .select("id, tipo, nombre_archivo, mime, size_bytes, created_at")
    .single();

  if (insertError) {
    await borrarObjeto(object_key);
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ documento }, { status: 201 });
}
