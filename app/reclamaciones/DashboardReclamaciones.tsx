"use client";

import { useState } from "react";
import Link from "next/link";
import type { RelojPresentacion, RelojPago, Semaforo } from "@/lib/reclamaciones/plazos";

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

const ESTADO_COLORS: Record<string, string> = {
  borrador:     "bg-gray-100 text-gray-700",
  armada:       "bg-blue-50 text-blue-700",
  enviada:      "bg-blue-100 text-blue-800",
  en_auditoria: "bg-yellow-100 text-yellow-800",
  glosada:      "bg-orange-100 text-orange-800",
  subsanada:    "bg-purple-100 text-purple-800",
  aprobada:     "bg-teal-100 text-teal-800",
  pagada:       "bg-green-100 text-green-700",
  rechazada:    "bg-red-100 text-red-700",
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
  if (rel.semaforo === "vencido")   return "bg-red-50";
  if (rel.semaforo === "pendiente") return "bg-amber-50";
  return "";
}

function RelojCell({ r }: { r: ReclamacionRow }) {
  const rel = relojActivo(r);
  if (!rel || rel.dias === null) return <span className="text-[#94A3B8]">—</span>;
  if (rel.semaforo === "vencido")
    return <span className="text-[#DC2626] font-medium text-xs">Vencido ({Math.abs(rel.dias)}d)</span>;
  if (rel.semaforo === "pendiente")
    return <span className="text-[#D97706] font-medium text-xs">⚠ {rel.dias}d</span>;
  return <span className="text-[#059669] text-xs">{rel.dias}d</span>;
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
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-600 mt-0.5 shrink-0">⚠</span>
          <p className="text-sm text-amber-800">
            Tienes <span className="font-semibold">{porVencer.length}</span> reclamación{porVencer.length > 1 ? "es" : ""} por vencer en los próximos 15 días.
          </p>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card
          titulo="Por cobrar"
          valor={usd(sumaMonto(porCobrar))}
          sub={`${porCobrar.length} reclamación${porCobrar.length !== 1 ? "es" : ""}`}
          color="text-[#0F766E]"
        />
        <Card
          titulo="Cobrado (mes)"
          valor={usd(sumaPagado(cobradoMes))}
          sub={`${cobradoMes.length} pagada${cobradoMes.length !== 1 ? "s" : ""}`}
          color="text-[#059669]"
        />
        <Card
          titulo="Por vencer"
          valor={String(porVencer.length)}
          sub={porVencer.length > 0 ? usd(sumaMonto(porVencer)) : "Sin urgencias"}
          color={porVencer.length > 0 ? "text-[#D97706]" : "text-[#94A3B8]"}
        />
        <Card
          titulo="Glosado"
          valor={String(glosadas.length)}
          sub={glosadas.length > 0 ? usd(sumaMonto(glosadas)) : "Sin glosas"}
          color={glosadas.length > 0 ? "text-[#DC2626]" : "text-[#94A3B8]"}
        />
      </div>

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
