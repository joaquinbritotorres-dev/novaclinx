# Novaclinx

Generador de notas clínicas SOAP para médicos independientes en Ecuador y Latinoamérica.

Novaclinx es una aplicación web mobile-first donde el médico escribe 3–5 líneas de lo que pasó en una consulta y la app genera una nota clínica estructurada en formato SOAP, lista para revisar, editar y aprobar.

## El problema

Los médicos independientes pierden entre 2 y 3 horas diarias llenando notas clínicas después de atender pacientes. Muchos terminan el día con documentación pendiente. Es trabajo repetitivo y tedioso que les quita tiempo personal.

## La solución

El médico describe la consulta en sus propias palabras, Novaclinx genera el borrador y el médico lo revisa y aprueba. La nota siempre es del médico; la aplicación solo la estructura.

Novaclinx no diagnostica, no prescribe y no reemplaza el criterio médico. Su único alcance es generar borradores de documentación clínica.

## Usuario objetivo

Pediatras y ginecólogos con consultorio propio en Ecuador, de 30 a 55 años, con un volumen de 15 a 25 pacientes por día.

## Funcionalidades

Incluye:
- Crear y buscar pacientes
- Nueva consulta por texto (audio opcional)
- Generación de nota clínica en formato SOAP
- Indicaciones y seguimiento solo si el médico los menciona
- Historial básico y resumen de la última consulta
- Dashboard de seguimientos
- Copiar nota y exportar a PDF
- Importación de pacientes anteriores vía CSV
- Demo de onboarding

No incluye: diagnóstico automático, prescripción autónoma, cobros, agenda, integración con WhatsApp API, facturación ni multi-usuario.

## Stack técnico

| Componente | Tecnología |
|---|---|
| Framework | Next.js 16 |
| Base de datos | Supabase |
| Modelo de lenguaje | GPT-4o-mini |
| Estilos | Tailwind CSS, shadcn/ui |
| Despliegue | Vercel |

El prompt clínico fue validado con 7 casos de prueba, incluyendo un caso trampa y un caso de estrés con contexto de consultas anteriores.

## Estado actual

Fase 1 de construcción completada. La base del proyecto está lista: branding, tokens de color, tipografía, prompt clínico, schema SQL, autenticación, middleware, headers de seguridad, logger médico seguro y páginas legales.

Pendiente: conexión con Supabase en producción e inicio de la Fase 2 (autenticación y base de datos en vivo).

## Setup

\`\`\`bash
# Instalar dependencias
npm install

# Correr el servidor de desarrollo
npm run dev
\`\`\`

Abrir http://localhost:3000 en el navegador para ver la aplicación.

## Autor

Joaquín Brito Torres — github.com/joaquinbritotorres-dev
