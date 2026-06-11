"use client";

export default function ImprimirButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
