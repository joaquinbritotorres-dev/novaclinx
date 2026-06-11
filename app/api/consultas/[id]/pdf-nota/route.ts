import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotaClinicaTemplate } from "@/lib/pdf/notaClinicaTemplate";
import { firmarPdf } from "@/lib/firma/firmar";

function parseJsonArray(raw: string | null): string[] | null {
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
    .select(
      "id, nombre, especialidad, registro_acess, registro_senescyt, direccion_consultorio, telefono_consultorio, ruc, firma_object_key, firma_titular"
    )
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
      "id, fecha, nota_soap, indicaciones, signos_alarma, cie10_codigo, cie10_descripcion, seguimiento_plazo, seguimiento_motivo, tipo_consulta, pacientes(id, nombre, cedula, identificacion, fecha_nacimiento, edad, sexo, tipo_seguro, alergias, numero_historia)"
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

  const paciente = consulta.pacientes as unknown as {
    id: string;
    nombre: string;
    cedula: string | null;
    identificacion: string | null;
    fecha_nacimiento: string | null;
    edad: number | null;
    sexo: string | null;
    tipo_seguro: string | null;
    alergias: string | null;
    numero_historia: string | null;
  } | null;

  const indicaciones = parseJsonArray(consulta.indicaciones);
  const signosAlarma = parseJsonArray(consulta.signos_alarma);

  const firmar = request.nextUrl.searchParams.get("firmar") === "1";
  const fechaFirmaHoy = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Guayaquil",
  });

  const element = createElement(NotaClinicaTemplate, {
    medicoNombre: medico.nombre ?? "Médico",
    medicoEspecialidad: medico.especialidad ?? null,
    medicoRegistroAcess: medico.registro_acess ?? null,
    medicoRegistroSenescyt: medico.registro_senescyt ?? null,
    medicoDireccion: medico.direccion_consultorio ?? null,
    medicoTelefono: medico.telefono_consultorio ?? null,
    medicoRuc: medico.ruc ?? null,
    pacienteNombre: paciente?.nombre ?? "Paciente",
    pacienteCedula: paciente?.identificacion || paciente?.cedula || null,
    pacienteFechaNacimiento: paciente?.fecha_nacimiento ?? null,
    pacienteEdad: paciente?.edad ?? null,
    pacienteSexo: paciente?.sexo ?? null,
    pacienteNumeroHistoria: paciente?.numero_historia ?? null,
    pacienteTipoSeguro: paciente?.tipo_seguro ?? null,
    pacienteAlergias: paciente?.alergias ?? null,
    fechaISO: consulta.fecha,
    tipoConsulta: consulta.tipo_consulta ?? null,
    notaSoap: consulta.nota_soap ?? "",
    cie10Codigo: consulta.cie10_codigo ?? null,
    cie10Descripcion: consulta.cie10_descripcion ?? null,
    indicaciones,
    signosAlarma,
    seguimientoPlazo: consulta.seguimiento_plazo ?? null,
    seguimientoMotivo: consulta.seguimiento_motivo ?? null,
    firmado: firmar,
    firmante: firmar ? (medico.firma_titular ?? medico.nombre ?? undefined) : undefined,
    fechaFirma: firmar ? fechaFirmaHoy : undefined,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  let buffer = await renderToBuffer(element);

  if (firmar) {
    try {
      buffer = await firmarPdf(Buffer.from(buffer), medico.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo firmar el PDF.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const safeNombre = (paciente?.nombre ?? "nota")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="novaclinx-nota-${safeNombre}${firmar ? "-firmada" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
