import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("aseguradoras")
      .select("id, nombre, slug")
      .eq("activo", true)
      .order("nombre");

    if (error) {
      return NextResponse.json(
        { error: "No pudimos completar la acción. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ aseguradoras: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la acción. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
