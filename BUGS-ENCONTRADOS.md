# Bitácora — Cacería de bugs (rama `caceria-bugs`)

Baseline al iniciar: `tsc` limpio · `vitest` 100/100 · `build` OK · base `12ff4f8` (main, sin PayPhone).

Zonas congeladas en esta rama: facturación (ya migrada a AutorizadorEC; `lib/datil/*` fue eliminado), lógica clínica de recetas, `lib/prompts/novaclinx-prompts-v1.ts`, `lib/scribe/*`, `app/api/grabaciones/*`. (PayPhone no está en esta rama.)

| # | Módulo | Bug | Fix | Commit |
|---|--------|-----|-----|--------|
| 1 | Pacientes / Consultas (perf) | Detalle de paciente hacía 3 queries en cascada (paciente→consultas→reclamaciones, ~3.6s); detalle de consulta 2 en cascada (factura→seguros); lista de pacientes en cascada + over-fetch de `resumen_corto` no usado | `Promise.all` para las queries independientes (RLS protege cada tabla); `resumen_corto` removido del select de la lista | cfd0043 |
| 2 | Certificados / Descargas PDF | Descargas de certificado, nota y receta usaban `<a download>`/`a.click()` directo: si el endpoint devolvía 422 (gate de corchetes), 400 (firma) o 500, el médico descargaba un JSON roto o no veía nada — fallo silencioso. La receta 422 ("dosis sin resolver") era invisible. | `fetch` + blob con `res.ok`, mensaje de error en UI y estado de carga, en `CertificadoModal` y `DescargasSection` | 65abbbe |
| 3 | Generación SOAP (typo) | Artefacto "Derivaciónación" en notas SOAP, parcheado solo en PDF (no en web) y con un replacer agresivo (`helpers.ts:110`) que corrompía el plural "derivaciones"→"Derivación" | Raíz: `corregirTypoDerivacion` en `generarNotaSOAP` (autorizado, zona congelada); eliminados los 4 replacers de Derivación en `helpers.ts` (una sola capa) | 753319d |
| 4 | `/m/[slug]` perfil público (SEGURIDAD) | **XSS almacenado** en el JSON-LD: `dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}` no escapa `<`; el médico controla nombre/bio/dirección/teléfono → `</script><script>…` ejecutaba en la página pública sin login | Escape `<` → `<` (patrón estándar) antes de inyectar el JSON-LD. Verificado: `</script>` ya no rompe el tag | (pendiente) |

## Hallazgos sin fix (recomendaciones)

- **`/m/[slug]` sin rate limiting:** es público y sin login. La query es un lookup por `slug` (índice único) + `perfil_publico=true`, así que el impacto de abuso es acotado, pero no hay límite de tasa. Implementarlo bien requiere infra (middleware + store tipo Upstash/Redis) — decisión de infraestructura, no un fix puntual. Recomendado antes de exposición pública agresiva.

## Pendientes de autorización (zona congelada)

_(ninguno — el typo "Derivaciónación" se resolvió en la raíz con tu autorización; ver fila #3)_

**Nota de deuda:** las notas YA guardadas antes de este fix conservan el typo en su `nota_soap` (la raíz solo limpia generaciones nuevas, y se quitaron los replacers de PDF). Es cosmético; una migración de datos requeriría SQL (no se hizo).

## Detalle

