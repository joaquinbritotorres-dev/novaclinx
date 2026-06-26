"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const MAX_BYTES = 2 * 1024 * 1024;

const BTN_PRIMARY =
  "h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_SECONDARY =
  "h-9 px-4 bg-white border border-[#E2E8F0] hover:border-[#0F766E] text-[#0F172A] text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
const BTN_OUTLINE_DANGER =
  "h-9 px-4 bg-white border border-[#E2E8F0] hover:border-[#EF4444] text-[#EF4444] text-sm font-medium rounded-lg transition-colors disabled:opacity-50";

interface Props {
  tieneLogoActual: boolean;
  logoPreviewUrl: string | null;
}

export default function LogoSection({ tieneLogoActual, logoPreviewUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [modo, setModo] = useState<"ver" | "subir" | "confirmDelete">("ver");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubir() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo PNG o JPEG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("El archivo debe pesar máximo 2 MB.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
      setError("Solo se aceptan archivos .png o .jpg/.jpeg.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", file);

    try {
      const res = await fetch("/api/perfil/logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos guardar el logo.");
      }
      setModo("ver");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar el logo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/perfil/logo", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos eliminar el logo.");
      }
      setModo("ver");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos eliminar el logo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 pt-6 border-t border-[#E5E7EB]">
      <h2 className="text-sm font-semibold text-[#0F172A] mb-1">Logo del consultorio</h2>
      <p className="text-xs text-[#64748B] mb-4">
        PNG o JPEG, máx 2 MB. Aparece en la cabecera de recetas, notas y certificados.
      </p>

      {error && (
        <div role="alert" className="mb-3 text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* ── Vista: sin logo ───────────────────────────────────────────── */}
      {modo === "ver" && !tieneLogoActual && (
        <button
          type="button"
          onClick={() => { setError(null); setModo("subir"); }}
          className={BTN_PRIMARY}
        >
          Subir logo
        </button>
      )}

      {/* ── Vista: con logo ───────────────────────────────────────────── */}
      {modo === "ver" && tieneLogoActual && (
        <div className="flex flex-col gap-3">
          {logoPreviewUrl && (
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-32 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
                <Image
                  src={logoPreviewUrl}
                  alt="Logo del consultorio"
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
              <span className="text-xs text-[#64748B]">Logo actual</span>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setError(null); setModo("subir"); }}
              disabled={loading}
              className={BTN_SECONDARY}
            >
              Cambiar logo
            </button>
            <button
              type="button"
              onClick={() => { setError(null); setModo("confirmDelete"); }}
              disabled={loading}
              className={BTN_OUTLINE_DANGER}
            >
              Eliminar logo
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmación de borrado ────────────────────────────────────── */}
      {modo === "confirmDelete" && (
        <div className="space-y-3">
          <p className="text-sm text-[#0F172A]">
            ¿Eliminar el logo? Los PDFs futuros ya no lo incluirán.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleEliminar}
              disabled={loading}
              className="h-9 px-4 bg-[#DC2626] hover:bg-[#DC2626]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => { setError(null); setModo("ver"); }}
              disabled={loading}
              className={BTN_SECONDARY}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Formulario de subida ──────────────────────────────────────── */}
      {modo === "subir" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Archivo de imagen
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              disabled={loading}
              className="block w-full text-sm text-[#0F172A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#0F766E]/10 file:text-[#0F766E] hover:file:bg-[#0F766E]/20 disabled:opacity-50 cursor-pointer"
            />
            <p className="mt-1 text-xs text-[#94A3B8]">PNG o JPEG, máx 2 MB. Fondo transparente recomendado (PNG).</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubir}
              disabled={loading}
              className={BTN_PRIMARY}
            >
              {loading ? "Guardando…" : "Guardar logo"}
            </button>
            <button
              type="button"
              onClick={() => { setError(null); setModo("ver"); }}
              disabled={loading}
              className={BTN_SECONDARY}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
