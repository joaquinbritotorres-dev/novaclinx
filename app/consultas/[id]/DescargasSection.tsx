"use client";

import { useState } from "react";
import Link from "next/link";
import CertificadoModal from "./CertificadoModal";
import CopiarNotaButton from "./CopiarNotaButton";
import CompartirNotaButton from "./CompartirNotaButton";

interface Props {
  consultaId: string;
  tieneFirma: boolean;
  tieneIndicaciones: boolean;
  tieneDiagnostico: boolean;
  textoCopia: string;
}

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
    <path d="M12 3v13m0 0-4-4m4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function DescargasSection({
  consultaId,
  tieneFirma,
  tieneIndicaciones,
  tieneDiagnostico,
  textoCopia,
}: Props) {
  const [electronica, setElectronica] = useState(tieneFirma);

  const firmarParam = electronica && tieneFirma ? "?firmar=1" : "";

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de firma */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
        <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">
          Tipo de firma en documentos
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setElectronica(false)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
              !electronica
                ? "bg-[#0F766E] text-white"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            A mano
          </button>
          {tieneFirma ? (
            <button
              type="button"
              onClick={() => setElectronica(true)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
                electronica
                  ? "bg-[#0F766E] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
              }`}
            >
              Electrónica
            </button>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <button
                type="button"
                disabled
                className="w-full h-9 rounded-lg text-sm font-medium bg-[#F1F5F9] text-[#CBD5E1] cursor-not-allowed"
              >
                Electrónica
              </button>
              <p className="text-xs text-[#94A3B8] mt-1 text-center">
                <Link href="/perfil" className="text-[#0F766E] hover:underline">
                  Configura tu firma
                </Link>{" "}
                en tu perfil
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nota Clínica */}
      <a
        href={`/api/consultas/${consultaId}/pdf-nota${firmarParam}`}
        download
        className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
      >
        <DownloadIcon />
        Descargar Nota Clínica
      </a>

      {/* Receta */}
      {tieneIndicaciones ? (
        <a
          href={`/api/consultas/${consultaId}/pdf-receta${firmarParam}`}
          download
          className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          <DownloadIcon />
          Descargar Receta
        </a>
      ) : (
        <button
          type="button"
          disabled
          title="Esta consulta no tiene medicamentos prescritos"
          className="w-full h-11 bg-[#E2E8F0] text-[#94A3B8] text-sm font-medium rounded-lg cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          Descargar Receta
        </button>
      )}

      {/* Certificado */}
      <CertificadoModal
        consultaId={consultaId}
        tieneDiagnostico={tieneDiagnostico}
        firmar={electronica && tieneFirma}
      />

      <CopiarNotaButton texto={textoCopia} />
      <CompartirNotaButton consultaId={consultaId} texto={textoCopia} />
    </div>
  );
}
