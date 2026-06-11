"use client";

import { useEffect, useState } from "react";

interface Comunicacion {
  id: string;
  tipo: string;
  canal: string;
  contenido: string | null;
  created_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  recordatorio: "Recordatorio",
  confirmacion: "Confirmación",
  resena: "Reseña",
  otro: "Otro",
};

export default function ComunicacionesSection({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    fetch(`/api/comunicaciones?paciente_id=${pacienteId}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (activo) setComunicaciones(data.comunicaciones ?? []);
      })
      .catch(() => {
        if (activo) setError(true);
      });
    return () => {
      activo = false;
    };
  }, [pacienteId]);

  return (
    <>
      <h2 className="text-sm font-semibold text-[#374151] mb-3">
        Comunicaciones
      </h2>

      {error ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
          <p className="text-sm text-[#64748B]">
            No pudimos cargar las comunicaciones.
          </p>
        </div>
      ) : comunicaciones === null ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
          <p className="text-sm text-[#94A3B8]">Cargando…</p>
        </div>
      ) : comunicaciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
          <p className="text-sm text-[#64748B]">
            Sin comunicaciones registradas. Se registran automáticamente al usar
            los botones de WhatsApp.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comunicaciones.map((c) => (
            <li
              key={c.id}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-medium text-[#0F766E]">
                  {new Date(c.created_at).toLocaleString("es-EC", {
                    timeZone: "America/Guayaquil",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F0FDFB] text-[#0F766E]">
                  {TIPO_LABELS[c.tipo] ?? c.tipo}
                </span>
              </div>
              {c.contenido && (
                <p className="text-sm text-[#374151] whitespace-pre-wrap">
                  {c.contenido}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
