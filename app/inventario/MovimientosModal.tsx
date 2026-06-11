"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { InventarioItem } from "./InventarioView";

interface Movimiento {
  id: string;
  tipo_movimiento: "entrada" | "salida";
  cantidad: number;
  motivo: string | null;
  paciente_id: string | null;
  created_at: string;
  pacientes: { nombre: string } | null;
}

interface Props {
  item: InventarioItem;
  onClose: () => void;
}

function formatFechaMov(iso: string): string {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MovimientosModal({ item, onClose }: Props) {
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [loadingMov, setLoadingMov] = useState(true);
  const [errorMov, setErrorMov] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/inventario/${item.id}/movimientos`)
      .then((r) => r.json())
      .then((d) => setMovimientos(d.movimientos ?? []))
      .catch(() => setErrorMov("Error al cargar el historial."))
      .finally(() => setLoadingMov(false));
  }, [item.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Historial de movimientos</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{item.nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loadingMov && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-[#94A3B8]">Cargando…</p>
            </div>
          )}
          {errorMov && (
            <div className="px-6 py-6">
              <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">{errorMov}</p>
            </div>
          )}
          {movimientos !== null && movimientos.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-[#94A3B8]">Sin movimientos registrados.</p>
            </div>
          )}
          {movimientos !== null && movimientos.length > 0 && (
            <ul className="divide-y divide-[#E2E8F0]">
              {movimientos.map((mov) => {
                const esEntrada = mov.tipo_movimiento === "entrada";
                return (
                  <li key={mov.id} className="px-6 py-3 flex items-start gap-3">
                    <span
                      className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        esEntrada
                          ? "bg-[#D1FAE5] text-[#065F46]"
                          : "bg-[#FEE2E2] text-[#991B1B]"
                      }`}
                    >
                      {esEntrada ? `+${mov.cantidad}` : `−${mov.cantidad}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[#0F172A]">
                          {esEntrada ? "Entrada" : "Salida"}
                        </span>
                        <span className="text-xs text-[#94A3B8]">
                          {formatFechaMov(mov.created_at)}
                        </span>
                      </div>
                      {mov.motivo && (
                        <p className="text-xs text-[#64748B] mt-0.5 truncate">{mov.motivo}</p>
                      )}
                      {mov.paciente_id && mov.pacientes && (
                        <p className="text-xs mt-0.5">
                          <Link
                            href={`/pacientes/${mov.paciente_id}`}
                            className="text-[#0F766E] hover:underline"
                          >
                            {mov.pacientes.nombre}
                          </Link>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E2E8F0] shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#E2E8F0] text-[#64748B] text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
