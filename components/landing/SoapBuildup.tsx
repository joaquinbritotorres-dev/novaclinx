"use client";

import { useEffect, useRef, useState } from "react";
import { SECCIONES, SOAP_PACIENTE } from "./SoapFrame";

/**
 * Animación protagonista: la nota SOAP se "construye" sección por sección
 * cuando entra al viewport. Reduced-motion → aparece completa al instante.
 */
export default function SoapBuildup() {
  const ref = useRef<HTMLDivElement>(null);
  const [reveladas, setReveladas] = useState(0); // cuántas secciones se ven

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReveladas(SECCIONES.length);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            // Revela una sección cada 500 ms (efecto "escribiéndose").
            SECCIONES.forEach((_, i) => {
              setTimeout(() => setReveladas(i + 1), i * 500 + 250);
            });
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const completa = reveladas >= SECCIONES.length;

  return (
    <div
      ref={ref}
      className="w-full rounded-[1.5rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] shadow-[0_4px_24px_rgba(26,26,24,0.04)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ln-hairline)] px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--ln-ink)]">
            {SOAP_PACIENTE.nombre}
          </p>
          <p className="mt-0.5 text-xs text-[var(--ln-muted)]">{SOAP_PACIENTE.detalle}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-500 ${
            completa
              ? "bg-[var(--ln-teal)]/[0.08] text-[var(--ln-teal-strong)]"
              : "bg-[var(--ln-surface-alt)] text-[var(--ln-muted)]"
          }`}
        >
          {completa ? "Borrador listo" : "Generando…"}
        </span>
      </div>

      <div className="divide-y divide-[var(--ln-hairline)]">
        {SECCIONES.map((s, i) => {
          const visible = i < reveladas;
          return (
            <div
              key={s.label}
              className={`px-5 py-3.5 transition-all duration-500 ease-out ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ln-muted)]">
                  {s.label}
                </p>
                {s.tag && (
                  <span className="rounded-md bg-[var(--ln-surface-alt)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--ln-secondary)]">
                    {s.tag}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-6 text-[var(--ln-secondary)]">
                {s.texto}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
