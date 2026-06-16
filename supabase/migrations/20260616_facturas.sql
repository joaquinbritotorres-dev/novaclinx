-- ============================================================
-- Novaclinx — Migración: Facturas electrónicas (consultas reales)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- ⚠ CONTEXTO LEGAL (Ecuador)
-- ------------------------------------------------------------
-- El emisor (el médico) debe CONSERVAR la factura electrónica (XML
-- autorizado) durante 7 años. Por eso:
--   • Guardamos metadatos en esta tabla Y respaldamos el XML en nuestro
--     Storage (bucket 'facturas-xml'); no dependemos solo del proveedor.
--   • Las FK a consulta/paciente son ON DELETE SET NULL: la factura es un
--     documento legal y debe sobrevivir aunque se borre la consulta o el
--     paciente del que salió.
--   • NO se crea política de DELETE para usuarios (ver RLS abajo).
--
-- ⚠ ESTADOS Y TIMEOUTS DEL SRI
-- ------------------------------------------------------------
-- El SRI a veces no responde al instante (timeout/mantenimiento), así que una
-- factura puede quedar en estado intermedio y sincronizarse después. El modelo
-- soporta esto con el estado 'procesando' y la columna `idempotency_key`
-- (permite reconciliar más tarde vía GET /documents/by-idempotency-key).
-- ------------------------------------------------------------


-- ─── 0. Función de trigger para `actualizado_en` ─────────────
-- Ya definida en la migración de config_facturacion; se re-declara con
-- CREATE OR REPLACE para que esta migración sea autosuficiente (idempotente).
CREATE OR REPLACE FUNCTION update_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─── 1. Tabla facturas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturas (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Emisor. ON DELETE CASCADE: si se borra el médico, sus facturas se van.
  medico_id                   UUID          NOT NULL
                                            REFERENCES medicos(id) ON DELETE CASCADE,

  -- Origen y comprador. Nullable + SET NULL: la factura (documento legal)
  -- sobrevive si se borra la consulta o el paciente.
  consulta_id                 UUID          REFERENCES consultas(id) ON DELETE SET NULL,
  paciente_id                 UUID          REFERENCES pacientes(id) ON DELETE SET NULL,

  -- Empresa emisora en AutorizadorEC (= config_facturacion.provider_company_id).
  provider_company_id         TEXT,

  -- Identificación del documento ante el SRI.
  clave_acceso                TEXT,         -- 49 dígitos; único si existe (ver índice)
  secuencial                  TEXT,         -- ej "001-001-000000001"
  numero_autorizacion         TEXT,
  fecha_autorizacion          TIMESTAMPTZ,

  -- Estado interno de Novaclinx. SIN CHECK estricto (los códigos del proveedor
  -- pueden variar); estados que manejamos:
  --   'pendiente'   → fila creada, aún no emitida
  --   'procesando'  → enviada al SRI, esperando respuesta / hubo timeout
  --   'autorizada'  → autorizada por el SRI
  --   'rechazada'   → rechazada por el SRI (ver `errores`)
  --   'fallida'     → fallo de emisión (red/proveedor; ver `errores`)
  estado                      TEXT          NOT NULL DEFAULT 'pendiente',

  ambiente                    TEXT          NOT NULL DEFAULT 'pruebas'
                                            CHECK (ambiente IN ('pruebas', 'produccion')),

  -- Datos del comprador (desnormalizados para mostrar la factura sin re-consultar).
  razon_social_comprador      TEXT,
  identificacion_comprador    TEXT,
  tipo_identificacion_comprador TEXT,

  importe_total               NUMERIC(12,2) NOT NULL,
  moneda                      TEXT          DEFAULT 'DOLAR',
  descripcion_servicio        TEXT,         -- ej "Consulta médica"

  -- Clave de idempotencia usada al emitir: permite reconciliar tras un timeout
  -- (GET /documents/by-idempotency-key) sin duplicar la emisión.
  idempotency_key             TEXT,

  -- Ruta del XML autorizado respaldado en Storage (se llena al sincronizar).
  xml_object_key              TEXT,

  -- Errores del SRI si rechazó/falló, para diagnóstico.
  errores                     JSONB,

  creado_en                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─── 2. Índices ──────────────────────────────────────────────
-- UNIQUE en clave_acceso permitiendo NULLs: en Postgres un índice único admite
-- múltiples NULL, así que filas aún no emitidas (clave_acceso IS NULL) conviven,
-- pero dos facturas no pueden compartir la misma clave de acceso real.
CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_clave_acceso
  ON facturas(clave_acceso);

CREATE INDEX IF NOT EXISTS idx_facturas_medico
  ON facturas(medico_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_facturas_consulta
  ON facturas(consulta_id);

CREATE INDEX IF NOT EXISTS idx_facturas_idempotency
  ON facturas(idempotency_key);


-- ─── 3. Trigger: mantener `actualizado_en` al día ────────────
CREATE OR REPLACE TRIGGER trg_facturas_actualizado_en
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION update_actualizado_en();


-- ─── 4. Row Level Security ───────────────────────────────────
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- Patrón universal del proyecto: el médico solo accede a SUS facturas vía
-- medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()).

-- SELECT: el dueño ve sus facturas.
CREATE POLICY facturas_select ON facturas
  FOR SELECT
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- INSERT: el dueño solo inserta facturas a su propio nombre.
CREATE POLICY facturas_insert ON facturas
  FOR INSERT
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- UPDATE: el dueño actualiza sus facturas. Necesario para SINCRONIZAR el
-- estado después de un timeout del SRI (pendiente/procesando → autorizada/…).
CREATE POLICY facturas_update ON facturas
  FOR UPDATE
  USING (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())
  );

-- DELETE: NO se crea política de DELETE para usuarios. Las facturas son
-- documentos legales que deben conservarse 7 años. Con RLS activo y sin
-- política de DELETE, ningún usuario (anon/authenticated) puede borrarlas; el
-- service_role (server-side) sí puede, para casos administrativos puntuales.


-- ─── 5. Bucket privado 'facturas-xml' (respaldo XML) ─────────
-- Privado. Los XML se suben/leen SOLO server-side con el cliente service-role,
-- que bypassa el RLS de Storage. Por eso NO se crean políticas de usuario
-- (mismo patrón que el bucket 'firmas-electronicas', que también es de acceso
-- exclusivamente server-side). Si en el futuro se quisiera acceso directo
-- desde el navegador, habría que añadir políticas por médico en storage.objects.
INSERT INTO storage.buckets (id, name, public)
VALUES ('facturas-xml', 'facturas-xml', false)
ON CONFLICT (id) DO NOTHING;
