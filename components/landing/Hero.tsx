import Link from "next/link";
import SoapFrame from "./SoapFrame";
import RevealOnScroll from "./RevealOnScroll";

export default function Hero() {
  return (
    <section className="relative mx-auto flex w-full items-start justify-center overflow-hidden pt-8 md:pt-10 md:[@media(min-height:700px)]:min-h-[calc(100dvh-4rem)] md:[@media(min-height:700px)]:items-center">
      {/* Sazón visual: Grid sutil y glows para dar profundidad premium sin romper minimalismo */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        {/* Grid pattern suave */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        {/* Glows abstractos tipo Abridge/Linear */}
        <div className="absolute top-0 w-[800px] h-[500px] bg-[var(--ln-teal)]/10 blur-[120px] rounded-full mix-blend-multiply opacity-70"></div>
        <div className="absolute top-20 right-[-10%] w-[500px] h-[400px] bg-[var(--ln-amber)]/5 blur-[100px] rounded-full mix-blend-multiply opacity-50"></div>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] items-start gap-8 px-6 py-8 md:grid-cols-[1fr_1fr] md:gap-10 md:py-12 lg:gap-20 lg:px-12 md:[@media(min-height:700px)]:items-center lg:[@media(min-height:700px)]:py-20">
        <RevealOnScroll>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ln-teal)]/20 bg-[var(--ln-teal)]/5 px-3.5 py-1.5 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[var(--ln-teal)]"></span>
            <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
              Para el médico ecuatoriano
            </p>
          </div>
          <h1 className="mt-6 max-w-[19ch] text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--ln-ink)] md:max-w-none">
            Su consultorio,{" "}
            <span className="bg-gradient-to-r from-[var(--ln-teal)] to-[var(--ln-teal-strong)] bg-clip-text text-transparent lg:bg-none lg:bg-clip-border lg:text-[var(--ln-ink)]">
              sin el papeleo
            </span>{" "}
            que le quita el día.
          </h1>
          <p className="mt-6 max-w-[38rem] text-[clamp(1.05rem,1.8vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)] md:mt-8">
            Nota SOAP, facturación al SRI y cobros a aseguradoras, en un solo lugar. Usted siempre revisa y aprueba.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center md:mt-12 md:flex-col md:items-stretch lg:flex-row lg:items-center">
            <Link
              href="/auth/login"
              className="inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--ln-teal)] to-[var(--ln-teal-strong)] px-8 text-[17px] font-semibold text-white shadow-[0_10px_28px_-8px_rgba(15,118,110,0.5)] transition hover:shadow-[0_14px_32px_-8px_rgba(15,118,110,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ln-teal)]/40 focus-visible:ring-offset-2 lg:bg-none lg:bg-[var(--ln-teal)] lg:shadow-none lg:hover:bg-[var(--ln-teal-strong)] lg:hover:shadow-none"
            >
              Crear mi cuenta
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-[var(--ln-hairline)] bg-transparent px-8 text-[17px] font-semibold text-[var(--ln-ink)] transition-colors hover:bg-[var(--ln-surface-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ln-teal)]/40 focus-visible:ring-offset-2"
            >
              Ver cómo funciona
            </a>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={120} className="flex w-full justify-center md:justify-end">
          <div className="w-full max-w-[650px] md:ml-auto lg:translate-x-12">
            <SoapFrame />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
