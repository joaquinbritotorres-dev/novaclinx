// Constantes del módulo Scribe de voz (compartidas entre UI y API).

export const CONSENTIMIENTO_GRABACION_TEXTO =
  "El paciente fue informado y consiente la grabación en audio de esta consulta con fines de documentación clínica. El audio se eliminará automáticamente al generar y aprobar la nota.";

/** Tope de grabación: 90 minutos. */
export const GRABACION_MAX_SEGUNDOS = 90 * 60;

export const BUCKET_AUDIOS = "audios-consulta";

export type EstadoGrabacion =
  | "consentida"
  | "subida"
  | "transcribiendo"
  | "transcrita"
  | "nota_generada"
  | "aprobada"
  | "descartada"
  | "error";
