"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import CertificadoModal from "./CertificadoModal";

interface Props {
  consultaId: string;
  tieneFirma: boolean;
  tieneIndicaciones: boolean;
  tieneDiagnostico: boolean;
  /** Conservado en la interfaz (lo pasa la página); copiar/compartir se retiró de esta vista. */
  textoCopia?: string;
}

export default function DescargasSection({
  consultaId,
  tieneFirma,
  tieneIndicaciones,
  tieneDiagnostico,
}: Props) {
  const [electronica, setElectronica] = useState(tieneFirma);
  const [descargando, setDescargando] = useState<"nota" | "receta" | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const firmarParam = electronica && tieneFirma ? "?firmar=1" : "";
  const firmadaSuffix = electronica && tieneFirma ? "-firmada" : "";

  // Descarga vía fetch para poder mostrar el error (p. ej. receta 422 con
  // dosis sin resolver, o fallo de firma) en vez de descargar un JSON roto.
  async function descargar(tipo: "nota" | "receta") {
    setDescargando(tipo);
    setErrorDescarga(null);
    try {
      const res = await fetch(
        `/api/consultas/${consultaId}/pdf-${tipo}${firmarParam}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "No pudimos generar el documento."
        );
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `novaclinx-${tipo}${firmadaSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch (err) {
      setErrorDescarga(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos generar el documento."
      );
    } finally {
      setDescargando(null);
    }
  }

  return (
    <section className="rounded-xl border border-[#E7E3DB] bg-white p-5 space-y-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]">
        Documentos
      </p>

      {/* Tipo de firma — segmented control */}
      <div>
        <p className="text-sm text-[#5C5A54] mb-2">Firma en documentos</p>
        <div className="flex w-full rounded-lg bg-[#F2EFE9] p-1">
          <button
            type="button"
            onClick={() => setElectronica(false)}
            className={`flex-1 h-8 rounded-md text-sm font-medium transition-colors ${
              !electronica
                ? "bg-white text-[#0F766E] shadow-sm"
                : "text-[#5C5A54] hover:text-[#1A1A18]"
            }`}
          >
            A mano
          </button>
          {tieneFirma ? (
            <button
              type="button"
              onClick={() => setElectronica(true)}
              className={`flex-1 h-8 rounded-md text-sm font-medium transition-colors ${
                electronica
                  ? "bg-white text-[#0F766E] shadow-sm"
                  : "text-[#5C5A54] hover:text-[#1A1A18]"
              }`}
            >
              Electrónica
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 h-8 rounded-md text-sm font-medium text-[#C4C0B7] cursor-not-allowed"
            >
              Electrónica
            </button>
          )}
        </div>
        {!tieneFirma && (
          <p className="text-xs text-[#A8A49C] mt-1.5">
            <Link href="/perfil" className="text-[#0F766E] hover:underline">
              Configura tu firma
            </Link>{" "}
            en tu perfil para firmar electrónicamente.
          </p>
        )}
      </div>

      {/* Descargas — los 3 documentos con el MISMO tratamiento (teal sólido) */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => descargar("nota")}
          disabled={descargando !== null}
          className="w-full h-11 rounded-lg bg-[#0F766E] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2"
        >
          <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {descargando === "nota" ? "Generando…" : "Descargar nota clínica"}
        </button>

        {tieneIndicaciones ? (
          <button
            type="button"
            onClick={() => descargar("receta")}
            disabled={descargando !== null}
            className="w-full h-11 rounded-lg bg-[#0F766E] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2"
          >
            <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {descargando === "receta" ? "Generando…" : "Descargar receta"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Esta consulta no tiene medicamentos prescritos"
            className="w-full h-11 rounded-lg bg-[#0F766E]/30 text-white/90 text-sm font-medium cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Descargar receta
          </button>
        )}

        {/* Certificado: abre modal; su botón disparador usa el mismo teal sólido */}
        <CertificadoModal
          consultaId={consultaId}
          tieneDiagnostico={tieneDiagnostico}
          firmar={electronica && tieneFirma}
        />
      </div>

      {errorDescarga && (
        <p role="alert" className="text-sm text-[#B91C1C] bg-[#FBEAE9] rounded-lg px-3 py-2">
          {errorDescarga}
        </p>
      )}
    </section>
  );
}
