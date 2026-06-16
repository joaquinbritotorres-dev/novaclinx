import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");

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

    let query = supabase
      .from("reclamaciones")
      .select(`
        id, 
        estado, 
        tipo, 
        fecha_atencion, 
        monto,
        created_at,
        pacientes ( nombre ),
        aseguradoras ( nombre )
      `)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (estado) {
      query = query.eq("estado", estado);
    }

    const { data: reclamaciones, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reclamaciones });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

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

  const { consulta_id, paciente_seguro_id } = body as Record<string, unknown>;

  if (typeof consulta_id !== "string" || !consulta_id.trim() || typeof paciente_seguro_id !== "string" || !paciente_seguro_id.trim()) {
    return NextResponse.json(
      { error: "Faltan datos requeridos." },
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

    // Load consultation
    const { data: consulta } = await supabase
      .from("consultas")
      .select("id, paciente_id, fecha")
      .eq("id", consulta_id)
      .eq("medico_id", medico.id)
      .maybeSingle();

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta no encontrada." },
        { status: 404 }
      );
    }

    // Load paciente_seguro
    const { data: seguro } = await supabase
      .from("paciente_seguros")
      .select("id, aseguradora_id, tipo_cobertura, paciente_id")
      .eq("id", paciente_seguro_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!seguro || seguro.paciente_id !== consulta.paciente_id) {
      return NextResponse.json(
        { error: "Seguro no válido para este paciente." },
        { status: 400 }
      );
    }

    // Monto desde la factura de la consulta (si ya existe). Esquema
    // AutorizadorEC: estado 'autorizada' y columna importe_total; la más
    // reciente si hubo reintentos.
    const { data: facturaParaMonto } = await supabase
      .from("facturas")
      .select("importe_total")
      .eq("consulta_id", consulta.id)
      .eq("estado", "autorizada")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Insert reclamacion
    const tipo = seguro.tipo_cobertura === "red_prestador" ? "red" : "reembolso";

    const { data: reclamacion, error: insertError } = await supabase
      .from("reclamaciones")
      .insert({
        medico_id: medico.id,
        paciente_id: consulta.paciente_id,
        consulta_id: consulta.id,
        aseguradora_id: seguro.aseguradora_id,
        paciente_seguro_id: seguro.id,
        tipo,
        fecha_atencion: consulta.fecha,
        estado: 'borrador',
        monto: facturaParaMonto?.importe_total ?? null,
      })
      .select("id")
      .single();

    if (insertError || !reclamacion) {
      return NextResponse.json(
        { error: "No pudimos crear la reclamación. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: reclamacion.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
