-- ============================================================
-- Novaclinx — Migración: Integración Dátil (Facturas)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Agregar campos de facturación a pacientes
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS identificacion TEXT,
ADD COLUMN IF NOT EXISTS tipo_identificacion TEXT CHECK (tipo_identificacion IN ('04', '05', '06', '07')),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT;

-- 2. Crear tabla facturas
CREATE TABLE IF NOT EXISTS facturas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id     UUID        NOT NULL UNIQUE REFERENCES consultas(id) ON DELETE CASCADE,
  medico_id       UUID        NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  estado          TEXT        NOT NULL CHECK (estado IN ('pendiente', 'emitida', 'autorizada', 'error')),
  datil_id        TEXT,
  clave_acceso    TEXT,
  monto           NUMERIC(10,2) NOT NULL,
  error_mensaje   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trigger para updated_at en facturas
CREATE OR REPLACE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Habilitar RLS en facturas
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- 5. Política RLS: el médico solo ve/modifica sus propias facturas
CREATE POLICY facturas_own_all ON facturas
  FOR ALL
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- 6. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_facturas_consulta ON facturas(consulta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_medico ON facturas(medico_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
