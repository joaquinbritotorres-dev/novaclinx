import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_MOV = ["entrada", "salida"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMedicoId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function GET(
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

  // Ownership check
  const { data: item } = await supabase
    .from("inventario_items")
    .select("id")
    .eq("id", id)
    .eq("medico_id", medicoId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!item) {
    return NextResponse.json(
      { error: "Ítem no encontrado o no autorizado." },
      { status: 404 }
    );
  }

  const { data: movimientos, error } = await supabase
    .from("inventario_movimientos")
    .select("*, pacientes(nombre)")
    .eq("item_id", id)
    .eq("medico_id", medicoId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Error al obtener movimientos." }, { status: 500 });
  }

  return NextResponse.json({ movimientos: movimientos ?? [] });
}

export async function POST(
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

  const tipo_movimiento =
    typeof b.tipo_movimiento === "string" ? b.tipo_movimiento.trim() : null;
  const motivo =
    typeof b.motivo === "string" ? b.motivo.trim() || null : null;
  const paciente_id =
    typeof b.paciente_id === "string" && b.paciente_id ? b.paciente_id : null;

  if (!tipo_movimiento || !(VALID_MOV as readonly string[]).includes(tipo_movimiento)) {
    return NextResponse.json(
      { error: "tipo_movimiento debe ser 'entrada' o 'salida'." },
      { status: 400 }
    );
  }

  const cantidad =
    typeof b.cantidad === "number" && Number.isFinite(b.cantidad)
      ? Math.floor(b.cantidad)
      : 0;
  if (cantidad <= 0) {
    return NextResponse.json(
      { error: "cantidad debe ser mayor a 0." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const medicoId = await getMedicoId(supabase, user.id);
  if (!medicoId) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 403 });
  }

  // Validar propiedad del paciente_id (si viene), igual que antes.
  if (paciente_id) {
    const { data: pac } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", paciente_id)
      .eq("medico_id", medicoId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!pac) {
      return NextResponse.json({ error: "Paciente no encontrado." }, { status: 400 });
    }
  }

  // Movimiento ATÓMICO vía RPC: bloquea la fila del ítem (FOR UPDATE), valida
  // stock y actualiza la cantidad + inserta el movimiento en una sola
  // transacción. Evita el descuadre por carrera (doble clic / 2 pestañas). El
  // RPC deriva el medico_id de auth.uid() y respeta la RLS (propiedad garantizada).
  const { data, error: rpcError } = await supabase.rpc(
    "registrar_movimiento_inventario",
    {
      p_item_id: id,
      p_tipo: tipo_movimiento,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_paciente_id: paciente_id,
    }
  );

  if (rpcError || !data) {
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento." },
      { status: 500 }
    );
  }
  if (data.resultado === "not_found") {
    return NextResponse.json(
      { error: "Ítem no encontrado o no autorizado." },
      { status: 404 }
    );
  }
  if (data.resultado === "insufficient_stock") {
    return NextResponse.json(
      { error: `Stock insuficiente: solo quedan ${data.disponible}.` },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { movimiento: data.movimiento, nuevaCantidad: data.nueva_cantidad },
    { status: 201 }
  );
}
