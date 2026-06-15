# Bitácora — Cacería de bugs (rama `caceria-bugs`)

Baseline al iniciar: `tsc` limpio · `vitest` 100/100 · `build` OK · base `12ff4f8` (main, sin PayPhone).

Zonas congeladas en esta rama: `lib/datil/*`, lógica clínica de recetas, `lib/prompts/novaclinx-prompts-v1.ts`, `lib/scribe/*`, `app/api/grabaciones/*`. (PayPhone no está en esta rama.)

| # | Módulo | Bug | Fix | Commit |
|---|--------|-----|-----|--------|
| 1 | Pacientes / Consultas (perf) | Detalle de paciente hacía 3 queries en cascada (paciente→consultas→reclamaciones, ~3.6s); detalle de consulta 2 en cascada (factura→seguros); lista de pacientes en cascada + over-fetch de `resumen_corto` no usado | `Promise.all` para las queries independientes (RLS protege cada tabla); `resumen_corto` removido del select de la lista | cfd0043 |
| 2 | Certificados / Descargas PDF | Descargas de certificado, nota y receta usaban `<a download>`/`a.click()` directo: si el endpoint devolvía 422 (gate de corchetes), 400 (firma) o 500, el médico descargaba un JSON roto o no veía nada — fallo silencioso. La receta 422 ("dosis sin resolver") era invisible. | `fetch` + blob con `res.ok`, mensaje de error en UI y estado de carga, en `CertificadoModal` y `DescargasSection` | (pendiente) |

## Pendientes de autorización (zona congelada)

### A — Typo "Derivaciónación" en notas SOAP
**Hallazgo (contradice la premisa):** el typo NO vive como texto en `lib/prompts`; el prompt dice correctamente `"Derivación:"` (líneas 274 y 730). Es un **artefacto de generación del modelo** (a veces duplica el sufijo). Hoy se parchea con regex SOLO en la capa PDF (`lib/pdf/shared/helpers.ts:109-112`), por eso el typo **sí aparece en la vista web** del detalle de consulta (que muestra `nota_soap` cruda).

**Opciones de fix:**
1. **Raíz (zona congelada):** 1 línea de normalización en `generarNotaSOAP` (`lib/prompts/novaclinx-prompts-v1.ts`), igual que el normalizador de `[NO REGISTRADO]` ya existente: `texto.replace(/Derivaci[oó]n[a-záéíóú]+(?=:|\b)/gi, "Derivación")` aplicado a `soap.plan`. Lo arregla una vez para web + PDF + todo. **Requiere tu OK** (archivo congelado; el eval NO hace falta correrlo para un cambio de texto, pero aviso igual).
2. **No congelada (síntoma):** centralizar el cleanup en un helper y aplicarlo también en la vista web. Parchea el display sin tocar generación.

**Bonus detectado:** el replacer `lib/pdf/shared/helpers.ts:110` (`/Derivaci[oó]n[a-záéíóú]{2,6}/gi`) es agresivo y **corrompería el plural legítimo "derivaciones" → "Derivación"**. `lib/pdf` NO es zona congelada; puedo afinarlo. Lo incluyo en la decisión.

→ Recomendación: opción 1 (raíz), que además vuelve innecesarios los replacers frágiles. Espero tu elección.

## Detalle

