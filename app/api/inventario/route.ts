import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_TIPOS = ["vacuna", "insumo"] as const;

function isValidDateStr(s: unknown): boolean {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !isNaN(new Date(s).getTime());
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const supabase = await createSupabaseServerClient();
  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 403 });
  }

  const { data: items, error } = await supabase
    .from("inventario_items")
    .select("*")
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .order("fecha_caducidad", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Error al obtener inventario." }, { status: 500 });
  }

  return NextResponse.json({ items: items ?? [] });
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

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

  const tipo = typeof b.tipo === "string" ? b.tipo.trim() : null;
  const nombre = typeof b.nombre === "string" ? b.nombre.trim() || null : null;
  const descripcion =
    typeof b.descripcion === "string" ? b.descripcion.trim() || null : null;
  const lote = typeof b.lote === "string" ? b.lote.trim() || null : null;
  const unidad = typeof b.unidad === "string" ? b.unidad.trim() || null : null;

  let fecha_caducidad: string | null = null;
  if (b.fecha_caducidad != null) {
    if (!isValidDateStr(b.fecha_caducidad)) {
      return NextResponse.json(
        { error: "fecha_caducidad inválida (YYYY-MM-DD)." },
        { status: 400 }
      );
    }
    fecha_caducidad = b.fecha_caducidad as string;
  }

  if (!tipo || !(VALID_TIPOS as readonly string[]).includes(tipo)) {
    return NextResponse.json(
      { error: "tipo debe ser 'vacuna' o 'insumo'." },
      { status: 400 }
    );
  }
  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (!unidad) {
    return NextResponse.json({ error: "La unidad es obligatoria." }, { status: 400 });
  }

  const cantidad =
    typeof b.cantidad === "number" && Number.isFinite(b.cantidad)
      ? Math.floor(b.cantidad)
      : 0;
  const stock_minimo =
    typeof b.stock_minimo === "number" && Number.isFinite(b.stock_minimo)
      ? Math.floor(b.stock_minimo)
      : 0;

  if (cantidad < 0) {
    return NextResponse.json(
      { error: "cantidad no puede ser negativa." },
      { status: 400 }
    );
  }
  if (stock_minimo < 0) {
    return NextResponse.json(
      { error: "stock_minimo no puede ser negativo." },
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
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 403 });
  }

  const { data: item, error } = await supabase
    .from("inventario_items")
    .insert({
      medico_id: medico.id,
      tipo,
      nombre,
      descripcion,
      lote,
      fecha_caducidad,
      cantidad,
      unidad,
      stock_minimo,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "No se pudo crear el ítem." }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
