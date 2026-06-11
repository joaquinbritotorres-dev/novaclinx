"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Seguro {
  id: string;
  aseguradoras: { nombre: string } | null;
  tipo_cobertura: string;
}

export default function CrearReclamacionButton({
  consultaId,
  seguros,
}: {
  consultaId: string;
  seguros: Seguro[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSeguroId, setSelectedSeguroId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCrear = async () => {
    if (!selectedSeguroId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reclamaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consulta_id: consultaId,
          paciente_seguro_id: selectedSeguroId,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(`/reclamaciones/${data.id}`);
    } catch {
      setError("No pudimos crear la reclamación. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full h-11 bg-white border border-[#0F766E] text-[#0F766E] hover:bg-[#F0FDFB] text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
        >
          Crear reclamación a aseguradora
        </button>
      ) : (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg space-y-3">
          <label className="block text-sm font-medium text-[#0F172A]">
            Selecciona el seguro
          </label>
          <select
            value={selectedSeguroId}
            onChange={(e) => setSelectedSeguroId(e.target.value)}
            className="w-full h-11 px-3 border border-[#CBD5E1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
          >
            <option value="">Selecciona un seguro...</option>
            {seguros.map((s) => (
              <option key={s.id} value={s.id}>
                {s.aseguradoras?.nombre} ({s.tipo_cobertura === "red_prestador" ? "Red" : "Reembolso"})
              </option>
            ))}
          </select>
          {error && (
            <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="flex-1 h-11 bg-white border border-[#CBD5E1] text-[#475569] text-sm font-medium rounded-lg hover:bg-[#F1F5F9]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCrear}
              disabled={!selectedSeguroId || loading}
              className="flex-1 h-11 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0F766E]/90 disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear Reclamación"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
