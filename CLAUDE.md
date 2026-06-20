@AGENTS.md

# Landing de marketing (`/`) — reglas de diseño

Estética editorial premium tipo Apple/Stripe/Linear. Sobria, mucho whitespace,
alto contraste, transmite confianza médica. NO debe parecer hecha por IA.
Idioma: español neutro de Latinoamérica.

## Posicionamiento
Novaclinx no es "otro scribe con IA": es el sistema que lleva al médico
ecuatoriano de **consulta → nota clínica → factura al SRI → cobro a la
aseguradora**, en un solo lugar. Gancho = ahorro de tiempo del scribe.
Diferenciadores que cierran la venta = **facturación SRI** y **cobros a
aseguradoras con validador anti-glosa** → secciones protagónicas propias.

## Tokens (usar SIEMPRE las variables `--ln-*` de globals.css; nunca defaults de shadcn)
- Canvas `--ln-bg` #F7F7F4 · superficies `--ln-surface` #FFFFFF / `--ln-surface-alt` #F2F1EC.
- Texto: `--ln-ink` #1A1A18 · `--ln-secondary` #5C5A54 · `--ln-muted` #8A8780.
- Hairline `--ln-hairline` #E7E3DB (bordes 1px, NUNCA glow).
- Acento ÚNICO = teal: `--ln-teal` #0F766E (botones/fills/títulos grandes),
  `--ln-teal-strong` #0E6A63 (texto pequeño y links, AA 6:1).
- `--ln-amber` #9A6B12: SOLO la cifra grande de dinero en la sección de
  aseguradoras. Uso puntual, jamás como fondo grande.

## Tipografía
Inter (ya cargada vía next/font en el layout; self-hosted en build). Una sola
familia para el cuerpo. Fraunces SOLO para el wordmark "Novaclinx".
Escala con clamp(): H1 36–64px/600–700/lh1.05/tracking −0.02em · H2 36–40/600 ·
H3 24–28/600 · Lead 18–20/400 · Body 16–17/400/lh1.6 · Caption 13–14/500
(mayúsculas tracking +0.04em). Medida máx ~70ch.

## Espaciado y componentes
Escala 4/8/12/16/24/32/48/64/96/128. Padding vertical de sección 96–128px
desktop, 64px móvil. Botón primario: fill teal, texto blanco, radio 8px,
12/24, peso 500, sin glow, hover #0E6A63. Secundario: transparente + borde 1px.
Cards: surface + hairline 1px + radio 12–16px + sombra apenas perceptible.

## Movimiento
fade-in + translateY 8–12px al entrar al viewport (una vez, 300–400ms). UNA
animación protagonista: la nota SOAP construyéndose al hacer scroll. Respeta
`prefers-reduced-motion`. Sin parallax/partículas. framer-motion NO está
instalado → CSS + IntersectionObserver.

## PROHIBIDO (delata "hecho por IA")
Gradientes morados/aurora · glow/neón · glassmorphism · dark mode por defecto ·
sopa de badges/pills · emojis decorativos · checkmarks verdes en cada bullet ·
iconos por todas partes · mockups genéricos flotando · defaults de shadcn sin
estilizar · Space Grotesk · testimonios o cifras inventadas · afirmar que
Novaclinx DIAGNOSTICA o que tiene un "sello de la Superintendencia".

## OBLIGATORIO
La IA siempre como borrador BAJO control del médico ("tú revisas y apruebas").
Responsive mobile-first (360 / 768 / 1280+). Accesible: contraste AA, foco
visible, reduced-motion. Copy humano sin hype. Capturas = frames HTML/CSS con
datos ficticios verosímiles (reemplazables); el demo de la nota SOAP usa un
caso de PEDIATRÍA.

## Routing / técnico
Next.js 16 (App Router) + Tailwind v4 (config en globals.css) + React 19.
No hay middleware: la auth es por página. `/` es pública (no redirige).
Seguridad es una sección ancla en la landing (no ruta propia). `components/AppShell.tsx` oculta el sidebar de la app
en esas rutas. Legales: se reutilizan las existentes `/privacidad` y
`/terminos`. Login en `/auth/login`.
