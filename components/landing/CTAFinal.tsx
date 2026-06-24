import Link from "next/link";
import RevealOnScroll from "./RevealOnScroll";

export default function CTAFinal() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 py-10 md:py-16 lg:px-12 lg:py-24">
      <RevealOnScroll className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-8 overflow-hidden rounded-[2rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] px-6 py-10 shadow-[0_8px_30px_rgba(26,26,24,0.04)] sm:px-8 sm:py-12 lg:flex-row lg:gap-10 lg:px-14 lg:py-16">

        {/* Fondo sutil (sazón) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-[var(--ln-teal)]/10 blur-[80px]"></div>
        </div>

        <div className="relative z-10 max-w-xl text-center lg:text-left">
          <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Recupere su tiempo. Empiece hoy.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[var(--ln-secondary)]">
            Únase al programa fundador. Pruebe Novaclinx y construyamos juntos el sistema que su consultorio necesita.
          </p>
        </div>

        <div className="relative z-10 flex shrink-0 flex-col items-center gap-3 lg:items-end">
          <Link
            href="/auth/login"
            className="inline-flex h-14 items-center justify-center rounded-xl bg-[var(--ln-teal)] px-8 text-[17px] font-semibold text-white shadow-sm transition hover:bg-[var(--ln-teal-strong)] hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ln-teal)]/40 focus-visible:ring-offset-2"
          >
            Crear mi cuenta
          </Link>
          <p className="text-[13px] font-medium text-[var(--ln-muted)]">
            Sin tarjeta de crédito. Sin instalación.
          </p>
        </div>
      </RevealOnScroll>
    </section>
  );
}
