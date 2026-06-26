import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import {
  createSupabaseServerClient,
  createSupabaseServerClientWithServiceRole,
} from "@/lib/supabase/server";

const BUCKET = "logos-medicos";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const MAGIC: Array<{ mime: string; sig: number[] }> = [
  { mime: "image/png",  sig: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", sig: [0xff, 0xd8, 0xff] },
];

function detectMime(buf: Buffer): string | null {
  for (const { mime, sig } of MAGIC) {
    if (sig.every((b, i) => buf[i] === b)) return mime;
  }
  return null;
}

// ─── POST: subir / reemplazar logo ───────────────────────────────────────────

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
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo de imagen." }, { status: 400 });
  }
  if (archivo.size === 0 || archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo debe pesar entre 1 byte y 2 MB." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await archivo.arrayBuffer());
  const mime = detectMime(bytes);
  if (!mime) {
    return NextResponse.json(
      { error: "Solo se aceptan imágenes PNG o JPEG." },
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

  const objectKey = `${medico.id}/logo`;
  const supabaseService = await createSupabaseServerClientWithServiceRole();
  const { error: uploadError } = await supabaseService.storage
    .from(BUCKET)
    .upload(objectKey, bytes, { contentType: mime, upsert: true });

  if (uploadError) {
    console.error("[logo POST] upload:", uploadError);
    return NextResponse.json(
      { error: "No pudimos guardar el logo. Intenta de nuevo." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("medicos")
    .update({ logo_object_key: objectKey })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[logo POST] update medicos:", updateError);
    await supabaseService.storage.from(BUCKET).remove([objectKey]);
    return NextResponse.json(
      { error: "No pudimos guardar el logo. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

// ─── DELETE: quitar el logo ───────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const supabase = await createSupabaseServerClient();
  const { data: medico } = await supabase
    .from("medicos")
    .select("id, logo_object_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (medico.logo_object_key) {
    try {
      const supabaseService = await createSupabaseServerClientWithServiceRole();
      await supabaseService.storage.from(BUCKET).remove([medico.logo_object_key]);
    } catch {
      // Fallo silencioso — seguimos limpiando la BD.
    }
  }

  const { error: updateError } = await supabase
    .from("medicos")
    .update({ logo_object_key: null })
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "No pudimos eliminar el logo. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
