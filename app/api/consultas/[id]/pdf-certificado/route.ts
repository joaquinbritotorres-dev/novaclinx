import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CertificadoTemplate } from "@/lib/pdf/certificadoTemplate";
import { detectarPlaceholders, documentoLimpio } from "@/lib/recetas/gateDocumentos";
import { firmarPdf } from "@/lib/firma/firmar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const sp = request.nextUrl.searchParams;

  const reposo = sp.get("reposo") === "1";
  let reposoDias: number | null = null;
  let reposoInicio: string | null = null;
  if (reposo) {
    const dias = parseInt(sp.get("reposo_dias") ?? "", 10);
    reposoDias = !isNaN(dias) && dias >= 1 && dias <= 90 ? dias : 1;
    const ini = sp.get("reposo_inicio") ?? "";
    reposoInicio = /^\d{4}-\d{2}-\d{2}$/.test(ini)
      ? ini
      : new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  }

  const mostrarDiagnostico = sp.get("mostrar_diagnostico") === "1";
  const obsRaw = sp.get("observaciones") ?? "";
  const observaciones = obsRaw.length > 0 ? obsRaw.slice(0, 500) : null;

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
      "id, fecha, tipo_consulta, cie10_codigo, cie10_descripcion, pacientes(id, nombre, cedula, identificacion, fecha_nacimiento, edad, sexo, tipo_seguro, numero_historia)"
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
    numero_historia: string | null;
  } | null;

  // Gate de documento legal: ningún corchete/rango sin resolver en el texto
  // visible del certificado (observaciones siempre; diagnóstico si se muestra).
  const textosCertificado = [
    observaciones,
    ...(mostrarDiagnostico
      ? [consulta.cie10_descripcion, consulta.cie10_codigo]
      : []),
  ];
  const hallazgoCert = detectarPlaceholders(textosCertificado);
  if (!documentoLimpio(hallazgoCert)) {
    return NextResponse.json(
      {
        error:
          "El certificado tiene texto sin resolver y no puede emitirse: " +
          [...hallazgoCert.corchetes, ...hallazgoCert.rangos].join(", ") +
          ". Revisa el diagnóstico y las observaciones.",
      },
      { status: 422 }
    );
  }

  const firmar = sp.get("firmar") === "1";
  const fechaFirmaHoy = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Guayaquil",
  });

  const element = createElement(CertificadoTemplate, {
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
    fechaISO: consulta.fecha,
    tipoConsulta: consulta.tipo_consulta ?? null,
    cie10Codigo: consulta.cie10_codigo ?? null,
    cie10Descripcion: consulta.cie10_descripcion ?? null,
    reposo,
    reposoDias,
    reposoInicio,
    mostrarDiagnostico,
    observaciones,
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

  const safeNombre = (paciente?.nombre ?? "certificado")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="novaclinx-certificado-${safeNombre}${firmar ? "-firmada" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
