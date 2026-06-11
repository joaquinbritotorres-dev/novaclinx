import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcularPlazos } from "@/lib/reclamaciones/plazos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

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

    const { data: reclamacion } = await supabase
      .from("reclamaciones")
      .select(`
        *,
        pacientes ( nombre, cedula, identificacion ),
        aseguradoras ( nombre, ventana_presentacion_dias, ventana_pago_dias, cuenta_desde, plazo_confirmado ),
        paciente_seguros ( numero_afiliado ),
        consultas ( cie10_codigo, indicaciones )
      `)
      .eq("id", id)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!reclamacion) {
      return NextResponse.json(
        { error: "Reclamación no encontrada." },
        { status: 404 }
      );
    }

    // Obtener consentimiento LOPDP
    const { data: consentimiento } = await supabase
      .from("consentimientos_seguro")
      .select("otorgado")
      .eq("paciente_id", reclamacion.paciente_id)
      .eq("medico_id", medico.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paciente = reclamacion.pacientes as unknown as { nombre: string; cedula: string | null; identificacion: string | null };
    const seguro = reclamacion.paciente_seguros as unknown as { numero_afiliado: string | null };
    const consulta = reclamacion.consultas as unknown as { cie10_codigo: string | null; indicaciones: any };
    const aseguradora = reclamacion.aseguradoras as unknown as {
      nombre: string;
      ventana_presentacion_dias: number;
      ventana_pago_dias: number;
      cuenta_desde: "factura" | "atencion";
      plazo_confirmado: boolean;
    } | null;

    // Factura — necesaria antes del cálculo de plazo (cuenta_desde='factura' usa created_at)
    const { data: factura } = await supabase
      .from("facturas")
      .select("numero, estado, created_at")
      .eq("consulta_id", reclamacion.consulta_id)
      .in("estado", ["emitida", "autorizada"])
      .maybeSingle();

    // Validador Anti-glosa
    const checklist = [];

    // 1. Paciente tiene cédula
    const tieneCedula = !!((paciente?.cedula && paciente.cedula.trim()) || (paciente?.identificacion && paciente.identificacion.trim()));
    checklist.push({
      item: "Identificación del paciente",
      estado: tieneCedula ? "ok" : "falta",
      mensaje: tieneCedula ? "Registrada" : "Falta número de cédula o pasaporte"
    });

    // 2. Seguro con número de afiliado
    const tieneAfiliado = !!(seguro?.numero_afiliado && seguro.numero_afiliado.trim());
    checklist.push({
      item: "Número de afiliado",
      estado: tieneAfiliado ? "ok" : "falta",
      mensaje: tieneAfiliado ? "Registrado" : "Falta número de afiliado en el seguro"
    });

    // 3. Consentimiento LOPDP
    const tieneConsentimiento = consentimiento?.otorgado === true;
    checklist.push({
      item: "Consentimiento LOPDP",
      estado: tieneConsentimiento ? "ok" : "falta",
      mensaje: tieneConsentimiento ? "Otorgado" : "No otorgado o falta registro"
    });

    // 4. Nota clínica con CIE-10
    const tieneCie10 = !!(consulta?.cie10_codigo && consulta.cie10_codigo.trim());
    checklist.push({
      item: "Diagnóstico CIE-10",
      estado: tieneCie10 ? "ok" : "falta",
      mensaje: tieneCie10 ? "Presente" : "Consulta no tiene CIE-10"
    });

    // 5. Receta presente
    let indicacionesCount = 0;
    try {
      const arr = typeof consulta?.indicaciones === "string" ? JSON.parse(consulta.indicaciones) : consulta?.indicaciones;
      if (Array.isArray(arr)) indicacionesCount = arr.length;
    } catch {}
    
    checklist.push({
      item: "Receta médica",
      estado: indicacionesCount > 0 ? "ok" : "falta",
      mensaje: indicacionesCount > 0 ? `${indicacionesCount} prescripciones` : "No hay medicamentos prescritos"
    });

    // 6. Plazo de presentación — usa el helper calcularPlazos
    {
      const { relojPresentacion } = calcularPlazos({
        ventana_presentacion_dias: aseguradora?.ventana_presentacion_dias ?? 90,
        ventana_pago_dias: aseguradora?.ventana_pago_dias ?? 60,
        cuenta_desde: aseguradora?.cuenta_desde ?? "factura",
        plazo_confirmado: aseguradora?.plazo_confirmado ?? false,
        fechaFactura: factura?.created_at ?? null,
        fechaAtencion: reclamacion.fecha_atencion ?? null,
        fechaEnvio: null,
      });

      const estadoPlazo =
        relojPresentacion.semaforo === "ok" ? "ok"
        : relojPresentacion.semaforo === "pendiente" ? "pendiente"
        : "falta";

      checklist.push({
        item: "Plazo de presentación",
        estado: estadoPlazo,
        mensaje: relojPresentacion.etiqueta,
      });
    }

    // 7. Factura electrónica
    checklist.push({
      item: "Factura electrónica",
      estado: factura ? "ok" : "falta",
      mensaje: factura
        ? `Emitida — Factura N° ${factura.numero ?? factura.estado}`
        : "Sin factura emitida",
    });

    return NextResponse.json({ reclamacion, checklist });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

const CANALES_VALIDOS = ["portal", "email", "fisico"] as const;
type Canal = (typeof CANALES_VALIDOS)[number];

const TRANSICIONES: Record<string, string[]> = {
  enviar:          ["borrador"],
  registrar_pago:  ["enviada"],
  glosar:          ["enviada"],
  reenviar:        ["glosada"],
  revertir:        ["enviada"],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 400 });
  }

  const { accion, ...rest } = body as Record<string, unknown>;

  if (typeof accion !== "string" || !TRANSICIONES[accion]) {
    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
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

    const { data: reclamacion } = await supabase
      .from("reclamaciones")
      .select("id, estado")
      .eq("id", id)
      .eq("medico_id", medico.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!reclamacion) {
      return NextResponse.json({ error: "Reclamación no encontrada." }, { status: 404 });
    }

    const estadoActual = reclamacion.estado as string;
    if (!TRANSICIONES[accion].includes(estadoActual)) {
      return NextResponse.json(
        { error: `No se puede '${accion}' desde el estado '${estadoActual}'.` },
        { status: 400 }
      );
    }

    let update: Record<string, unknown>;

    if (accion === "enviar") {
      const canal = rest.canal_envio as string | undefined;
      if (!canal || !(CANALES_VALIDOS as readonly string[]).includes(canal)) {
        return NextResponse.json({ error: "canal_envio inválido. Use 'portal', 'email' o 'fisico'." }, { status: 400 });
      }
      update = { estado: "enviada", fecha_envio: new Date().toISOString(), canal_envio: canal };

    } else if (accion === "registrar_pago") {
      const montoPagado = rest.monto_pagado;
      const fechaPago = typeof rest.fecha_pago === "string" && rest.fecha_pago
        ? rest.fecha_pago
        : new Date().toISOString().slice(0, 10);
      if (typeof montoPagado !== "number" || montoPagado <= 0) {
        return NextResponse.json({ error: "monto_pagado debe ser un número mayor a 0." }, { status: 400 });
      }
      update = { estado: "pagada", fecha_pago: fechaPago, monto_pagado: montoPagado };

    } else if (accion === "glosar") {
      const motivo = rest.motivo_glosa;
      if (typeof motivo !== "string" || !motivo.trim()) {
        return NextResponse.json({ error: "motivo_glosa es requerido." }, { status: 400 });
      }
      update = { estado: "glosada", motivo_glosa: motivo.trim() };

    } else if (accion === "reenviar") {
      update = { estado: "enviada", fecha_envio: new Date().toISOString() };

    } else { // revertir
      update = { estado: "borrador", fecha_envio: null, canal_envio: null };
    }

    const { error: updateError } = await supabase
      .from("reclamaciones")
      .update(update)
      .eq("id", id)
      .eq("medico_id", medico.id);

    if (updateError) {
      return NextResponse.json({ error: "No pudimos actualizar la reclamación." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 500 });
  }
}
