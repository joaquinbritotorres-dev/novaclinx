"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Pencil, Clock, Trash2 } from "lucide-react";
import ItemModal from "./ItemModal";
import MovimientoModal from "./MovimientoModal";
import MovimientosModal from "./MovimientosModal";

// ── Tipos exportados (usados por page.tsx) ────────────────────────────────────

export type TipoItem = "vacuna" | "insumo";

export interface InventarioItem {
  id: string;
  tipo: TipoItem;
  nombre: string;
  descripcion: string | null;
  lote: string | null;
  fecha_caducidad: string | null; // YYYY-MM-DD
  cantidad: number;
  unidad: string;
  stock_minimo: number;
  medico_id: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS_AVISO_VENCIMIENTO = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addDias(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function InventarioView({ items }: { items: InventarioItem[] }) {
  const router = useRouter();

  // Filtros
  const [tab, setTab] = useState<"todos" | "vacuna" | "insumo">("todos");
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalItem, setModalItem] = useState<{ open: boolean; item: InventarioItem | null }>({
    open: false, item: null,
  });
  const [modalMov, setModalMov] = useState<{
    item: InventarioItem;
    tipo: "entrada" | "salida";
  } | null>(null);
  const [modalHistorial, setModalHistorial] = useState<InventarioItem | null>(null);

  // Eliminando (loading per row)
  const [eliminando, setEliminando] = useState<Set<string>>(new Set());

  // Fechas de referencia
  const hoy = useMemo(
    () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
    []
  );
  const limite = useMemo(() => addDias(hoy, DIAS_AVISO_VENCIMIENTO), [hoy]);

  // Resumen
  const resumen = useMemo(() => {
    let stockBajo = 0, vencidos = 0, porVencer = 0;
    for (const i of items) {
      if (i.stock_minimo > 0 && i.cantidad <= i.stock_minimo) stockBajo++;
      if (i.fecha_caducidad) {
        if (i.fecha_caducidad < hoy) vencidos++;
        else if (i.fecha_caducidad <= limite) porVencer++;
      }
    }
    return { total: items.length, stockBajo, vencidos, porVencer };
  }, [items, hoy, limite]);

  // Ítems filtrados
  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((i) => {
      if (tab !== "todos" && i.tipo !== tab) return false;
      if (!q) return true;
      return (
        i.nombre.toLowerCase().includes(q) ||
        (i.lote?.toLowerCase().includes(q) ?? false) ||
        (i.descripcion?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, tab, busqueda]);

  // Eliminar
  async function handleEliminar(item: InventarioItem) {
    if (!window.confirm(`¿Eliminar "${item.nombre}" del inventario? Esta acción no se puede deshacer.`))
      return;
    setEliminando((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/api/inventario/${item.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        window.alert(typeof data.error === "string" ? data.error : "No se pudo eliminar.");
      }
    } finally {
      setEliminando((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }

  function onItemModalClose(refresh?: boolean) {
    setModalItem({ open: false, item: null });
    if (refresh) router.refresh();
  }

  function onMovModalClose(refresh?: boolean) {
    setModalMov(null);
    if (refresh) router.refresh();
  }

  // ── Render celdas de caducidad y stock ───────────────────────────────────

  function renderCaducidad(fecha: string | null) {
    if (!fecha) return <span className="text-[#94A3B8]">—</span>;
    if (fecha < hoy)
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEE2E2] text-[#991B1B]">
          Vencido
        </span>
      );
    if (fecha <= limite)
      return (
        <span className="flex flex-col gap-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3C7] text-[#92400E] w-fit">
            Vence pronto
          </span>
          <span className="text-xs text-[#64748B]">{formatFecha(fecha)}</span>
        </span>
      );
    return <span className="text-sm text-[#0F172A]">{formatFecha(fecha)}</span>;
  }

  function renderStock(item: InventarioItem) {
    const { cantidad, unidad, stock_minimo } = item;
    const texto = `${cantidad} ${unidad}`;
    if (cantidad === 0)
      return (
        <span className="flex flex-col gap-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEE2E2] text-[#991B1B] w-fit">
            Agotado
          </span>
          <span className="text-xs text-[#94A3B8]">{texto}</span>
        </span>
      );
    if (stock_minimo > 0 && cantidad <= stock_minimo)
      return (
        <span className="flex flex-col gap-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3C7] text-[#92400E] w-fit">
            Stock bajo
          </span>
          <span className="text-xs text-[#64748B]">{texto}</span>
        </span>
      );
    return <span className="text-sm text-[#0F172A]">{texto}</span>;
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#0F172A]">Inventario</h1>
        <button
          type="button"
          onClick={() => setModalItem({ open: true, item: null })}
          className="h-10 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          + Nuevo ítem
        </button>
      </div>

      {/* ── Tarjetas resumen ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Total */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Total ítems</p>
          <p className="text-2xl font-bold text-[#0F172A]">{resumen.total}</p>
        </div>
        {/* Stock bajo */}
        <div className={`border rounded-xl p-4 ${resumen.stockBajo > 0 ? "bg-[#FFFBEB] border-[#FDE68A]" : "bg-white border-[#E2E8F0]"}`}>
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Stock bajo</p>
          <p className={`text-2xl font-bold ${resumen.stockBajo > 0 ? "text-[#92400E]" : "text-[#0F172A]"}`}>
            {resumen.stockBajo}
          </p>
        </div>
        {/* Por vencer */}
        <div className={`border rounded-xl p-4 ${resumen.porVencer > 0 ? "bg-[#FFF7ED] border-[#FED7AA]" : "bg-white border-[#E2E8F0]"}`}>
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
            Por vencer ({DIAS_AVISO_VENCIMIENTO}d)
          </p>
          <p className={`text-2xl font-bold ${resumen.porVencer > 0 ? "text-[#9A3412]" : "text-[#0F172A]"}`}>
            {resumen.porVencer}
          </p>
        </div>
        {/* Vencidos */}
        <div className={`border rounded-xl p-4 ${resumen.vencidos > 0 ? "bg-[#FEF2F2] border-[#FCA5A5]" : "bg-white border-[#E2E8F0]"}`}>
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Vencidos</p>
          <p className={`text-2xl font-bold ${resumen.vencidos > 0 ? "text-[#991B1B]" : "text-[#0F172A]"}`}>
            {resumen.vencidos}
          </p>
        </div>
      </div>

      {/* ── Controles ── */}
      <div className="flex items-center gap-3 mb-4">
        {/* Tabs */}
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
          {(["todos", "vacuna", "insumo"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white shadow-sm text-[#0F172A]"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {t === "todos" ? "Todos" : t === "vacuna" ? "Vacunas" : "Insumos"}
            </button>
          ))}
        </div>
        {/* Búsqueda */}
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, lote o descripción…"
          className="h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 w-64"
        />
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {itemsFiltrados.length === 0 ? (
          <div className="px-6 py-14 text-center">
            {items.length === 0 ? (
              <>
                <p className="text-sm font-medium text-[#0F172A] mb-1">
                  Aún no tienes ítems en tu inventario
                </p>
                <p className="text-sm text-[#64748B] mb-4">
                  Registra vacunas e insumos para llevar el control de stock y caducidad.
                </p>
                <button
                  type="button"
                  onClick={() => setModalItem({ open: true, item: null })}
                  className="h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Agregar el primero
                </button>
              </>
            ) : (
              <p className="text-sm text-[#94A3B8]">
                No hay ítems que coincidan con la búsqueda.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wide">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wide w-24">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wide w-28">
                  Lote
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wide w-36">
                  Caducidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wide w-32">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wide w-20">
                  Mínimo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wide w-44">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {itemsFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                  {/* Producto */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#0F172A]">{item.nombre}</p>
                    {item.descripcion && (
                      <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-xs">
                        {item.descripcion}
                      </p>
                    )}
                  </td>
                  {/* Tipo badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.tipo === "vacuna"
                          ? "bg-[#CCFBF1] text-[#0F766E]"
                          : "bg-[#F1F5F9] text-[#475569]"
                      }`}
                    >
                      {item.tipo === "vacuna" ? "Vacuna" : "Insumo"}
                    </span>
                  </td>
                  {/* Lote */}
                  <td className="px-4 py-3 text-sm text-[#64748B]">
                    {item.lote ?? <span className="text-[#94A3B8]">—</span>}
                  </td>
                  {/* Caducidad */}
                  <td className="px-4 py-3">{renderCaducidad(item.fecha_caducidad)}</td>
                  {/* Stock */}
                  <td className="px-4 py-3">{renderStock(item)}</td>
                  {/* Mínimo */}
                  <td className="px-4 py-3 text-sm text-[#64748B]">
                    {item.stock_minimo > 0
                      ? `${item.stock_minimo} ${item.unidad}`
                      : <span className="text-[#94A3B8]">—</span>}
                  </td>
                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setModalMov({ item, tipo: "entrada" })}
                        title="Registrar entrada"
                        aria-label={`Registrar entrada de ${item.nombre}`}
                        className="p-1.5 rounded text-[#0F766E] hover:bg-[#F0FDFB] transition-colors"
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalMov({ item, tipo: "salida" })}
                        title="Registrar salida"
                        aria-label={`Registrar salida de ${item.nombre}`}
                        className="p-1.5 rounded text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                      >
                        <Minus size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalItem({ open: true, item })}
                        title="Editar"
                        aria-label={`Editar ${item.nombre}`}
                        className="p-1.5 rounded text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalHistorial(item)}
                        title="Ver historial"
                        aria-label={`Ver historial de ${item.nombre}`}
                        className="p-1.5 rounded text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
                      >
                        <Clock size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(item)}
                        disabled={eliminando.has(item.id)}
                        title="Eliminar"
                        aria-label={`Eliminar ${item.nombre}`}
                        className="p-1.5 rounded text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modales ── */}
      {modalItem.open && (
        <ItemModal item={modalItem.item} onClose={onItemModalClose} />
      )}
      {modalMov && (
        <MovimientoModal
          item={modalMov.item}
          tipoInicial={modalMov.tipo}
          onClose={onMovModalClose}
        />
      )}
      {modalHistorial && (
        <MovimientosModal item={modalHistorial} onClose={() => setModalHistorial(null)} />
      )}
    </main>
  );
}
