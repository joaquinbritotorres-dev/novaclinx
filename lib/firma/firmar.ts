import "server-only";

import { PDFDocument } from "pdf-lib";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import { createSupabaseServerClientWithServiceRole } from "@/lib/supabase/server";
import { descifrar } from "@/lib/firma/cifrado";

export async function firmarPdf(pdfBuffer: Buffer, medicoId: string): Promise<Buffer> {
  const supabase = createSupabaseServerClientWithServiceRole();

  // 1. Leer campos de firma del médico
  const { data: medico } = await supabase
    .from("medicos")
    .select(
      "firma_object_key, firma_password_cipher, firma_password_iv, firma_password_tag, firma_titular, firma_valida_hasta"
    )
    .eq("id", medicoId)
    .maybeSingle();

  if (
    !medico?.firma_object_key ||
    !medico.firma_password_cipher ||
    !medico.firma_password_iv ||
    !medico.firma_password_tag
  ) {
    throw new Error("El médico no tiene firma electrónica configurada.");
  }

  // 2. Verificar vigencia
  if (medico.firma_valida_hasta) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vence = new Date(medico.firma_valida_hasta + "T00:00:00");
    if (vence < hoy) {
      throw new Error(
        "La firma electrónica está vencida. Renueva tu certificado en Mi perfil."
      );
    }
  }

  // 3. Descargar .p12 del bucket privado (service role)
  const { data: blob, error: downloadError } = await supabase.storage
    .from("firmas-electronicas")
    .download(medico.firma_object_key);

  if (downloadError || !blob) {
    console.error("[firmar] descarga .p12:", downloadError);
    throw new Error("No se pudo descargar el certificado de firma.");
  }

  const p12Buffer = Buffer.from(await blob.arrayBuffer());

  // 4. Descifrar contraseña
  let password: string;
  try {
    password = descifrar({
      cipher: medico.firma_password_cipher,
      iv: medico.firma_password_iv,
      tag: medico.firma_password_tag,
    });
  } catch (err) {
    console.error("[firmar] descifrado contraseña:", err);
    throw new Error("No se pudo descifrar las credenciales de firma.");
  }

  try {
    // 5. Cargar el PDF en pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // 6. Inyectar placeholder de firma (PAdES — ETSI.CAdES.detached, 16 KB)
    //    pdflibAddPlaceholder opera sobre el PDFDocument directamente;
    //    usa getPages()[0] por defecto si no se pasa pdfPage.
    await pdflibAddPlaceholder({
      pdfDoc,
      reason: `Firmado electrónicamente por ${medico.firma_titular ?? "médico"}`,
      name: medico.firma_titular ?? "Médico",
      location: "Ecuador",
      contactInfo: "",
      subFilter: SUBFILTER_ETSI_CADES_DETACHED,
      signatureLength: 16384,
    });

    // useObjectStreams: false es OBLIGATORIO — los object/xref streams rompen
    // el ByteRange de la firma y hacen que @signpdf falle con "cross reference at NaN".
    const pdfConPlaceholder = Buffer.from(
      await pdfDoc.save({ useObjectStreams: false })
    );

    // 7. Firmar con el .p12
    const signer = new P12Signer(p12Buffer, { passphrase: password });
    const signpdf = new SignPdf();
    const signedBuffer = await signpdf.sign(pdfConPlaceholder, signer);

    return Buffer.from(signedBuffer);
  } catch (err) {
    console.error("[firmar] proceso de firma:", err);
    throw err;
  } finally {
    // Borrar la contraseña de memoria (best-effort en JS)
    password.split("").forEach((_, i, a) => { a[i] = "\0"; });
  }
}
