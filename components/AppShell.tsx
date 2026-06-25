"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

// Rutas sin sidebar: auth, onboarding, legales y marketing público.
const SIN_SIDEBAR = [
  "/auth/",
  "/onboarding/",
  "/privacidad",
  "/terminos",
  "/seguridad",
  "/legal",
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cierra el cajón al cambiar de ruta.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // "/" (landing pública) es match exacto; el resto por prefijo.
  const ocultar =
    pathname === "/" || SIN_SIDEBAR.some((p) => pathname.startsWith(p));

  if (ocultar) return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior solo en móvil/tablet (<lg): abre el cajón */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#E7E3DB] bg-white px-4 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#5C5A54] transition-colors hover:bg-[#F2EFE9] hover:text-[#1A1A18]"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="text-base font-semibold tracking-tight text-[#1A1A18] font-[family-name:var(--font-brand)]">
            Novaclinx
          </span>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
