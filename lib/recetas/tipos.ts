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
