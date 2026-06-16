import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcularPlazos } from "@/lib/reclamaciones/plazos";
import DashboardReclamaciones, { type ReclamacionRow } from "./DashboardReclamaciones";

export default async function ReclamacionesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  const { data: rows } = await supabase
    .from("reclamaciones")
    .select(`
      id,
      estado,
      tipo,
      monto,
      monto_pagado,
      fecha_pago,
      fecha_envio,
      fecha_atencion,
      created_at,
      paciente_id,
      consulta_id,
      pacientes ( nombre ),
      aseguradoras (
        nombre,
        ventana_presentacion_dias,
        ventana_pago_dias,
        cuenta_desde,
        plazo_confirmado
      )
    `)
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const consultaIds = (rows ?? [])
    .map((r: any) => r.consulta_id)
    .filter(Boolean) as string[];

  let facturaMap: Record<string, { created_at: string }> = {};
  if (consultaIds.length > 0) {
    const { data: facturas } = await supabase
      .from("facturas")
      .select("consulta_id, created_at")
      .in("consulta_id", consultaIds)
      .in("estado", ["emitida", "autorizada"]);

    for (const f of facturas ?? []) {
      if (f.consulta_id && !facturaMap[f.consulta_id]) {
        facturaMap[f.consulta_id] = { created_at: f.created_at };
      }
    }
  }

  const reclamaciones: ReclamacionRow[] = (rows ?? []).map((r: any) => {
    const aseg = r.aseguradoras as {
      nombre: string;
      ventana_presentacion_dias: number;
      ventana_pago_dias: number;
      cuenta_desde: "factura" | "atencion";
      plazo_confirmado: boolean;
    } | null;

    const factura = r.consulta_id ? facturaMap[r.consulta_id] ?? null : null;

    const { relojPresentacion, relojPago } = calcularPlazos({
      ventana_presentacion_dias: aseg?.ventana_presentacion_dias ?? 90,
      ventana_pago_dias:         aseg?.ventana_pago_dias ?? 60,
      cuenta_desde:              aseg?.cuenta_desde ?? "factura",
      plazo_confirmado:          aseg?.plazo_confirmado ?? false,
      fechaFactura:              factura?.created_at ?? null,
      fechaAtencion:             r.fecha_atencion ?? null,
      fechaEnvio:                r.fecha_envio ?? null,
    });

    return {
      id:           r.id,
      estado:       r.estado,
      tipo:         r.tipo,
      monto:        r.monto ?? null,
      monto_pagado: r.monto_pagado ?? null,
      fecha_pago:   r.fecha_pago ?? null,
      fecha_envio:  r.fecha_envio ?? null,
      fecha_atencion: r.fecha_atencion ?? null,
      created_at:   r.created_at,
      paciente_id:  r.paciente_id,
      pacientes:    r.pacientes ?? null,
      aseguradoras: aseg ? { nombre: aseg.nombre } : null,
      relojPresentacion,
      relojPago,
    };
  });

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-10">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]">
            Reclamaciones
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-[#1A1A18]">
            Reclamaciones a Aseguradoras
          </h1>
          <p className="mt-1.5 text-sm text-[#8A8780]">
            Gestiona los cobros por reembolso o red de prestadores.
          </p>
        </div>

        <DashboardReclamaciones reclamaciones={reclamaciones} />
      </div>
    </main>
  );
}
