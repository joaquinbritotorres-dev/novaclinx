"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Factura {
  id: string;
  estado: string;
  clave_acceso: string | null;
  secuencial: string | null;
  numero_autorizacion: string | null;
  errores: unknown | null;
}

/** Extrae un mensaje legible del jsonb `errores` de forma defensiva. */
function extraerMensajeError(errores: unknown): string | null {
  if (!errores) return null;
  if (typeof errores === "string") return errores;
  if (typeof errores === "object") {
    const obj = errores as Record<string, unknown>;
    // Forma { errores: [...] } o { errores, mensaje } guardada por el motor.
    const directo = obj.mensaje ?? obj.message;
    if (typeof directo === "string" && directo.trim()) return directo;
    const lista = obj.errores;
    if (Array.isArray(lista) && lista.length > 0) {
      const e = lista[0];
      if (typeof e === "string") return e;
      if (e && typeof e === "object") {
        const eo = e as Record<string, unknown>;
        const m = eo.mensaje ?? eo.message ?? eo.error;
        if (typeof m === "string" && m.trim()) return m;
      }
    }
  }
  return null;
}

export default function FacturacionSection({
  consultaId,
  facturaExistente,
  tieneIdentificacion,
}: {
  consultaId: string;
  facturaExistente: Factura | null;
  tieneIdentificacion: boolean;
}) {
  const router = useRouter();
  const [monto, setMonto] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emitirFactura = async () => {
    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      setErrorMsg("Ingresa un monto válido mayor a 0.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/facturas/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ consulta_id: consultaId, monto: numMonto }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Error al emitir factura.");
      } else {
        // 201/202/200 → recargar para mostrar el nuevo estado.
        router.refresh();
      }
    } catch {
      setErrorMsg("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const estado = facturaExistente?.estado;
  const esActiva = estado === "autorizada";
  const enProceso = estado === "procesando" || estado === "pendiente";
  const fallida = estado === "rechazada" || estado === "fallida";

  // Formulario de emisión / reintento (compartido).
  const formulario = (labelBoton: string) => (
    <div className="flex flex-col gap-3">
      {!tieneIdentificacion && (
        <p className="text-xs text-red-600 mb-1">
          El paciente no tiene cédula o RUC registrado. Edita el paciente para poder facturar.
        </p>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            disabled={!tieneIdentificacion || isLoading}
            className="w-full h-11 pl-7 pr-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
        <button
          onClick={emitirFactura}
          disabled={!tieneIdentificacion || isLoading || !monto}
          className="h-11 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center justify-center min-w-[120px]"
        >
          {isLoading ? "Enviando..." : labelBoton}
        </button>
      </div>

      {errorMsg && <p className="text-xs text-red-600 mt-1">{errorMsg}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-[#E7E3DB] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780] mb-4">
        Facturación · SRI
      </p>

      {!facturaExistente && formulario("Emitir factura")}

      {/* Autorizada */}
      {facturaExistente && esActiva && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Factura autorizada
          </div>
          {facturaExistente.secuencial && (
            <p className="text-sm text-[#5C5A54]">N° {facturaExistente.secuencial}</p>
          )}
          <a
            href={`/api/facturas/${facturaExistente.id}/ride`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 border border-[#0F766E] text-[#0F766E] hover:bg-[#F0FDFB] text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            Ver / Descargar RIDE
          </a>
        </div>
      )}

      {/* Procesando / pendiente */}
      {facturaExistente && enProceso && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-yellow-600 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
            Procesando factura… El SRI la confirmará pronto.
          </div>
          <button
            onClick={() => router.refresh()}
            className="w-full h-11 border border-[#E7E3DB] text-[#5C5A54] hover:bg-[#F7F7F4] text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            Actualizar
          </button>
        </div>
      )}

      {/* Rechazada / fallida → mostrar error + reintentar */}
      {facturaExistente && fallida && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            La factura fue rechazada
          </div>
          <div className="text-red-500 text-xs bg-red-50 p-2 rounded">
            {extraerMensajeError(facturaExistente.errores) ??
              "Revisa los datos e intenta nuevamente."}
          </div>
          {formulario("Reintentar factura")}
        </div>
      )}
    </div>
  );
}
