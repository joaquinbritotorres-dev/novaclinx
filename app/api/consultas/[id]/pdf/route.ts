import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotaTemplate } from "@/lib/pdf/notaTemplate";

function parseIndicaciones(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id, nombre")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 403 }
    );
  }

  const { data: consulta } = await supabase
    .from("consultas")
    .select(
      "id, fecha, nota_soap, indicaciones, seguimiento_plazo, seguimiento_motivo, pacientes(id, nombre)"
    )
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!consulta) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 404 }
    );
  }

  const paciente = consulta.pacientes as unknown as { id: string; nombre: string } | null;
  const indicaciones = parseIndicaciones(consulta.indicaciones);

  const element = createElement(NotaTemplate, {
    pacienteNombre: paciente?.nombre ?? "Paciente",
    fechaISO: consulta.fecha,
    notaSoap: consulta.nota_soap ?? "",
    indicaciones,
    seguimientoPlazo: consulta.seguimiento_plazo ?? null,
    seguimientoMotivo: consulta.seguimiento_motivo ?? null,
    medicoNombre: medico.nombre ?? "Médico",
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);

  const safeNombre = (paciente?.nombre ?? "nota")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="novaclinx-${safeNombre}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
