# Novaclinx — Inventario completo del sistema

> Documento de contexto/documentación. Generado recorriendo el código real en `main`.
> Donde algo no consta en el código, se marca explícitamente como *(no versionado)* o *(no encontrado en el código)*.

Novaclinx es un SaaS médico para Ecuador (médicos individuales / consultorios): historia clínica con IA, recetas y certificados en PDF firmados electrónicamente, facturación electrónica al SRI multi-médico, cobros a aseguradoras, agenda, inventario y seguimiento de crónicos. Multi-tenant por médico, con aislamiento por RLS en Supabase.

---

## 1) Mapa de funcionalidades (lo que el usuario puede hacer)

### Autenticación
- `/auth/login`: ingreso con Supabase Auth. `/auth/callback` procesa el retorno de sesión. Sin sesión, las rutas de la app redirigen al login.

### Onboarding
- `/onboarding/especialidad`: el médico crea su perfil inicial (nombre + especialidad: pediatría, ginecología, general, cirugía, otro). Crea la fila en `medicos`.

### Dashboard (`/dashboard`)
- Vista de inicio: métricas clínicas (estilo Stripe, sin cards pesadas), citas de hoy, crónicos por vencer y accesos rápidos. Animaciones sutiles (`CountUp`, `Reveal`).

### Agenda / Citas (`/agenda`)
- Calendario mensual (grilla 7 columnas) + panel del día seleccionado. Navegación por mes (←/→) y botón "Hoy".
- Crear/editar citas (`CitaModal`), cancelar (con confirmación), recordatorio por WhatsApp, descarga `.ics`. Estados de cita: programada / confirmada / atendida / no_show / cancelada.

### Pacientes
- **Lista** (`/pacientes`): buscador por nombre, filas con avatar/iniciales, metadata (edad·sexo·HC), chip "Crónico", última consulta.
- **Nuevo** (`/pacientes/nuevo`): alta de paciente.
- **Ficha** (`/pacientes/[id]`): detalle editorial con tabs; editar paciente (modal con portal), seguros del paciente, comunicaciones, acceso a historia.
- **Historia clínica** (`/pacientes/[id]/historia`): timeline de consultas colapsable; impresión completa preservada (`ImprimirButton`, `ConsultaColapsable`).
- **Seguros del paciente**: alta/baja de pólizas (aseguradora, nº afiliado, tipo de cobertura reembolso/red).

### Consultas
- **Nueva** (`/consultas/nueva`): dos modos de captura →
  - *Escrito*: el médico describe la consulta; IA genera la nota SOAP.
  - *Grabación* (`GrabarConsulta`): graba audio, se transcribe (Deepgram) y se condensa a descripción clínica (Claude), luego SOAP.
  - Confirmación de medicamentos (`MedicamentoCard`), resultado (`ResultadoConsulta`).
- **Detalle** (`/consultas/[id]`): documento clínico (SOAP colapsable, banda resumen), panel de acciones: copiar/compartir nota, descargas (PDF nota/receta/certificado), **facturación** (emitir/estado/RIDE), crear reclamación.

### Facturación electrónica (SRI vía AutorizadorEC)
- Desde el detalle de consulta (`FacturacionSection`): emitir factura por un monto; estados **autorizada / procesando / rechazada / fallida**; descarga del **RIDE** (PDF); reintento si quedó rechazada/fallida.
- Activación automática al subir la firma `.p12` (si los datos fiscales del médico están completos).
- Sincronización en segundo plano de facturas en "procesando" (cron).

### Reclamaciones a aseguradoras (`/reclamaciones`, `/reclamaciones/[id]`)
- Lista con métricas (por cobrar, cobrado, por vencer, glosado), filtros por estado, semáforo de plazos.
- Detalle: **validador anti-glosa** (checklist: identificación del paciente, nº afiliado, consentimiento LOPDP, CIE-10, receta, plazo de presentación, factura electrónica), gestión de **soportes** (subir/eliminar documentos), descarga del **paquete** PDF para la aseguradora, gestión de estado (enviar/glosar/pagar/reenviar).

