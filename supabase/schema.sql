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

-- ============================================================
-- Tablas creadas manualmente, versionadas retroactivamente.
-- ------------------------------------------------------------
-- Estas 5 tablas YA EXISTEN en la base (se aplicaron a mano). Sus columnas y
-- relaciones se reconstruyeron desde el uso real en el código (queries/inserts);
-- el RLS sigue el patrón universal del proyecto. Es documentación del esquema
-- real para que el repo lo refleje — NO ejecutar contra una base que ya las
-- tiene. Si alguna columna/tipo difiere de la base real, conciliar con Supabase.
-- ============================================================

-- ─── Tabla: citas (agenda) — creada manualmente, versionada retroactivamente ──
CREATE TABLE IF NOT EXISTS citas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       UUID        NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  paciente_id     UUID        REFERENCES pacientes(id) ON DELETE SET NULL,
  nombre_paciente TEXT,       -- nombre suelto (cita sin paciente registrado)
  inicio          TIMESTAMPTZ NOT NULL,
  duracion_min    INTEGER     NOT NULL DEFAULT 30,
  motivo          TEXT,
  estado          TEXT        NOT NULL DEFAULT 'programada'
                              CHECK (estado IN ('programada','confirmada','atendida','no_show','cancelada')),
  notas           TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_citas_updated_at
  BEFORE UPDATE ON citas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY citas_own_all ON citas
  FOR ALL
  USING (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
  WITH CHECK (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_citas_medico_inicio
  ON citas(medico_id, inicio)
  WHERE deleted_at IS NULL;

-- ─── Tabla: comunicaciones (bitácora WhatsApp) — versionada retroactivamente ──
-- Append-only: registro de comunicaciones enviadas (no se edita).
CREATE TABLE IF NOT EXISTS comunicaciones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id   UUID        NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  paciente_id UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  cita_id     UUID        REFERENCES citas(id) ON DELETE SET NULL,
  tipo        TEXT        NOT NULL,   -- p. ej. 'recordatorio', 'otro'
  canal       TEXT,                   -- p. ej. 'whatsapp'
  contenido   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comunicaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY comunicaciones_own_all ON comunicaciones
  FOR ALL
  USING (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
  WITH CHECK (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_comunicaciones_paciente
  ON comunicaciones(medico_id, paciente_id, created_at DESC);

-- ─── Tabla: grabaciones_consulta (scribe de voz) — versionada retroactivamente ─
CREATE TABLE IF NOT EXISTS grabaciones_consulta (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id         UUID        NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  paciente_id       UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id       UUID        REFERENCES consultas(id) ON DELETE SET NULL,
  estado            TEXT        NOT NULL DEFAULT 'consentida'
                                CHECK (estado IN ('consentida','transcrita','nota_generada','aprobada','descartada','error')),
  audio_path        TEXT,
  transcripcion     TEXT,
  error_detalle     TEXT,
  consentimiento_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_grabaciones_consulta_updated_at
  BEFORE UPDATE ON grabaciones_consulta FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE grabaciones_consulta ENABLE ROW LEVEL SECURITY;

CREATE POLICY grabaciones_consulta_own_all ON grabaciones_consulta
  FOR ALL
  USING (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
  WITH CHECK (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_grabaciones_medico
  ON grabaciones_consulta(medico_id, created_at DESC);

-- ─── Tabla: inventario_items (vacunas/insumos) — versionada retroactivamente ──
CREATE TABLE IF NOT EXISTS inventario_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       UUID        NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL CHECK (tipo IN ('vacuna','insumo')),
  nombre          TEXT        NOT NULL,
  descripcion     TEXT,
  lote            TEXT,
  fecha_caducidad DATE,
  cantidad        INTEGER     NOT NULL DEFAULT 0,
  unidad          TEXT        NOT NULL,
  stock_minimo    INTEGER     NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_inventario_items_updated_at
  BEFORE UPDATE ON inventario_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE inventario_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventario_items_own_all ON inventario_items
  FOR ALL
  USING (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
  WITH CHECK (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_inventario_items_medico
  ON inventario_items(medico_id)
  WHERE deleted_at IS NULL;

-- ─── Tabla: inventario_movimientos — versionada retroactivamente ──────────────
-- Append-only: cada entrada/salida de stock. El ajuste de cantidad es atómico
-- vía el RPC registrar_movimiento_inventario (migrations/20260617).
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       UUID        NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  item_id         UUID        NOT NULL REFERENCES inventario_items(id) ON DELETE CASCADE,
  tipo_movimiento TEXT        NOT NULL CHECK (tipo_movimiento IN ('entrada','salida')),
  cantidad        INTEGER     NOT NULL CHECK (cantidad > 0),
  motivo          TEXT,
  paciente_id     UUID        REFERENCES pacientes(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventario_movimientos_own_all ON inventario_movimientos
  FOR ALL
  USING (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
  WITH CHECK (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_inventario_movimientos_item
  ON inventario_movimientos(item_id, created_at DESC);
