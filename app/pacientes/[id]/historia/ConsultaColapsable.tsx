"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Acordeón de un nivel para cada consulta de la historia. Colapsado en pantalla
 * (chevron + cabecera escaneable), pero con overrides `print:` que lo fuerzan
 * abierto al imprimir → el documento legal sale COMPLETO aunque esté colapsado.
 */
export default function ConsultaColapsable({
  fecha,
  cie10Codigo,
  cie10Descripcion,
  resumen,
  children,
}: {
  fecha: string;
  cie10Codigo: string | null;
  cie10Descripcion: string | null;
  resumen: string | null;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <article className="break-inside-avoid border-t border-[#E7E3DB] first:border-t-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1A1A18]">{fecha}</p>
          {cie10Codigo && (
            <p className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-xs font-semibold text-[#0F766E]">
                {cie10Codigo}
              </span>
              {cie10Descripcion && (
                <span className="text-sm text-[#5C5A54]">{cie10Descripcion}</span>
              )}
            </p>
          )}
          {!abierto && resumen && (
            <p className="mt-1 max-w-[60ch] truncate text-sm text-[#8A8780] print:hidden">
              {resumen}
            </p>
          )}
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-[#A8A49C] transition-transform duration-200 print:hidden ${
            abierto ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
        />
      </button>

      {/* Colapsado en pantalla; forzado abierto al imprimir */}
      <div
        className={`grid transition-all duration-200 print:grid-rows-[1fr] print:opacity-100 ${
          abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden pb-6 print:overflow-visible">{children}</div>
      </div>
    </article>
  );
}
