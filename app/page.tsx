import { LEGAL } from "@/constants/legal";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <h1 className="text-3xl font-bold text-foreground">{LEGAL.APP_NAME}</h1>
      <p className="mt-2 text-muted-foreground">{LEGAL.TAGLINE}</p>
      <p className="mt-8 text-xs text-muted-foreground max-w-sm">
        {LEGAL.FOOTER}
      </p>
    </main>
  );
}
