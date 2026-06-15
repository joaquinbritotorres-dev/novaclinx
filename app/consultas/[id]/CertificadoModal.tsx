"use client";

import { useState } from "react";
import { Download } from "lucide-react";

interface Props {
  consultaId: string;
  tieneDiagnostico: boolean;
  firmar?: boolean;
}

export default function CertificadoModal({ consultaId, tieneDiagnostico, firmar }: Props) {
  const [open, setOpen] = useState(false);
  const [reposo, setReposo] = useState(false);
  const [reposoDias, setReposoDias] = useState(3);
  const [reposoInicio, setReposoInicio] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
  );
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerar() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (reposo) {
        params.set("reposo", "1");
        params.set("reposo_dias", String(reposoDias));
        params.set("reposo_inicio", reposoInicio);
      }
      if (mostrarDiagnostico) params.set("mostrar_diagnostico", "1");
      if (observaciones.trim()) params.set("observaciones", observaciones.trim());
      if (firmar) params.set("firmar", "1");

      const res = await fetch(
        `/api/consultas/${consultaId}/pdf-certificado?${params.toString()}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        // El endpoint puede devolver 422 (gate de corchetes/rangos), 400
        // (firma) o 500 — mostramos el motivo en vez de fallar en silencio.
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "No pudimos generar el certificado."
        );
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `novaclinx-certificado${firmar ? "-firmado" : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos generar el certificado."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-lg bg-[#0F766E] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2"
      >
        <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Descargar certificado
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!loading) setOpen(false); }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F172A]">Certificado Médico</h2>

            <p className="text-xs text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2 leading-relaxed">
              Revisa la información antes de firmar. El criterio clínico y la decisión final son tuyos.
            </p>

            {/* Reposo */}
            <div>
              <p className="text-sm font-medium text-[#0F172A] mb-2">Reposo médico</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReposo(false)}
                  className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${!reposo ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setReposo(true)}
                  className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${reposo ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}
                >
                  Sí
                </button>
              </div>
            </div>

            {reposo && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#64748B] mb-1">Días de reposo</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={reposoDias}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setReposoDias(!isNaN(v) ? Math.max(1, Math.min(90, v)) : 1);
                    }}
                    className="w-full h-9 border border-[#E2E8F0] rounded-lg px-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] mb-1">Desde</label>
                  <input
                    type="date"
                    value={reposoInicio}
                    onChange={(e) => setReposoInicio(e.target.value)}
                    className="w-full h-9 border border-[#E2E8F0] rounded-lg px-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                  />
                </div>
              </div>
            )}

            {/* Mostrar diagnóstico */}
            {tieneDiagnostico && (
              <div>
                <p className="text-sm font-medium text-[#0F172A] mb-2">Incluir diagnóstico CIE-10</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarDiagnostico(false)}
                    className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${!mostrarDiagnostico ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarDiagnostico(true)}
                    className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${mostrarDiagnostico ? "bg-[#0F766E] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}
                  >
                    Sí
                  </button>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-xs text-[#64748B] mb-1">
                Observaciones <span className="text-[#94A3B8]">(opcional)</span>
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Apto para reintegro laboral el..."
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerar}
                disabled={loading}
                className="flex-1 h-10 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-75 inline-flex items-center justify-center"
              >
                {loading ? "Generando…" : "Generar certificado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
