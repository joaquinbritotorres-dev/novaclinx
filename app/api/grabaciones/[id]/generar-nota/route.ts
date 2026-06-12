import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adaptarTranscripcion, AdaptadorError } from "@/lib/scribe/adaptador";
import {
  generarNotaSOAP,
  type NovaclinxInput,
} from "@/lib/prompts/novaclinx-prompts-v1";

export const maxDuration = 300;

// Glue replicado de /api/consultas/generar a propósito: el módulo SOAP y la
// ruta del modo escrito no se tocan; el scribe consume la misma interfaz
// pública generarNotaSOAP(NovaclinxInput).
type Especialidad = NovaclinxInput["especialidad"];

function mapEspecialidad(raw: string | null): Especialidad {
  if (raw === "pediatria") return "pediatria";
  if (raw === "ginecologia") return "ginecologia";
  return "medicina_general";
}

function edadEnAniosMeses(fechaStr: string): { anos: number; meses: number } {
  const hoy = new Date();
  const nac = new Date(fechaStr + "T00:00:00");
  let anos = hoy.getFullYear() - nac.getFullYear();
  let meses = hoy.getMonth() - nac.getMonth();
  if (hoy.getDate() < nac.getDate()) meses--;
  if (meses < 0) { anos--; meses += 12; }
  return { anos: Math.max(0, anos), meses: Math.max(0, meses) };
}

/**
 * Transcripción → adaptador (Claude) → pipeline SOAP existente.
 * Transiciones: transcrita|error(con transcripción) → nota_generada|error.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id, especialidad")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: grabacion } = await supabase
    .from("grabaciones_consulta")
    .select("id, estado, paciente_id, transcripcion")
    .eq("id", id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!grabacion) {
    return NextResponse.json({ error: "Grabación no encontrada." }, { status: 404 });
  }

  const transcripcion = grabacion.transcripcion as { texto?: string } | null;
  const textoDiarizado =
    typeof transcripcion?.texto === "string" ? transcripcion.texto : "";

  if (
    !["transcrita", "error"].includes(grabacion.estado) ||
    !textoDiarizado.trim()
  ) {
    return NextResponse.json(
      { error: "La grabación no tiene una transcripción lista." },
      { status: 409 }
    );
  }

  async function marcarError(detalle: string) {
    await supabase
      .from("grabaciones_consulta")
      .update({ estado: "error", error_detalle: detalle })
      .eq("id", id);
  }

  try {
    // Datos del paciente para el NovaclinxInput (igual que el modo escrito)
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id, nombre, edad, sexo, fecha_nacimiento, cedula")
      .eq("id", grabacion.paciente_id)
      .eq("medico_id", medico.id)
      .maybeSingle();

    if (!paciente) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data: ultimaConsulta } = await supabase
      .from("consultas")
      .select("id")
      .eq("paciente_id", paciente.id)
      .eq("aprobada_por_medico", true)
      .limit(1)
      .maybeSingle();

    // 1) Adaptador: transcripción → descripcion (contrato del modo escrito)
    const descripcion = await adaptarTranscripcion(textoDiarizado);

    // 2) Pipeline SOAP existente, por su interfaz pública
    let edad_anos = 0;
    let edad_meses = 0;
    if (paciente.fecha_nacimiento) {
      const calc = edadEnAniosMeses(paciente.fecha_nacimiento);
      edad_anos = calc.anos;
      edad_meses = calc.meses;
    } else if (paciente.edad != null) {
      edad_anos = paciente.edad;
      edad_meses = 0;
    }

    const input: NovaclinxInput = {
      especialidad: mapEspecialidad(medico.especialidad),
      tipo_consulta: ultimaConsulta ? "subsecuente" : "primera_vez",
      paciente: {
        nombre_completo: paciente.nombre,
        edad_anos,
        edad_meses,
        sexo: paciente.sexo === "F" ? "femenino" : "masculino",
        cedula: typeof paciente.cedula === "string" ? paciente.cedula : null,
      },
      descripcion_libre_del_medico: descripcion,
      resumen_longitudinal: undefined,
    };

    const soapOutput = await generarNotaSOAP(input);

    const { error: updateError } = await supabase
      .from("grabaciones_consulta")
      .update({ estado: "nota_generada", error_detalle: null })
      .eq("id", grabacion.id);

    if (updateError) {
      await marcarError("No se pudo actualizar el estado a nota_generada.");
      return NextResponse.json(
        { error: "No pudimos completar la acción. Reintenta." },
        { status: 500 }
      );
    }

    const tieneAlerta =
      typeof soapOutput?.soap?.analisis === "string" &&
      soapOutput.soap.analisis.includes("[ALERTA:");

    return NextResponse.json({
      ...(tieneAlerta ? { ...soapOutput, tiene_alerta: true } : soapOutput),
      tipo_consulta: input.tipo_consulta,
      descripcion,
    });
  } catch (err) {
    const detalle =
      err instanceof AdaptadorError
        ? err.message
        : "Error generando la nota desde la transcripción.";
    await marcarError(detalle);
    console.error(`[grabaciones/generar-nota] ${detalle} (grabacion ${id})`);
    return NextResponse.json(
      { error: "No pudimos generar la nota. Reintenta." },
      { status: 500 }
    );
  }
}
