// lib/datil/types.ts

export interface DatilEmisor {
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  direccion: string;
  obligado_contabilidad: boolean;
  contribuyente_especial: string;
  establecimiento: {
    codigo: string;
    punto_emision: string;
  };
}

export interface DatilComprador {
  identificacion: string;
  tipo_identificacion: "04" | "05" | "06" | "07";
  razon_social: string;
  email: string;
  direccion: string;
}

export interface DatilImpuesto {
  codigo: string;         // "2" = IVA
  codigo_porcentaje: string; // "0"=0% | "4"=15% (Ecuador 2024+)
  base_imponible: number;
  tarifa?: number;        // permitido en items, no en totales
  valor: number;
}

export interface DatilItem {
  codigo_principal: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  precio_total_sin_impuestos: number;
  impuestos: DatilImpuesto[];
}

export interface DatilTotales {
  total_sin_impuestos: number;
  descuento: number;
  propina: number;
  importe_total: number;
  impuestos: DatilImpuesto[];
}

export interface DatilPago {
  medio: string; // "efectivo" | "transferencia" | "tarjeta_credito" | ...
  total: number;
}

export interface DatilFacturaRequest {
  ambiente: 1 | 2;
  tipo_emision: 1;
  secuencial: number;
  fecha_emision: string;  // YYYY-MM-DD
  moneda: string;         // "USD"
  emisor: DatilEmisor;
  comprador: DatilComprador;
  items: DatilItem[];
  totales: DatilTotales;
  pagos: DatilPago[];
}

export interface DatilFacturaResponse {
  id: string;
  clave_acceso: string;
  estado: string; // "RECIBIDO" | "AUTORIZADO" | etc.
  ambiente: string;
  numero?: string; // número secuencial oficial (ej. "001-001-000000001")
  es_valida?: boolean;
}

export type DatilResult =
  | { ok: true; data: DatilFacturaResponse }
  | { ok: false; status: number; message: string };
