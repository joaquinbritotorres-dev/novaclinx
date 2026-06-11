import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll llamado desde Server Component — las cookies de sesión
            // se actualizan en el middleware, aquí se puede ignorar.
          }
        },
      },
    }
  );
}

export function createSupabaseServerClientWithServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL no está configurada.");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada.");
  // createClient puro — sin cookies, sin JWT del usuario.
  // Esto garantiza que el rol efectivo sea "service_role" y RLS se bypasee.
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
