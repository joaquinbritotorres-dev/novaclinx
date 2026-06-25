import ReclamacionFrame from "./ReclamacionFrame";
import RevealOnScroll from "./RevealOnScroll";

const PUNTOS = [
  "Carpeta armada automáticamente",
  "Validador anti-glosa antes de enviar",
  "Seguimiento de estado y plazos por aseguradora",
];

export default function Aseguradoras() {
  return (
    <section
      id="aseguradoras"
      className="border-t border-[var(--ln-hairline)] bg-[var(--ln-surface-alt)]"
    >
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 px-6 py-16 md:grid-cols-2 md:gap-10 md:py-28 lg:gap-24 lg:px-12 lg:py-40">
        {/* Imagen — izquierda */}
        <RevealOnScroll className="flex w-full justify-center">
          <div className="relative w-full max-w-[500px]">
            <div
              aria-hidden
              className="absolute -inset-x-6 -top-8 -z-10 h-36 rounded-full bg-[var(--ln-teal)]/15 blur-[60px] lg:hidden"
            ></div>
            <ReclamacionFrame />
          </div>
        </RevealOnScroll>

        {/* Texto — derecha */}
        <RevealOnScroll delay={100}>
          <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
            Cobros a aseguradoras
          </p>
          <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Deje de{" "}
            <span className="bg-gradient-to-r from-[var(--ln-teal)] to-[var(--ln-teal-strong)] bg-clip-text text-transparent lg:bg-none lg:bg-clip-border lg:text-[var(--ln-ink)]">
              perder dinero
            </span>{" "}
            en glosas.
          </h2>
          <p className="mt-6 max-w-[44ch] text-[clamp(1.05rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
            El validador anti-glosa revisa su reclamación antes de enviarla, para que cobre lo que le corresponde.
          </p>
          {/* Cifra de dinero — ejemplo ilustrativo, NO un claim */}
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-[var(--ln-muted)]">
            Ejemplo ilustrativo: una reclamación de{" "}
            <span className="font-bold text-[var(--ln-amber)]">$45</span>{" "}
            rechazada por un soporte faltante es dinero perdido cada mes.
          </p>

          <ul className="mt-8 flex flex-col gap-3">
            {PUNTOS.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-[17px] font-semibold text-[var(--ln-ink)]"
              >
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ln-teal)]" />
                {p}
              </li>
            ))}
          </ul>
        </RevealOnScroll>
      </div>
    </section>
  );
}
