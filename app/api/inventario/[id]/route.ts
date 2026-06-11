import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_TIPOS = ["vacuna", "insumo"] as const;

function isValidDateStr(s: unknown): boolean {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !isNaN(new Date(s).getTime());
}

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

  if (b.nombre !== undefined) {
    const v = typeof b.nombre === "string" ? b.nombre.trim() : null;
    if (!v) {
      return NextResponse.json({ error: "nombre no puede estar vacío." }, { status: 400 });
    }
    updates.nombre = v;
  }
  if (b.tipo !== undefined) {
    if (!(VALID_TIPOS as readonly string[]).includes(b.tipo as string)) {
      return NextResponse.json({ error: "tipo debe ser 'vacuna' o 'insumo'." }, { status: 400 });
    }
    updates.tipo = b.tipo;
  }
  if (b.descripcion !== undefined) {
    updates.descripcion =
      typeof b.descripcion === "string" ? b.descripcion.trim() || null : null;
  }
  if (b.lote !== undefined) {
    updates.lote = typeof b.lote === "string" ? b.lote.trim() || null : null;
  }
  if (b.fecha_caducidad !== undefined) {
    if (b.fecha_caducidad === null) {
      updates.fecha_caducidad = null;
    } else if (isValidDateStr(b.fecha_caducidad)) {
      updates.fecha_caducidad = b.fecha_caducidad;
    } else {
      return NextResponse.json(
        { error: "fecha_caducidad inválida (YYYY-MM-DD)." },
        { status: 400 }
      );
    }
  }
  if (b.unidad !== undefined) {
    const v = typeof b.unidad === "string" ? b.unidad.trim() : null;
    if (!v) {
      return NextResponse.json({ error: "unidad no puede estar vacía." }, { status: 400 });
    }
    updates.unidad = v;
  }
  if (b.stock_minimo !== undefined) {
    const v =
      typeof b.stock_minimo === "number" && Number.isFinite(b.stock_minimo)
        ? Math.floor(b.stock_minimo)
        : -1;
    if (v < 0) {
      return NextResponse.json({ error: "stock_minimo inválido." }, { status: 400 });
    }
    updates.stock_minimo = v;
  }
  if (b.cantidad !== undefined) {
    const v =
      typeof b.cantidad === "number" && Number.isFinite(b.cantidad)
        ? Math.floor(b.cantidad)
        : -1;
    if (v < 0) {
      return NextResponse.json(
        { error: "cantidad no puede ser negativa." },
        { status: 400 }
      );
    }
    updates.cantidad = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const medicoId = await getMedicoId(supabase, user.id);
  if (!medicoId) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 403 });
  }

  const { data: item, error } = await supabase
    .from("inventario_items")
    .update(updates)
    .eq("id", id)
    .eq("medico_id", medicoId)
    .is("deleted_at", null)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Error al actualizar el ítem." }, { status: 500 });
  }
  if (!item) {
    return NextResponse.json(
      { error: "Ítem no encontrado o no autorizado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ item });
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
    .from("inventario_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("medico_id", medicoId)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar el ítem." }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
