import { Download } from "lucide-react";

/**
 * Frame de demostración de una factura electrónica SRI (placeholder HTML/CSS,
 * datos ficticios). Coherente con el caso del SOAP: misma consulta de Mateo.
 * IVA 0% = servicios de salud (Art. 56 LRTI).
 */
export default function FacturaFrame() {
  return (
    <div className="w-full rounded-[1.5rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] shadow-[0_4px_24px_rgba(26,26,24,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ln-hairline)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--ln-ink)]">Factura electrónica</p>
        <span className="shrink-0 rounded-full bg-[var(--ln-teal)]/[0.08] px-2.5 py-1 text-xs font-medium text-[var(--ln-teal-strong)]">
          Autorizada por el SRI
        </span>
      </div>

      <dl className="divide-y divide-[var(--ln-hairline)] text-[13px]">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-[var(--ln-muted)]">Cliente</dt>
          <dd className="font-medium text-[var(--ln-ink)]">Mateo Salazar</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-[var(--ln-muted)]">Detalle</dt>
          <dd className="text-[var(--ln-secondary)]">Consulta médica · 1</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-[var(--ln-muted)]">IVA</dt>
          <dd className="text-[var(--ln-secondary)]">0 % · servicios de salud</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-[var(--ln-muted)]">Total</dt>
          <dd className="text-base font-semibold text-[var(--ln-ink)] tabular-nums">$40.00</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <dt className="text-[var(--ln-muted)]">Clave de acceso</dt>
          <dd className="font-mono text-xs text-[var(--ln-secondary)]">2106…3201</dd>
        </div>
      </dl>

      <div className="border-t border-[var(--ln-hairline)] px-5 py-4">
        <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--ln-hairline)] px-3.5 text-[13px] font-medium text-[var(--ln-ink)]">
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Descargar RIDE
        </span>
      </div>
    </div>
  );
}
