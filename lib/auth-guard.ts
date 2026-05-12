import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string;
}

type AuthResult =
  | { user: AuthUser; errorResponse: null }
  | { user: null; errorResponse: NextResponse };

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        ),
      };
    }

    return {
      user: { id: user.id, email: user.email ?? "" },
      errorResponse: null,
    };
  } catch {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      ),
    };
  }
}
