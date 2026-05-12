export const LEGAL = {
  DISCLAIMER_REVISION:
    "Novaclinx genera borradores. La nota oficial y el criterio clínico son tuyos.",

  FOOTER:
    "Novaclinx genera borradores de documentación clínica. No diagnostica, no prescribe y no reemplaza el criterio médico.",

  TAGLINE: "De tu consulta a una nota lista para revisar.",

  APP_NAME: "Novaclinx",

  DOMAIN: "novaclinx.com",
} as const;

export const MICROCOPY = {
  BTN_GENERATE: "Generar borrador",
  BTN_APPROVE: "Aprobar y guardar",

  LOADING_STATES: [
    "Procesando...",
    "Estructurando SOAP...",
    "Casi listo...",
  ] as const,

  BADGE_AI: "Borrador generado por IA",

  ERRORS: {
    NO_CONNECTION:
      "Sin conexión. Tu texto está guardado, reintenta cuando vuelvas a estar en línea.",
    SERVER_ERROR:
      "No pudimos generar el borrador ahora. Reintenta o escríbenos.",
  },

  EMPTY_STATES: {
    NO_PATIENTS:
      "Aún no tienes pacientes. Crea uno o importa tu lista para empezar.",
    NO_FOLLOWUPS: "Sin seguimientos pendientes.",
  },

  PLACEHOLDERS: {
    pediatria:
      "Ej: Niño 4 años, fiebre 38.5 desde hace 2 días, tos seca, faringe eritematosa. Dx viral. Paracetamol si fiebre, líquidos, control si empeora.",
    ginecologia:
      "Ej: Control prenatal 28 semanas, FUR 10 sept, PA 110/70, FCF 148. Sin edemas. Hierro y ácido fólico. Control en 4 semanas.",
    general:
      "Ej: HTA en control. PA 148/92. Ajusto Losartán 50mg, agrego Amlodipino 5mg nocturno. Creatinina y potasio. Control 1 mes.",
    cirugia:
      "Ej: Control post-operatorio. Herida limpia, sin signos de infección. Retiro de puntos en 7 días.",
    otro: "Describe la consulta: motivo, hallazgos, diagnóstico y plan.",
  } as const,
} as const;
