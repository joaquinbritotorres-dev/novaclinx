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

      <div className="mt-12 grid gap-8 lg:mt-20 lg:grid-cols-2">
        {BENEFICIOS.map((b, i) => {
          const Icon = b.icon;
          return (
            <RevealOnScroll
              key={b.n}
              delay={i * 80}
              className="flex flex-col p-6 md:p-8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ln-teal)]/[0.08]">
                <Icon className="h-7 w-7 text-[var(--ln-teal)]" strokeWidth={2} />
              </div>
              <h3 className="mt-8 text-[22px] font-bold tracking-tight text-[var(--ln-ink)]">
                {b.titulo}
              </h3>
              <p className="mt-4 text-[18px] leading-relaxed text-[var(--ln-secondary)]">
                {b.texto}
              </p>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
