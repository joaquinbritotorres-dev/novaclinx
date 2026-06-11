-- ============================================================
-- Novaclinx — Migración: bucket privado de soportes + RLS
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ─── 1. Bucket privado ───────────────────────────────────────
-- file_size_limit en bytes: 15 MB = 15 * 1024 * 1024 = 15 728 640
-- allowed_mime_types rechazado por el propio bucket antes de que RLS actúe.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soportes-reclamaciones',
  'soportes-reclamaciones',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 15728640,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- ─── 2. Políticas RLS en storage.objects ─────────────────────
-- Convención de ruta: {medico_id}/{reclamacion_id}/{tipo}/{uuid}.{ext}
-- (storage.foldername(name))[1]  →  primer segmento = medico_id
--
-- IMPORTANTE: en este proyecto medico_id ≠ auth.uid().
-- auth.uid() es medicos.user_id; el medico_id real se obtiene
-- con la subconsulta (SELECT id FROM medicos WHERE user_id = auth.uid()).

DROP POLICY IF EXISTS soportes_select ON storage.objects;
DROP POLICY IF EXISTS soportes_insert ON storage.objects;
DROP POLICY IF EXISTS soportes_update ON storage.objects;
DROP POLICY IF EXISTS soportes_delete ON storage.objects;

-- SELECT
CREATE POLICY soportes_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'soportes-reclamaciones'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE user_id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY soportes_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'soportes-reclamaciones'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY soportes_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'soportes-reclamaciones'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'soportes-reclamaciones'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE user_id = auth.uid()
    )
  );

-- DELETE
CREATE POLICY soportes_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'soportes-reclamaciones'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM medicos WHERE user_id = auth.uid()
    )
  );
