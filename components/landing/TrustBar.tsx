import Image from "next/image";

export default function TrustBar() {
  return (
    <section className="border-y border-[var(--ln-hairline)] bg-[var(--ln-surface-alt)]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-4 md:flex-row lg:px-12">
        {/* Sazón: Powered by Anthropic */}
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-[var(--ln-secondary)]">
            El motor de IA para medicina, potenciado por
          </span>
          <div className="flex items-center justify-center px-3.5 py-2 rounded-full bg-black/[0.03] border border-black/[0.06] transition duration-300 hover:bg-black/[0.06] hover:shadow-sm">
             <Image 
               src="/anthropic-logo.png" 
               alt="Anthropic" 
               width={400} 
               height={80} 
               className="w-[90px] md:w-[110px] h-auto object-contain opacity-80 mix-blend-multiply grayscale contrast-125" 
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
