import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; seguroId: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id: pacienteId, seguroId } = await params;

  try {
    const supabase = await createSupabaseServerClient();

    const { data: medico } = await supabase
      .from("medicos")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!medico) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // Verify ownership through the paciente → medico chain
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", pacienteId)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!paciente) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 404 }
      );
    }

    const { data: existing } = await supabase
      .from("paciente_seguros")
      .select("id")
      .eq("id", seguroId)
      .eq("paciente_id", pacienteId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("paciente_seguros")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", seguroId);

    if (error) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
