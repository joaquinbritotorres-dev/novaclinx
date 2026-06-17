"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// Rutas sin sidebar: auth, onboarding y legales.
const SIN_SIDEBAR = ["/auth/", "/onboarding/", "/privacidad", "/terminos"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ocultar = SIN_SIDEBAR.some((p) => pathname.startsWith(p));

  if (ocultar) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
