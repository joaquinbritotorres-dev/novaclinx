import SoapBuildup from "./SoapBuildup";
import RevealOnScroll from "./RevealOnScroll";
import { Mic, PenLine } from "lucide-react";

/* ── Visuales sobrios para los pasos 1 y 3 (placeholders HTML/CSS) ── */

function VisualEscucha() {
  return (
    <div className="flex w-full flex-col gap-3 rounded-[1.5rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface-alt)] p-4 shadow-sm">
      <div className="flex items-start gap-4 rounded-[1.25rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-5 shadow-[0_2px_12px_rgba(26,26,24,0.03)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ln-teal)]/10">
          <Mic className="h-5 w-5 text-[var(--ln-teal)]" strokeWidth={2} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-[var(--ln-ink)]">Modo Ambiente</p>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ln-teal)]/40 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ln-teal)]" />
            </span>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--ln-secondary)]">Captura la consulta sin interrumpir.</p>
        </div>
      </div>

      <div className="flex items-start gap-4 rounded-[1.25rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-5 shadow-[0_2px_12px_rgba(26,26,24,0.03)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ln-amber)]/10">
          <PenLine className="h-5 w-5 text-[var(--ln-amber)]" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--ln-ink)]">Dictado Directo</p>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--ln-secondary)]">Dicte un resumen al terminar de atender.</p>
        </div>
      </div>
    </div>
  );
}

function VisualAprobar() {
  return (
    <div className="w-full rounded-[1.5rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-8 shadow-[0_4px_24px_rgba(26,26,24,0.04)]">
      <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--ln-muted)]">
        P — Plan
      </p>
      <p className="mt-2 text-[16px] leading-relaxed text-[var(--ln-secondary)]">
        Amoxicilina 50 mg/kg/día c/12h × 7 días. Paracetamol 15 mg/kg si fiebre.
        Hidratación. Control en 48–72 h.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="inline-flex h-11 items-center rounded-xl border border-[var(--ln-hairline)] px-5 text-[15px] font-semibold text-[var(--ln-ink)]">
          Editar
        </span>
        <span className="inline-flex h-11 items-center rounded-xl bg-[var(--ln-teal)] px-5 text-[15px] font-semibold text-white">
          Aprobar y guardar
        </span>
      </div>
    </div>
  );
}

const PASOS = [
  {
    n: "01",
    titulo: "Atienda o dicte.",
    texto: "Deje que la IA escuche la consulta en segundo plano, o dicte un resumen al terminar. Usted elige.",
    visual: <VisualEscucha />,
  },
  {
    n: "02",
    titulo: "Reciba su nota SOAP.",
    texto: "Una nota estructurada con CIE-10, lista en segundos.",
    visual: <SoapBuildup />,
  },
  {
    n: "03",
    titulo: "Revise y firme.",
    texto: "Usted tiene el control. Edite y apruebe para el expediente.",
    visual: <VisualAprobar />,
  },
];

export default function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="border-t border-[var(--ln-hairline)] bg-[var(--ln-surface-alt)]"
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 py-16 md:py-28 lg:px-12 lg:py-40">
        <RevealOnScroll className="mx-auto max-w-4xl text-center">
          <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
            Cómo funciona
          </p>
          <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Tres pasos. Usted siempre al mando.
          </h2>
        </RevealOnScroll>

        <div className="mx-auto mt-14 flex max-w-[1200px] flex-col gap-16 lg:mt-24 lg:gap-32">
          {PASOS.map((p, i) => (
            <div
              key={p.n}
              className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-20"
            >
              {/* Texto */}
              <RevealOnScroll className={i % 2 === 1 ? "lg:order-2" : ""}>
                <span className="text-[17px] font-bold text-[var(--ln-teal-strong)] tabular-nums">
                  {p.n}
                </span>
                <h3 className="mt-4 text-[clamp(2rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.01em] text-[var(--ln-ink)]">
                  {p.titulo}
                </h3>
                <p className="mt-5 max-w-[42ch] text-[20px] leading-relaxed text-[var(--ln-secondary)]">
                  {p.texto}
                </p>
              </RevealOnScroll>

              {/* Visual */}
              <RevealOnScroll
                delay={100}
                className={`flex w-full ${i % 2 === 1 ? "lg:order-1" : ""}`}
              >
                <div className="w-full">
                  {p.visual}
                </div>
              </RevealOnScroll>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
