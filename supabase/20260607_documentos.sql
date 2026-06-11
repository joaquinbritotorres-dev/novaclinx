-- ============================================================
-- Novaclinx — Migración: tabla documentos (soportes de reclamación)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS documentos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamacion_id  UUID        NOT NULL REFERENCES reclamaciones(id) ON DELETE CASCADE,
  medico_id       UUID        NOT NULL REFERENCES medicos(id)       ON DELETE CASCADE,
  tipo            TEXT        NOT NULL
                              CHECK (tipo IN ('factura','examen','informe','receta','otro')),
  object_key      TEXT        NOT NULL UNIQUE,   -- ruta completa en el bucket
  nombre_archivo  TEXT        NOT NULL,
  mime            TEXT        NOT NULL,
  size_bytes      BIGINT      NOT NULL CHECK (size_bytes > 0),
  hash_sha256     TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documentos_reclamacion
  ON documentos(reclamacion_id);

CREATE INDEX IF NOT EXISTS idx_documentos_medico
  ON documentos(medico_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Mismo patrón que el resto del proyecto:
-- medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
CREATE POLICY documentos_own ON documentos
  FOR ALL
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );
