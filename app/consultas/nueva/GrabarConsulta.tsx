"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BUCKET_AUDIOS,
  CONSENTIMIENTO_GRABACION_TEXTO,
  GRABACION_MAX_SEGUNDOS,
} from "@/lib/scribe/constantes";

type Fase =
  | "consentimiento"
  | "iniciando"
  | "grabando"
  | "pausada"
  | "subiendo"
  | "subida"
  | "error_subida"
  | "mic_denegado";

interface Props {
  pacienteId: string;
  onVolverEscribir: () => void;
}

function formatTiempo(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function GrabarConsulta({ pacienteId, onVolverEscribir }: Props) {
  const [fase, setFase] = useState<Fase>("consentimiento");
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [grabacionId, setGrabacionId] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const uploadRef = useRef<{ path: string; token: string } | null>(null);
  const segundosRef = useRef(0);

  // Cronómetro (solo avanza grabando)
  useEffect(() => {
    if (fase !== "grabando") return;
    const id = setInterval(() => {
      segundosRef.current += 1;
      setSegundos(segundosRef.current);
      if (segundosRef.current >= GRABACION_MAX_SEGUNDOS) {
        detener(); // tope 90 min
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  // Limpieza al desmontar: liberar micrófono
  useEffect(() => {
    return () => {
      recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function confirmarConsentimiento() {
    setFase("iniciando");
    setError(null);
    try {
      // 1) Registrar consentimiento + obtener signed upload URL
      const res = await fetch("/api/grabaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paciente_id: pacienteId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "No pudimos iniciar la grabación."
        );
      }
      const data = await res.json();
      setGrabacionId(data.grabacion_id);
      uploadRef.current = { path: data.path, token: data.token };

      // 2) Pedir micrófono
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setFase("mic_denegado");
        return;
      }
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        void subir();
      };
      recorderRef.current = recorder;
      segundosRef.current = 0;
      setSegundos(0);
      recorder.start(10_000); // chunks cada 10 s: no se pierde nada si algo falla
      setFase("grabando");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos iniciar la grabación."
      );
      setFase("consentimiento");
    }
  }

  function pausar() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      setFase("pausada");
    }
  }

  function reanudar() {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      setFase("grabando");
    }
  }

  function detener() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop(); // onstop dispara subir()
    }
  }

  async function subir() {
    const blob = blobRef.current;
    const upload = uploadRef.current;
    if (!blob || !upload || !grabacionId) return;

    setFase("subiendo");
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET_AUDIOS)
        .uploadToSignedUrl(upload.path, upload.token, blob, {
          contentType: "audio/webm",
        });
      if (upErr) throw new Error(upErr.message);

      const res = await fetch(`/api/grabaciones/${grabacionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          estado: "subida",
          duracion_segundos: Math.max(1, segundosRef.current),
        }),
      });
      if (!res.ok) throw new Error("El audio subió pero no pudimos confirmarlo.");

      setFase("subida");
    } catch {
      // El blob sigue en memoria: reintento sin perder la grabación
      setError("Falló la subida del audio. Tu grabación está a salvo — reintenta.");
      setFase("error_subida");
    }
  }

  // ── UI ──────────────────────────────────────────────────────

  if (fase === "consentimiento" || fase === "iniciando") {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <h3 className="text-sm font-bold text-[#0F172A] mb-3">
          Consentimiento del paciente
        </h3>
        <p className="text-sm text-[#475569] leading-relaxed bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-3 mb-4">
          {CONSENTIMIENTO_GRABACION_TEXTO}
        </p>
        {error && (
          <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={confirmarConsentimiento}
            disabled={fase === "iniciando"}
            className="h-11 px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {fase === "iniciando" ? "Iniciando…" : "El paciente consiente — iniciar grabación"}
          </button>
          <button
            type="button"
            onClick={onVolverEscribir}
            className="h-11 px-4 border border-[#E2E8F0] text-[#64748B] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (fase === "mic_denegado") {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-4 py-3 mb-4">
          No pudimos acceder al micrófono. Revisa los permisos del navegador
          (icono de candado en la barra de direcciones) o usa el modo Escribir.
        </p>
        <button
          type="button"
          onClick={onVolverEscribir}
          className="h-11 px-4 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0F766E]/90 transition-colors"
        >
          Volver al modo Escribir
        </button>
      </div>
    );
  }

  if (fase === "grabando" || fase === "pausada") {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <div className="flex items-center gap-3 mb-5">
          <span
            className={`w-3 h-3 rounded-full ${
              fase === "grabando" ? "bg-[#DC2626] animate-pulse" : "bg-[#F59E0B]"
            }`}
            aria-hidden
          />
          <span className="text-sm font-bold text-[#0F172A]">
            {fase === "grabando" ? "Grabando consulta" : "Grabación en pausa"}
          </span>
          <span className="font-mono text-lg text-[#0F172A] ml-auto tabular-nums">
            {formatTiempo(segundos)}
          </span>
        </div>
        <p className="text-xs text-[#94A3B8] mb-4">
          Tope de grabación: 90 minutos. El audio se procesa al detener.
        </p>
        <div className="flex items-center gap-3">
          {fase === "grabando" ? (
            <button
              type="button"
              onClick={pausar}
              className="h-11 px-4 border border-[#E2E8F0] text-[#374151] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors"
            >
              Pausar
            </button>
          ) : (
            <button
              type="button"
              onClick={reanudar}
              className="h-11 px-4 border border-[#0F766E] text-[#0F766E] text-sm font-medium rounded-lg hover:bg-[#F0FDFB] transition-colors"
            >
              Reanudar
            </button>
          )}
          <button
            type="button"
            onClick={detener}
            className="h-11 px-5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Detener y procesar
          </button>
        </div>
      </div>
    );
  }

  if (fase === "subiendo" || fase === "error_subida") {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        {fase === "subiendo" ? (
          <p className="text-sm text-[#475569]">Subiendo audio… ({formatTiempo(segundos)})</p>
        ) : (
          <>
            <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void subir()}
              className="h-11 px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Reintentar subida
            </button>
          </>
        )}
      </div>
    );
  }

  // fase === "subida" — la transcripción llega en la PARTE 3
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
      <p className="text-sm font-medium text-[#065F46] bg-[#D1FAE5] rounded-lg px-4 py-3">
        Audio subido correctamente ({formatTiempo(segundos)}). La transcripción
        estará disponible en el siguiente paso.
      </p>
    </div>
  );
}