### Inventario (`/inventario`)
- Items de vacunas e insumos (nombre, tipo, unidad, lote, fecha de caducidad, cantidad, stock mínimo).
- Movimientos de **entrada/salida** (con motivo y paciente opcional); el stock se ajusta de forma **atómica** (RPC con lock). Modales para crear ítem, registrar movimiento y ver historial de movimientos.

### Seguimiento de crónicos (`/seguimiento`)
- Lista de pacientes con condición crónica y su próximo control (vencidos / próximos 7 días), con recordatorio por WhatsApp. *(Server Component.)*

### Perfil del médico (`/perfil`)
- Datos profesionales y fiscales (nombre, especialidad, registros ACESS/SENESCYT, RUC, dirección/teléfono de consultorio, bio), **perfil público** (slug) y enlace de reseñas de Google.
- **Firma electrónica** (`FirmaElectronicaSection`): subir/reemplazar/borrar el `.p12` (auto-custodia cifrada); su carga además activa la facturación.

### Perfil público del médico (`/m/[slug]`)
- Página **pública sin login**: muestra solo datos públicos del médico (nombre, especialidad, bio, dirección/teléfono de consultorio, registro ACESS) si `perfil_publico = true`. Nunca expone email/RUC/firma/user_id.

### Páginas legales
- `/privacidad`, `/terminos`: contenido estático.

---

## 2) Inventario de pantallas (rutas de página)

19 páginas (`page.tsx`).

### Públicas (sin login)
| Ruta | Qué muestra | Componentes clave |
|---|---|---|
| `/` (`app/page.tsx`) | Landing / entrada | — |
| `/auth/login` | Login Supabase | form cliente, `useSearchParams` |
| `/m/[slug]` | Perfil público del médico | `getMedicoPublico` (service-role, solo campos públicos) |
| `/privacidad` | Política de privacidad | estático |
| `/terminos` | Términos | estático |

### Onboarding
| Ruta | Qué muestra | Componentes |
|---|---|---|
| `/onboarding/especialidad` | Alta de perfil inicial | `EspecialidadForm` |

### App autenticada
| Ruta | Qué muestra | Componentes clave |
|---|---|---|
| `/dashboard` | Métricas + citas hoy + crónicos | `CountUp`, `Reveal` |
| `/agenda` | Calendario + panel del día | `AgendaView`, `CitaModal`, `BotonWhatsApp` |
| `/pacientes` | Lista de pacientes | `BuscadorPacientes`, `Reveal` |
| `/pacientes/nuevo` | Alta de paciente | `NuevoPacienteForm` |
| `/pacientes/[id]` | Ficha del paciente | `PacienteTabs`, `EditarPacienteModal`, `ComunicacionesSection`, `SegurosFormSection` |
| `/pacientes/[id]/historia` | Historia clínica | `ConsultaColapsable`, `ImprimirButton` |
| `/consultas/nueva` | Crear consulta (escrito/grabado) | `NuevaConsultaForm`, `GrabarConsulta`, `MedicamentoCard`, `ResultadoConsulta` |
| `/consultas/[id]` | Detalle de consulta | `NotaSoap`, `FacturacionSection`, `DescargasSection`, `CertificadoModal`, `CompartirNotaButton`, `CopiarNotaButton`, `CrearReclamacionButton` |
| `/reclamaciones` | Lista de reclamaciones | `DashboardReclamaciones` |
| `/reclamaciones/[id]` | Detalle + anti-glosa | `EstadoReclamacionSection`, `SoportesSection`, `DescargarPaqueteButton` |
| `/inventario` | Inventario | `InventarioView`, `ItemModal`, `MovimientoModal`, `MovimientosModal` |
| `/seguimiento` | Crónicos | `SeguimientoView` (server), `BotonWhatsApp` |
| `/perfil` | Perfil + firma | `PerfilForm`, `FirmaElectronicaSection` |

Layout global: `app/layout.tsx` → `AppShell` (decide mostrar `Sidebar` según ruta, vía `usePathname`).

---

## 3) Inventario de endpoints (API) — 35 rutas

> Todos los listados usan `requireAuth` salvo el cron (protegido por `CRON_SECRET`). "Propiedad" = verifica que el recurso sea del médico del usuario.

