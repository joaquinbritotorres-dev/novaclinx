"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Factura {
  id: string;
  estado: string;
  datil_id: string | null;
  clave_acceso: string | null;
  error_mensaje: string | null;
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
        // Recargar para mostrar el nuevo estado
        router.refresh();
      }
    } catch (err) {
      setErrorMsg("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E7E3DB] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780] mb-4">
        Facturación · SRI
      </p>

      {/* Caso 1: Ya hay una factura */}
      {facturaExistente ? (
        <div className="flex flex-col gap-3">
          {facturaExistente.estado === "pendiente" && (
            <div className="flex items-center gap-2 text-yellow-600 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              Procesando factura... (Recarga en unos segundos)
            </div>
          )}

          {(facturaExistente.estado === "emitida" || facturaExistente.estado === "autorizada") && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Factura {facturaExistente.estado === "autorizada" ? "Autorizada" : "Emitida"}
              </div>
              {facturaExistente.datil_id && (
                <a
                  href={`https://app.datil.co/ver/${facturaExistente.datil_id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 border border-[#0F766E] text-[#0F766E] hover:bg-[#F0FDFB] text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  Ver / Descargar RIDE
                </a>
              )}
            </div>
          )}

          {facturaExistente.estado === "error" && (
             <div className="flex flex-col gap-2">
               <div className="text-red-600 text-sm font-medium">
                 Error al facturar:
               </div>
               <div className="text-red-500 text-xs bg-red-50 p-2 rounded">
                 {facturaExistente.error_mensaje}
               </div>
               {/* Note: In a full app you might add a retry button here, but for now we show the error. */}
             </div>
          )}
        </div>
      ) : (
        /* Caso 2: No hay factura, mostrar formulario */
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
              {isLoading ? "Enviando..." : "Emitir factura"}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
