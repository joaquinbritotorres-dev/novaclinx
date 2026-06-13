import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RecetaTemplate } from "@/lib/pdf/recetaTemplate";
import { parseIndicaciones } from "@/lib/recetas/parseIndicaciones";
import { detectarPlaceholders, documentoLimpio } from "@/lib/recetas/gateDocumentos";
import { firmarPdf } from "@/lib/firma/firmar";
import type { Medicamento } from "@/lib/recetas/tipos";

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

  const parsedIndicaciones = parseIndicaciones(consulta.indicaciones);

  if (!parsedIndicaciones) {
    return NextResponse.json(
      { error: "Esta consulta no tiene medicamentos prescritos." },
      { status: 400 }
    );
  }

  let indicaciones: string[] | null = null;
  let medicamentos: Medicamento[] | undefined = undefined;

  if (parsedIndicaciones.tipo === "legado") {
    // Gate de documento legal: ningún corchete/rango sin resolver en la receta
    const hallazgo = detectarPlaceholders(parsedIndicaciones.indicaciones);
    if (!documentoLimpio(hallazgo)) {
      return NextResponse.json(
        {
          error:
            "La receta tiene texto sin resolver y no puede emitirse: " +
            [...hallazgo.corchetes, ...hallazgo.rangos].join(", ") +
            ". Edita la consulta y confirma las dosis antes de generar la receta.",
        },
        { status: 422 }
      );
    }
    indicaciones = parsedIndicaciones.indicaciones;
  } else {
    const todos = parsedIndicaciones.medicamentos;
    if (todos.some((m) => !m.confirmado || !m.cantidadTexto)) {
      return NextResponse.json(
        { error: "Hay medicamentos pendientes de confirmación médica." },
        { status: 400 }
      );
    }
    // Gate de documento legal: lo que se imprime (dosisConfirmadaTexto y
    // cantidad) no puede contener corchetes ni rangos sin resolver.
    const textosImpresos = todos.flatMap((m) => [
      m.dosisConfirmadaTexto ?? m.dosis,
      m.cantidadTexto,
      m.concentracion,
      m.via,
    ]);
    const hallazgo = detectarPlaceholders(textosImpresos);
    if (!documentoLimpio(hallazgo)) {
      return NextResponse.json(
        {
          error:
            "La receta tiene dosis sin resolver y no puede emitirse: " +
            [...hallazgo.corchetes, ...hallazgo.rangos].join(", ") +
            ". Vuelve a confirmar las dosis antes de generar la receta.",
        },
        { status: 422 }
      );
    }
    medicamentos = todos as Medicamento[];
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

  const signosAlarma = parseJsonArray(consulta.signos_alarma);

  const firmar = request.nextUrl.searchParams.get("firmar") === "1";
  const fechaFirmaHoy = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Guayaquil",
  });

  const element = createElement(RecetaTemplate, {
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
    medicamentos,
    indicaciones,
    signosAlarma,
    seguimientoPlazo: consulta.seguimiento_plazo ?? null,
    seguimientoMotivo: consulta.seguimiento_motivo ?? null,
    firmado: firmar,
    firmante: firmar ? (medico.firma_titular ?? medico.nombre ?? undefined) : undefined,
    fechaFirma: firmar ? fechaFirmaHoy : undefined,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  let buffer = await renderToBuffer(element);

  const safeNombre = (paciente?.nombre ?? "receta")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();

  if (firmar) {
    try {
      buffer = await firmarPdf(Buffer.from(buffer), medico.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo firmar el PDF.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="novaclinx-receta-${safeNombre}${firmar ? "-firmada" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
