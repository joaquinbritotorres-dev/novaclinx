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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLinkClick() {
    setMenuOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-50 bg-[var(--ln-bg)]/95 backdrop-blur-md transition-colors ${
        scrolled ? "border-b border-[var(--ln-hairline)]" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex w-full max-w-[1400px] h-20 items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Novaclinx — Inicio">
            <Image
              src="/novaclinx-logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-[20px] font-bold tracking-tight text-[var(--ln-ink)] font-[family-name:var(--font-brand)]">
              Novaclinx
            </span>
          </Link>
        </div>

        {/* Nav links — desktop */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-10">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[16px] font-semibold text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Account actions — desktop */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-6">
          <Link
            href="/auth/login"
            className="flex h-11 items-center text-[16px] font-semibold text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--ln-teal)] px-5 text-[16px] font-semibold text-white transition hover:bg-[var(--ln-teal-strong)]"
          >
            Crear mi cuenta
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex flex-1 justify-end items-center gap-3 md:hidden">
          <Link
            href="/auth/login"
            className="inline-flex h-10 items-center rounded-xl bg-[var(--ln-teal)] px-4 text-[14px] font-semibold text-white transition hover:bg-[var(--ln-teal-strong)]"
          >
            Crear mi cuenta
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--ln-secondary)] transition-colors hover:text-[var(--ln-ink)]"
          >
            {menuOpen ? (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                 <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
               </svg>
            ) : (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                 <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
               </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="border-t border-[var(--ln-hairline)] bg-[var(--ln-bg)] px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={handleLinkClick}
                className="rounded-xl px-4 py-3 text-[16px] font-semibold text-[var(--ln-secondary)] transition-colors hover:bg-[var(--ln-surface-alt)] hover:text-[var(--ln-ink)]"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/auth/login"
              onClick={handleLinkClick}
              className="mt-2 rounded-xl px-4 py-3 text-[16px] font-semibold text-[var(--ln-secondary)] transition-colors hover:bg-[var(--ln-surface-alt)] hover:text-[var(--ln-ink)]"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
