import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONSENTIMIENTO_DATOS_VERSION } from "@/lib/consentimiento";

const VALID_SEGUROS = ["ninguno", "iess", "issfa", "privado"] as const;
type TipoSeguro = (typeof VALID_SEGUROS)[number];

const VALID_TIPO_ID = ["04", "05", "06", "07"] as const;
type TipoIdentificacion = (typeof VALID_TIPO_ID)[number];

function isValidTipoId(v: unknown): v is TipoIdentificacion {
  return typeof v === "string" && (VALID_TIPO_ID as readonly string[]).includes(v);
}

function isValidSeguro(v: unknown): v is TipoSeguro {
  return (
    typeof v === "string" &&
    (VALID_SEGUROS as readonly string[]).includes(v)
  );
}

function isValidDateStr(s: unknown): boolean {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !isNaN(new Date(s).getTime());
}

function toTextOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function edadDesde(fechaStr: string): number {
  const hoy = new Date();
  const nac = new Date(fechaStr + "T00:00:00");
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return Math.max(0, edad);
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

  const {
    nombre,
    edad,
    sexo,
    identificacion,
    tipo_identificacion,
    fecha_nacimiento,
    direccion,
    telefono,
    tipo_seguro,
    alergias,
    condicion_cronica,
    proximo_control,
    consentimiento_datos,
  } = body as Record<string, unknown>;

  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const edadNum =
    edad !== undefined && edad !== null && edad !== "" ? Number(edad) : null;
  if (
    edadNum !== null &&
    (isNaN(edadNum) || edadNum <= 0 || edadNum >= 150)
  ) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  if (
    sexo !== undefined &&
    sexo !== null &&
    sexo !== "" &&
    !["M", "F", "O"].includes(sexo as string)
  ) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const fechaNacimientoFinal = toTextOrNull(fecha_nacimiento);
  if (fechaNacimientoFinal !== null && !isValidDateStr(fechaNacimientoFinal)) {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 400 }
    );
  }

  // If birth date provided, derive edad from it (more accurate than manual entry)
  const edadFinal =
    fechaNacimientoFinal !== null
      ? edadDesde(fechaNacimientoFinal)
      : edadNum;

  const tipoSeguroFinal: TipoSeguro = isValidSeguro(tipo_seguro)
    ? tipo_seguro
    : "ninguno";

  const tipoIdFinal: TipoIdentificacion | null = isValidTipoId(tipo_identificacion)
    ? tipo_identificacion
    : null;

  const proximoControlFinal = toTextOrNull(proximo_control);
  if (proximoControlFinal !== null && !isValidDateStr(proximoControlFinal)) {
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
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 403 }
      );
    }

    const { count } = await supabase
      .from("pacientes")
      .select("id", { count: "exact", head: true })
      .eq("medico_id", medico.id);

    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const numero_historia = `HC-${new Date().getFullYear()}-${seq}`;

    const { data: paciente, error: insertError } = await supabase
      .from("pacientes")
      .insert({
        medico_id: medico.id,
        nombre: nombre.trim(),
        edad: edadFinal,
        sexo: sexo && sexo !== "" ? (sexo as string) : null,
        identificacion: toTextOrNull(identificacion),
        tipo_identificacion: tipoIdFinal,
        fecha_nacimiento: fechaNacimientoFinal,
        direccion: toTextOrNull(direccion),
        telefono: toTextOrNull(telefono),
        tipo_seguro: tipoSeguroFinal,
        alergias: toTextOrNull(alergias),
        condicion_cronica: toTextOrNull(condicion_cronica),
        proximo_control: proximoControlFinal,
        ...(consentimiento_datos === true
          ? {
              consentimiento_datos_at: new Date().toISOString(),
              consentimiento_datos_version: CONSENTIMIENTO_DATOS_VERSION,
            }
          : {}),
        numero_historia,
      })
      .select("id, nombre")
      .single();

    if (insertError || !paciente) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ paciente }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
