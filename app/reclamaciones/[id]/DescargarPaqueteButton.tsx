"use client";

import { useState } from "react";
import Link from "next/link";

export default function DescargarPaqueteButton({
  reclamacionId,
  tieneFirma,
}: {
  reclamacionId: string;
  tieneFirma: boolean;
}) {
  const [electronica, setElectronica] = useState(tieneFirma);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firmarParam = electronica && tieneFirma ? "?firmar=1" : "";

  async function handleDescargar() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reclamaciones/${reclamacionId}/paquete${firmarParam}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "No pudimos generar el paquete. Intenta de nuevo."
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `paquete-${reclamacionId.slice(0, 8)}.pdf`;
      a.href = url;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos generar el paquete. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {/* ── Selector de tipo de firma (horizontal, alineado a la izquierda) ── */}
      <div className="flex flex-wrap items-stretch justify-start gap-3">
        {/* Opción: A mano */}
        <button
          type="button"
          onClick={() => setElectronica(false)}
          className={[
            "w-64 flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-1",
            !electronica
              ? "border-[#0F766E] bg-[#F0FDFB]"
              : "border-[#E2E8F0] bg-white hover:border-[#0F766E]/40",
          ].join(" ")}
        >
          <span
            className={[
              "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
              !electronica ? "border-[#0F766E]" : "border-[#CBD5E1]",
            ].join(" ")}
          >
            {!electronica && (
              <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
            )}
          </span>
          <span>
            <span
              className={[
                "block text-sm font-semibold",
                !electronica ? "text-[#0F766E]" : "text-[#0F172A]",
              ].join(" ")}
            >
              Firma a mano
            </span>
            <span className="block text-xs text-[#64748B] mt-0.5">
              Espacio para firma manuscrita
            </span>
          </span>
        </button>

        {/* Opción: Electrónica */}
        {tieneFirma ? (
          <button
            type="button"
            onClick={() => setElectronica(true)}
            className={[
              "w-64 flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-1",
              electronica
                ? "border-[#0F766E] bg-[#F0FDFB]"
                : "border-[#E2E8F0] bg-white hover:border-[#0F766E]/40",
            ].join(" ")}
          >
            <span
              className={[
                "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                electronica ? "border-[#0F766E]" : "border-[#CBD5E1]",
              ].join(" ")}
            >
              {electronica && (
                <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              )}
            </span>
            <span>
              <span
                className={[
                  "block text-sm font-semibold",
                  electronica ? "text-[#0F766E]" : "text-[#0F172A]",
                ].join(" ")}
              >
                Firma electrónica
              </span>
              <span className="block text-xs text-[#64748B] mt-0.5">
                Certificado digital PAdES
              </span>
            </span>
          </button>
        ) : (
          <div className="w-64 flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC]">
            <span className="w-4 h-4 rounded-full border-2 border-[#CBD5E1] shrink-0" />
            <span>
              <span className="block text-sm font-semibold text-[#94A3B8]">
                Firma electrónica
              </span>
              <span className="block text-xs text-[#94A3B8] mt-0.5">
                <Link
                  href="/perfil"
                  className="text-[#0F766E] hover:underline"
                >
                  Configura tu firma
                </Link>{" "}
                en tu perfil
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Botón de descarga ── */}
      <button
        type="button"
        onClick={handleDescargar}
        disabled={loading}
        className="h-11 px-6 self-start bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
      >
        {loading ? "Generando paquete…" : "Descargar paquete PDF"}
      </button>

      {error && (
        <p
          role="alert"
          className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
    </div>
  );
}
