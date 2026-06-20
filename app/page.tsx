import type { Metadata } from "next";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import Problema from "@/components/landing/Problema";
import ComoFunciona from "@/components/landing/ComoFunciona";
import FacturacionSRI from "@/components/landing/FacturacionSRI";
import Aseguradoras from "@/components/landing/Aseguradoras";
import Beneficios from "@/components/landing/Beneficios";
import SuiteCompleta from "@/components/landing/SuiteCompleta";
import Seguridad from "@/components/landing/Seguridad";
import Confianza from "@/components/landing/Confianza";
import FAQ from "@/components/landing/FAQ";
import CTAFinal from "@/components/landing/CTAFinal";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Novaclinx — El consultorio del médico ecuatoriano",
  description:
    "De la consulta a la nota clínica, la factura al SRI y el cobro a la aseguradora — en un solo lugar. Genera notas SOAP con IA bajo tu control.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--ln-bg)] text-[var(--ln-ink)]">
      <LandingNav />
      <main>
        <Hero />
        <TrustBar />
        <Problema />
        <ComoFunciona />
        <FacturacionSRI />
        <Aseguradoras />
        <Beneficios />
        <SuiteCompleta />
        <Seguridad />
        <Confianza />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}
