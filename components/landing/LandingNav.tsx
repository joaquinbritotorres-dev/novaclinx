"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#facturacion", label: "Facturación" },
  { href: "#aseguradoras", label: "Aseguradoras" },
  { href: "#seguridad", label: "Seguridad" },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-[var(--ln-bg)]/95 backdrop-blur-md transition-colors ${
        scrolled ? "border-b border-[var(--ln-hairline)]" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex w-full max-w-[1400px] h-16 items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:h-20 lg:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2"
          aria-label="Novaclinx — Inicio"
        >
          <Image
            src="/novaclinx-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-7 w-7 shrink-0 rounded-lg lg:h-8 lg:w-8"
          />
          <span className="hidden truncate text-lg font-bold tracking-tight text-[var(--ln-ink)] font-[family-name:var(--font-brand)] sm:inline lg:text-xl">
            Novaclinx
          </span>
        </Link>

        {/* Nav links — desktop (flujo normal, sin absolute) */}
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="whitespace-nowrap text-base font-semibold text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Account actions — desktop */}
        <div className="ml-auto hidden shrink-0 items-center gap-5 lg:flex">
          <Link
            href="/auth/login"
            className="flex h-11 items-center whitespace-nowrap text-base font-semibold text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-[var(--ln-teal)] px-5 text-base font-semibold text-white transition hover:bg-[var(--ln-teal-strong)]"
          >
            Crear mi cuenta
          </Link>
        </div>

        {/* Account actions — mobile: sin menú, todo accesible de un toque */}
        <div className="ml-auto flex shrink-0 items-center gap-3 lg:hidden">
          <Link
            href="/auth/login"
            className="whitespace-nowrap text-sm font-semibold text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex h-9 items-center whitespace-nowrap rounded-xl bg-[var(--ln-teal)] px-3.5 text-sm font-semibold text-white transition hover:bg-[var(--ln-teal-strong)]"
          >
            Crear cuenta
          </Link>
        </div>
      </nav>
    </header>
  );
}
