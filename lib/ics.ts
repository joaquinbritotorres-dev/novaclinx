/**
 * Generación de archivos .ics (iCalendar) para "Agregar al calendario".
 * Compatible con Google Calendar, Apple Calendar y Outlook sin cuentas.
 */

interface CitaICS {
  /** Inicio de la cita (timestamptz ISO, p.ej. "2026-06-10T14:00:00-05:00") */
  inicio: string;
  duracionMin: number;
  titulo: string;
  descripcion?: string;
}

/** Formatea una fecha a UTC básico iCalendar: YYYYMMDDTHHMMSSZ */
function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Escapa texto según RFC 5545 (comas, puntos y coma, backslashes, saltos de línea). */
function escaparTextoICS(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function citaToICS({ inicio, duracionMin, titulo, descripcion }: CitaICS): string {
  const inicioDate = new Date(inicio);
  const finDate = new Date(inicioDate.getTime() + duracionMin * 60_000);

  const uid = `${inicioDate.getTime()}-${Math.random().toString(36).slice(2, 10)}@novaclinx`;

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Novaclinx//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(inicioDate)}`,
    `DTEND:${toICSDate(finDate)}`,
    `SUMMARY:${escaparTextoICS(titulo)}`,
  ];

  if (descripcion) {
    lineas.push(`DESCRIPTION:${escaparTextoICS(descripcion)}`);
  }

  lineas.push("END:VEVENT", "END:VCALENDAR");

  return lineas.join("\r\n") + "\r\n";
}
