// Loader SOLO para el eval standalone: resuelve el alias "@/" (que usan los
// módulos de la app) a rutas de archivo .ts, ya que el runner nativo de Node
// no conoce el alias de tsconfig. No afecta a Next.js/tsc/vitest.
//
// Uso: node --experimental-loader ./scripts/eval-loader.mjs --conditions=react-server scripts/eval-generacion.ts
import { pathToFileURL } from "node:url";

const root = pathToFileURL(process.cwd() + "/");

export function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    // "@/lib/recetas/gateDocumentos" → file://<root>/lib/recetas/gateDocumentos.ts
    const url = new URL(specifier.slice(2) + ".ts", root).href;
    return next(url, context);
  }
  return next(specifier, context);
}
