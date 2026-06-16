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

export default function Sidebar() {
  const pathname = usePathname();
  const esActivo = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const itemClase = (activo: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      activo
        ? "bg-[#0F766E]/[0.08] text-[#0F766E]"
        : "text-[#5C5A54] hover:bg-[#F2EFE9] hover:text-[#1A1A18]"
    }`;

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-[#E7E3DB] bg-white px-3 py-5 print:hidden">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="group mb-6 flex items-center gap-2.5 px-2"
        aria-label="Novaclinx — Inicio"
      >
        <Image
          src="/novaclinx-logo.png"
          alt="Novaclinx"
          width={30}
          height={30}
          className="shrink-0 rounded-lg"
        />
        <span className="text-lg font-semibold tracking-tight text-[#1A1A18] font-[family-name:var(--font-brand)]">
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
              aria-current={activo ? "page" : undefined}
              className={itemClase(activo)}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  activo ? "text-[#0F766E]" : "text-[#8A8780]"
                }`}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Pie: perfil + cerrar sesión */}
      <div className="mt-auto border-t border-[#E7E3DB] pt-3">
        <Link
          href="/perfil"
          aria-current={esActivo("/perfil") ? "page" : undefined}
          className={itemClase(esActivo("/perfil"))}
        >
          <UserRound
            className={`h-[18px] w-[18px] shrink-0 ${
              esActivo("/perfil") ? "text-[#0F766E]" : "text-[#8A8780]"
            }`}
            strokeWidth={1.75}
          />
          Mi perfil
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#5C5A54] transition-colors hover:bg-[#F2EFE9] hover:text-[#1A1A18]"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-[#8A8780]" strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
