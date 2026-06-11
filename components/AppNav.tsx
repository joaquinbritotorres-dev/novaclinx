"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Agenda",        href: "/agenda"        },
  { label: "Pacientes",     href: "/pacientes"     },
  { label: "Seguimiento",   href: "/seguimiento"   },
  { label: "Reclamaciones", href: "/reclamaciones" },
  { label: "Inventario",    href: "/inventario"    },
];

const HIDDEN_PREFIXES = ["/auth/", "/onboarding/", "/privacidad", "/terminos", "/m/"];

export default function AppNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] print:hidden">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">

        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 mr-3 shrink-0 group"
          aria-label="Novaclinx — Inicio"
        >
          <span className="w-7 h-7 rounded-lg bg-[#0F766E] flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#0D6560] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 11 L5.5 4 L7 7.5 L8.5 5.5 L12 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="font-semibold text-[#0F172A] text-sm tracking-tight hidden sm:block group-hover:text-[#0F766E] transition-colors">
            Novaclinx
          </span>
        </Link>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] mr-1 shrink-0" />

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar" aria-label="Navegación principal">
          {NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`
                  whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${active
                    ? "bg-[#F0FDFB] text-[#0F766E]"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }
                `}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Profile */}
        <Link
          href="/perfil"
          className={`
            shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${pathname.startsWith("/perfil")
              ? "bg-[#F0FDFB] text-[#0F766E]"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
            }
          `}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span className="hidden sm:inline">Mi perfil</span>
        </Link>
      </div>
    </header>
  );
}
