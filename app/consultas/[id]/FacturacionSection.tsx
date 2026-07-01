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

/** Texto legible de un error individual del SRI (varios formatos posibles). */
function textoDeError(e: unknown): string | null {
  if (typeof e === "string") return e.trim() || null;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    // Campos que usa el SRI / AutorizadorEC: mensaje, message, error,
    // informacionAdicional, informationAdditional, tipo, identificador, codigo.
    const msg = o.mensaje ?? o.message ?? o.error ?? o.motivo;
    const info = o.informacionAdicional ?? o.informationAdditional ?? o.additionalInformation;
    const partes = [msg, info].filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
    if (partes.length > 0) return partes.join(" — ");
    // Último recurso: mostrar el objeto crudo para no perder el motivo real.
    try {
      const json = JSON.stringify(e);
      if (json && json !== "{}") return json;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Extrae un mensaje legible del jsonb `errores` de forma defensiva. */
function extraerMensajeError(errores: unknown): string | null {
  if (!errores) return null;
  if (typeof errores === "string") return errores.trim() || null;
  if (typeof errores === "object") {
    const obj = errores as Record<string, unknown>;
    // Mensaje directo a nivel raíz.
    const directo = textoDeError(obj);
    // Lista de errores: junta hasta los primeros 3.
    const lista = obj.errores;
    if (Array.isArray(lista) && lista.length > 0) {
      const textos = lista
        .map(textoDeError)
        .filter((x): x is string => !!x)
        .slice(0, 3);
      if (textos.length > 0) return textos.join(" · ");
    }
    // Si la raíz tenía un mensaje pero no era solo el JSON completo, úsalo.
    if (directo && directo !== JSON.stringify(obj)) return directo;
    // Último recurso: JSON crudo (así el médico ve algo aunque sea técnico).
    try {
      const json = JSON.stringify(errores);
      if (json && json !== "{}" && json !== "[]") return json;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export default function FacturacionSection({
  consultaId,
  facturaExistente,
  tieneIdentificacion,
  esMenorDeEdad,
  pagadorInicial,
}: {
  consultaId: string;
  facturaExistente: Factura | null;
  tieneIdentificacion: boolean;
  esMenorDeEdad: boolean;
  pagadorInicial: {
    nombre: string | null;
    identificacion: string | null;
    tipoIdentificacion: string | null;
  } | null;
}) {
  const router = useRouter();
  const [monto, setMonto] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Consulta al SRI el estado real de la factura AHORA (sin esperar al cron
  // diario). Si ya se autorizó/rechazó, refresca para mostrar el nuevo estado.
  async function sincronizarEstado() {
    if (!facturaExistente) return;
    setSincronizando(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/facturas/${facturaExistente.id}/sincronizar`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMsg(data.error || "No pudimos consultar el estado. Reintenta.");
        return;
      }
      if (data.estado && data.estado !== "procesando" && data.estado !== "pendiente") {
        router.refresh(); // ya cambió (autorizada/rechazada/fallida)
      } else {
        const sri = typeof data.estadoSri === "string" ? data.estadoSri : null;
        setSyncMsg(
          `El SRI aún la está procesando${sri ? ` (estado en el SRI: ${sri})` : ""}. ` +
            "Puede tardar unos minutos en pruebas; vuelve a consultar en un rato."
        );
      }
    } catch {
      setSyncMsg("Error de conexión al consultar el SRI. Reintenta.");
    } finally {
      setSincronizando(false);
    }
  }

  const [pagadorNombre, setPagadorNombre] = useState(pagadorInicial?.nombre ?? "");
  const [pagadorIdentificacion, setPagadorIdentificacion] = useState(pagadorInicial?.identificacion ?? "");
  const [pagadorTipo, setPagadorTipo] = useState(pagadorInicial?.tipoIdentificacion ?? "05");

  const puedeFacturar = esMenorDeEdad
    ? Boolean(pagadorNombre.trim() && pagadorIdentificacion.trim())
    : tieneIdentificacion;

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
        body: JSON.stringify({
          consulta_id: consultaId,
          monto: numMonto,
          ...(esMenorDeEdad
            ? {
                pagador_nombre: pagadorNombre,
                pagador_identificacion: pagadorIdentificacion,
                pagador_tipo_identificacion: pagadorTipo,
              }
            : {}),
        }),
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
      {!esMenorDeEdad && !tieneIdentificacion && (
        <p className="text-xs text-red-600 mb-1">
          El paciente no tiene cédula o RUC registrado. Edita el paciente para poder facturar.
        </p>
      )}

      {esMenorDeEdad && (
        <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3 space-y-2">
          <p className="text-xs font-semibold text-[#1E40AF] uppercase tracking-wide">
            Pagador · padre / madre / representante
          </p>
          <div>
            <label className="block text-xs text-[#374151] mb-1">Tipo de identificación</label>
            <select
              value={pagadorTipo}
              onChange={(e) => setPagadorTipo(e.target.value)}
              disabled={isLoading}
              className="w-full h-9 px-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100"
            >
              <option value="05">Cédula</option>
              <option value="04">RUC</option>
              <option value="06">Pasaporte</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#374151] mb-1">N.° de identificación</label>
            <input
              type="text"
              value={pagadorIdentificacion}
              onChange={(e) => setPagadorIdentificacion(e.target.value)}
              disabled={isLoading}
              placeholder="1712345678"
              className="w-full h-9 px-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs text-[#374151] mb-1">Nombre completo</label>
            <input
              type="text"
              value={pagadorNombre}
              onChange={(e) => setPagadorNombre(e.target.value)}
              disabled={isLoading}
              placeholder="Juan Pérez"
              className="w-full h-9 px-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100"
            />
          </div>
        </div>
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
            disabled={!puedeFacturar || isLoading}
            className="w-full h-11 pl-7 pr-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
        <button
          onClick={emitirFactura}
          disabled={!puedeFacturar || isLoading || !monto}
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
          <p className="text-xs text-[#64748B]">
            El SRI autoriza las facturas de forma asíncrona. Toca «Consultar estado al SRI»
            para revisar si ya se autorizó.
          </p>
          {/* Si la emisión falló (timeout / rechazo del proveedor), aquí está el
              motivo por el que quedó en 'procesando'. */}
          {extraerMensajeError(facturaExistente.errores) && (
            <div className="text-xs text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-2.5 py-2">
              <span className="font-medium">Detalle del proveedor: </span>
              {extraerMensajeError(facturaExistente.errores)}
            </div>
          )}
          <button
            onClick={sincronizarEstado}
            disabled={sincronizando}
            className="w-full h-11 border border-[#0F766E] text-[#0F766E] hover:bg-[#F0FDFB] text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sincronizando ? "Consultando…" : "Consultar estado al SRI"}
          </button>
          {syncMsg && <p className="text-xs text-[#64748B]">{syncMsg}</p>}
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
