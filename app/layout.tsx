import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Novaclinx — De tu consulta a una nota lista para revisar.",
  description:
    "Novaclinx convierte la descripción de tu consulta médica en una nota clínica estructurada tipo SOAP, lista para revisar y aprobar.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://novaclinx.com"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
