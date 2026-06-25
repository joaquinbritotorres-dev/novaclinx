import { ShieldCheck } from "lucide-react";

/**
 * Frame de demostración de una nota SOAP — caso de PEDIATRÍA, datos ficticios
 * verosímiles. Placeholder editorial (HTML/CSS), reemplazable por captura real.
 * `animated`: cuando es true, las secciones entran escalonadas (lo usa
 * "Cómo funciona" envolviéndolas con RevealOnScroll desde afuera).
 */

// Caso pediátrico ficticio verosímil — compartido por el frame estático (hero)
// y la animación de "Cómo funciona". Una sola fuente de verdad.
export const SOAP_PACIENTE = { nombre: "Mateo Salazar", detalle: "4 años · 16 kg · Pediatría" };
export const SOAP_ALARMA =
  "Dificultad para respirar, fiebre >39 °C que no cede, rechazo a líquidos.";

export const SECCIONES = [
  {
    label: "S — Subjetivo",
    texto:
      "Madre refiere fiebre de hasta 38.7 °C desde hace 2 días, odinofagia y menor apetito. Sin tos ni dificultad respiratoria.",
  },
  {
    label: "O — Objetivo",
    texto:
      "Tº 38.2 °C. Faringe eritematosa con exudado amigdalino. Adenopatías submandibulares dolorosas. Resto del examen normal.",
  },
  {
    label: "A — Análisis",
    texto: "Faringoamigdalitis aguda.",
    tag: "CIE-10 · J03.9",
  },
  {
    label: "P — Plan",
    texto:
      "Amoxicilina 50 mg/kg/día c/12h × 7 días. Paracetamol 15 mg/kg si fiebre. Hidratación. Control en 48–72 h.",
  },
];

export default function SoapFrame() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--ln-hairline)] bg-[var(--ln-surface)] shadow-[0_1px_2px_rgba(26,26,24,0.04),0_12px_32px_-12px_rgba(26,26,24,0.12)] md:mx-0">
      {/* Cabecera del paciente */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ln-hairline)] px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--ln-ink)]">
            {SOAP_PACIENTE.nombre}
          </p>
          <p className="mt-0.5 text-xs text-[var(--ln-muted)]">
            {SOAP_PACIENTE.detalle}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--ln-teal)]/[0.08] px-2.5 py-1 text-xs font-medium text-[var(--ln-teal-strong)]">
          Borrador
        </span>
      </div>

      {/* Secciones SOAP */}
      <div className="divide-y divide-[var(--ln-hairline)]">
        {SECCIONES.map((s) => (
          <div key={s.label} className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ln-muted)]">
                {s.label}
              </p>
              {s.tag && (
                <span className="rounded-md bg-[var(--ln-surface-alt)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--ln-secondary)]">
                  {s.tag}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-6 text-[var(--ln-secondary)]">
              {s.texto}
            </p>
          </div>
        ))}
      </div>

      {/* Signos de alarma + control del médico */}
      <div className="space-y-3 border-t border-[var(--ln-hairline)] px-5 py-4">
        <div className="rounded-lg bg-[var(--ln-amber)]/[0.07] px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ln-amber)]">
            Signos de alarma
          </p>
          <p className="mt-1 text-[13px] leading-6 text-[var(--ln-secondary)]">
            {SOAP_ALARMA}
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-[var(--ln-muted)]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Borrador generado por IA — usted revisa y aprueba.
        </p>
      </div>
    </div>
  );
}
