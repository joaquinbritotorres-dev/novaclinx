"use client";

import { useState, useEffect } from "react";

interface Props {
  consultaId: string;
  texto: string;
}

export default function CompartirNotaButton({ consultaId, texto }: Props) {
  const [canShare, setCanShare] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleCompartir() {
    if (!canShare) return;
    setSharing(true);
    try {
      await navigator.share({ title: "Nota clínica", text: texto });
    } catch {
      // user cancelled or share failed — no error shown
    } finally {
      setSharing(false);
    }
  }

  if (!canShare) return null;

  return (
    <button
      onClick={handleCompartir}
      disabled={sharing}
      className="w-full h-11 bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#374151] text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2 disabled:opacity-50"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {sharing ? "Compartiendo..." : "Compartir nota"}
    </button>
  );
}
