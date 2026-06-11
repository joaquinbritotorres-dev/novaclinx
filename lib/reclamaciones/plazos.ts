export type Semaforo = "ok" | "pendiente" | "vencido";

export interface RelojPresentacion {
  dias: number | null;
  semaforo: Semaforo | null;
  etiqueta: string;
  referencial: boolean;
}

export interface RelojPago {
  dias: number | null;
  semaforo: Semaforo | null;
  etiqueta: string;
}

export interface PlazosInput {
  ventana_presentacion_dias: number;
  ventana_pago_dias: number;
  cuenta_desde: "factura" | "atencion";
  plazo_confirmado: boolean;
  fechaFactura: string | null;
  fechaAtencion: string | null;
  fechaEnvio: string | null;
}

export interface PlazosResult {
  relojPresentacion: RelojPresentacion;
  relojPago: RelojPago;
}

function diasRestantesDesde(fechaISO: string, ventana: number): number {
  const base = new Date(fechaISO);
  const transcurridos = Math.floor((Date.now() - base.getTime()) / (1000 * 60 * 60 * 24));
  return ventana - transcurridos;
}

function toSemaforo(dias: number): Semaforo {
  if (dias <= 0) return "vencido";
  if (dias <= 15) return "pendiente";
  return "ok";
}

export function calcularPlazos(input: PlazosInput): PlazosResult {
  const {
    ventana_presentacion_dias,
    ventana_pago_dias,
    cuenta_desde,
    plazo_confirmado,
    fechaFactura,
    fechaAtencion,
    fechaEnvio,
  } = input;

  const sufijo = plazo_confirmado ? "" : " — plazo referencial, verifica con la póliza";
  const origen = cuenta_desde === "factura" ? "la factura" : "la atención";

  // ── Reloj de presentación ──────────────────────────────────────────
  const fechaBase = cuenta_desde === "factura" ? fechaFactura : fechaAtencion;
  const etiquetaSinFecha =
    cuenta_desde === "factura"
      ? `Sin factura emitida — no se puede calcular el plazo${sufijo}`
      : "Sin fecha base para el cálculo";

  let relojPresentacion: RelojPresentacion;
  if (!fechaBase) {
    relojPresentacion = {
      dias: null,
      semaforo: null,
      etiqueta: etiquetaSinFecha,
      referencial: !plazo_confirmado,
    };
  } else {
    const dias = diasRestantesDesde(fechaBase, ventana_presentacion_dias);
    const semaforo = toSemaforo(dias);
    const etiqueta =
      dias <= 0
        ? `Vencido — ${Math.abs(dias)} días fuera de plazo (${ventana_presentacion_dias} días desde ${origen})${sufijo}`
        : `Quedan ${dias} días para presentar (plazo ${ventana_presentacion_dias} días desde ${origen})${sufijo}`;
    relojPresentacion = { dias, semaforo, etiqueta, referencial: !plazo_confirmado };
  }

  // ── Reloj de cobro (desde fecha_envio) ────────────────────────────
  let relojPago: RelojPago;
  if (!fechaEnvio) {
    relojPago = { dias: null, semaforo: null, etiqueta: "Pendiente de envío" };
  } else {
    const dias = diasRestantesDesde(fechaEnvio, ventana_pago_dias);
    const semaforo = toSemaforo(dias);
    const etiqueta =
      dias <= 0
        ? `Cobro vencido — ${Math.abs(dias)} días fuera de plazo (${ventana_pago_dias} días desde el envío)`
        : `Quedan ${dias} días para cobrar (${ventana_pago_dias} días desde el envío)`;
    relojPago = { dias, semaforo, etiqueta };
  }

  return { relojPresentacion, relojPago };
}
