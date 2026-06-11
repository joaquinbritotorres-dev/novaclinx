-- ============================================================
-- Novaclinx — Migración: columnas Dátil que faltaban en facturas
-- La tabla se creó antes de que se añadieran estas columnas al
-- CREATE TABLE, así que se agregan aquí de forma idempotente.
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS datil_id      TEXT,
  ADD COLUMN IF NOT EXISTS clave_acceso  TEXT,
  ADD COLUMN IF NOT EXISTS numero        TEXT;
