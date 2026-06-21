import Image from "next/image";

export default function TrustBar() {
  return (
    <section className="border-y border-[var(--ln-hairline)] bg-[var(--ln-surface-alt)]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-4 md:flex-row lg:px-12">
        {/* Sazón: Powered by Anthropic */}
        <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--ln-secondary)]">
          <span>El motor de IA para medicina, potenciado por</span>
          <div className="flex items-center opacity-80 mix-blend-multiply contrast-125 grayscale transition hover:grayscale-0 hover:opacity-100">
             <Image 
               src="/anthropic-logo.png" 
               alt="Anthropic" 
               width={120} 
               height={22} 
               className="h-[22px] w-auto object-contain" 
             />
          </div>
        </div>

        {/* Legal y Cupos */}
        <p className="text-center text-[13px] leading-relaxed text-[var(--ln-secondary)] md:text-right">
          Diseñado conforme a la LOPDP
          <span className="mx-2 text-[var(--ln-muted)]" aria-hidden>
            ·
          </span>
          Programa fundador: 50 cupos
        </p>
      </div>
    </section>
  );
}
