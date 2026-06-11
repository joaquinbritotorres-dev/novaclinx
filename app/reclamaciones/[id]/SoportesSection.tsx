"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Documento {
  id: string;
  tipo: string;
  nombre_archivo: string;
  mime: string;
  size_bytes: number;
  created_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  factura: "Factura",
  examen: "Examen",
  informe: "Informe",
  receta: "Receta",
  otro: "Otro",
};

const EXT_FROM_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const MAX_SIZE = 15 * 1024 * 1024;

function detectMime(buf: ArrayBuffer): string | null {
  const b = new Uint8Array(buf, 0, 8);
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SoportesSection({
  reclamacionId,
  medicoId,
}: {
  reclamacionId: string;
  medicoId: string;
}) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [tipo, setTipo] = useState("factura");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchDocumentos() {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/reclamaciones/${reclamacionId}/documentos`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocumentos(data.documentos ?? []);
    } catch {
      setListError("No pudimos cargar los soportes. Intenta de nuevo.");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    fetchDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reclamacionId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setUploadError(null);
  }

  async function handleSubir() {
    if (!file) return;
    setUploadError(null);
    setUploading(true);

    try {
      // 1. Tamaño
      if (file.size > MAX_SIZE) {
        setUploadError("El archivo supera el límite de 15 MB.");
        return;
      }

      // 2. Leer buffer (necesario para magic bytes y sha256)
      const buffer = await file.arrayBuffer();

      // 3. Tipo real por magic bytes
      const detectedMime = detectMime(buffer);
      if (!detectedMime) {
        setUploadError("Tipo de archivo no permitido. Solo PDF, JPEG o PNG.");
        return;
      }

      // 4. SHA-256
      const hash = await sha256Hex(buffer);

      // 5. Extensión desde el MIME detectado, no desde el nombre
      const ext = EXT_FROM_MIME[detectedMime];

      // 6. object_key con ruta canónica
      const objectKey = `${medicoId}/${reclamacionId}/${tipo}/${crypto.randomUUID()}.${ext}`;

      // 7. Subida directa al Storage con el cliente autenticado del navegador
      const supabase = createSupabaseBrowserClient();
      const { error: storageError } = await supabase.storage
        .from("soportes-reclamaciones")
        .upload(objectKey, file, { contentType: detectedMime, upsert: false });

      if (storageError) {
        setUploadError("No pudimos subir el archivo. Intenta de nuevo.");
        return;
      }

      // 8. Registrar en documentos — el servidor revalida magic bytes y borra si algo falla
      const res = await fetch(`/api/reclamaciones/${reclamacionId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object_key: objectKey,
          nombre_archivo: file.name,
          mime: detectedMime,
          size_bytes: file.size,
          hash_sha256: hash,
          tipo,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUploadError(
          typeof body.error === "string"
            ? body.error
            : "No pudimos registrar el documento. Intenta de nuevo."
        );
        return;
      }

      // 9. Limpiar y refrescar
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDocumentos();
    } catch {
      setUploadError("No pudimos completar la acción. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleVer(docId: string) {
    setActionLoading(docId);
    setListError(null);
    try {
      const res = await fetch(
        `/api/reclamaciones/${reclamacionId}/documentos/${docId}/url`
      );
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setListError("No pudimos generar el enlace. Intenta de nuevo.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEliminar(docId: string) {
    if (!window.confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) return;
    setActionLoading(docId);
    setListError(null);
    try {
      const res = await fetch(
        `/api/reclamaciones/${reclamacionId}/documentos/${docId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      await fetchDocumentos();
    } catch {
      setListError("No pudimos eliminar el documento. Intenta de nuevo.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mt-6">
      <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4 border-b border-[#E2E8F0] pb-2">
        Soportes
      </h2>

      {/* Formulario de subida */}
      <div className="space-y-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={uploading}
            className="h-9 px-3 border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
          >
            <option value="factura">Factura</option>
            <option value="examen">Examen</option>
            <option value="informe">Informe</option>
            <option value="receta">Receta</option>
            <option value="otro">Otro</option>
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={uploading}
            className="flex-1 min-w-0 h-9 px-3 border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] bg-white file:mr-2 file:border-0 file:bg-transparent file:text-sm file:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
          />

          <button
            type="button"
            onClick={handleSubir}
            disabled={!file || uploading}
            className="h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 shrink-0"
          >
            {uploading ? "Subiendo..." : "Subir"}
          </button>
        </div>

        {uploadError && (
          <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
            {uploadError}
          </p>
        )}
      </div>

      {/* Lista de documentos */}
      {listError && (
        <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2 mb-3">
          {listError}
        </p>
      )}

      {listLoading ? (
        <p className="text-sm text-[#64748B] py-1">Cargando soportes...</p>
      ) : documentos.length === 0 ? (
        <p className="text-sm text-[#64748B] py-1">Sin soportes adjuntos.</p>
      ) : (
        <ul className="space-y-2">
          {documentos.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC]"
            >
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F0FDFB] text-[#0F766E] border border-[#99F6E4] uppercase tracking-wide">
                {TIPO_LABELS[doc.tipo] ?? doc.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#0F172A] font-medium truncate">
                  {doc.nombre_archivo}
                </p>
                <p className="text-xs text-[#64748B]">{formatSize(doc.size_bytes)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleVer(doc.id)}
                  disabled={actionLoading === doc.id}
                  className="h-8 px-3 text-sm text-[#0F766E] border border-[#0F766E] rounded-lg hover:bg-[#F0FDFB] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
                >
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => handleEliminar(doc.id)}
                  disabled={actionLoading === doc.id}
                  className="h-8 px-3 text-sm text-[#DC2626] border border-[#FECACA] rounded-lg hover:bg-[#FEF2F2] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
