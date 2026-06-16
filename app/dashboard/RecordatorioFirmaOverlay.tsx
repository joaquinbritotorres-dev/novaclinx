"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BadgeCheck, FileText, ShieldCheck, X } from "lucide-react";

const SESSION_KEY = "firma_recordatorio_omitido";

/**
 * Recordatorio NO bloqueante para subir el .p12 tras iniciar sesión.
 * Se muestra desde el dashboard cuando el médico aún no tiene firma. Reutiliza
 * el mismo endpoint de subida (POST /api/perfil/firma con FormData
 * archivo+password); ese endpoint valida el .p12, lo guarda cifrado y activa la
 * facturación por su cuenta (no se duplica aquí).
 *
 * Saltable: "Ahora no" oculta el overlay y marca un flag en sessionStorage para
 * no re-forzarlo durante la sesión; reaparece en el próximo login si sigue sin firma.
 */
export default function RecordatorioFirmaOverlay() {
  const router = useRouter();
  const [visible, setVisible] = useState(false); // se decide en el efecto (sessionStorage)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Solo mostrar si no fue omitido en esta sesión.
    setVisible(sessionStorage.getItem(SESSION_KEY) !== "1");
  }, []);

  function omitir() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const archivo = fileRef.current?.files?.[0];
    const password = passRef.current?.value ?? "";
    if (!archivo) {
      setError("Selecciona tu archivo .p12.");
      return;
    }
    if (!password) {
      setError("Ingresa la contraseña del certificado.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("password", password);
      const res = await fetch("/api/perfil/firma", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No pudimos completar la acción.");
      if (passRef.current) passRef.current.value = "";
      // El dashboard recarga; ya con firma_object_key, el overlay no vuelve a aparecer.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar la acción.");
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  const beneficios = [
    { Icon: FileText, texto: "Firma recetas y certificados médicos" },
    { Icon: BadgeCheck, texto: "Emite facturas electrónicas al SRI" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A18]/40 px-4 py-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E7E3DB] bg-white shadow-xl">
        {/* Cerrar (equivale a "Ahora no") */}
        <button
          type="button"
          onClick={omitir}
          aria-label="Omitir por ahora"
          className="absolute right-4 top-4 text-[#A8A49C] transition-colors hover:text-[#5C5A54]"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="px-6 py-8 sm:px-8">
          <Image
            src="/novaclinx-logo.png"
            alt="Novaclinx"
            width={52}
            height={52}
            className="rounded-xl"
          />

          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[#1A1A18]">
            Activa tu firma electrónica
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5C5A54]">
            Sube tu certificado <span className="font-medium text-[#1A1A18]">.p12</span> una sola
            vez y queda lista. Sin ella no puedes firmar documentos ni facturar.
          </p>

          <ul className="mt-5 space-y-3">
            {beneficios.map(({ Icon, texto }) => (
              <li key={texto} className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-[#0F766E]" strokeWidth={1.75} />
                <span className="text-sm text-[#5C5A54]">{texto}</span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleUpload} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="firma-p12"
                className="mb-1.5 block text-sm font-medium text-[#1A1A18]"
              >
                Archivo .p12
              </label>
              <input
                id="firma-p12"
                ref={fileRef}
                type="file"
                accept=".p12,.pfx"
                required
                disabled={loading}
                className="w-full cursor-pointer text-sm text-[#5C5A54]
                  file:mr-3 file:rounded-lg file:border-0 file:bg-[#0F766E]/[0.08]
                  file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#0F766E]
                  hover:file:bg-[#0F766E]/[0.14] file:transition-colors file:cursor-pointer
                  disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="firma-pass"
                className="mb-1.5 block text-sm font-medium text-[#1A1A18]"
              >
                Contraseña del certificado
              </label>
              <input
                id="firma-pass"
                ref={passRef}
                type="password"
                autoComplete="off"
                required
                disabled={loading}
                placeholder="Contraseña del .p12"
                className="h-11 w-full rounded-lg border border-[#E7E3DB] bg-white px-3.5 text-sm text-[#1A1A18] placeholder-[#A8A49C] transition-colors focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 disabled:opacity-50"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-[#B91C1C]/[0.06] px-3 py-2 text-sm text-[#B91C1C]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#0F766E] text-sm font-medium text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Validando y guardando…" : "Subir y activar"}
            </button>

            <button
              type="button"
              onClick={omitir}
              disabled={loading}
              className="w-full text-center text-sm font-medium text-[#8A8780] transition-colors hover:text-[#5C5A54] disabled:opacity-50"
            >
              Ahora no
            </button>
          </form>

          <p className="mt-6 flex items-start gap-1.5 text-xs leading-relaxed text-[#8A8780]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Tu firma se guarda cifrada. Solo se usa para firmar tus documentos.
          </p>
        </div>
      </div>
    </div>
  );
}
