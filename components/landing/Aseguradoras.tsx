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
      <div className="mx-auto w-full max-w-[1400px] px-6 py-16 md:py-28 lg:px-12 lg:py-40">
        {/* Encabezado */}
        <RevealOnScroll className="mx-auto max-w-4xl text-center">
          <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
            Cobros a aseguradoras
          </p>
          <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Deje de perder dinero en glosas.
          </h2>
          <p className="mx-auto mt-8 max-w-[65ch] text-[clamp(1.15rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
            El validador anti-glosa revisa su reclamación antes de enviarla, para que cobre lo que le corresponde.
          </p>
        </RevealOnScroll>

        <div className="mx-auto mt-14 grid max-w-[1200px] items-center gap-12 lg:mt-24 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          {/* Izquierda: cifra de ejemplo + puntos */}
          <RevealOnScroll className="order-2 w-full lg:order-1">
            {/* Cifra de dinero — ejemplo ilustrativo, NO un claim */}
            <div className="rounded-[1.5rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-8">
              <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--ln-muted)]">
                Ejemplo ilustrativo
              </p>
              <p className="mt-4 text-[18px] leading-relaxed text-[var(--ln-secondary)]">
                Una reclamación de{" "}
                <span className="font-bold text-[var(--ln-amber)]">$45</span>{" "}
                rechazada por un soporte faltante es dinero perdido. Multiplícalo por cada mes.
              </p>
            </div>

            <ul className="mt-10 divide-y divide-[var(--ln-hairline)] overflow-hidden rounded-2xl border border-[var(--ln-hairline)] bg-[var(--ln-surface)]">
              {PUNTOS.map((p) => (
                <li
                  key={p}
                  className="px-6 py-5 text-[17px] font-semibold text-[var(--ln-ink)]"
                >
                  {p}
                </li>
              ))}
            </ul>
          </RevealOnScroll>

          {/* Derecha: validador anti-glosa */}
          <RevealOnScroll
            delay={100}
            className="order-1 flex w-full justify-center lg:order-2"
          >
            <div className="w-full">
              <ReclamacionFrame />
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
