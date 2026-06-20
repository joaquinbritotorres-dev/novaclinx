/**
 * Frame del validador anti-glosa (placeholder HTML/CSS, datos ficticios).
 * Refleja el validador real del producto: revisa cada requisito ANTES de
 * enviar la reclamación. Status pills sobrios (sin checkmarks decorativos).
 */

const ITEMS: { label: string; estado: string; tono: "ok" | "info" }[] = [
  { label: "Identificación del paciente", estado: "Lista", tono: "ok" },
  { label: "Número de afiliado", estado: "Lista", tono: "ok" },
  { label: "Consentimiento LOPDP", estado: "Otorgado", tono: "ok" },
  { label: "Diagnóstico CIE-10", estado: "J03.9", tono: "info" },
  { label: "Receta médica", estado: "Adjunta", tono: "ok" },
  { label: "Plazo de presentación", estado: "12 días", tono: "info" },
  { label: "Factura electrónica", estado: "Autorizada", tono: "ok" },
];

const ASEGURADORAS = ["Saludsa", "BMI", "Humana", "Ecuasanitas", "Confiamed"];

export default function ReclamacionFrame() {
  return (
    <div className="w-full rounded-[1.5rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] shadow-[0_4px_24px_rgba(26,26,24,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ln-hairline)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--ln-ink)]">Validador anti-glosa</p>
        <span className="shrink-0 rounded-full bg-[var(--ln-teal)]/[0.08] px-2.5 py-1 text-xs font-medium text-[var(--ln-teal-strong)]">
          Lista para enviar
        </span>
      </div>

      <ul className="divide-y divide-[var(--ln-hairline)]">
        {ITEMS.map((it) => (
          <li key={it.label} className="flex items-center justify-between gap-4 px-5 py-2.5">
            <span className="text-[13px] text-[var(--ln-secondary)]">{it.label}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                it.tono === "ok"
                  ? "bg-[var(--ln-teal)]/[0.08] text-[var(--ln-teal-strong)]"
                  : "bg-[var(--ln-surface-alt)] text-[var(--ln-secondary)]"
              }`}
            >
              {it.estado}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-[var(--ln-hairline)] px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ln-muted)]">
          Formato por aseguradora
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {ASEGURADORAS.map((a) => (
            <span
              key={a}
              className="rounded-md border border-[var(--ln-hairline)] px-2 py-0.5 text-[11px] text-[var(--ln-secondary)]"
            >
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
