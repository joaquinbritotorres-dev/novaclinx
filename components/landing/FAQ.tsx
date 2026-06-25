"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import RevealOnScroll from "./RevealOnScroll";

const PREGUNTAS = [
  {
    q: "¿La IA diagnostica por mí?",
    a: "No. Novaclinx genera un borrador de nota clínica a partir de lo que escucha. Usted revisa, edita y aprueba. El diagnóstico y la firma son siempre suyos.",
  },
  {
    q: "¿Mis datos y los de mis pacientes están seguros?",
    a: "Sí. Toda la información viaja cifrada (TLS 1.3) y se almacena cifrada en reposo. Cumplimos con la LOPDP y sus datos jamás se usan para entrenar modelos de IA.",
  },
  {
    q: "¿Funciona con el SRI para facturación electrónica?",
    a: "Sí. Emite facturas electrónicas válidas ante el SRI, con cálculo automático de IVA y generación del RIDE, como exige la normativa vigente.",
  },
  {
    q: "¿Con qué aseguradoras trabaja?",
    a: "Soportamos los formatos de Saludsa, BMI, Humana, Ecuasanitas y Confiamed. El validador anti-glosa revisa su carpeta antes de que usted la envíe.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Solo necesita conexión a internet. No hay instalación ni actualizaciones manuales.",
  },
];

export default function FAQ() {
  const [abierto, setAbierto] = useState<number | null>(null);

  const toggle = (i: number) =>
    setAbierto((prev) => (prev === i ? null : i));

  return (
    <section className="border-t border-[var(--ln-hairline)]">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 py-16 md:py-28 lg:gap-24 lg:px-12 lg:py-40 lg:grid-cols-[1fr_1.5fr] items-start">
        <RevealOnScroll className="lg:sticky lg:top-32">
          <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
            Preguntas frecuentes
          </p>
          <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Todo lo que necesita saber.
          </h2>
          <p className="mt-6 text-[18px] leading-relaxed text-[var(--ln-secondary)]">
            Respuestas a las dudas más comunes de los médicos sobre seguridad, facturación y la IA de Novaclinx.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={80}>
          <div className="divide-y divide-[var(--ln-hairline)] border-t border-[var(--ln-hairline)]">
            {PREGUNTAS.map((item, i) => {
              const open = abierto === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="flex w-full items-center justify-between gap-6 py-8 text-left transition-colors hover:text-[var(--ln-teal)]"
                  >
                    <span className="text-[20px] font-bold text-[var(--ln-ink)]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-6 w-6 shrink-0 text-[var(--ln-muted)] transition-transform duration-200 ${
                        open ? "rotate-180 text-[var(--ln-teal)]" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-[70ch] pb-8 text-[18px] leading-relaxed text-[var(--ln-secondary)]">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