### Facturación
| Ruta | Métodos | Qué hace | Auth/Propiedad |
|---|---|---|---|
| `/api/facturas/emitir` | POST | Emite factura de una consulta (regla de cédula, anti-duplicados, motor AutorizadorEC). Estados 201/202/200 según resultado. | ✓ auth + propiedad (SSR) antes del service-role |
| `/api/facturas/[facturaId]/ride` | GET | Descarga el RIDE (PDF) de una factura autorizada. | ✓ auth + propiedad |
| `/api/cron/sincronizar-facturas` | GET | Reconcilia facturas en "procesando" contra el SRI. | `CRON_SECRET` (fail-closed) |

### Reclamaciones
| Ruta | Métodos | Qué hace | Auth/Propiedad |
|---|---|---|---|
| `/api/reclamaciones` | GET, POST | Lista / crea reclamación (monto desde factura autorizada). | ✓ |
| `/api/reclamaciones/[id]` | GET, PATCH | Detalle + **checklist anti-glosa**; transiciones de estado (enviar/glosar/pagar/reenviar). | ✓ propiedad |
| `/api/reclamaciones/[id]/documentos` | GET, POST | Lista / registra soportes (valida tipo por **magic bytes**). | ✓ propiedad |
| `/api/reclamaciones/[id]/documentos/[docId]` | DELETE | Borra soporte (storage + fila). | ✓ propiedad |
| `/api/reclamaciones/[id]/documentos/[docId]/url` | GET | URL firmada temporal (300s) del soporte. | ✓ propiedad |
| `/api/reclamaciones/[id]/paquete` | GET | Genera el PDF del paquete (portada+nota+receta+RIDE+soportes), opción firmado. | ✓ propiedad |

### Inventario
| Ruta | Métodos | Qué hace | Auth/Propiedad |
|---|---|---|---|
| `/api/inventario` | GET, POST | Lista / crea ítems. | ✓ propiedad |
| `/api/inventario/[id]` | PATCH, DELETE | Edita / borra (soft-delete) ítem. | ✓ propiedad |
| `/api/inventario/[id]/movimientos` | GET, POST | Lista / registra movimiento **atómico** (RPC `registrar_movimiento_inventario`). | ✓ propiedad |

### Consultas
| Ruta | Métodos | Qué hace | Auth/Propiedad |
|---|---|---|---|
| `/api/consultas/generar` | POST | Genera nota SOAP con IA (modo escrito). | ✓ propiedad |
| `/api/consultas/guardar` | POST | Guarda/aprueba la consulta. | ✓ propiedad |
| `/api/consultas/[id]/pdf` | GET | PDF combinado de la consulta. | ✓ propiedad |
| `/api/consultas/[id]/pdf-nota` | GET | PDF de la nota clínica. | ✓ propiedad |
| `/api/consultas/[id]/pdf-receta` | GET | PDF de la receta (opción firmado). | ✓ propiedad |
| `/api/consultas/[id]/pdf-certificado` | GET | PDF de certificado médico. | ✓ propiedad |

### Grabaciones (scribe)
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/grabaciones` | POST | Crea registro de grabación. |
| `/api/grabaciones/[id]` | PATCH | Actualiza grabación. |
| `/api/grabaciones/[id]/transcribir` | POST | Transcribe el audio (Deepgram). |
| `/api/grabaciones/[id]/generar-nota` | POST | Condensa transcripción (Claude) → SOAP. |
| `/api/grabaciones/[id]/aprobar` | POST | Aprueba la nota generada. |
| `/api/grabaciones/[id]/descartar` | POST | Descarta la grabación. |
> Todas con `requireAuth` + propiedad.

### Pacientes
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/pacientes` | POST | Crea paciente. |
| `/api/pacientes/[id]` | PATCH, DELETE | Edita / soft-delete paciente. |
| `/api/pacientes/buscar` | GET | Búsqueda por nombre. |
| `/api/pacientes/[id]/seguros` | GET, POST | Lista / agrega seguro del paciente. |
| `/api/pacientes/[id]/seguros/[seguroId]` | DELETE | Quita seguro. |
> Todas con auth + propiedad.

