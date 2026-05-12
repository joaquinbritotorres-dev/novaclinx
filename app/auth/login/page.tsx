"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const hasCallbackError = searchParams.get("error") === "true";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(
    hasCallbackError ? "No pudimos completar el acceso. Intenta de nuevo." : null
  );

  const supabase = createSupabaseBrowserClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError("No pudimos enviarte el enlace. Verifica tu correo e intenta de nuevo.");
    } else {
      setLinkSent(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError("No pudimos conectarte con Google. Intenta de nuevo.");
      setLoading(false);
    }
  }

  if (linkSent) {
    return (
      <main className="min-h-screen bg-[#F7F7F4] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Novaclinx</h1>
          <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB]">
            <div className="mx-auto mb-3 flex items-center justify-center w-10 h-10 rounded-full bg-[#DCFCE7]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10l4 4 8-8" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[#0F172A]">Revisa tu correo</h2>
            <p className="mt-1.5 text-sm text-[#475569]">
              Te enviamos un enlace de acceso. Ábrelo desde este mismo dispositivo.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F4] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Novaclinx</h1>
          <p className="mt-2 text-sm text-[#475569]">
            De tu consulta a una nota lista para revisar.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB]">
          <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#0F172A] mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#0F172A] placeholder-[#94A3B8] text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-11 bg-[#0F766E] hover:bg-[#0E6A63] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
            >
              {loading ? "Enviando..." : "Recibir enlace"}
            </button>
          </form>

          <div className="flex items-center my-5 gap-3">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-xs text-[#94A3B8] select-none">o</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2.5 border border-[#E5E7EB] bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
          >
            <GoogleIcon />
            Continuar con Google
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-[#94A3B8] px-2 leading-relaxed">
          Tu información está cifrada. Solo tú accedes a tus notas.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
