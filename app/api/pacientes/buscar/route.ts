import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = await createSupabaseServerClient();

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) return NextResponse.json({ pacientes: [] });

  let query = supabase
    .from("pacientes")
    .select("id, nombre")
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .order("nombre")
    .limit(20);

  if (q) {
    query = query.ilike("nombre", `%${q}%`);
  }

  const { data } = await query;
  return NextResponse.json({ pacientes: data ?? [] });
}