### Citas / Comunicaciones / Perfil / Catálogos
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/citas` | GET, POST | Lista / crea cita. |
| `/api/citas/[id]` | PATCH, DELETE | Edita / cancela cita. |
| `/api/comunicaciones` | GET, POST | Registro de comunicaciones (p. ej. WhatsApp). |
| `/api/medicos/perfil` | POST, PATCH | Crea / actualiza perfil del médico (slug único vía service-role solo lectura). |
| `/api/perfil/firma` | GET, POST, DELETE | Estado / subir / borrar el `.p12`; el POST activa facturación. |
| `/api/aseguradoras` | GET | Catálogo de aseguradoras activas (compartido, solo requiere auth). |

---

## 4) Modelo de datos (tablas)

Patrón RLS universal: `medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())` (o `user_id = auth.uid()` en `medicos`).

### Versionadas en el repo
| Tabla | Origen | Propósito | Columnas clave | RLS |
|---|---|---|---|---|
| `medicos` | `schema.sql` | El médico (tenant) | id, user_id→auth.users, nombre, especialidad, pais, onboarding_completado, plan, + (perfil/fiscales: ruc, registros, direccion/telefono_consultorio, bio, slug, perfil_publico, google_review_url, firma_*) | ✓ `user_id=auth.uid()` |
| `pacientes` | `schema.sql` | Pacientes del médico | id, medico_id→medicos, nombre, edad, sexo, notas_generales, (+ identificacion, tipo_identificacion, email, direccion, cedula, condicion_cronica, numero_historia añadidas por migraciones/manual), deleted_at | ✓ |
| `consultas` | `schema.sql` | Consultas/notas clínicas | id, paciente_id, medico_id, fecha, input_medico, nota_soap, indicaciones, seguimiento_*, resumen_corto, aprobada_por_medico, cie10_*, modelo_usado | ✓ |
| `eventos` | `schema.sql` | Bitácora de eventos por médico | id, medico_id, … | ✓ |
| `facturas` | `migrations/20260616_facturas.sql` (reemplaza esquema Dátil viejo) | Facturas electrónicas | id, medico_id, consulta_id (SET NULL), paciente_id (SET NULL), provider_company_id, clave_acceso (unique), secuencial, numero_autorizacion, fecha_autorizacion, estado (pendiente/procesando/autorizada/rechazada/fallida), ambiente, importe_total, descripcion_servicio, idempotency_key, xml_object_key, errores(jsonb), creado_en/actualizado_en | ✓ SELECT/INSERT/UPDATE (sin DELETE de usuario: documento legal 7 años) |
| `config_facturacion` | `migrations/20260616_config_facturacion.sql` | Config SRI por médico | id, medico_id (UNIQUE), ruc, razon_social, nombre_comercial, provider_company_id, provider_api_key_secret_id (ref Vault), ambiente, estado (pendiente/activo/error), certificado_vigencia_hasta | ✓ (4 políticas) |
| `aseguradoras` | `migrations/20260604_seguros.sql` | Catálogo de aseguradoras (+plazos en `20260607`) | id, nombre, slug, activo, config, ventana_presentacion_dias, ventana_pago_dias, cuenta_desde, plazo_confirmado | ✓ lectura para autenticados |
| `paciente_seguros` | `migrations/20260604_seguros.sql` | Pólizas por paciente | id, paciente_id, aseguradora_id, numero_afiliado, tipo_cobertura (reembolso/red_prestador), deleted_at | ✓ (vía dueño del paciente) |
| `consentimientos_seguro` | `migrations/20260604_seguros.sql` | Consentimiento LOPDP (append-only, auditable) | id, paciente_id, medico_id, otorgado, version_texto, created_at | ✓ solo INSERT/SELECT |
| `reclamaciones` | `migrations/20260604_seguros.sql` | Cobros a aseguradoras | id, medico_id, paciente_id, consulta_id, aseguradora_id, paciente_seguro_id, estado (borrador…pagada/rechazada), tipo, fecha_atencion/envio, canal_envio, monto, motivo_glosa, fecha_pago, monto_pagado, deleted_at | ✓ |
| `documentos` | `migrations/20260607_documentos.sql` | Soportes de reclamaciones | id, reclamacion_id, medico_id, object_key, nombre_archivo, mime, size_bytes, hash_sha256, tipo, created_at | ✓ |

### Creadas a mano *(no versionadas en el repo)*
Usadas por el código pero ausentes de `migrations/`/`schema.sql`. **Su RLS no es verificable desde el repo** (ver auditoría — ítem A1, pendiente de verificar en el panel de Supabase).
| Tabla | Usada en | Propósito (inferido del código) |
|---|---|---|
| `citas` | agenda + `/api/citas` | Agenda: inicio, duracion_min, motivo, estado, paciente/nombre_paciente, notas, deleted_at |
| `comunicaciones` | `/api/comunicaciones`, grabaciones | Registro de comunicaciones (WhatsApp/recordatorios) |
| `grabaciones_consulta` | `/api/grabaciones/*` | Grabaciones de consulta (audio/transcripción/estado) |
| `inventario_items` | inventario | Vacunas/insumos: tipo, nombre, descripcion, lote, unidad, fecha_caducidad, cantidad, stock_minimo, deleted_at |
| `inventario_movimientos` | inventario | Movimientos: item_id, tipo_movimiento (entrada/salida), cantidad, motivo, paciente_id |

### Funciones SQL (RPC)
- `siguiente_secuencial_factura(p_medico_id)` *(no versionada; usada por facturas)* — contador atómico (legado).
- `registrar_movimiento_inventario(p_item_id,p_tipo,p_cantidad,p_motivo,p_paciente_id)` — `migrations/20260617` — movimiento de stock atómico (FOR UPDATE), SECURITY INVOKER, deriva médico de `auth.uid()`.
- `guardar_sk_medico` / `leer_sk_medico` / `borrar_sk_medico` — `migrations/20260616_vault_sk_facturacion.sql` — Vault para el `sk_` (SECURITY DEFINER, solo `service_role`).
- `update_updated_at()` / `update_actualizado_en()` — triggers de timestamp.

### Buckets de Storage (privados)
| Bucket | Versionado | Guarda | Acceso |
|---|---|---|---|
| `firmas-electronicas` | no (panel) | El `.p12` cifrado de cada médico (`{medico_id}/firma.p12`) | server-side service-role |
| `facturas-xml` | `migrations/20260616_facturas.sql` | XML autorizado del SRI (`{medico_id}/{claveAcceso}.xml`), respaldo legal 7 años | server-side service-role |
| `soportes-reclamaciones` | `migrations/20260607_soportes_bucket.sql` | Soportes de reclamaciones (PDF/JPG/PNG, ≤15MB) | políticas RLS por `{medico_id}/...` |

> Migraciones legado en `supabase/` (no en `migrations/`): `20250524_facturas.sql` (tabla Dátil vieja), `20260604_facturas_columnas_datil.sql` — superadas por el esquema AutorizadorEC.

---

## 5) Integraciones y servicios externos

| Servicio | Para qué | Dónde (código) | Env var |
|---|---|---|---|
| **Supabase** | Auth, Postgres (RLS), Storage | `lib/supabase/{client,server,service-role}.ts` y todo el backend | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` |
| **AutorizadorEC** | Facturación electrónica SRI (crear empresa, certificado, punto de emisión, habilitar factura, emitir, consultar estado, descargar RIDE/XML) | `lib/facturacion/autorizadorec.ts` (cliente base + funciones), `onboarding.ts`, `facturar-consulta.ts`, `sincronizar-facturas.ts` | `AUTORIZADOREC_ACCOUNT_KEY` (ak_ de plataforma); el `sk_` por médico vive en el Vault |
| **Anthropic / Claude** | (1) Generar nota **SOAP** desde la descripción escrita; (2) condensar la transcripción de la grabación a descripción clínica | `lib/prompts/novaclinx-prompts-v1.ts` (modelo `claude-sonnet-4-6`), `lib/scribe/adaptador.ts` (`claude-sonnet-4-6`) | `ANTHROPIC_API_KEY` |
| **Deepgram** | Transcripción diarizada del audio de consultas | `lib/deepgram/config.ts`, `lib/scribe/transcripcion.ts`, `/api/grabaciones/[id]/transcribir` | `DEEPGRAM_API_KEY` |
| **WhatsApp** | Enlaces `wa.me` para recordatorios (no API oficial; abre WhatsApp con texto) | `lib/whatsapp.ts`, `components/BotonWhatsApp.tsx` | — |
| **Vercel Cron** | Dispara `/api/cron/sincronizar-facturas` cada 30 min | `vercel.json` | `CRON_SECRET` |
| **Cifrado de firma** | Cifra la contraseña del `.p12` (AES) | `lib/firma/cifrado.ts` | `FIRMA_ENCRYPTION_KEY` |

> Variables públicas: `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_APP_URL`. Las demás son server-only.

---

## 6) Librerías internas (`lib/`)

- **`lib/supabase/`** — `client.ts` (browser, anon), `server.ts` (SSR con cookies + `…WithServiceRole`), `service-role.ts` (cliente service-role "puro" sin `next/headers`, para jobs/scripts).
- **`lib/auth-guard.ts`** — `requireAuth(request)`: valida sesión y devuelve `user` o `errorResponse`.
- **`lib/facturacion/`** — núcleo de facturación AutorizadorEC:
  - `autorizadorec.ts`: cliente base (`autorizadorecRequest`, auth dual ak_/sk_, `AutorizadorECError`) + crearEmpresa, subirCertificado, habilitarTiposDocumento, crearPuntoEmision, emitirFactura, consultarDocumento(/PorIdempotencyKey), descargarArchivoDocumento, listarEmpresas.
  - `vault.ts`: `guardarSkMedico/leerSkMedico/borrarSkMedico` (envuelven los RPC del Vault, server-only).
  - `onboarding.ts`: `darDeAltaMedico` (alta completa) y `activarFacturacionMedico` (al subir firma; reusa empresa existente por RUC).
  - `facturar-consulta.ts`: `facturarConsulta` (emite + registra en `facturas` + respalda XML), `FacturacionBloqueadaError`, `respaldarXmlAutorizado`.
  - `sincronizar-facturas.ts`: `sincronizarFacturas` (job de reconciliación).
- **`lib/firma/`** — `cifrado.ts` (cifra/descifra contraseña del `.p12`), `firmar.ts` (`firmarPdf`: firma PAdES del PDF con el `.p12` del médico).
- **`lib/pdf/`** — `paqueteReclamacion.ts` (`armarPaqueteReclamacion` + `RideNoDisponibleError`) y plantillas (`notaClinicaTemplate`, `recetaTemplate`, `portadaTemplate`) vía `@react-pdf/renderer`.
- **`lib/prompts/`** — `novaclinx-prompts-v1.ts` (`generarNotaSOAP` con Claude), `generate-soap.ts`.
- **`lib/scribe/`** — modo grabación: `transcripcion.ts` (Deepgram), `adaptador.ts` (Claude condensa transcripción), `constantes.ts`, `rutas.ts`. (Con tests.)
- **`lib/recetas/`** — lógica clínica de recetas: `parseIndicaciones`, `parsearDosis`, `calcularDispensacion`, `dosisVerificadas`, `extraerPeso`, `gateDocumentos`, `tipos`. (Amplia cobertura de tests.)
- **`lib/reclamaciones/plazos.ts`** — `calcularPlazos` (semáforo de plazos de presentación/pago).
- **`lib/consentimiento.ts`** — consentimiento LOPDP.
- **`lib/ics.ts`** — genera `.ics` para citas. **`lib/whatsapp.ts`** — enlaces `wa.me`. **`lib/slug.ts`** — slugify. **`lib/logger.ts`** — logger con **redacción de campos sensibles**. **`lib/utils.ts`** — utilidades (cn, etc.).

---

## 7) Capacidades técnicas clave

- **Multi-tenancy con RLS por médico**: cada tabla filtra por `medico_id`/`user_id`; los endpoints además verifican propiedad en capa de app antes de cualquier operación con service-role.
- **Firma electrónica de PDFs (PAdES, auto-custodia)**: el `.p12` se guarda **cifrado** en Storage privado y su contraseña cifrada con `FIRMA_ENCRYPTION_KEY`; `firmarPdf` firma recetas/certificados/paquetes server-side (`@signpdf` + `pdf-lib` + `node-forge`).
- **Facturación electrónica multi-médico (delegación de custodia)**: la firma del SRI se delega a AutorizadorEC; nosotros guardamos solo referencias. El `sk_` (Company Key) de cada médico vive cifrado en **Supabase Vault**. Onboarding crea/reusa empresa por RUC, sube certificado, habilita factura y guarda el `sk_`.
- **Resiliencia ante SRI caído**: emitir registra la factura **antes** de llamar al SRI; un timeout la deja en **`procesando`** (con `idempotency_key`), y un **cron** cada 30 min la reconcilia (`consultarDocumento`/`…PorIdempotencyKey`) y respalda el XML autorizado.
- **Generación de PDFs**: notas, recetas, certificados y el **paquete de reclamación** (portada + nota + receta + RIDE + soportes unidos con `pdf-lib`), con opción de firmarlos.
- **Grabación + transcripción + IA**: audio → Deepgram (transcripción diarizada) → Claude (condensa a descripción clínica, marcando dudoso con `[VERIFICAR]`, sin inventar) → SOAP. El médico aprueba antes de guardar.
- **Nota SOAP con IA**: `generarNotaSOAP` (Claude `claude-sonnet-4-6`) a partir de la descripción del médico, con lógica pediátrica de peso/dosis.
- **Validador anti-glosa**: checklist server-side que evalúa identificación, afiliado, consentimiento LOPDP, CIE-10, receta, plazo (con `calcularPlazos`) y factura electrónica autorizada.
- **Inventario atómico**: movimientos de stock vía RPC con `FOR UPDATE` (sin carrera/lost-update), en una transacción.
- **Seguridad de logs**: `logger` redacta campos sensibles; los `console` de facturación nunca registran el `sk_` ni contraseñas.
- **Cabeceras de seguridad**: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (micrófono self, cámara/geo denegadas).

---

## 8) Estado actual

### Completo y probado
- Facturación AutorizadorEC de punta a punta: onboarding (empresa real RUC `0104499736001`), emisión con **factura AUTORIZADA por el SRI** confirmada (IVA 0% servicios médicos), descarga de RIDE, cron de sincronización, activación al subir firma.
- Migración completa de Dátil → AutorizadorEC y eliminación del código muerto de Dátil.
- Reclamaciones migradas al esquema nuevo (validador anti-glosa, lista, creación, paquete).
- Inventario con descuento de stock atómico (RPC aplicado y probado).
- Rediseño editorial de dashboard, pacientes, historia, consulta, reclamaciones, agenda; navegación por sidebar global.
- Firma electrónica de PDFs (auto-custodia) operativa.

### En modo prueba / a confirmar
- **AutorizadorEC en ambiente `test`** (`pruebas`): las empresas/facturas se crean en pruebas; falta certificar producción (`ambiente='produccion'`).
- **Pendiente de verificación (auditoría A1)**: confirmar en el panel de Supabase que las tablas creadas a mano (`citas`, `comunicaciones`, `grabaciones_consulta`, `inventario_items`, `inventario_movimientos`) tienen RLS habilitada.
- **`schema.sql` desactualizado**: varias tablas/columnas se aplicaron a mano; a partir de las migraciones de facturación se usa `supabase/migrations/` versionado.
- Modelo `modelo_usado` por defecto `'gpt-4o-mini'` en `consultas` (legado del schema); la generación real usa Claude `claude-sonnet-4-6`.

### Stack y despliegue
- **Next.js 16.2.6** (App Router, **Turbopack**), **React 19.2.4**, **TypeScript** estricto, **Tailwind v4**.
- **Supabase** (Auth + Postgres + Storage + Vault + RLS).
- **Vercel** (deploy + Cron). Local: `next dev`.
- Tests con **Vitest** (cobertura fuerte en `lib/recetas/` y `lib/scribe/`).
- Estado git: rama `main`, con commits locales **sin push** a `origin/main` al momento de este documento.

---

*Generado por inspección del código real. Tablas y RLS marcadas como "a mano / no versionadas" requieren verificación directa en Supabase.*
