# Bitácora — Cacería de bugs (rama `caceria-bugs`)

Baseline al iniciar: `tsc` limpio · `vitest` 100/100 · `build` OK · base `12ff4f8` (main, sin PayPhone).

Zonas congeladas en esta rama: `lib/datil/*`, lógica clínica de recetas, `lib/prompts/novaclinx-prompts-v1.ts`, `lib/scribe/*`, `app/api/grabaciones/*`. (PayPhone no está en esta rama.)

| # | Módulo | Bug | Fix | Commit |
|---|--------|-----|-----|--------|
| 1 | Pacientes / Consultas (perf) | Detalle de paciente hacía 3 queries en cascada (paciente→consultas→reclamaciones, ~3.6s); detalle de consulta 2 en cascada (factura→seguros); lista de pacientes en cascada + over-fetch de `resumen_corto` no usado | `Promise.all` para las queries independientes (RLS protege cada tabla); `resumen_corto` removido del select de la lista | (pendiente) |

## Pendientes de autorización (zona congelada)

_(ninguno aún)_

## Detalle

