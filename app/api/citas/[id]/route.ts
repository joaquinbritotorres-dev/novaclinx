import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_ESTADOS = [
  "programada",
  "confirmada",
  "cancelada",
  "atendida",
  "no_show",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMedicoId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (b.inicio !== undefined) {
    if (typeof b.inicio !== "string") {
      return NextResponse.json({ error: "inicio inválido." }, { status: 400 });
    }
    updates.inicio = b.inicio.trim();
  }
  if (b.duracion_min !== undefined) {
    if (typeof b.duracion_min !== "number" || b.duracion_min <= 0) {
      return NextResponse.json({ error: "duracion_min inválido." }, { status: 400 });
    }
    updates.duracion_min = Math.floor(b.duracion_min);
  }
  if (b.estado !== undefined) {
    if (!(VALID_ESTADOS as readonly string[]).includes(b.estado as string)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    updates.estado = b.estado;
  }
  if (b.motivo !== undefined) {
    updates.motivo =
      typeof b.motivo === "string" ? b.motivo.trim() || null : null;
  }
  if (b.notas !== undefined) {
    updates.notas =
      typeof b.notas === "string" ? b.notas.trim() || null : null;
  }
  if (b.paciente_id !== undefined) {
    updates.paciente_id =
      typeof b.paciente_id === "string" && b.paciente_id
        ? b.paciente_id
        : null;
  }
  if (b.nombre_paciente !== undefined) {
    updates.nombre_paciente =
      typeof b.nombre_paciente === "string"
        ? b.nombre_paciente.trim() || null
        : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const medicoId = await getMedicoId(supabase, user.id);
  if (!medicoId) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 403 });
  }

  const { data: cita, error } = await supabase
    .from("citas")
    .update(updates)
    .eq("id", id)
    .eq("medico_id", medicoId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Error al actualizar la cita." }, { status: 500 });
  }
  if (!cita) {
    return NextResponse.json(
      { error: "Cita no encontrada o no autorizado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ cita });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const medicoId = await getMedicoId(supabase, user.id);
  if (!medicoId) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 403 });
  }

  const { error } = await supabase
    .from("citas")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("medico_id", medicoId)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar la cita." }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
