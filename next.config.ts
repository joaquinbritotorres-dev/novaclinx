import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Micrófono permitido para audio médico; cámara y geolocalización denegadas
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // React requires eval() in development (HMR/Fast Refresh); never in production.
      // 'unsafe-inline' es una concesión ACEPTADA: Next.js necesita scripts inline
      // para el bootstrap/hidratación. Endurecerlo exige nonces por petición vía
      // middleware (más complejo y con riesgo de romper la hidratación), y el
      // beneficio es marginal: no hay vector XSS (React escapa por defecto, sin
      // dangerouslySetInnerHTML con input de usuario). Si se quiere defensa en
      // profundidad a futuro, migrar a CSP con nonce en middleware.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
