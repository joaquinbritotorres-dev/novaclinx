import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const fecha = request.nextUrl.searchParams.get("fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json(
      { error: "Parámetro fecha inválido (YYYY-MM-DD)." },
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

  const { data: citas, error } = await supabase
    .from("citas")
    .select(
      "id, paciente_id, nombre_paciente, inicio, duracion_min, motivo, estado, notas, pacientes(nombre)"
    )
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .gte("inicio", `${fecha}T00:00:00-05:00`)
    .lte("inicio", `${fecha}T23:59:59.999-05:00`)
    .order("inicio");

  if (error) {
    return NextResponse.json({ error: "Error al obtener citas." }, { status: 500 });
  }

  return NextResponse.json({ citas: citas ?? [] });
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

  const inicio = typeof b.inicio === "string" ? b.inicio.trim() : null;
  const duracion_min =
    typeof b.duracion_min === "number" && b.duracion_min > 0
      ? Math.floor(b.duracion_min)
      : 30;
  const motivo =
    typeof b.motivo === "string" ? b.motivo.trim() || null : null;
  const notas =
    typeof b.notas === "string" ? b.notas.trim() || null : null;
  const paciente_id =
    typeof b.paciente_id === "string" && b.paciente_id ? b.paciente_id : null;
  const nombre_paciente =
    typeof b.nombre_paciente === "string"
      ? b.nombre_paciente.trim() || null
      : null;

  if (!inicio || isNaN(new Date(inicio).getTime())) {
    return NextResponse.json(
      { error: "El campo inicio es obligatorio y debe ser una fecha válida." },
      { status: 400 }
    );
  }
  if (!paciente_id && !nombre_paciente) {
    return NextResponse.json(
      { error: "Se requiere paciente_id o nombre_paciente." },
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

  // El paciente vinculado debe pertenecer al médico
  if (paciente_id) {
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", paciente_id)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente no encontrado." },
        { status: 404 }
      );
    }
  }

  const { data: cita, error } = await supabase
    .from("citas")
    .insert({
      medico_id: medico.id,
      paciente_id,
      nombre_paciente,
      inicio,
      duracion_min,
      motivo,
      notas,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "No se pudo crear la cita." }, { status: 500 });
  }

  return NextResponse.json({ cita }, { status: 201 });
}
