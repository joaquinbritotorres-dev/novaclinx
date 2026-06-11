import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONSENTIMIENTO_TEXTO } from "@/lib/consentimiento";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id: pacienteId } = await params;

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

    const [{ data: seguros }, { data: consentimiento }] = await Promise.all([
      supabase
        .from("paciente_seguros")
        .select(
          "id, aseguradora_id, aseguradoras(nombre), numero_afiliado, numero_titular, plan, tipo_cobertura, es_titular, parentesco"
        )
        .eq("paciente_id", pacienteId)
        .is("deleted_at", null)
        .order("created_at"),
      supabase
        .from("consentimientos_seguro")
        .select("otorgado, created_at")
        .eq("paciente_id", pacienteId)
        .eq("medico_id", medico.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      seguros: seguros ?? [],
      consentimientoOtorgado: consentimiento?.otorgado ?? false,
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id: pacienteId } = await params;

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

  const { seguros, consentimientoOtorgado } = body as Record<string, unknown>;

  if (!Array.isArray(seguros)) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  if (typeof consentimientoOtorgado !== "boolean") {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  for (const s of seguros) {
    if (typeof s !== "object" || s === null) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 400 }
      );
    }
    const seg = s as Record<string, unknown>;
    if (typeof seg.aseguradora_id !== "string" || !seg.aseguradora_id.trim()) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 400 }
      );
    }
    if (!["reembolso", "red_prestador"].includes(seg.tipo_cobertura as string)) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 400 }
      );
    }
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

    if (seguros.length > 0) {
      const rows = (seguros as Record<string, unknown>[]).map((seg) => ({
        paciente_id: pacienteId,
        aseguradora_id: seg.aseguradora_id as string,
        numero_afiliado:
          typeof seg.numero_afiliado === "string" && seg.numero_afiliado.trim()
            ? seg.numero_afiliado.trim()
            : null,
        numero_titular:
          typeof seg.numero_titular === "string" && seg.numero_titular.trim()
            ? seg.numero_titular.trim()
            : null,
        plan:
          typeof seg.plan === "string" && seg.plan.trim()
            ? seg.plan.trim()
            : null,
        tipo_cobertura: seg.tipo_cobertura as "reembolso" | "red_prestador",
        es_titular: seg.es_titular === true,
        parentesco:
          typeof seg.parentesco === "string" && seg.parentesco.trim()
            ? seg.parentesco.trim()
            : null,
      }));

      const { error: insertError } = await supabase
        .from("paciente_seguros")
        .insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: "No pudimos completar la acción. Intenta de nuevo." },
          { status: 500 }
        );
      }
    }

    const { error: consentError } = await supabase
      .from("consentimientos_seguro")
      .insert({
        paciente_id: pacienteId,
        medico_id: medico.id,
        otorgado: consentimientoOtorgado,
        version_texto: CONSENTIMIENTO_TEXTO,
      });

    if (consentError) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
