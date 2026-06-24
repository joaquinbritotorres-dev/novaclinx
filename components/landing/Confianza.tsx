import { ShieldCheck } from "lucide-react";
import RevealOnScroll from "./RevealOnScroll";

export default function Confianza() {
  return (
    <section className="border-t border-[var(--ln-hairline)] bg-[var(--ln-surface-alt)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-16 md:py-28 lg:px-12 lg:py-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <RevealOnScroll className="w-full">
            <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
              Por qué confiar
            </p>
            <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
              Construido para el médico ecuatoriano.
            </h2>
            <p className="mt-8 max-w-[52ch] text-[clamp(1.15rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
              Olvídese de instalaciones manuales y servidores locales. Novaclinx
              está en la nube, actualizado en tiempo real y diseñado exclusivamente
              para Ecuador.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={100} className="w-full">
            <div className="rounded-[2rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-8 shadow-[0_4px_24px_rgba(26,26,24,0.04)] lg:p-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ln-teal)]/[0.08]">
                <ShieldCheck className="h-7 w-7 text-[var(--ln-teal)]" strokeWidth={2} />
              </div>
              <h3 className="mt-8 text-[22px] font-bold text-[var(--ln-ink)]">
                Infraestructura moderna
              </h3>
              <ul className="mt-6 flex flex-col gap-4 text-[17px] text-[var(--ln-secondary)]">
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[var(--ln-teal)]" />
                  Servidores globales con alta disponibilidad.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[var(--ln-teal)]" />
                  Actualizaciones transparentes sin instalación.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[var(--ln-teal)]" />
                  Conexión directa y certificada con el SRI.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[var(--ln-teal)]" />
                  Backups automáticos cifrados.
                </li>
              </ul>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
