import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TIPOS_VALIDOS = ["recordatorio", "confirmacion", "resena", "otro"] as const;

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const pacienteId = request.nextUrl.searchParams.get("paciente_id");
  if (!pacienteId) {
    return NextResponse.json(
      { error: "Parámetro paciente_id requerido." },
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

  // Guarda de propiedad: el paciente debe pertenecer al médico
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }

  const { data: comunicaciones, error } = await supabase
    .from("comunicaciones")
    .select("id, tipo, canal, contenido, created_at")
    .eq("medico_id", medico.id)
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Error al obtener comunicaciones." },
      { status: 500 }
    );
  }

  return NextResponse.json({ comunicaciones: comunicaciones ?? [] });
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

  const tipo = typeof b.tipo === "string" ? b.tipo : null;
  if (!tipo || !TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) {
    return NextResponse.json(
      { error: "Tipo de comunicación inválido." },
      { status: 400 }
    );
  }

  const paciente_id =
    typeof b.paciente_id === "string" && b.paciente_id ? b.paciente_id : null;
  const cita_id =
    typeof b.cita_id === "string" && b.cita_id ? b.cita_id : null;
  const contenido =
    typeof b.contenido === "string" ? b.contenido.trim() || null : null;

  const supabase = await createSupabaseServerClient();
  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 403 });
  }

  const { data: comunicacion, error } = await supabase
    .from("comunicaciones")
    .insert({
      medico_id: medico.id,
      paciente_id,
      cita_id,
      tipo,
      contenido,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo registrar la comunicación." },
      { status: 500 }
    );
  }

  return NextResponse.json({ comunicacion }, { status: 201 });
}
