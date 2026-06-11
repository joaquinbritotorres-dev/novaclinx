"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export interface FirmaInfo {
  tiene: boolean;
  titular: string | null;
  valida_hasta: string | null;
}

const BTN_PRIMARY =
  "h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_SECONDARY =
  "h-9 px-4 bg-white border border-[#E2E8F0] hover:border-[#0F766E] text-[#0F172A] text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
const BTN_OUTLINE_DANGER =
  "h-9 px-4 bg-white border border-[#E2E8F0] hover:border-[#EF4444] text-[#EF4444] text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
const BTN_DANGER =
  "h-9 px-4 bg-[#DC2626] hover:bg-[#DC2626]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const INPUT =
  "w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50";

function diasHastaVencimiento(validaHasta: string | null): number | null {
  if (!validaHasta) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(validaHasta + "T00:00:00");
  return Math.floor((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function formatFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function FirmaElectronicaSection({ firmaInfo }: { firmaInfo: FirmaInfo }) {
  const router = useRouter();
  const [modo, setModo] = useState<"ver" | "subir" | "confirmDelete">("ver");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const dias = diasHastaVencimiento(firmaInfo.valida_hasta);

  function irASubir() {
    setError(null);
    setShowPass(false);
    setModo("subir");
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const archivo = fileRef.current?.files?.[0];
    const password = passRef.current?.value ?? "";
    if (!archivo) { setError("Selecciona un archivo .p12."); return; }
    if (!password) { setError("Ingresa la contraseña del certificado."); return; }

    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("password", password);
      const res = await fetch("/api/perfil/firma", { method: "POST", body: fd });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No pudimos completar la acción.");
      // Limpiar el campo de contraseña de la memoria
      if (passRef.current) passRef.current.value = "";
      setModo("ver");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar la acción.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/perfil/firma", { method: "DELETE" });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No pudimos completar la acción.");
      setModo("ver");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar la acción.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mt-6">
      <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4 border-b border-[#E2E8F0] pb-2">
        Firma electrónica
      </h2>

      {error && (
        <p role="alert" className="mb-4 text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Sin firma + modo ver ── */}
      {!firmaInfo.tiene && modo === "ver" && (
        <div>
          <p className="text-sm text-[#64748B] mb-4">
            Sube tu certificado <span className="font-medium text-[#0F172A]">.p12</span> para firmar
            documentos clínicos electrónicamente. La llave privada se guarda cifrada (AES-256-GCM);
            la contraseña nunca se almacena en texto plano.
          </p>
          <button type="button" className={BTN_PRIMARY} onClick={irASubir}>
            Subir certificado .p12
          </button>
        </div>
      )}

      {/* ── Con firma + modo ver ── */}
      {firmaInfo.tiene && modo === "ver" && (
        <div className="space-y-4">
          {/* Alertas de vencimiento */}
          {dias !== null && dias <= 0 && (
            <div className="flex items-start gap-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2.5">
              <svg className="text-[#DC2626] shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-[#DC2626] font-medium">
                Certificado vencido hace {Math.abs(dias)} día{Math.abs(dias) !== 1 ? "s" : ""}. Reemplázalo para poder firmar.
              </p>
            </div>
          )}
          {dias !== null && dias > 0 && dias <= 30 && (
            <div className="flex items-start gap-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2.5">
              <svg className="text-[#D97706] shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-sm text-[#92400E]">
                Vence en <span className="font-semibold">{dias} día{dias !== 1 ? "s" : ""}</span>. Considera renovarlo pronto.
              </p>
            </div>
          )}

          {/* Datos del certificado */}
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-xs text-[#64748B] shrink-0">Titular</dt>
              <dd className="text-sm font-medium text-[#0F172A] text-right truncate">{firmaInfo.titular ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-xs text-[#64748B] shrink-0">Válida hasta</dt>
              <dd className={`text-sm font-medium text-right ${
                dias !== null && dias <= 0
                  ? "text-[#DC2626]"
                  : dias !== null && dias <= 30
                  ? "text-[#D97706]"
                  : "text-[#0F172A]"
              }`}>
                {firmaInfo.valida_hasta ? formatFecha(firmaInfo.valida_hasta) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-xs text-[#64748B] shrink-0">Estado</dt>
              <dd>
                {dias === null ? null
                  : dias <= 0
                  ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEE2E2] text-[#DC2626]">Vencida</span>
                  : dias <= 30
                  ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FEF3C7] text-[#D97706]">Por vencer</span>
                  : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#D1FAE5] text-[#065F46]">Activa</span>
                }
              </dd>
            </div>
          </dl>

          <div className="flex gap-2 pt-1">
            <button type="button" className={BTN_SECONDARY} onClick={irASubir}>
              Reemplazar
            </button>
            <button type="button" className={BTN_OUTLINE_DANGER}
              onClick={() => { setError(null); setModo("confirmDelete"); }}>
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* ── Formulario de subida ── */}
      {modo === "subir" && (
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#475569] mb-1.5 block">
              Archivo .p12
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".p12,.pfx"
              required
              disabled={loading}
              className="w-full text-sm text-[#475569] cursor-pointer
                file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                file:text-xs file:font-medium file:bg-[#F0FDFB] file:text-[#0F766E]
                hover:file:bg-[#CCFBF1] file:transition-colors file:cursor-pointer
                disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#475569] mb-1.5 block">
              Contraseña del certificado
            </label>
            <div className="relative">
              <input
                ref={passRef}
                type={showPass ? "text" : "password"}
                required
                autoComplete="off"
                disabled={loading}
                placeholder="Contraseña del .p12"
                className={INPUT + " pr-10"}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors"
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          <p className="text-xs text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2">
            El certificado se valida antes de guardarse. La contraseña se cifra con AES-256-GCM y
            nunca se almacena en texto plano ni se registra en logs.
          </p>

          <div className="flex gap-2">
            <button type="submit" className={BTN_PRIMARY} disabled={loading}>
              {loading ? "Validando y guardando..." : "Guardar certificado"}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={loading}
              onClick={() => { setError(null); setModo("ver"); }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Confirmar eliminación ── */}
      {modo === "confirmDelete" && (
        <div className="space-y-3 border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-sm font-medium text-[#0F172A]">¿Eliminar el certificado?</p>
          <p className="text-xs text-[#64748B]">
            Se borrará permanentemente del servidor. Hasta que subas uno nuevo, no podrás firmar
            documentos clínicos con este sistema.
          </p>
          <div className="flex gap-2">
            <button type="button" className={BTN_DANGER} disabled={loading} onClick={handleDelete}>
              {loading ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={loading}
              onClick={() => setModo("ver")}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
