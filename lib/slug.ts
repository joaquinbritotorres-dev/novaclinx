/**
 * Convierte un nombre a slug URL-safe: "Dra. María Pérez" → "dra-maria-perez".
 * Devuelve "" si no queda nada utilizable.
 */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
