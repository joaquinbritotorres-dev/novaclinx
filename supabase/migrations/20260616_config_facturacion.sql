-- ============================================================
-- Novaclinx — Migración: Configuración de facturación electrónica
--                        por médico (multi-médico, SRI Ecuador)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- ⚠ NOTA DE SEGURIDAD — DELEGACIÓN DE CUSTODIA (LEER ANTES DE MODIFICAR)
-- ------------------------------------------------------------
-- La firma electrónica .p12 del médico y su clave del certificado
-- NUNCA se almacenan en nuestra base de datos. Se delegan a un
-- proveedor externo (AutorizadorEC), que las custodia. Nosotros
-- guardamos SOLO referencias seguras (p. ej. `provider_company_id`,
-- el identificador del emisor que ese proveedor nos devuelve).
--
-- Por eso esta tabla NO tiene —ni debe tener nunca— columnas para:
--   • el archivo .p12 / certificado (BYTEA, base64, ruta, etc.)
--   • la clave/contraseña del certificado
-- Añadir cualquiera de esas columnas sería un fallo grave de seguridad.
-- ------------------------------------------------------------


-- ─── 1. Función de trigger para `actualizado_en` ─────────────
-- El proyecto ya tiene `update_updated_at()`, pero está fija a la
-- columna `updated_at`. Esta tabla usa el nombre en español
-- `actualizado_en`, así que definimos una función equivalente.
-- (CREATE OR REPLACE → idempotente; si ya existe, no rompe nada.)
CREATE OR REPLACE FUNCTION update_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─── 2. Tabla config_facturacion ─────────────────────────────
-- Una fila por médico (ver UNIQUE más abajo) con los datos del
-- emisor y el estado de su onboarding de facturación electrónica.
CREATE TABLE IF NOT EXISTS config_facturacion (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- De qué médico es esta configuración. ON DELETE CASCADE: si se
  -- borra el médico, su config se elimina con él.
  medico_id                   UUID        NOT NULL
                                          REFERENCES medicos(id) ON DELETE CASCADE,

  -- Datos del emisor ante el SRI.
  ruc                         TEXT,                 -- RUC del médico
  razon_social                TEXT,                 -- nombre legal
  nombre_comercial            TEXT,                 -- opcional

  -- Referencia segura: ID del emisor en el sistema de AutorizadorEC.
  -- Nullable porque al inicio (antes de subir la firma) aún no existe.
  provider_company_id         TEXT,

  -- Ambiente del SRI. Por defecto 'pruebas' hasta certificar producción.
  ambiente                    TEXT        NOT NULL DEFAULT 'pruebas'
                                          CHECK (ambiente IN ('pruebas', 'produccion')),

  -- Estado del onboarding de facturación:
  --   pendiente → aún no sube la firma
  --   activo    → firma cargada (en AutorizadorEC) y lista para emitir
  --   error     → algo falló en el proceso
  estado                      TEXT        NOT NULL DEFAULT 'pendiente'
                                          CHECK (estado IN ('pendiente', 'activo', 'error')),

  -- Vencimiento del certificado del médico (lo reporta el proveedor),
  -- para alertar antes de que expire. Nullable hasta tener firma.
  certificado_vigencia_hasta  DATE,

  creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cada médico tiene UNA sola configuración de facturación.
  -- (Esta restricción crea además un índice único sobre medico_id,
  --  que sirve para las búsquedas por médico — no hace falta otro.)
  CONSTRAINT config_facturacion_medico_unico UNIQUE (medico_id)
);


-- ─── 3. Trigger: mantener `actualizado_en` al día ────────────
CREATE OR REPLACE TRIGGER trg_config_facturacion_actualizado_en
  BEFORE UPDATE ON config_facturacion
  FOR EACH ROW EXECUTE FUNCTION update_actualizado_en();


-- ─── 4. Row Level Security ───────────────────────────────────
ALTER TABLE config_facturacion ENABLE ROW LEVEL SECURITY;

-- Políticas separadas por operación, siguiendo el patrón universal
-- del proyecto: cada médico solo accede a SU propia config, vía
-- medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()).

-- SELECT: solo ve su propia config.
CREATE POLICY config_facturacion_select ON config_facturacion
  FOR SELECT
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- INSERT: solo puede crear config a su propio nombre.
CREATE POLICY config_facturacion_insert ON config_facturacion
  FOR INSERT
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- UPDATE: solo modifica su propia config (y no puede reasignarla a otro médico).
CREATE POLICY config_facturacion_update ON config_facturacion
  FOR UPDATE
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- DELETE: solo borra su propia config.
CREATE POLICY config_facturacion_delete ON config_facturacion
  FOR DELETE
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );
