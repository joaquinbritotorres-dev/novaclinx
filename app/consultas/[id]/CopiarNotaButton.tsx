"use client";

import { useState } from "react";

interface Props {
  texto: string;
}

export default function CopiarNotaButton({ texto }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — no-op
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopiar}
      className="w-full h-11 bg-white border border-[#D1D5DB] text-[#374151] text-sm font-medium rounded-lg hover:bg-[#F9FAFB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
    >
      {copied ? "¡Copiado!" : "Copiar nota"}
    </button>
  );
}
