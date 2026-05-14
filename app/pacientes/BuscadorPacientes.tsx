"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialQ: string;
}

export default function BuscadorPacientes({ initialQ }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/pacientes?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/pacientes");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar paciente por nombre..."
        className="flex-1 h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E]"
      />
      <button
        type="submit"
        className="h-11 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
      >
        Buscar
      </button>
    </form>
  );
}
