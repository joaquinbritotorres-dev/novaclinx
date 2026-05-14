import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SOAP_SYSTEM_PROMPT,
  buildUserPrompt,
  normalizeSoapOutput,
} from "@/lib/prompts/generate-soap";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!medico) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // Defense-in-depth: verify patient belongs to this medico before reading any data
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("id, nombre, edad, sexo")
      .eq("id", paciente_id)
      .eq("medico_id", medico.id)
      .maybeSingle();

    if (!paciente) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data: ultimaConsulta } = await supabase
      .from("consultas")
      .select("resumen_corto")
      .eq("paciente_id", paciente_id)
      .eq("aprobada_por_medico", true)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();

    const userPrompt = buildUserPrompt({
      inputMedico: descripcion,
      nombrePaciente: paciente.nombre,
      edadPaciente: paciente.edad ?? null,
      sexoPaciente: paciente.sexo ?? null,
      consultaAnteriorResumen: ultimaConsulta?.resumen_corto ?? null,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SOAP_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No pudimos generar la nota. Intenta de nuevo." },
        { status: 500 }
      );
    }

    const soapOutput = normalizeSoapOutput(JSON.parse(raw));
    return NextResponse.json(soapOutput);
  } catch {
    return NextResponse.json(
      { error: "No pudimos generar la nota. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
