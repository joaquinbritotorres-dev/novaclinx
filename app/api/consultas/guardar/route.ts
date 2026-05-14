import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const {
    paciente_id,
    input_medico,
    soap,
    indicaciones,
    seguimiento_plazo,
    seguimiento_motivo,
    resumen_corto,
  } = body as Record<string, unknown>;

  if (
    typeof paciente_id !== "string" ||
    !paciente_id.trim() ||
    typeof input_medico !== "string" ||
    !input_medico.trim() ||
    typeof soap !== "string" ||
    !soap.trim()
  ) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

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

    // Defense-in-depth: verify patient belongs to this medico before writing
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", paciente_id)
      .eq("medico_id", medico.id)
      .maybeSingle();

    if (!paciente) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data: consulta, error: insertError } = await supabase
      .from("consultas")
      .insert({
        paciente_id,
        medico_id: medico.id,
        input_medico: input_medico.slice(0, 4999),
        nota_soap: soap,
        indicaciones: indicaciones != null ? JSON.stringify(indicaciones) : null,
        seguimiento_plazo: typeof seguimiento_plazo === "string" ? seguimiento_plazo : null,
        seguimiento_motivo: typeof seguimiento_motivo === "string" ? seguimiento_motivo : null,
        resumen_corto: typeof resumen_corto === "string" ? resumen_corto : null,
        aprobada_por_medico: true,
        aprobada_en: new Date().toISOString(),
        modelo_usado: "gpt-4o-mini",
      })
      .select("id")
      .single();

    if (insertError || !consulta) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: consulta.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
