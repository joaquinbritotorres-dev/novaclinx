import { Clock, CheckCircle, Shield, MapPin } from "lucide-react";
import RevealOnScroll from "./RevealOnScroll";

const BENEFICIOS = [
  {
    n: "01",
    titulo: "Recupere sus tardes.",
    texto:
      "Usted dedica gran parte de su jornada a documentar. Novaclinx le devuelve ese tiempo.",
    icon: Clock,
  },
  {
    n: "02",
    titulo: "Usted revisa. Usted aprueba.",
    texto:
      "La IA redacta el borrador; el criterio clínico siempre es suyo. Nada entra al expediente sin su firma.",
    icon: CheckCircle,
  },
  {
    n: "03",
    titulo: "Sus datos, protegidos.",
    texto:
      "Sistema diseñado conforme a la LOPDP. Sus datos jamás se usan para entrenar modelos de IA.",
    icon: Shield,
  },
  {
    n: "04",
    titulo: "Pensado para el Ecuador.",
    texto:
      "Español clínico, terminología local y recetas estructuradas conforme a la normativa vigente del MSP.",
    icon: MapPin,
  },
];

export default function Beneficios() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 py-16 md:py-28 lg:px-12 lg:py-40">
      <RevealOnScroll className="mx-auto max-w-4xl text-center">
        <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
          Por qué Novaclinx
        </p>
        <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
          El control siempre es suyo.
        </h2>
      </RevealOnScroll>

      <div className="mt-12 grid gap-5 lg:mt-20 lg:gap-8 lg:grid-cols-2">
        {BENEFICIOS.map((b, i) => {
          const Icon = b.icon;
          return (
            <RevealOnScroll
              key={b.n}
              delay={i * 80}
              className="flex flex-col rounded-2xl border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-6 shadow-[0_2px_12px_rgba(26,26,24,0.03)] md:p-8 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
            >
              <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--ln-teal)]/[0.08] lg:h-14 lg:w-14">
                  <Icon className="h-6 w-6 text-[var(--ln-teal)] lg:h-7 lg:w-7" strokeWidth={2} />
                </div>
                <span className="text-[13px] font-bold text-[var(--ln-muted)] tabular-nums lg:hidden">
                  {b.n}
                </span>
              </div>
              <h3 className="mt-5 text-[20px] font-bold tracking-tight text-[var(--ln-ink)] lg:mt-8 lg:text-[22px]">
                {b.titulo}
              </h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[var(--ln-secondary)] lg:mt-4 lg:text-[18px]">
                {b.texto}
              </p>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
