import Link from "next/link";
import SoapFrame from "./SoapFrame";
import RevealOnScroll from "./RevealOnScroll";

export default function Hero() {
  return (
    <section className="relative mx-auto flex min-h-[100dvh] w-full flex-col items-center overflow-hidden pt-24 pb-16">
      {/* Fondo Limpio Cargo.one - Cero glows, solo un grid súper sutil o fondo puro */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        {/* Un gradiente blanco radial arriba para dar luz natural, sin colores */}
        <div className="absolute top-0 w-full h-[600px] bg-gradient-to-b from-white/60 to-transparent"></div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center gap-10 px-6 lg:px-12">
        <RevealOnScroll>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ln-hairline)] bg-white px-4 py-2 shadow-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--ln-teal)]"></span>
            <p className="text-[14px] font-bold uppercase tracking-widest text-[var(--ln-ink)]">
              Novaclinx para Médicos
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={100} className="max-w-[1000px]">
          <h1 className="text-[clamp(3.5rem,7vw,6.5rem)] font-extrabold leading-[1.05] tracking-tighter text-[var(--ln-ink)]">
            Atender es lo de menos. Lo que quita el día es todo lo demás.
          </h1>
        </RevealOnScroll>

        <RevealOnScroll delay={200} className="max-w-[600px]">
          <p className="text-[clamp(1.2rem,2vw,1.5rem)] leading-snug tracking-tight text-[var(--ln-secondary)]">
            Escribimos su nota SOAP con Inteligencia Artificial, facturamos al SRI automáticamente y conectamos con aseguradoras. 
            <strong className="font-semibold text-[var(--ln-ink)]"> Usted solo revisa y aprueba.</strong>
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={300} className="mt-4 flex flex-col sm:flex-row gap-4">
          <Link
            href="/auth/login"
            className="inline-flex h-16 items-center justify-center rounded-2xl bg-[var(--ln-ink)] px-10 text-[18px] font-semibold text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Empezar ahora — Gratis
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex h-16 items-center justify-center rounded-2xl border-2 border-[var(--ln-hairline)] bg-white px-10 text-[18px] font-semibold text-[var(--ln-ink)] shadow-sm transition-colors hover:bg-[var(--ln-surface-alt)]"
          >
            Ver cómo funciona
          </a>
        </RevealOnScroll>

        {/* Floating Mockup with physics */}
        <RevealOnScroll delay={500} className="w-full max-w-[1000px] mt-16 perspective-1000">
          <div className="rounded-2xl border border-[var(--ln-hairline)] bg-white shadow-2xl overflow-hidden transform-gpu">
            <SoapFrame />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
