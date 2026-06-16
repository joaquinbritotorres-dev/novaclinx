import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE ROLE "puro": createClient con la service key,
 * SIN cookies ni next/headers. Bypassa RLS (rol efectivo service_role).
 *
 * Para operaciones server-side privilegiadas que NO dependen de la request
 * HTTP (onboarding, jobs, scripts CLI). A diferencia del de lib/supabase/server.ts,
 * no importa next/headers, así que puede usarse fuera del runtime de Next.js.
 *
 * ⚠ server-only: nunca debe llegar al bundle del cliente. En scripts por CLI se
 * corre con --conditions=react-server, que neutraliza "server-only".
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL no está configurada.");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada.");
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
