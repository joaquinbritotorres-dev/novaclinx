import FacturaFrame from "./FacturaFrame";
import RevealOnScroll from "./RevealOnScroll";
import Image from "next/image";

export default function FacturacionSRI() {
  return (
    <section id="facturacion" className="border-t border-[var(--ln-hairline)]">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 px-6 py-32 lg:px-12 md:py-40 lg:grid-cols-2 lg:gap-24">
        {/* Texto */}
        <RevealOnScroll>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
              Facturación electrónica
            </p>
            <div className="flex h-10 items-center justify-center rounded-xl border border-[var(--ln-hairline)] bg-white px-4 shadow-[0_2px_8px_rgba(26,26,24,0.04)]">
              <Image
                src="/sri-logo.svg"
                alt="SRI Ecuador"
                width={80}
                height={30}
                className="h-6 w-auto object-contain"
              />
            </div>
          </div>
          <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Facture al SRI sin salir de la consulta.
          </h2>
          <p className="mt-8 max-w-[52ch] text-[clamp(1.15rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
            Comprobantes autorizados al instante. Sin trámites paralelos.
          </p>
        </RevealOnScroll>

        {/* Visual */}
        <RevealOnScroll delay={100} className="flex w-full justify-center">
          <div className="w-full">
            <FacturaFrame />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
