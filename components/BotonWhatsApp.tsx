"use client";

import { linkWhatsApp } from "@/lib/whatsapp";

type TipoComunicacion = "recordatorio" | "confirmacion" | "resena" | "otro";

interface Props {
  telefono: string | null | undefined;
  texto: string;
  tipo: TipoComunicacion;
  paciente_id?: string;
  cita_id?: string;
  label?: string;
  className?: string;
}

export default function BotonWhatsApp({
  telefono,
  texto,
  tipo,
  paciente_id,
  cita_id,
  label = "WhatsApp",
  className,
}: Props) {
  const link = telefono ? linkWhatsApp(telefono, texto) : null;

  function handleClick() {
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");

    // Registro en bitácora; no bloquea la apertura de WhatsApp
    fetch("/api/comunicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        tipo,
        contenido: texto,
        ...(paciente_id ? { paciente_id } : {}),
        ...(cita_id ? { cita_id } : {}),
      }),
    }).catch(() => {
      // silencioso: el registro es secundario al envío
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!link}
      title={!link ? "Sin número de WhatsApp" : undefined}
      className={
        className ??
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] text-sm font-medium hover:bg-[#D1FAE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.1-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4.1.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
      </svg>
      {label}
    </button>
  );
}
