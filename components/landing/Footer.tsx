import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--ln-hairline)] bg-[var(--ln-bg)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-12 md:py-16 lg:px-12">
        {/* Top row */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="Novaclinx — Inicio"
            >
              <Image
                src="/novaclinx-logo.png"
                alt=""
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span className="text-lg font-semibold tracking-tight text-[var(--ln-ink)] font-[family-name:var(--font-brand)]">
                Novaclinx
              </span>
            </Link>
            <p className="mt-3 text-sm text-[var(--ln-muted)]">
              Software médico para el consultorio ecuatoriano.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--ln-muted)]">
                Legal
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/privacidad"
                    className="text-sm text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
                  >
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terminos"
                    className="text-sm text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
                  >
                    Términos
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ln-muted)]">
                Contacto
              </p>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="mailto:info@novaclinx.com"
                    className="text-[15px] text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
                  >
                    info@novaclinx.com
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:joaquin@novaclinx.com"
                    className="text-[15px] text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
                  >
                    joaquin@novaclinx.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--ln-hairline)] pt-8 lg:flex-row">
          <p className="text-[14px] text-[var(--ln-muted)]">
            © 2026 Novaclinx. Todos los derechos reservados.
          </p>
          <p className="text-[14px] font-medium text-[var(--ln-muted)]">
            Desarrollado con precisión por <span className="text-[var(--ln-ink)]">Joaquín Brito</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
