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
    cie10_codigo,
    cie10_descripcion,
    indicaciones,
    signos_alarma,
    seguimiento_plazo,
    seguimiento_motivo,
    resumen_corto,
    tipo_consulta,
  } = body as Record<string, unknown>;

  if (
    typeof paciente_id !== "string" ||
    !paciente_id.trim() ||
    typeof input_medico !== "string" ||
    !input_medico.trim()
  ) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  // Validate soap sections object
  if (typeof soap !== "object" || soap === null) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }
  const soapParsed = soap as Record<string, unknown>;
  if (
    typeof soapParsed.subjetivo !== "string" ||
    typeof soapParsed.objetivo !== "string" ||
    typeof soapParsed.analisis !== "string" ||
    typeof soapParsed.plan !== "string"
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
        nota_soap: JSON.stringify(soap),
        cie10_codigo:
          typeof cie10_codigo === "string" && cie10_codigo.trim()
            ? cie10_codigo.trim()
            : null,
        cie10_descripcion:
          typeof cie10_descripcion === "string" && cie10_descripcion.trim()
            ? cie10_descripcion.trim()
            : null,
        indicaciones:
          Array.isArray(indicaciones) && indicaciones.length > 0
            ? JSON.stringify(indicaciones)
            : null,
        signos_alarma:
          Array.isArray(signos_alarma) && signos_alarma.length > 0
            ? JSON.stringify(signos_alarma)
            : null,
        seguimiento_plazo:
          typeof seguimiento_plazo === "string" && seguimiento_plazo.trim()
            ? seguimiento_plazo.trim()
            : null,
        seguimiento_motivo:
          typeof seguimiento_motivo === "string" && seguimiento_motivo.trim()
            ? seguimiento_motivo.trim()
            : null,
        resumen_corto:
          typeof resumen_corto === "string" ? resumen_corto : null,
        tipo_consulta:
          typeof tipo_consulta === "string" && tipo_consulta.trim()
            ? tipo_consulta.trim()
            : "subsecuente",
        aprobada_por_medico: true,
        aprobada_en: new Date().toISOString(),
        modelo_usado: "gpt-4o",
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
