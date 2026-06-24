"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  FileText,
  Mail,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const EYEBROW = "text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]";

/** Lado de marca (presentacional). En desktop ocupa la columna izquierda;
 *  en móvil se oculta (un encabezado compacto lo reemplaza arriba del form). */
function BrandPanel() {
  const puntos = [
    { Icon: ShieldCheck, texto: "Cifrado de extremo a extremo" },
    { Icon: FileText, texto: "Notas clínicas asistidas por IA" },
    { Icon: BadgeCheck, texto: "Recetas y certificados con firma electrónica" },
  ];
  return (
    <div className="hidden lg:flex lg:w-[55%] flex-col justify-center border-r border-[#E7E3DB] bg-[#F7F7F4] py-12 lg:py-20 xl:py-24 pr-10 lg:pr-14 pl-16 lg:pl-28 xl:pl-44">
      <div className="max-w-2xl">
        <Image
          src="/novaclinx-logo.png"
          alt="Novaclinx"
          width={104}
          height={104}
          priority
          className="rounded-[24px]"
        />
        <p className={`${EYEBROW} mt-10`}>Historia clínica con IA</p>
        <h1 className="mt-4 text-7xl xl:text-8xl font-semibold tracking-tight text-[#1A1A18] font-[family-name:var(--font-brand)]">
          Novaclinx
        </h1>
        <p className="mt-6 max-w-lg text-3xl leading-snug text-[#5C5A54]">
          De tu consulta a una nota lista para revisar.
        </p>

        <ul className="mt-16 space-y-8">
          {puntos.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-center gap-4">
              <Icon className="h-7 w-7 shrink-0 text-[#0F766E]" strokeWidth={1.75} />
              <span className="text-lg text-[#5C5A54]">{texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Encabezado compacto de marca, solo móvil (<lg). */
function BrandHeaderMobile() {
  return (
    <div className="lg:hidden flex flex-col items-center text-center mb-8">
      <Image
        src="/novaclinx-logo.png"
        alt="Novaclinx"
        width={48}
        height={48}
        priority
        className="rounded-xl"
      />
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#1A1A18] font-[family-name:var(--font-brand)]">
        Novaclinx
      </h1>
      <p className="mt-2 text-sm text-[#5C5A54]">
        De tu consulta a una nota lista para revisar.
      </p>
    </div>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const hasCallbackError = searchParams.get("error") === "true";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  // Estado SOLO presentacional: alterna el copy "iniciar sesión / crear cuenta".
  // Ambos modos usan el mismo magic link (signInWithOtp registra o entra según
  // el correo); no cambia la lógica de auth.
  const [mode, setMode] = useState<"login" | "signup">("login");
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
      <main className="min-h-[100dvh] flex bg-white">
        <BrandPanel />
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-sm mx-auto">
            <BrandHeaderMobile />
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F766E]/[0.08]">
                <MailCheck className="h-6 w-6 text-[#0F766E]" strokeWidth={1.75} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-[#1A1A18]">
                Revisa tu correo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5C5A54]">
                Te enviamos un enlace de acceso. Ábrelo desde este mismo dispositivo.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] flex bg-white">
      <BrandPanel />

      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm mx-auto">
          <BrandHeaderMobile />

          {/* Selector visual: ambos modos usan el mismo magic link */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-[#E7E3DB] bg-[#F7F7F4] p-1">
            {([
              ["login", "Iniciar sesión"],
              ["signup", "Crear cuenta"],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-white text-[#1A1A18] shadow-sm"
                    : "text-[#8A8780] hover:text-[#5C5A54]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[#1A1A18]">
              {mode === "login" ? "Entra a tu cuenta" : "Crea tu cuenta"}
            </h2>
            <p className="mt-1.5 text-sm text-[#8A8780]">
              {mode === "login"
                ? "Sin contraseñas: te enviamos un enlace seguro a tu correo."
                : "Sin contraseñas: te enviamos un enlace para activar tu cuenta."}
            </p>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#1A1A18] mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8780]"
                  strokeWidth={1.75}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="h-11 w-full rounded-lg border border-[#E7E3DB] bg-white pl-10 pr-3.5 text-sm text-[#1A1A18] placeholder-[#A8A49C] transition-colors focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-[#B91C1C]/[0.06] px-3 py-2 text-sm text-[#B91C1C]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] text-sm font-medium text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Enviando…"
              ) : (
                <>
                  {mode === "login" ? "Recibir enlace de acceso" : "Crear cuenta"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E7E3DB]" />
            <span className="select-none text-xs text-[#8A8780]">o</span>
            <div className="h-px flex-1 bg-[#E7E3DB]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[#E7E3DB] bg-white text-sm font-medium text-[#1A1A18] transition-colors hover:bg-[#F7F7F4] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs leading-relaxed text-[#8A8780]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Tu información está cifrada. Solo tú accedes a tus notas.
          </p>
        </div>
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
