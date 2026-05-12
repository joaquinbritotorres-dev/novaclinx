type LogLevel = "info" | "warn" | "error";

const SENSITIVE_FIELDS = new Set([
  "nombre",
  "soap",
  "input_medico",
  "indicaciones",
  "diagnostico",
  "audio",
  "email",
  "transcripcion",
  "nota_soap",
  "resumen_corto",
  "notas_generales",
  "seguimiento_motivo",
  "password",
  "token",
]);

function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 5) return "[redacted-deep]";
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      obj as Record<string, unknown>
    )) {
      result[key] = SENSITIVE_FIELDS.has(key.toLowerCase())
        ? "[REDACTED]"
        : redactSensitive(value, depth + 1);
    }
    return result;
  }
  return obj;
}

function log(level: LogLevel, message: string, meta?: unknown) {
  if (process.env.NODE_ENV === "test") return;

  const sanitized = meta !== undefined ? redactSensitive(meta) : undefined;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(sanitized !== undefined ? { meta: sanitized } : {}),
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
};
