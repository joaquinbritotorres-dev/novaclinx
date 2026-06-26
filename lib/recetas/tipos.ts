/**
 * Unidad de dispensación elegida por el médico (manda sobre la inferencia de la
 * IA). Determina la etiqueta y la math de presentación, no la dosis en mg:
 *  - "liquido":    jarabe/suspensión → mL, redondeo a 0.5 de jeringa.
 *  - "comprimido": tableta/cápsula   → comprimidos (math entera).
 *  - "inhalador":  aerosol/spray     → puffs (misma math que sólido, sin redondeo).
 */
export type UnidadDispensacion = "liquido" | "comprimido" | "inhalador";

export interface MedicamentoPropuesto {
  dci: string;
  nombreComercial?: string | null;
  formaFarmaceutica: string;
  concentracion: string;
  via: string;
  dosis: string;
  frecuencia: string;
  duracionDias: number;
  indicacion?: string | null;
  origenDosis: "sugerencia_ia" | "tabla_verificada" | "manual";
  confirmado: boolean;
  cantidadTexto?: string | null;
  /** Dosis confirmada en números y letras (AM 00031-2020). La fija el médico
   *  al confirmar; es lo único que se imprime en la receta, nunca med.dosis. */
  dosisConfirmadaTexto?: string | null;
}

/** Medicamento confirmado por el médico con cantidad calculada. */
export type Medicamento = MedicamentoPropuesto & {
  confirmado: true;
  cantidadTexto: string;
};

export function medicamentoFromPropuesto(
  propuesto: MedicamentoPropuesto,
  cantidadTexto: string
): Medicamento {
  return { ...propuesto, confirmado: true, cantidadTexto };
}
