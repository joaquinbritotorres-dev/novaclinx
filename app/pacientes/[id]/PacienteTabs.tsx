"use client";

import { useState } from "react";

type TabId = "historial" | "reclamaciones" | "comunicaciones";

const TABS: { id: TabId; label: string }[] = [
  { id: "historial", label: "Historial de consultas" },
  { id: "reclamaciones", label: "Reclamaciones" },
  { id: "comunicaciones", label: "Comunicaciones" },
];

export default function PacienteTabs({
  historial,
  reclamaciones,
  comunicaciones,
}: {
  historial: React.ReactNode;
  reclamaciones: React.ReactNode;
  comunicaciones: React.ReactNode;
}) {
  const [activa, setActiva] = useState<TabId>("historial");

  const contenido: Record<TabId, React.ReactNode> = {
    historial,
    reclamaciones,
    comunicaciones,
  };

  return (
    <div>
      {/* Tabs editoriales: underline teal en el activo, hairline debajo */}
      <div
        role="tablist"
        aria-label="Detalle del paciente"
        className="flex gap-6 border-b border-[#E7E3DB]"
      >
        {TABS.map((t) => {
          const sel = activa === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={sel}
              onClick={() => setActiva(t.id)}
              className={`-mb-px border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors ${
                sel
                  ? "border-[#0F766E] text-[#1A1A18]"
                  : "border-transparent text-[#8A8780] hover:text-[#1A1A18]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Solo se monta el panel activo → Comunicaciones recién hace fetch al abrirse */}
      <div role="tabpanel" className="pt-6">
        {contenido[activa]}
      </div>
    </div>
  );
}
