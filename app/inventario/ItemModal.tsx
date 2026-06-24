"use client";

import { useState } from "react";
import type { InventarioItem } from "./InventarioView";

const VACUNAS_ECUADOR = [
  "BCG", "Hepatitis B", "Pentavalente", "Rotavirus", "Neumococo",
  "Influenza", "SRP (triple viral)", "Varicela", "Fiebre amarilla",
  "dTpa", "VPH",
];
const UNIDADES = ["dosis", "unidad", "frasco", "caja", "ml", "par"];

interface Props {
  item: InventarioItem | null; // null = crear
  onClose: (refresh?: boolean) => void;
}

export default function ItemModal({ item, onClose }: Props) {
  const isEdit = !!item;

  const [tipo, setTipo] = useState<"vacuna" | "insumo">(item?.tipo ?? "vacuna");
  const [nombre, setNombre] = useState(item?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(item?.descripcion ?? "");
  const [lote, setLote] = useState(item?.lote ?? "");
  const [fechaCaducidad, setFechaCaducidad] = useState(item?.fecha_caducidad ?? "");
  const [unidad, setUnidad] = useState(item?.unidad ?? "dosis");
  const [cantidad, setCantidad] = useState(item?.cantidad ?? 0);
  const [stockMinimo, setStockMinimo] = useState(item?.stock_minimo ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTipoChange(t: "vacuna" | "insumo") {
    setTipo(t);
    if (!isEdit) setUnidad(t === "vacuna" ? "dosis" : "unidad");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        tipo,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        lote: lote.trim() || null,
        fecha_caducidad: fechaCaducidad || null,
        unidad,
        cantidad: Math.max(0, Math.floor(cantidad)),
        stock_minimo: Math.max(0, Math.floor(stockMinimo)),
      };

      const url = isEdit ? `/api/inventario/${item!.id}` : "/api/inventario";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo guardar.");
      }
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A]">
            {isEdit ? "Editar ítem" : "Nuevo ítem"}
          </h2>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[80dvh] overflow-y-auto">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
              Tipo
            </label>
            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
              {(["vacuna", "insumo"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTipoChange(t)}
                  className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tipo === t
                      ? "bg-white shadow-sm text-[#0F172A]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {t === "vacuna" ? "Vacuna" : "Insumo"}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Nombre <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              list={tipo === "vacuna" ? "vacunas-list" : undefined}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={tipo === "vacuna" ? "Ej. Pentavalente" : "Ej. Guantes de nitrilo"}
              required
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
            />
            {tipo === "vacuna" && (
              <datalist id="vacunas-list">
                {VACUNAS_ECUADOR.map((v) => <option key={v} value={v} />)}
              </datalist>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Fabricante, presentación, notas…"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
            />
          </div>

          {/* Lote + Caducidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Lote
              </label>
              <input
                type="text"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder="Ej. ABC-2025"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Fecha caducidad
              </label>
              <input
                type="date"
                value={fechaCaducidad}
                onChange={(e) => setFechaCaducidad(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              />
            </div>
          </div>

          {/* Unidad + Cantidad + Stock mínimo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Unidad
              </label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              >
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Cantidad
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Stock mínimo
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={stockMinimo}
                onChange={(e) => setStockMinimo(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onClose()}
              className="h-10 px-4 rounded-lg border border-[#E2E8F0] text-[#64748B] text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando…" : isEdit ? "Guardar" : "Crear ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
