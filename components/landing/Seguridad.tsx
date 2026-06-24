import { Lock, ShieldCheck, ClipboardCheck, Ban } from "lucide-react";
import RevealOnScroll from "./RevealOnScroll";

const PUNTOS = [
  {
    titulo: "Cifrado de extremo a extremo",
    detalle:
      "Toda la información clínica viaja cifrada (TLS 1.3) y se almacena cifrada en reposo (AES-256).",
    icon: Lock,
  },
  {
    titulo: "Conforme a la LOPDP",
    detalle:
      "Diseñado conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador. Sus datos no se comparten ni se venden.",
    icon: ShieldCheck,
  },
  {
    titulo: "Alineado con ACESS",
    detalle:
      "La historia clínica se conserva y estructura según los lineamientos de la Agencia de Aseguramiento de la Calidad de los Servicios de Salud.",
    icon: ClipboardCheck,
  },
  {
    titulo: "Nunca entrenamos con sus datos",
    detalle:
      "Los datos de sus pacientes jamás se usan para entrenar modelos de IA. Su información es estrictamente suya.",
    icon: Ban,
  },
];

export default function Seguridad() {
  return (
    <section
      id="seguridad"
      className="border-t border-[var(--ln-hairline)]"
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 py-16 md:py-28 lg:px-12 lg:py-40">
        <RevealOnScroll className="mx-auto max-w-4xl text-center">
          <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
            Seguridad y cumplimiento
          </p>
          <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Sus datos y los de sus pacientes, protegidos.
          </h2>
          <p className="mx-auto mt-8 max-w-[65ch] text-[clamp(1.15rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
            Su información viaja y se almacena cifrada. Cumplimos con la LOPDP y ACESS. Sus datos nunca entrenarán modelos de IA.
          </p>
        </RevealOnScroll>

        <div className="mt-12 grid gap-4 lg:mt-20 lg:gap-y-16 lg:gap-x-12 lg:grid-cols-2">
          {PUNTOS.map((p, i) => {
            const Icon = p.icon;
            return (
              <RevealOnScroll
                key={p.titulo}
                delay={i * 80}
                className="flex items-start gap-4 rounded-2xl border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-5 shadow-[0_2px_12px_rgba(26,26,24,0.03)] lg:items-stretch lg:gap-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-4 lg:shadow-none md:p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ln-teal)]/[0.08] lg:hidden">
                  <Icon className="h-5 w-5 text-[var(--ln-teal)]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[17px] font-bold text-[var(--ln-ink)] lg:text-[18px]">
                    {p.titulo}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--ln-secondary)] lg:mt-4 lg:text-[16px]">
                    {p.detalle}
                  </p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
