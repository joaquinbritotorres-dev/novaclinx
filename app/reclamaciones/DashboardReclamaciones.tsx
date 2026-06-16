"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { RelojPresentacion, RelojPago, Semaforo } from "@/lib/reclamaciones/plazos";

const EYEBROW = "text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]";

export interface ReclamacionRow {
  id: string;
  estado: string;
  tipo: string;
  monto: number | null;
  monto_pagado: number | null;
  fecha_pago: string | null;
  fecha_envio: string | null;
  fecha_atencion: string | null;
  created_at: string;
  paciente_id: string;
  pacientes: { nombre: string } | null;
  aseguradoras: { nombre: string } | null;
  relojPresentacion: RelojPresentacion;
  relojPago: RelojPago;
}

interface Props {
  reclamaciones: ReclamacionRow[];
}

const ESTADO_LABELS: Record<string, string> = {
  borrador:     "Borrador",
  armada:       "Armada",
  enviada:      "Enviada",
  en_auditoria: "En auditoría",
  glosada:      "Glosada",
  subsanada:    "Subsanada",
  aprobada:     "Aprobada",
  pagada:       "Pagada",
  rechazada:    "Rechazada",
};

// Paleta sobria — misma que RECLAMACION_BADGE del detalle de paciente,
// extendida a los estados intermedios con tonos coherentes y apagados.
const ESTADO_COLORS: Record<string, string> = {
  borrador:     "bg-[#8A8780]/[0.14] text-[#5C5A54]",
  armada:       "bg-[#8A8780]/[0.14] text-[#5C5A54]",
  enviada:      "bg-[#0F766E]/[0.08] text-[#0F766E]",
  en_auditoria: "bg-[#9A6B12]/[0.12] text-[#9A6B12]",
  glosada:      "bg-[#9A6B12]/[0.12] text-[#9A6B12]",
  subsanada:    "bg-[#0F766E]/[0.08] text-[#0F766E]",
  aprobada:     "bg-[#3F7A5E]/[0.12] text-[#3F7A5E]",
  pagada:       "bg-[#3F7A5E]/[0.12] text-[#3F7A5E]",
  rechazada:    "bg-[#B91C1C]/[0.08] text-[#B91C1C]",
};

const CHIPS = [
  { label: "Todas",      value: null        },
  { label: "Borradores", value: "borrador"  },
  { label: "Enviadas",   value: "enviada"   },
  { label: "Pagadas",    value: "pagada"    },
  { label: "Glosadas",   value: "glosada"   },
];

function usd(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);
}

function relojActivo(r: ReclamacionRow): { dias: number | null; semaforo: Semaforo | null } | null {
  if (r.estado === "borrador") return r.relojPresentacion;
  if (r.estado === "enviada")  return r.relojPago;
  return null;
}

function filaBg(r: ReclamacionRow): string {
  const rel = relojActivo(r);
  if (!rel || rel.dias === null) return "";
  if (rel.semaforo === "vencido")   return "bg-[#B91C1C]/[0.04]";
  if (rel.semaforo === "pendiente") return "bg-[#9A6B12]/[0.05]";
  return "";
}

function RelojCell({ r }: { r: ReclamacionRow }) {
  const rel = relojActivo(r);
  if (!rel || rel.dias === null) return <span className="text-[#A8A49C]">—</span>;
  if (rel.semaforo === "vencido")
    return (
      <span className="inline-flex items-center gap-1 text-[#B91C1C] font-medium text-xs">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
        Vencido ({Math.abs(rel.dias)}d)
      </span>
    );
  if (rel.semaforo === "pendiente")
    return (
      <span className="inline-flex items-center gap-1 text-[#9A6B12] font-medium text-xs">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
        {rel.dias}d
      </span>
    );
  return <span className="text-[#5C5A54] text-xs">{rel.dias}d</span>;
}

