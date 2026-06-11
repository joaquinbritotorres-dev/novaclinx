/**
 * Helpers de WhatsApp "click-to-send" (links wa.me, sin Business API).
 */

/**
 * Normaliza un teléfono ecuatoriano a formato internacional sin "+".
 * "0991234567" → "593991234567"; "991234567" → "593991234567".
 * Devuelve null si el número no parece válido.
 */
export function normalizarTelefonoEC(raw: string): string | null {
  const digitos = raw.replace(/\D/g, "");
  if (!digitos) return null;

  let normalizado: string;
  if (digitos.startsWith("593")) {
    normalizado = digitos;
  } else if (digitos.startsWith("0")) {
    normalizado = "593" + digitos.slice(1);
  } else {
    normalizado = "593" + digitos;
  }

  // 593 + 9 dígitos (celular) o 593 + 8 dígitos (fijo)
  if (normalizado.length < 11 || normalizado.length > 12) return null;

  return normalizado;
}

/**
 * Construye un link wa.me con mensaje precargado.
 * Devuelve null si el teléfono no normaliza.
 */
export function linkWhatsApp(telefono: string, texto: string): string | null {
  const normalizado = normalizarTelefonoEC(telefono);
  if (!normalizado) return null;
  return `https://wa.me/${normalizado}?text=${encodeURIComponent(texto)}`;
}
