-- ============================================================
-- Novaclinx — Schema SQL
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ─── Función de updated_at automático ───────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Tabla: medicos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicos (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre                 TEXT        NOT NULL,
  especialidad           TEXT        NOT NULL
                                     CHECK (especialidad IN ('pediatria','ginecologia','general','cirugia','otro')),
  pais                   TEXT        NOT NULL DEFAULT 'Ecuador',
  onboarding_completado  BOOLEAN     NOT NULL DEFAULT FALSE,
  plan                   TEXT        NOT NULL DEFAULT 'beta',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_medicos_updated_at
  BEFORE UPDATE ON medicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;

-- Cada médico solo ve y modifica su propio registro
CREATE POLICY medicos_own_all ON medicos
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Tabla: pacientes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       UUID        REFERENCES medicos(id) ON DELETE CASCADE NOT NULL,
  nombre          TEXT        NOT NULL,
  edad            INTEGER     CHECK (edad > 0 AND edad < 150),
  sexo            TEXT        CHECK (sexo IN ('M','F','O')),
  notas_generales TEXT,
  importado       BOOLEAN     DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pacientes_own_all ON pacientes
  FOR ALL
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- ─── Tabla: consultas ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultas (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id             UUID        REFERENCES pacientes(id) ON DELETE CASCADE NOT NULL,
  medico_id               UUID        REFERENCES medicos(id)  ON DELETE CASCADE NOT NULL,
  fecha                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  input_medico            TEXT        NOT NULL
                                      CHECK (length(input_medico) > 0 AND length(input_medico) < 5000),
  nota_soap               TEXT,
  indicaciones            TEXT,
  seguimiento_fecha       DATE,
  seguimiento_motivo      TEXT,
  seguimiento_completado  BOOLEAN     DEFAULT FALSE,
  resumen_corto           TEXT,
  aprobada_por_medico     BOOLEAN     NOT NULL DEFAULT FALSE,
  aprobada_en             TIMESTAMPTZ,
  modelo_usado            TEXT        DEFAULT 'gpt-4o-mini',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_consultas_updated_at
  BEFORE UPDATE ON consultas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultas_own_all ON consultas
  FOR ALL
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- ─── Tabla: eventos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id   UUID        REFERENCES medicos(id) ON DELETE CASCADE NOT NULL,
  tipo        TEXT        NOT NULL,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY eventos_own_all ON eventos
  FOR ALL
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- ─── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pacientes_medico
  ON pacientes(medico_id);

CREATE INDEX IF NOT EXISTS idx_pacientes_nombre
  ON pacientes(medico_id, nombre);

CREATE INDEX IF NOT EXISTS idx_consultas_paciente
  ON consultas(paciente_id);

CREATE INDEX IF NOT EXISTS idx_consultas_medico_fecha
  ON consultas(medico_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_consultas_seguimiento
  ON consultas(medico_id, seguimiento_fecha)
  WHERE seguimiento_fecha IS NOT NULL
    AND seguimiento_completado = FALSE;

-- ─── Integración Dátil ───────────────────────────────────────
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS identificacion TEXT,
ADD COLUMN IF NOT EXISTS tipo_identificacion TEXT CHECK (tipo_identificacion IN ('04', '05', '06', '07')),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT;

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

CREATE OR REPLACE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY facturas_own_all ON facturas
  FOR ALL
  USING (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
  WITH CHECK (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_facturas_consulta ON facturas(consulta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_medico ON facturas(medico_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
