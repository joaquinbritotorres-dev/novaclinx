import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import {
  createSupabaseServerClient,
  createSupabaseServerClientWithServiceRole,
} from "@/lib/supabase/server";

// DELETE: borra el objeto de Storage Y la fila en documentos.
// Orden deliberado: Storage primero — si falla, la fila queda intacta (estado consistente).
// Si la fila falla tras borrar Storage, el registro queda huérfano (apunta a un objeto
// inexistente); es el caso menos grave de los dos.
export async function DELETE(
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

  // RLS + filtros explícitos verifican ownership antes de cualquier borrado
  const { data: documento } = await supabase
    .from("documentos")
    .select("id, object_key")
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

  // 1. Borrar objeto de Storage (service role: operación de servidor, ownership ya verificada)
  const serviceClient = await createSupabaseServerClientWithServiceRole();
  const { error: storageError } = await serviceClient.storage
    .from("soportes-reclamaciones")
    .remove([documento.object_key]);

  if (storageError) {
    return NextResponse.json(
      { error: "No pudimos eliminar el archivo. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // 2. Borrar fila en documentos (cliente con RLS como red de seguridad adicional)
  const { error: dbError } = await supabase
    .from("documentos")
    .delete()
    .eq("id", docId)
    .eq("medico_id", medico.id);

  if (dbError) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
