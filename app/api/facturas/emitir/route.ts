import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emitirFacturaDatil } from "@/lib/datil/emitir-factura";
import { DATIL_AMBIENTE, DATIL_EMISOR } from "@/lib/datil/config";
import type {
  DatilFacturaRequest,
  DatilItem,
  DatilTotales,
  DatilImpuesto,
} from "@/lib/datil/types";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

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
    const supabase = await createSupabaseServerClient();

    const { data: medico } = await supabase
      .from("medicos")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!medico) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data: consulta } = await supabase
      .from("consultas")
      .select(`
        id,
        paciente_id,
        pacientes (
          id,
          nombre,
          identificacion,
          tipo_identificacion,
          email,
          direccion
        )
      `)
      .eq("id", consulta_id)
      .eq("medico_id", medico.id)
      .maybeSingle();

    if (!consulta) {
      return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 404 });
    }

    const paciente = consulta.pacientes as unknown as {
      nombre: string;
      identificacion: string | null;
      tipo_identificacion: "04" | "05" | "06" | "07" | null;
      email: string | null;
      direccion: string | null;
    };

    if (!paciente.identificacion || !paciente.tipo_identificacion) {
      return NextResponse.json(
        { error: "El paciente no tiene cédula o RUC registrado. Edítalo antes de facturar." },
        { status: 422 }
      );
    }

    // "Consumidor final" (07) no es facturable: impide el reembolso del
    // paciente ante su aseguradora y desde 2026 es irreversible ante el SRI.
    // Guarda para datos preexistentes; la opción ya no existe en formularios.
    if (paciente.tipo_identificacion === "07") {
      return NextResponse.json(
        {
          error:
            "Este paciente tiene tipo de identificación 'Consumidor final', que no es facturable. Edita el paciente y registra su cédula, RUC o pasaporte.",
        },
        { status: 422 }
      );
    }

    // Idempotencia: solo bloquear si ya hay una factura activa
    const { data: facturaActiva } = await supabase
      .from("facturas")
      .select("id, estado")
      .eq("consulta_id", consulta_id)
      .in("estado", ["emitida", "autorizada", "pendiente"])
      .maybeSingle();

    if (facturaActiva) {
      return NextResponse.json(
        { error: "Esta consulta ya fue facturada o está en proceso." },
        { status: 409 }
      );
    }

    // Secuencial: siguiente número para este médico
    const { count: facturaCount } = await supabase
      .from("facturas")
      .select("id", { count: "exact", head: true })
      .eq("medico_id", medico.id);

    const secuencial = (facturaCount ?? 0) + 1;

    // Registro PENDIENTE para tracking (antes de llamar a Dátil)
    const { data: factura, error: insertError } = await supabase
      .from("facturas")
      .insert({
        consulta_id,
        medico_id: medico.id,
        estado: "pendiente",
        monto: montoNum,
      })
      .select("id")
      .single();

    if (insertError || !factura) {
      return NextResponse.json({ error: "No pudimos completar la acción. Intenta de nuevo." }, { status: 500 });
    }

    // IVA tarifa 0% — servicios de salud (Art. 56 num. 2, Ley de Régimen
    // Tributario Interno). El desglose "SUBTOTAL 0%" debe constar en el RIDE,
    // por eso base_imponible lleva el monto y codigo_porcentaje es "0".
    const base = Number(montoNum.toFixed(2));
    const ivaValor = 0;
    const total = base;

    // tarifa solo va en items, no en totales (Dátil rechaza tarifa en totales)
    const impuestoItem: DatilImpuesto = {
      codigo: "2",
      codigo_porcentaje: "0", // IVA 0% (Tabla 17 SRI)
      base_imponible: base,
      tarifa: 0,
      valor: ivaValor,
    };

    const impuestoTotal: Omit<DatilImpuesto, "tarifa"> = {
      codigo: "2",
      codigo_porcentaje: "0",
      base_imponible: base,
      valor: ivaValor,
    };

    const item: DatilItem = {
      codigo_principal: "CONSULTA",
      descripcion: "Consulta médica",
      cantidad: 1,
      precio_unitario: base,
      descuento: 0,
      precio_total_sin_impuestos: base,
      impuestos: [impuestoItem],
    };

    const totales: DatilTotales = {
      total_sin_impuestos: base,
      descuento: 0,
      propina: 0,
      importe_total: total,
      impuestos: [impuestoTotal as DatilImpuesto],
    };

    const payload: DatilFacturaRequest = {
      ambiente: DATIL_AMBIENTE,
      tipo_emision: 1,
      secuencial,
      fecha_emision: new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
      moneda: "USD",
      emisor: DATIL_EMISOR,
      comprador: {
        identificacion: paciente.identificacion,
        tipo_identificacion: paciente.tipo_identificacion,
        razon_social: paciente.nombre,
        email: paciente.email ?? "",
        direccion: paciente.direccion ?? "Ecuador",
      },
      items: [item],
      totales,
      pagos: [{ medio: "efectivo", total }],
    };

    const result = await emitirFacturaDatil(payload, factura.id);

    if (result.ok) {
      const estadoRaw = typeof result.data.estado === "string" ? result.data.estado : "";
      const estadoFinal = estadoRaw.toUpperCase() === "AUTORIZADO" ? "autorizada" : "emitida";

      const { error: updateError } = await supabase
        .from("facturas")
        .update({
          estado: estadoFinal,
          datil_id: result.data.id ?? null,
          clave_acceso: result.data.clave_acceso ?? null,
          numero: result.data.numero ?? null,
        })
        .eq("id", factura.id);

      return NextResponse.json(
        { id: result.data.id, estado: estadoFinal },
        { status: 201 }
      );
    } else {
      await supabase
        .from("facturas")
        .update({ estado: "error", error_mensaje: result.message })
        .eq("id", factura.id);

      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: result.status }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
