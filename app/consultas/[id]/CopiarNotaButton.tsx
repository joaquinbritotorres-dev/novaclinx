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
      className="w-full h-11 bg-white border border-[#E7E3DB] text-[#5C5A54] text-sm font-medium rounded-lg hover:bg-[#F7F7F4] hover:text-[#1A1A18] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2"
    >
      {copied ? "¡Copiado!" : "Copiar nota"}
    </button>
  );
}
