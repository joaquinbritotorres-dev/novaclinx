-- ============================================================
-- Novaclinx — Migración: Módulo Cobros a Aseguradoras (cimiento)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ─── 1. Catálogo de aseguradoras ─────────────────────────────
CREATE TABLE IF NOT EXISTS aseguradoras (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  activo     BOOLEAN     NOT NULL DEFAULT TRUE,
  config     JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_aseguradoras_updated_at
  BEFORE UPDATE ON aseguradoras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE aseguradoras ENABLE ROW LEVEL SECURITY;

-- Lectura permitida a cualquier usuario autenticado (es un catálogo público interno)
CREATE POLICY aseguradoras_read ON aseguradoras
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed inicial
INSERT INTO aseguradoras (nombre, slug) VALUES
  ('Saludsa',         'saludsa'),
  ('Humana',          'humana'),
  ('BMI',             'bmi'),
  ('Ecuasanitas',     'ecuasanitas'),
  ('Confiamed',       'confiamed'),
  ('Bupa',            'bupa'),
  ('Plan Vital',      'plan-vital'),
  ('MediKen',         'mediken'),
  ('Latina Seguros',  'latina-seguros'),
  ('Best Doctors',    'best-doctors'),
  ('PALIG',           'palig'),
  ('Otra',            'otra')
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Seguros por paciente (N por paciente) ─────────────────
CREATE TABLE IF NOT EXISTS paciente_seguros (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  aseguradora_id   UUID        NOT NULL REFERENCES aseguradoras(id),
  numero_afiliado  TEXT,
  numero_titular   TEXT,
  plan             TEXT,
  tipo_cobertura   TEXT        NOT NULL DEFAULT 'reembolso'
                               CHECK (tipo_cobertura IN ('reembolso', 'red_prestador')),
  es_titular       BOOLEAN     NOT NULL DEFAULT TRUE,
  parentesco       TEXT,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_paciente_seguros_updated_at
  BEFORE UPDATE ON paciente_seguros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE paciente_seguros ENABLE ROW LEVEL SECURITY;

-- El médico dueño del paciente es el único que ve/modifica
CREATE POLICY paciente_seguros_own ON paciente_seguros
  FOR ALL
  USING (
    paciente_id IN (
      SELECT p.id FROM pacientes p
      INNER JOIN medicos m ON p.medico_id = m.id
      WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    paciente_id IN (
      SELECT p.id FROM pacientes p
      INNER JOIN medicos m ON p.medico_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_paciente_seguros_paciente
  ON paciente_seguros(paciente_id)
  WHERE deleted_at IS NULL;

-- ─── 3. Consentimiento LOPDP (auditable, append-only) ─────────
-- Registro permanente: quién, cuándo, qué texto autorizó/revocó.
-- Nunca se modifica ni se borra. El estado actual es el registro más reciente.
CREATE TABLE IF NOT EXISTS consentimientos_seguro (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id     UUID        NOT NULL REFERENCES medicos(id)   ON DELETE CASCADE,
  otorgado      BOOLEAN     NOT NULL,
  version_texto TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Sin updated_at ni deleted_at: es tabla de auditoría, solo INSERT
);

ALTER TABLE consentimientos_seguro ENABLE ROW LEVEL SECURITY;

-- Solo INSERT y SELECT. Nunca UPDATE ni DELETE.
CREATE POLICY consentimientos_seguro_insert ON consentimientos_seguro
  FOR INSERT
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

CREATE POLICY consentimientos_seguro_select ON consentimientos_seguro
  FOR SELECT
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_consentimientos_paciente
  ON consentimientos_seguro(paciente_id, created_at DESC);

-- ─── 4. Reclamaciones (esquema — sin UI todavía) ──────────────
CREATE TABLE IF NOT EXISTS reclamaciones (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id           UUID          NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  paciente_id         UUID          NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id         UUID          REFERENCES consultas(id),
  aseguradora_id      UUID          NOT NULL REFERENCES aseguradoras(id),
  paciente_seguro_id  UUID          REFERENCES paciente_seguros(id),
  estado              TEXT          NOT NULL DEFAULT 'borrador'
                                    CHECK (estado IN (
                                      'borrador','armada','enviada','en_auditoria',
                                      'glosada','subsanada','aprobada','pagada','rechazada'
                                    )),
  tipo                TEXT          NOT NULL CHECK (tipo IN ('reembolso','red')),
  fecha_atencion      DATE,
  fecha_envio         TIMESTAMPTZ,
  canal_envio         TEXT          CHECK (canal_envio IN ('portal','email','fisico')),
  monto               NUMERIC(10,2),
  motivo_glosa        TEXT,
  fecha_pago          DATE,
  monto_pagado        NUMERIC(10,2),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_reclamaciones_updated_at
  BEFORE UPDATE ON reclamaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE reclamaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY reclamaciones_own ON reclamaciones
  FOR ALL
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_reclamaciones_medico
  ON reclamaciones(medico_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reclamaciones_paciente
  ON reclamaciones(paciente_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reclamaciones_estado
  ON reclamaciones(medico_id, estado)
  WHERE deleted_at IS NULL;
