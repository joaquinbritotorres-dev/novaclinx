import { LEGAL } from "@/constants/legal";

export const metadata = {
  title: `Términos de uso — ${LEGAL.APP_NAME}`,
};

export default function TerminosPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 prose prose-slate">
      <h1 className="text-2xl font-bold text-foreground">Términos de uso</h1>
      <p className="text-muted-foreground text-sm">
        Última actualización: mayo 2025
      </p>

      <section className="mt-8 space-y-4 text-foreground">
        <h2 className="text-lg font-semibold">1. Naturaleza del servicio</h2>
        <p>
          {LEGAL.APP_NAME} es una herramienta de documentación clínica que
          genera borradores de notas en formato SOAP a partir de las
          descripciones del médico. {LEGAL.FOOTER}
        </p>

        <h2 className="text-lg font-semibold">2. Responsabilidad médica</h2>
        <p>
          El médico es el único responsable del contenido de las notas clínicas
          que aprueba y firma. {LEGAL.APP_NAME} no emite diagnósticos, no
          prescribe medicamentos y no reemplaza el juicio clínico del
          profesional de la salud.
        </p>

        <h2 className="text-lg font-semibold">3. Uso autorizado</h2>
        <p>
          El servicio está destinado a médicos debidamente licenciados o en
          formación bajo supervisión. Está prohibido el uso para cualquier fin
          distinto a la documentación clínica propia del usuario.
        </p>

        <h2 className="text-lg font-semibold">4. Disponibilidad</h2>
        <p>
          El servicio se ofrece &ldquo;tal cual&rdquo;. No garantizamos
          disponibilidad ininterrumpida. La revisión final de cada nota es
          responsabilidad del médico.
        </p>

        <h2 className="text-lg font-semibold">5. Modificaciones</h2>
        <p>
          Nos reservamos el derecho de actualizar estos términos. Los cambios
          significativos se comunicarán por correo electrónico.
        </p>
      </section>

      <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
        {LEGAL.FOOTER}
      </footer>
    </main>
  );
}
