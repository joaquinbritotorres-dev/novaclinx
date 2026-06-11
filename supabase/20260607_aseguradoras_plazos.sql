-- ============================================================
-- Novaclinx — Migración: plazos parametrizables por aseguradora
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Agregar columnas de plazo a aseguradoras.
-- ADD COLUMN IF NOT EXISTS + DEFAULT backfill automático en Postgres:
-- todas las filas existentes quedan con los valores conservadores por defecto.
ALTER TABLE aseguradoras
  ADD COLUMN IF NOT EXISTS ventana_presentacion_dias INT  NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS cuenta_desde              TEXT NOT NULL DEFAULT 'factura'
                                                     CHECK (cuenta_desde IN ('atencion', 'factura')),
  ADD COLUMN IF NOT EXISTS ventana_pago_dias         INT  NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS tipo                      TEXT NOT NULL DEFAULT 'prepagada'
                                                     CHECK (tipo IN ('prepagada', 'seguro')),
  ADD COLUMN IF NOT EXISTS plazo_confirmado          BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Seed: plazos verificados ─────────────────────────────────────────────────
-- Solo tres aseguradoras con datos confirmados. El resto mantiene los defaults
-- (presentación 90 días desde factura, pago 60 días, plazo_confirmado=false).

-- Saludsa: 90 días desde emisión de factura, prepagada, 60 días pago
UPDATE aseguradoras
SET ventana_presentacion_dias = 90,
    cuenta_desde              = 'factura',
    ventana_pago_dias         = 60,
    tipo                      = 'prepagada',
    plazo_confirmado          = true
WHERE slug = 'saludsa';

-- Ecuasanitas: 90 días desde fecha de atención, prepagada, 60 días pago
UPDATE aseguradoras
SET ventana_presentacion_dias = 90,
    cuenta_desde              = 'atencion',
    ventana_pago_dias         = 60,
    tipo                      = 'prepagada',
    plazo_confirmado          = true
WHERE slug = 'ecuasanitas';

-- MediKen: 90 días desde emisión de factura, prepagada, 60 días pago
UPDATE aseguradoras
SET ventana_presentacion_dias = 90,
    cuenta_desde              = 'factura',
    ventana_pago_dias         = 60,
    tipo                      = 'prepagada',
    plazo_confirmado          = true
WHERE slug = 'mediken';

-- Las demás (Humana, BMI, Confiamed, Bupa, Plan Vital, Latina Seguros,
-- Best Doctors, PALIG, Otra) conservan los defaults del ALTER TABLE:
-- presentacion=90, cuenta_desde='factura', pago=60, tipo='prepagada',
-- plazo_confirmado=false  →  se mostrará advertencia de "plazo referencial".
