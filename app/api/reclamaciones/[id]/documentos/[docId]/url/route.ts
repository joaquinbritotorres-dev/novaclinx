import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: genera una URL firmada de corta duración (5 min) para ver un documento.
// Usa el cliente autenticado con RLS — nunca el service role.
// Así un médico no puede generar la URL de un documento que no es suyo.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id: reclamacionId, docId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // La RLS de documentos garantiza que solo ve el propietario
  const { data: documento } = await supabase
    .from("documentos")
    .select("object_key")
    .eq("id", docId)
    .eq("reclamacion_id", reclamacionId)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!documento) {
    return NextResponse.json(
      { error: "Documento no encontrado." },
      { status: 404 }
    );
  }

  // Cliente autenticado con RLS: Storage verifica SELECT antes de firmar
  const { data, error } = await supabase.storage
    .from("soportes-reclamaciones")
    .createSignedUrl(documento.object_key, 300); // 5 minutos

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "No pudimos generar el enlace. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // La URL firmada NO se guarda en base de datos ni en logs
  return NextResponse.json({ url: data.signedUrl });
}
