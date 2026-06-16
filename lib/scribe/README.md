# Scribe de voz — módulo de grabación de consultas

Convierte una consulta grabada en una nota SOAP usando el pipeline existente
del modo escrito, **sin modificarlo**.

## Flujo

```
consentimiento (modal, registrado en bitácora `comunicaciones`)
  → POST /api/grabaciones                  estado: consentida
  → MediaRecorder webm/opus → uploadToSignedUrl
  → PATCH /api/grabaciones/[id]            estado: subida
  → POST /api/grabaciones/[id]/transcribir estado: transcribiendo → transcrita
       (Deepgram nova-3, multi, diarize; fallback comentado: nova-2/es)
  → POST /api/grabaciones/[id]/generar-nota estado: nota_generada
       (lib/scribe/adaptador.ts → descripcion → generarNotaSOAP())
  → médico revisa el borrador (banner de revisión obligatoria)
  → "Aprobar y guardar" → /api/consultas/guardar (flujo existente)
  → POST /api/grabaciones/[id]/aprobar     estado: aprobada
       (vincula consulta_id, borra audio del bucket, transcripcion = null)

"Descartar grabación" (disponible en todo el flujo)
  → POST /api/grabaciones/[id]/descartar   estado: descartada
       (borra audio + transcripción)
```

Cualquier fallo intermedio deja `estado='error'` + `error_detalle` y es
reintentable desde la UI. Estados terminales: `aprobada`, `descartada` —
en ambos la fila queda **sin contenido clínico** (solo `consentimiento_at`,
`duracion_segundos` y timestamps) como evidencia de auditoría.

## Variables de entorno

- `DEEPGRAM_API_KEY` — obligatoria; sin ella la transcripción responde 500
  con log explícito (fail-fast, sin fallbacks).
- `ANTHROPIC_API_KEY` — ya usada por el pipeline SOAP; el adaptador la
  comparte.

## Privacidad

- Audio solo en el bucket **privado** `audios-consulta`, path
  `{medico_id}/{paciente_id}/{grabacionId}.webm`; las políticas de storage
  exigen que el primer segmento sea un médico del `auth.uid()`.
- Cero PHI en logs: solo IDs y estados. Nunca transcripciones, nombres ni
  URLs firmadas.
- Audio y transcripción se eliminan al aprobar o descartar.

## Purga manual de grabaciones huérfanas (>72 h sin cerrar)

Una grabación queda huérfana si el médico abandonó el flujo (cerró la
pestaña, falló el borrado, etc.) y la fila quedó en estado no terminal.
**SQL para revisar y purgar a mano en Supabase SQL Editor — no automatizado
a propósito:**

```sql
-- 1) Revisar candidatas (no borra nada)
SELECT id, estado, audio_path, duracion_segundos, created_at
  FROM grabaciones_consulta
 WHERE estado NOT IN ('aprobada', 'descartada')
   AND created_at < NOW() - INTERVAL '72 hours'
 ORDER BY created_at;

-- 2) Borrar los audios del bucket de esas filas.
--    Los objetos de storage se eliminan desde el dashboard
--    (Storage → audios-consulta) o vía API con los audio_path
--    del paso 1. storage.objects no debe manipularse con DELETE
--    directo en SQL salvo que sepas lo que haces:
-- DELETE FROM storage.objects
--  WHERE bucket_id = 'audios-consulta'
--    AND name IN (SELECT audio_path FROM grabaciones_consulta
--                  WHERE estado NOT IN ('aprobada','descartada')
--                    AND created_at < NOW() - INTERVAL '72 hours'
--                    AND audio_path IS NOT NULL);

-- 3) Cerrar las filas como descartadas (auditoría sin contenido)
UPDATE grabaciones_consulta
   SET estado = 'descartada',
       transcripcion = NULL,
       audio_path = NULL,
       error_detalle = 'Purga manual: huérfana >72h'
 WHERE estado NOT IN ('aprobada', 'descartada')
   AND created_at < NOW() - INTERVAL '72 hours';
```

## Qué NO toca este módulo

- `lib/prompts/*` (generación SOAP) — solo consume `generarNotaSOAP()`.
- `lib/recetas/*` — la confirmación de medicamentos es del flujo existente.
- `lib/facturacion/*` y la facturación electrónica.
- Cliente service-role: prohibido en todo el módulo; todas las rutas usan
  `createSupabaseServerClient()` con RLS + verificación explícita de
  propiedad.
