"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="relative">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8780]"
        strokeWidth={1.75}
      />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar paciente por nombre…"
        className="h-11 w-full rounded-lg border border-[#E7E3DB] bg-white pl-10 pr-3.5 text-sm text-[#1A1A18] placeholder-[#A8A49C] transition-colors focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
      />
    </form>
  );
}
