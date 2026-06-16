-- ============================================================
-- Novaclinx — Migración: Vault para el "Company API Key" (sk_)
--                        de facturación por médico (AutorizadorEC)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- ⚠ QUÉ ES Y POR QUÉ
-- ------------------------------------------------------------
-- Al configurar su facturación electrónica, cada médico recibe del
-- proveedor AutorizadorEC un "Company API Key" con prefijo sk_...
-- Esa key permite EMITIR FACTURAS LEGALES en nombre del médico, así
-- que es una credencial sensible y NO puede guardarse en texto plano.
--
-- Usamos Supabase Vault (vault.secrets / vault.decrypted_secrets), que
-- cifra los secretos en disco (Transparent Column Encryption) y maneja
-- las llaves de cifrado FUERA de SQL. En config_facturacion guardamos
-- únicamente el UUID de referencia al secreto, nunca la key.
--
-- ⚠ SEGURIDAD DE LOGS
-- ------------------------------------------------------------
-- Como estas funciones reciben/leen el sk_ como parámetro, conviene
-- tener DESACTIVADO el statement logging del proyecto (p. ej.
-- log_statement = 'none' y log_min_duration_statement alto) para que
-- los secretos no queden escritos en los logs de Postgres. Esto es
-- solo una ADVERTENCIA; esta migración NO cambia configuración del
-- servidor.
--
-- ⚠ ACCESO RESTRINGIDO
-- ------------------------------------------------------------
-- Las tres funciones (guardar/leer/borrar) son SECURITY DEFINER y su
-- EXECUTE se concede SOLO a service_role. Un usuario logueado normal
-- (anon / authenticated) NUNCA debe poder ejecutarlas: solo el cliente
-- server-side con service role (createSupabaseServerClientWithServiceRole)
-- puede tocar estas keys.
--
-- ⚠ NOTA DE VERSIÓN (firmas de Vault)
-- ------------------------------------------------------------
-- Se usan las formas documentadas de Supabase Vault:
--   vault.create_secret(secret text, name text, description text) -> uuid
--   vault.update_secret(id uuid, secret text, name text, description text) -> void
-- Los NOMBRES de los argumentos pueden variar levemente entre versiones,
-- pero el orden posicional documentado es el de arriba. Si tu versión
-- difiere, ajusta la llamada antes de aplicar (no inventes columnas).
-- ------------------------------------------------------------


-- ─── 1. Extensión Vault (idempotente) ────────────────────────
-- En Supabase suele venir habilitada. Esto la asegura sin romper
-- si ya existe.
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


-- ─── 2. Columna de referencia al secreto ─────────────────────
-- Guarda SOLO el UUID del secreto en vault.secrets, jamás la key en
-- texto plano. Nullable porque al inicio el médico aún no tiene sk_.
ALTER TABLE config_facturacion
  ADD COLUMN IF NOT EXISTS provider_api_key_secret_id UUID;

COMMENT ON COLUMN config_facturacion.provider_api_key_secret_id IS
  'Referencia (UUID) al secreto en vault.secrets que contiene el Company API Key (sk_) del médico. NUNCA almacena la key en texto plano.';


-- ─── 3. guardar_sk_medico(p_medico_id, p_sk) -> uuid ─────────
-- Crea o actualiza el secreto del médico en el Vault.
--   • Si el médico ya tiene provider_api_key_secret_id → vault.update_secret.
--   • Si no tiene → vault.create_secret y guarda el uuid en la fila.
-- SECURITY DEFINER + search_path vacío: la función corre como su dueño
-- (postgres) con acceso al Vault, y al fijar search_path = '' obligamos
-- a calificar TODOS los objetos por schema (anti-hijacking).
CREATE OR REPLACE FUNCTION guardar_sk_medico(p_medico_id uuid, p_sk text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id uuid;
  v_name text := 'sk_facturacion_medico_' || p_medico_id::text;
  v_desc text := 'Company API Key (sk_) de AutorizadorEC para el médico ' || p_medico_id::text;
BEGIN
  -- Localizar la config del médico (y su secreto, si ya existe).
  SELECT provider_api_key_secret_id
    INTO v_secret_id
    FROM public.config_facturacion
   WHERE medico_id = p_medico_id;

  -- Si no hay fila de config, no creamos un secreto huérfano: error claro.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe config_facturacion para el médico %', p_medico_id;
  END IF;

  IF v_secret_id IS NOT NULL THEN
    -- Ya tiene secreto → actualizar su valor cifrado en el Vault.
    PERFORM vault.update_secret(v_secret_id, p_sk, v_name, v_desc);
  ELSE
    -- No tiene → crear secreto nuevo y guardar su referencia en la fila.
    v_secret_id := vault.create_secret(p_sk, v_name, v_desc);

    UPDATE public.config_facturacion
       SET provider_api_key_secret_id = v_secret_id
     WHERE medico_id = p_medico_id;
  END IF;

  RETURN v_secret_id;
END;
$$;


-- ─── 4. leer_sk_medico(p_medico_id) -> text ──────────────────
-- Devuelve el sk_ descifrado del médico, o NULL si no tiene secreto.
CREATE OR REPLACE FUNCTION leer_sk_medico(p_medico_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id uuid;
  v_sk        text;
BEGIN
  SELECT provider_api_key_secret_id
    INTO v_secret_id
    FROM public.config_facturacion
   WHERE medico_id = p_medico_id;

  -- Sin fila de config o sin secreto guardado → NULL.
  IF v_secret_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Descifrar el secreto desde la vista del Vault.
  SELECT decrypted_secret
    INTO v_sk
    FROM vault.decrypted_secrets
   WHERE id = v_secret_id;

  RETURN v_sk;
END;
$$;


-- ─── 5. borrar_sk_medico(p_medico_id) -> void ────────────────
-- Elimina el secreto del Vault (si existe) y limpia la referencia.
CREATE OR REPLACE FUNCTION borrar_sk_medico(p_medico_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT provider_api_key_secret_id
    INTO v_secret_id
    FROM public.config_facturacion
   WHERE medico_id = p_medico_id;

  IF v_secret_id IS NOT NULL THEN
    -- Borrar el secreto cifrado del Vault.
    DELETE FROM vault.secrets WHERE id = v_secret_id;

    -- Limpiar la referencia en la config del médico.
    UPDATE public.config_facturacion
       SET provider_api_key_secret_id = NULL
     WHERE medico_id = p_medico_id;
  END IF;
END;
$$;


-- ─── 6. Permisos: SOLO service_role ──────────────────────────
-- Por defecto una función nueva concede EXECUTE a PUBLIC. Lo revocamos
-- de PUBLIC/anon/authenticated y lo concedemos únicamente a service_role.
-- Así, solo el cliente server-side con service role puede ejecutarlas.

REVOKE EXECUTE ON FUNCTION guardar_sk_medico(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION leer_sk_medico(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION borrar_sk_medico(uuid)        FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION guardar_sk_medico(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION leer_sk_medico(uuid)          TO service_role;
GRANT EXECUTE ON FUNCTION borrar_sk_medico(uuid)        TO service_role;
