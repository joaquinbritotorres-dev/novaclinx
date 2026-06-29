"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Users,
  Activity,
  FileText,
  Boxes,
  UserRound,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

const NAV = [
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "Seguimiento", href: "/seguimiento", icon: Activity },
  { label: "Reclamaciones", href: "/reclamaciones", icon: FileText },
  { label: "Inventario", href: "/inventario", icon: Boxes },
] as const;

/** rail=true (desktop): se usa dentro del riel angosto que se expande con
 *  hover/foco (ver Sidebar abajo) — las etiquetas quedan colapsadas (ancho 0)
 *  hasta que el ancestro .group/sidebar recibe hover o foco. rail=false
 *  (cajón móvil): etiquetas siempre visibles, igual que antes. */
function SidebarContent({
  onNavigate,
  rail = false,
}: {
  onNavigate?: () => void;
  rail?: boolean;
}) {
  const pathname = usePathname();
  const esActivo = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const itemClase = (activo: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      activo
        ? "bg-[#0F766E]/[0.08] text-[#0F766E]"
        : "text-[#5C5A54] hover:bg-[#F2EFE9] hover:text-[#1A1A18]"
    }`;

  const etiquetaClase = rail
    ? "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[160px] group-hover/sidebar:opacity-100 group-focus-within/sidebar:max-w-[160px] group-focus-within/sidebar:opacity-100"
    : "";

  return (
    <>
      {/* Logo */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-2.5 px-2"
        aria-label="Novaclinx — Inicio"
      >
        <Image
          src="/novaclinx-logo.png"
          alt="Novaclinx"
          width={30}
          height={30}
          className="shrink-0 rounded-lg"
        />
        <span
          className={`text-lg font-semibold tracking-tight text-[#1A1A18] font-[family-name:var(--font-brand)] ${etiquetaClase}`}
        >
          Novaclinx
        </span>
      </Link>

      {/* Navegación */}
      <nav className="flex flex-col gap-0.5" aria-label="Navegación principal">
        {NAV.map(({ label, href, icon: Icon }) => {
          const activo = esActivo(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={activo ? "page" : undefined}
              title={rail ? label : undefined}
              className={itemClase(activo)}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  activo ? "text-[#0F766E]" : "text-[#8A8780]"
                }`}
                strokeWidth={1.75}
              />
              <span className={etiquetaClase}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Pie: perfil + cerrar sesión */}
      <div className="mt-auto border-t border-[#E7E3DB] pt-3">
        <Link
          href="/perfil"
          onClick={onNavigate}
          aria-current={esActivo("/perfil") ? "page" : undefined}
          title={rail ? "Mi perfil" : undefined}
          className={itemClase(esActivo("/perfil"))}
        >
          <UserRound
            className={`h-[18px] w-[18px] shrink-0 ${
              esActivo("/perfil") ? "text-[#0F766E]" : "text-[#8A8780]"
            }`}
            strokeWidth={1.75}
          />
          <span className={etiquetaClase}>Mi perfil</span>
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            title={rail ? "Cerrar sesión" : undefined}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#5C5A54] transition-colors hover:bg-[#F2EFE9] hover:text-[#1A1A18]"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-[#8A8780]" strokeWidth={1.75} />
            <span className={etiquetaClase}>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </>
  );
}

export default function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Desktop (pantallas grandes, lg+): sidebar FIJO y abierto, con etiquetas
          siempre visibles. Empuja el contenido (no es overlay). En pantallas
          pequeñas se usa el cajón móvil de abajo. */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[244px] shrink-0 flex-col overflow-y-auto border-r border-[#E7E3DB] bg-white px-4 py-5 lg:flex print:hidden">
        <SidebarContent />
      </aside>

      {/* Móvil: cajón off-canvas con backdrop. */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          mobileOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-[#1A1A18]/40 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-[100dvh] w-[248px] max-w-[82%] flex-col overflow-y-auto border-r border-[#E7E3DB] bg-white px-3 py-5 shadow-xl transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
