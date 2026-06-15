import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  generarNotaSOAP,
  type NovaclinxInput,
} from "@/lib/prompts/novaclinx-prompts-v1";
import { extraerPesoKg } from "@/lib/recetas/extraerPeso";

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

  const { paciente_id, descripcion } = body as Record<string, unknown>;

  if (typeof paciente_id !== "string" || !paciente_id.trim()) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  if (
    typeof descripcion !== "string" ||
    descripcion.trim().length < 10 ||
    descripcion.length > 4999
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
      .select("id, especialidad")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!medico) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // Defense-in-depth: verify patient belongs to this medico before reading any data
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id, nombre, edad, sexo, fecha_nacimiento, cedula")
      .eq("id", paciente_id)
      .eq("medico_id", medico.id)
      .maybeSingle();

    if (!paciente) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data: ultimaConsulta } = await supabase
      .from("consultas")
      .select("id, nota_soap")
      .eq("paciente_id", paciente_id)
      .eq("aprobada_por_medico", true)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Peso del historial (vive en el texto de la nota SOAP) → al generador
    const pesoKg = extraerPesoKg(ultimaConsulta?.nota_soap ?? null);

    // Derive age in years + months
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
        peso_kg: pesoKg,
      },
      descripcion_libre_del_medico: descripcion,
      resumen_longitudinal: undefined,
    };

    const soapOutput = await generarNotaSOAP(input);
    const tieneAlerta =
      typeof soapOutput?.soap?.analisis === "string" &&
      soapOutput.soap.analisis.includes("[ALERTA:");
    return NextResponse.json({
      ...(tieneAlerta ? { ...soapOutput, tiene_alerta: true } : soapOutput),
      tipo_consulta: input.tipo_consulta,
    });
  } catch (err) {
    console.error("[generar-nota] error:", err);
    return NextResponse.json(
      { error: "No pudimos generar la nota. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
