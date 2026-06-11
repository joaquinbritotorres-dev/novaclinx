import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export interface CipherParts {
  cipher: string;
  iv: string;
  tag: string;
}

function getKey(): Buffer {
  const raw = process.env.FIRMA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "FIRMA_ENCRYPTION_KEY no está configurada. Genera 32 bytes aleatorios en base64 y agrégala como variable de entorno."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "FIRMA_ENCRYPTION_KEY debe ser exactamente 32 bytes codificados en base64."
    );
  }
  return key;
}

export function cifrar(texto: string): CipherParts {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  return {
    cipher: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function descifrar({ cipher, iv, tag }: CipherParts): string {
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return (
    decipher.update(Buffer.from(cipher, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}
