import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  facturarConsulta,
  FacturacionBloqueadaError,
} from "@/lib/facturacion/facturar-consulta";

// Estados de factura que BLOQUEAN un nuevo intento (ya facturada / en curso).
// 'rechazada'/'fallida' NO bloquean: se permite reintentar.
const ESTADOS_BLOQUEANTES = new Set(["autorizada", "procesando", "pendiente"]);

export async function POST(request: NextRequest) {
  // 1) Autenticación.
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  // 2) Body + validaciones (mensajes genéricos al usuario; detalle a logs).
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 400 });
  }

  const { consulta_id, monto } = body as Record<string, unknown>;
  if (typeof consulta_id !== "string" || !consulta_id.trim()) {
    return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 400 });
  }
  const montoNum = typeof monto === "number" ? monto : parseFloat(String(monto));
  if (isNaN(montoNum) || montoNum <= 0 || montoNum > 9999) {
    return NextResponse.json({ error: "Monto inválido. Debe ser entre $0.01 y $9,999." }, { status: 400 });
  }

  try {
    // Cliente SSR con RLS: auth + verificación de dueño. (El trabajo técnico de
    // emitir/escribir en facturas lo hace facturarConsulta con service-role.)
    const supabase = await createSupabaseServerClient();

    // 3) Médico del usuario.
    const { data: medico } = await supabase
      .from("medicos")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!medico) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // 4) Consulta del médico (dueño) + paciente.
    const { data: consulta } = await supabase
      .from("consultas")
      .select(`
        id,
        paciente_id,
        pacientes (
          identificacion,
          tipo_identificacion
        )
      `)
      .eq("id", consulta_id)
      .eq("medico_id", medico.id)
      .maybeSingle();
    if (!consulta) {
      return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 404 });
    }

    const paciente = consulta.pacientes as unknown as {
      identificacion: string | null;
      tipo_identificacion: "04" | "05" | "06" | "07" | null;
    } | null;

    // 5) REGLA DE LA CÉDULA — fallar rápido con mensaje claro.
    if (!paciente || !paciente.identificacion || !paciente.tipo_identificacion) {
      return NextResponse.json(
        { error: "El paciente no tiene cédula o RUC registrado. Edítalo antes de facturar." },
        { status: 422 }
      );
    }
    // "Consumidor final" (07) no es facturable: impide el reembolso del paciente
    // ante su aseguradora y desde 2026 es irreversible ante el SRI.
    if (paciente.tipo_identificacion === "07") {
      return NextResponse.json(
        {
          error:
            "Este paciente tiene tipo de identificación 'Consumidor final', que no es facturable. Edita el paciente y registra su cédula, RUC o pasaporte.",
        },
        { status: 422 }
      );
    }

    // 6) ANTI-DUPLICADOS. Puede haber varias filas por consulta (reintentos):
    // si ALGUNA está en estado bloqueante → 409. Si solo hay rechazada/fallida
    // (o ninguna) → se permite continuar.
    const { data: facturasPrevias } = await supabase
      .from("facturas")
      .select("estado")
      .eq("consulta_id", consulta_id);

    const bloqueada = (facturasPrevias ?? []).some((f) =>
      ESTADOS_BLOQUEANTES.has(f.estado)
    );
    if (bloqueada) {
      return NextResponse.json(
        { error: "Esta consulta ya fue facturada o está en proceso." },
        { status: 409 }
      );
    }

    // 7) Emitir vía el motor nuevo (verifica de nuevo el dueño con medicoIdEsperado).
    const resultado = await facturarConsulta({
      consultaId: consulta_id,
      monto: montoNum,
      medicoIdEsperado: medico.id,
    });

    // 8) Mapear estado → status HTTP.
    const payload = {
      facturaId: resultado.facturaId,
      estado: resultado.estado,
      claveAcceso: resultado.claveAcceso,
      mensaje: resultado.mensaje,
    };
    if (resultado.estado === "autorizada") {
      return NextResponse.json(payload, { status: 201 });
    }
    if (resultado.estado === "procesando") {
      return NextResponse.json(payload, { status: 202 });
    }
    // 'rechazada' (u otro): operación procesada, resultado no exitoso. 200 con
    // el detalle; el front distingue por `estado`/`mensaje`.
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    // Error de negocio (paciente sin identificación válida que se coló) → 422.
    if (err instanceof FacturacionBloqueadaError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[facturas/emitir] error al facturar consulta: ${message}`);
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
