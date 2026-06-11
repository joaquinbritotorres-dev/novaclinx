"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reclamacionId: string;
  estado: string;
  monto: number | null;
  fechaEnvio: string | null;
  canalEnvio: string | null;
  fechaPago: string | null;
  montoPagado: number | null;
  motivoGlosa: string | null;
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

const CANAL_LABELS: Record<string, string> = {
  portal: "Portal de la aseguradora",
  email:  "Email",
  fisico: "Físico",
};

const BTN_PRIMARY =
  "h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_SECONDARY =
  "h-9 px-4 bg-white border border-[#E2E8F0] hover:border-[#0F766E] text-[#0F172A] text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
const BTN_DANGER =
  "h-9 px-4 bg-white border border-[#E2E8F0] hover:border-[#EF4444] text-[#EF4444] text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
const INPUT =
  "w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50";

function formatFecha(iso: string | null, isDate = false) {
  if (!iso) return "—";
  const d = isDate ? new Date(iso + "T00:00:00") : new Date(iso);
  return d.toLocaleDateString("es-EC", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EstadoReclamacionSection({
  reclamacionId,
  estado,
  monto,
  fechaEnvio,
  canalEnvio,
  fechaPago,
  montoPagado,
  motivoGlosa,
}: Props) {
  const router = useRouter();
  const todayISO = new Date().toISOString().slice(0, 10);

  const [activeForm, setActiveForm] = useState<"enviar" | "pago" | "glosa" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [canal, setCanal] = useState("portal");
  const [fechaPagoForm, setFechaPagoForm] = useState(todayISO);
  const [montoPagadoForm, setMontoPagadoForm] = useState(monto != null ? String(monto) : "");
  const [motivoGlosaForm, setMotivoGlosaForm] = useState("");

  async function doAction(accion: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reclamaciones/${reclamacionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "No pudimos completar la acción.");
      }
      setActiveForm(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar la acción.");
    } finally {
      setLoading(false);
    }
  }

  const colorClass = ESTADO_COLORS[estado] ?? "bg-gray-100 text-gray-700";
  const hasEnvioData = ["enviada", "glosada", "pagada"].includes(estado) && fechaEnvio;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-6">
      <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4 border-b border-[#E2E8F0] pb-2">
        Estado de la Reclamación
      </h2>

      {/* Badge + datos capturados */}
      <div className="mb-4 space-y-2">
        <div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${colorClass}`}>
            {ESTADO_LABELS[estado] ?? estado}
          </span>
        </div>

        {hasEnvioData && (
          <p className="text-sm text-[#475569]">
            <span className="font-medium text-[#0F172A]">Enviada el</span>{" "}
            {formatFecha(fechaEnvio)}
            {canalEnvio ? ` · ${CANAL_LABELS[canalEnvio] ?? canalEnvio}` : ""}
          </p>
        )}

        {estado === "glosada" && motivoGlosa && (
          <p className="text-sm text-[#475569]">
            <span className="font-medium text-[#0F172A]">Motivo de glosa:</span> {motivoGlosa}
          </p>
        )}

        {estado === "pagada" && (
          <p className="text-sm text-[#475569]">
            <span className="font-medium text-[#0F172A]">Pago recibido:</span>{" "}
            {formatFecha(fechaPago, true)}
            {montoPagado != null ? ` · $${Number(montoPagado).toFixed(2)}` : ""}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Acciones — borrador */}
      {estado === "borrador" && activeForm === null && (
        <button type="button" className={BTN_PRIMARY} onClick={() => setActiveForm("enviar")}>
          Marcar como enviada
        </button>
      )}
      {estado === "borrador" && activeForm === "enviar" && (
        <div className="space-y-3 border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-sm font-medium text-[#0F172A]">Canal de envío</p>
          <select value={canal} onChange={(e) => setCanal(e.target.value)} className={INPUT} disabled={loading}>
            <option value="portal">Portal de la aseguradora</option>
            <option value="email">Email</option>
            <option value="fisico">Físico</option>
          </select>
          <div className="flex gap-2">
            <button type="button" className={BTN_PRIMARY} disabled={loading}
              onClick={() => doAction("enviar", { canal_envio: canal })}>
              {loading ? "Guardando..." : "Confirmar envío"}
            </button>
            <button type="button" className={BTN_SECONDARY} onClick={() => setActiveForm(null)} disabled={loading}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Acciones — enviada */}
      {estado === "enviada" && activeForm === null && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_PRIMARY} onClick={() => setActiveForm("pago")}>
            Registrar pago
          </button>
          <button type="button" className={BTN_SECONDARY} onClick={() => setActiveForm("glosa")}>
            Marcar glosada
          </button>
          <button type="button" className={BTN_DANGER} disabled={loading}
            onClick={() => doAction("revertir")}>
            {loading ? "Guardando..." : "Volver a borrador"}
          </button>
        </div>
      )}
      {estado === "enviada" && activeForm === "pago" && (
        <div className="space-y-3 border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-sm font-medium text-[#0F172A]">Registrar pago recibido</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#64748B] mb-1 block">Fecha de pago</label>
              <input type="date" value={fechaPagoForm}
                onChange={(e) => setFechaPagoForm(e.target.value)}
                className={INPUT} disabled={loading} />
            </div>
            <div>
              <label className="text-xs text-[#64748B] mb-1 block">Monto pagado ($)</label>
              <input type="number" value={montoPagadoForm}
                onChange={(e) => setMontoPagadoForm(e.target.value)}
                min={0.01} step={0.01} className={INPUT} disabled={loading} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className={BTN_PRIMARY}
              disabled={loading || !montoPagadoForm || parseFloat(montoPagadoForm) <= 0}
              onClick={() => doAction("registrar_pago", {
                fecha_pago: fechaPagoForm,
                monto_pagado: parseFloat(montoPagadoForm),
              })}>
              {loading ? "Guardando..." : "Confirmar pago"}
            </button>
            <button type="button" className={BTN_SECONDARY} onClick={() => setActiveForm(null)} disabled={loading}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {estado === "enviada" && activeForm === "glosa" && (
        <div className="space-y-3 border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-sm font-medium text-[#0F172A]">Registrar glosa</p>
          <textarea
            value={motivoGlosaForm}
            onChange={(e) => setMotivoGlosaForm(e.target.value)}
            rows={3}
            placeholder="Describe el motivo de la glosa..."
            className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 resize-none disabled:opacity-50"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button type="button" className={BTN_PRIMARY}
              disabled={loading || !motivoGlosaForm.trim()}
              onClick={() => doAction("glosar", { motivo_glosa: motivoGlosaForm })}>
              {loading ? "Guardando..." : "Confirmar glosa"}
            </button>
            <button type="button" className={BTN_SECONDARY} onClick={() => setActiveForm(null)} disabled={loading}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Acciones — glosada */}
      {estado === "glosada" && (
        <button type="button" className={BTN_PRIMARY} disabled={loading}
          onClick={() => doAction("reenviar")}>
          {loading ? "Guardando..." : "Volver a enviar"}
        </button>
      )}
    </div>
  );
}
