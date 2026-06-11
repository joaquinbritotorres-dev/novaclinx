"use client";

import { useState, useEffect, useRef } from "react";
import type { InventarioItem } from "./InventarioView";

interface Paciente {
  id: string;
  nombre: string;
}

interface Props {
  item: InventarioItem;
  tipoInicial: "entrada" | "salida";
  onClose: (refresh?: boolean) => void;
}

export default function MovimientoModal({ item, tipoInicial, onClose }: Props) {
  const [tipoMov, setTipoMov] = useState<"entrada" | "salida">(tipoInicial);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [pacienteBusqueda, setPacienteBusqueda] = useState("");
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [sugerencias, setSugerencias] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarBuscadorPaciente = item.tipo === "vacuna" && tipoMov === "salida";

  // Reset patient when the condition disappears
  useEffect(() => {
    if (!mostrarBuscadorPaciente) {
      setPacienteBusqueda("");
      setPacienteSeleccionado(null);
      setSugerencias([]);
    }
  }, [mostrarBuscadorPaciente]);

  // Debounced patient search
  useEffect(() => {
    if (!mostrarBuscadorPaciente || pacienteSeleccionado) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!pacienteBusqueda.trim()) { setSugerencias([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pacientes/buscar?q=${encodeURIComponent(pacienteBusqueda)}`);
        if (res.ok) {
          const data = await res.json();
          setSugerencias(data.pacientes ?? []);
        }
      } catch { /* silent */ }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [pacienteBusqueda, pacienteSeleccionado, mostrarBuscadorPaciente]);

  function clearPaciente() {
    setPacienteSeleccionado(null);
    setPacienteBusqueda("");
    setSugerencias([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (cantidad <= 0) { setError("La cantidad debe ser mayor a 0."); return; }
    if (tipoMov === "salida" && cantidad > item.cantidad) {
      setError(`Stock insuficiente: solo quedan ${item.cantidad} ${item.unidad}.`);
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        tipo_movimiento: tipoMov,
        cantidad: Math.floor(cantidad),
        motivo: motivo.trim() || null,
        paciente_id: pacienteSeleccionado?.id ?? null,
      };

      const res = await fetch(`/api/inventario/${item.id}/movimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo registrar.");
      }
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  }

  const motivoPlaceholder = tipoMov === "entrada" ? "Compra / llegada de stock" : "Aplicada, caducada, descartada…";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Registrar movimiento</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {item.nombre} — stock actual:{" "}
              <span className="font-semibold text-[#0F172A]">{item.cantidad} {item.unidad}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Tipo movimiento */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
              Tipo
            </label>
            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
              {(["entrada", "salida"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoMov(t)}
                  className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tipoMov === t
                      ? "bg-white shadow-sm text-[#0F172A]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {t === "entrada" ? "Entrada" : "Salida"}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Cantidad ({item.unidad})
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              required
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Motivo <span className="text-[#94A3B8] normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={motivoPlaceholder}
              maxLength={200}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
            />
          </div>

          {/* Buscador de paciente (solo vacuna + salida) */}
          {mostrarBuscadorPaciente && (
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Paciente <span className="text-[#94A3B8] normal-case font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pacienteBusqueda}
                  onChange={(e) => {
                    setPacienteBusqueda(e.target.value);
                    if (pacienteSeleccionado) clearPaciente();
                  }}
                  placeholder="Buscar paciente registrado…"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
                />
                {pacienteSeleccionado && (
                  <button
                    type="button"
                    onClick={clearPaciente}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] text-xs"
                  >
                    ✕
                  </button>
                )}
                {sugerencias.length > 0 && !pacienteSeleccionado && (
                  <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[#E2E8F0] shadow-lg overflow-hidden">
                    {sugerencias.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPacienteSeleccionado(p);
                            setPacienteBusqueda(p.nombre);
                            setSugerencias([]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-[#0F172A] hover:bg-[#F0FDFB] transition-colors"
                        >
                          {p.nombre}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

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
              className={`h-10 px-4 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                tipoMov === "entrada"
                  ? "bg-[#0F766E] hover:bg-[#0F766E]/90"
                  : "bg-[#DC2626] hover:bg-[#DC2626]/90"
              }`}
            >
              {loading ? "Registrando…" : tipoMov === "entrada" ? "Registrar entrada" : "Registrar salida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
