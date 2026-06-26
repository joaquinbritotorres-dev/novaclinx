import "server-only";
import { createSupabaseServerClientWithServiceRole } from "@/lib/supabase/server";

const BUCKET = "logos-medicos";

/**
 * Descarga el logo del médico desde Storage y lo devuelve como
 * data URL base64 lista para pasar a @react-pdf/renderer Image.
 * Retorna null si no hay logo o si la descarga falla — los PDFs
 * se renderizan igualmente sin logo.
 */
export async function getLogoBase64(logoObjectKey: string | null): Promise<string | null> {
  if (!logoObjectKey) return null;

  try {
    const supabase = await createSupabaseServerClientWithServiceRole();
    const { data, error } = await supabase.storage.from(BUCKET).download(logoObjectKey);
    if (error || !data) return null;

    const buf = Buffer.from(await data.arrayBuffer());
    if (buf.length === 0) return null;

    // Detectar MIME por magic bytes (PNG: 89 50 4E 47, JPEG: FF D8 FF)
    const mime =
      buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" : "image/png";

    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
