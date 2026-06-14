// Extrae el peso (kg) más reciente del historial para alimentar el generador.
// El peso vive en el texto de la nota SOAP (bloque objetivo / antropometría),
// no en una columna propia — por eso se parsea. Puro y testeable.

const PESO_RE = /\bpeso[:\s]*(\d{1,3}(?:[.,]\d{1,2})?)\s*kg\b/i;

/**
 * Busca "peso: 22 kg" / "Peso 22kg" / "peso 13,5 kg" en una nota SOAP
 * (JSON {subjetivo,objetivo,...} o string legado). Devuelve kg o null.
 * Rango plausible 0.5–250 kg; fuera de eso se descarta.
 */
export function extraerPesoKg(notaSoap: string | null | undefined): number | null {
  if (!notaSoap) return null;

  let texto = notaSoap;
  try {
    const parsed = JSON.parse(notaSoap);
    if (parsed && typeof parsed === "object") {
      texto = Object.values(parsed).filter((v) => typeof v === "string").join(" ");
    }
  } catch {
    // nota legada en texto plano: se usa tal cual
  }

  const m = texto.match(PESO_RE);
  if (!m) return null;
  const kg = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(kg) || kg < 0.5 || kg > 250) return null;
  return kg;
}
