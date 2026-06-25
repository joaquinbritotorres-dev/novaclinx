import RevealOnScroll from "./RevealOnScroll";

const FRENTES = [
  {
    titulo: "Documentar",
    texto: "Horas frente a la pantalla en lugar de con el paciente.",
  },
  {
    titulo: "Facturar al SRI",
    texto: "El trámite de emitir la factura electrónica y el RIDE.",
  },
  {
    titulo: "Cobrar a la aseguradora",
    texto: "Armar carpetas y pelear glosas para cobrar lo trabajado.",
  },
];

export default function Problema() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 py-16 md:py-28 lg:px-12 lg:py-40">
      <RevealOnScroll className="mx-auto max-w-4xl text-center">
        <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
          Atender es lo de menos. Lo que le quita el día es todo lo demás.
        </h2>
        <p className="mx-auto mt-8 max-w-[65ch] text-[clamp(1.15rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
          Su tiempo es para la medicina. Nosotros estructuramos su documentación, facturamos al SRI y armamos sus cobros.
        </p>
      </RevealOnScroll>

      <div className="mt-12 grid gap-4 lg:mt-20 lg:grid-cols-3 lg:gap-px lg:overflow-hidden lg:rounded-[2rem] lg:border lg:border-[var(--ln-hairline)] lg:bg-[var(--ln-hairline)]">
        {FRENTES.map((f, i) => (
          <RevealOnScroll
            key={f.titulo}
            delay={i * 80}
            className="rounded-2xl border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-7 shadow-[0_2px_12px_rgba(26,26,24,0.03)] md:p-10 lg:rounded-none lg:border-0 lg:p-12 lg:shadow-none"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ln-teal)]/10 text-[13px] font-bold text-[var(--ln-teal-strong)] tabular-nums lg:hidden">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-4 text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--ln-muted)] lg:mt-0">
              {f.titulo}
            </p>
            <p className="mt-3 text-[17px] leading-relaxed text-[var(--ln-secondary)] lg:mt-4">
              {f.texto}
            </p>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
