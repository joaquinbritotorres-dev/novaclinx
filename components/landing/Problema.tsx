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
    <section className="mx-auto w-full max-w-[1400px] px-6 py-32 lg:px-12 md:py-40">
      <RevealOnScroll className="mx-auto max-w-4xl text-center">
        <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
          Atender es lo de menos. Lo que le quita el día es todo lo demás.
        </h2>
        <p className="mx-auto mt-8 max-w-[65ch] text-[clamp(1.15rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
          Su tiempo es para la medicina. Nosotros estructuramos su documentación, facturamos al SRI y armamos sus cobros.
        </p>
      </RevealOnScroll>

      <div className="mt-20 grid gap-px overflow-hidden rounded-[2rem] border border-[var(--ln-hairline)] bg-[var(--ln-hairline)] md:grid-cols-3">
        {FRENTES.map((f, i) => (
          <RevealOnScroll
            key={f.titulo}
            delay={i * 80}
            className="bg-[var(--ln-surface)] p-10 md:p-12"
          >
            <p className="text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--ln-muted)]">
              {f.titulo}
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-[var(--ln-secondary)]">
              {f.texto}
            </p>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
