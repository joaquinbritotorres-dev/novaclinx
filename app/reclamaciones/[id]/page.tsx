import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SoportesSection from "./SoportesSection";
import DescargarPaqueteButton from "./DescargarPaqueteButton";
import EstadoReclamacionSection from "./EstadoReclamacionSection";

export default async function ReclamacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: medico } = await supabase
    .from("medicos")
    .select("id, firma_object_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const url = `${protocol}://${host}/api/reclamaciones/${id}`;
  
  const cookieHeader = headersList.get('cookie') || '';

  const res = await fetch(url, {
    headers: {
      cookie: cookieHeader
    }
  });

  if (!res.ok) {
    if (res.status === 404) notFound();
    return <div className="p-8 text-center text-red-500">Error al cargar la reclamación.</div>;
  }

  const { reclamacion, checklist } = await res.json();

  if (!reclamacion) notFound();

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-5">
          <Link href="/reclamaciones" className="text-sm text-[#0F766E] hover:underline">
            ← Reclamaciones
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Detalle de Reclamación</h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              ID: {reclamacion.id.split('-')[0]}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DescargarPaqueteButton
              reclamacionId={id}
              tieneFirma={!!medico.firma_object_key}
            />
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-200 text-gray-800 uppercase tracking-wide">
              {reclamacion.estado}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-6">
          <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4 border-b border-[#E2E8F0] pb-2">
            Información General
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-[#64748B] mb-1">Paciente</dt>
              <dd className="text-sm font-medium">
                <Link
                  href={`/pacientes/${reclamacion.paciente_id}`}
                  className="text-[#0F766E] hover:underline"
                >
                  {reclamacion.pacientes?.nombre}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B] mb-1">Aseguradora</dt>
              <dd className="text-sm font-medium text-[#0F172A]">{reclamacion.aseguradoras?.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B] mb-1">Fecha de Atención</dt>
              <dd className="text-sm font-medium text-[#0F172A]">
                {reclamacion.fecha_atencion ? new Date(reclamacion.fecha_atencion).toLocaleDateString("es-EC", { timeZone: "UTC" }) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B] mb-1">Tipo de Cobertura</dt>
              <dd className="text-sm font-medium text-[#0F172A]">
                {reclamacion.tipo === "red" ? "Red de Prestadores" : "Reembolso"}
              </dd>
            </div>
          </dl>
        </div>

        <EstadoReclamacionSection
          reclamacionId={id}
          estado={reclamacion.estado}
          monto={reclamacion.monto ?? null}
          fechaEnvio={reclamacion.fecha_envio ?? null}
          canalEnvio={reclamacion.canal_envio ?? null}
          fechaPago={reclamacion.fecha_pago ?? null}
          montoPagado={reclamacion.monto_pagado ?? null}
          motivoGlosa={reclamacion.motivo_glosa ?? null}
        />

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4 border-b border-[#E2E8F0] pb-2">
            Validador Anti-Glosa
          </h2>
          <ul className="space-y-3">
            {checklist.map((item: any, i: number) => (
              <li key={i} className="flex items-start gap-3">
                {item.estado === "ok" ? (
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                ) : item.estado === "falta" ? (
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#EF4444] flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </div>
                ) : (
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  </div>
                )}
                <div>
                  <p className={`text-sm font-medium ${item.estado === "falta" ? "text-[#EF4444]" : "text-[#0F172A]"}`}>
                    {item.item}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">{item.mensaje}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <SoportesSection reclamacionId={id} medicoId={medico.id} />
      </div>
    </main>
  );
}
