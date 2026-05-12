"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ESPECIALIDADES = [
  { value: "pediatria", label: "Pediatría" },
  { value: "ginecologia", label: "Ginecología y Obstetricia" },
  { value: "general", label: "Medicina General" },
  { value: "cirugia", label: "Cirugía" },
  { value: "otro", label: "Otra especialidad" },
] as const;

type Especialidad = (typeof ESPECIALIDADES)[number]["value"];

export default function EspecialidadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(especialidad: Especialidad) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/medicos/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ especialidad }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error();
      }

      router.push("/dashboard");
    } catch {
      setError("No pudimos completar la acción. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F7F4] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Novaclinx</h1>
          <p className="mt-3 text-base font-semibold text-[#0F172A]">
            ¿Cuál es tu especialidad?
          </p>
          <p className="mt-1 text-sm text-[#475569]">
            Personalizamos tus notas según tu área clínica.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2 text-center"
          >
            {error}
          </div>
        )}

        <div className="space-y-2" role="list" aria-label="Especialidades médicas">
          {ESPECIALIDADES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              disabled={loading}
              role="listitem"
              className="w-full h-14 px-4 flex items-center justify-between bg-white border border-[#E5E7EB] hover:border-[#0F766E] hover:bg-[#F0FDFB] text-[#0F172A] text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-1"
            >
              <span>{label}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="text-[#94A3B8] shrink-0"
              >
                <path
                  d="M6 12l4-4-4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