export default function DashboardReclamaciones({ reclamaciones }: Props) {
  const [filtro, setFiltro] = useState<string | null>(null);

  // ── Cálculo de tarjetas ────────────────────────────────────────────
  const hoy = new Date();
  const anoActual  = hoy.getFullYear();
  const mesActual  = hoy.getMonth();

  const porCobrar = reclamaciones.filter((r) => r.estado === "enviada");
  const cobradoMes = reclamaciones.filter((r) => {
    if (r.estado !== "pagada" || !r.fecha_pago) return false;
    const fp = new Date(r.fecha_pago + "T00:00:00");
    return fp.getFullYear() === anoActual && fp.getMonth() === mesActual;
  });
  const porVencer = reclamaciones.filter((r) => {
    const rel = relojActivo(r);
    return rel !== null && rel.dias !== null && rel.dias <= 15;
  });
  const glosadas = reclamaciones.filter((r) => r.estado === "glosada");

  const sumaMonto = (arr: ReclamacionRow[]) =>
    arr.reduce((acc, r) => acc + (r.monto ?? 0), 0);
  const sumaPagado = (arr: ReclamacionRow[]) =>
    arr.reduce((acc, r) => acc + (r.monto_pagado ?? 0), 0);

  const filtradas = filtro ? reclamaciones.filter((r) => r.estado === filtro) : reclamaciones;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* Banner de alerta */}
      {porVencer.length > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-[#9A6B12]/[0.07] border border-[#9A6B12]/20 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#9A6B12]" strokeWidth={1.75} />
          <p className="text-sm text-[#5C5A54]">
            Tienes <span className="font-semibold text-[#1A1A18]">{porVencer.length}</span> reclamación{porVencer.length > 1 ? "es" : ""} por vencer en los próximos 15 días.
          </p>
        </div>
      )}

      {/* Resumen — estilo Stripe: una superficie con divisores hairline */}
      <section className="mb-6 rounded-2xl border border-[#E7E3DB] bg-white">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#E7E3DB] sm:grid-cols-4 sm:divide-y-0">
          <Card
            titulo="Por cobrar"
            valor={usd(sumaMonto(porCobrar))}
            sub={`${porCobrar.length} reclamación${porCobrar.length !== 1 ? "es" : ""}`}
            color="text-[#1A1A18]"
          />
          <Card
            titulo="Cobrado (mes)"
            valor={usd(sumaPagado(cobradoMes))}
            sub={`${cobradoMes.length} pagada${cobradoMes.length !== 1 ? "s" : ""}`}
            color="text-[#1A1A18]"
          />
          <Card
            titulo="Por vencer"
            valor={String(porVencer.length)}
            sub={porVencer.length > 0 ? usd(sumaMonto(porVencer)) : "Sin urgencias"}
            color={porVencer.length > 0 ? "text-[#9A6B12]" : "text-[#A8A49C]"}
          />
          <Card
            titulo="Glosado"
            valor={String(glosadas.length)}
            sub={glosadas.length > 0 ? usd(sumaMonto(glosadas)) : "Sin glosas"}
            color={glosadas.length > 0 ? "text-[#B91C1C]" : "text-[#A8A49C]"}
          />
        </div>
      </section>

      {/* Chips de filtro */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setFiltro(chip.value)}
            className={`h-8 px-3 rounded-full text-xs font-medium transition-colors border ${
              filtro === chip.value
                ? "bg-[#0F766E] text-white border-[#0F766E]"
                : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#0F766E]"
            }`}
          >
            {chip.label}
            {chip.value !== null && (
              <span className="ml-1.5 opacity-70">
                {reclamaciones.filter((r) => r.estado === chip.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">
            {filtro ? "No hay reclamaciones en este estado." : "No tienes reclamaciones registradas."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569]">
                <tr>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Paciente</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Aseguradora</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Monto</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Reloj</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtradas.map((r) => {
                  const bg = filaBg(r);
                  const badgeColor = ESTADO_COLORS[r.estado] ?? "bg-gray-100 text-gray-700";
                  return (
                    <tr key={r.id} className={`transition-colors ${bg || "hover:bg-[#F8FAFC]"}`}>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <Link
                          href={`/pacientes/${r.paciente_id}`}
                          className="text-[#0F766E] hover:underline"
                        >
                          {r.pacientes?.nombre ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#475569] whitespace-nowrap">
                        {r.aseguradoras?.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#0F172A]">
                        {r.monto != null ? usd(r.monto) : <span className="text-[#94A3B8]">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${badgeColor}`}>
                          {ESTADO_LABELS[r.estado] ?? r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RelojCell r={r} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/reclamaciones/${r.id}`}
                          className="text-[#0F766E] hover:underline font-medium"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
  sub,
  color,
}: {
  titulo: string;
  valor: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1">{titulo}</p>
      <p className={`text-xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-[#94A3B8] mt-0.5">{sub}</p>
    </div>
  );
}
