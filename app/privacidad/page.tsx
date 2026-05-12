import { LEGAL } from "@/constants/legal";

export const metadata = {
  title: `Privacidad — ${LEGAL.APP_NAME}`,
};

export default function PrivacidadPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 prose prose-slate">
      <h1 className="text-2xl font-bold text-foreground">
        Política de privacidad
      </h1>
      <p className="text-muted-foreground text-sm">
        Última actualización: mayo 2025
      </p>

      <section className="mt-8 space-y-4 text-foreground">
        <h2 className="text-lg font-semibold">1. Datos que recopilamos</h2>
        <p>
          Recopilamos únicamente los datos necesarios para operar el servicio:
          nombre, especialidad y país del médico; descripciones de consultas
          ingresadas por el médico; y datos básicos de pacientes ingresados por
          el médico.
        </p>

        <h2 className="text-lg font-semibold">2. Cómo usamos los datos</h2>
        <p>
          Los datos se usan exclusivamente para generar borradores de notas
          clínicas y para que el médico gestione su historial de consultas.
          Nunca vendemos ni compartimos datos con terceros para fines
          comerciales.
        </p>

        <h2 className="text-lg font-semibold">3. Procesamiento por IA</h2>
        <p>
          Las descripciones de consultas se envían a OpenAI para generar la
          nota SOAP. Este procesamiento ocurre en los servidores de OpenAI bajo
          sus políticas de privacidad y retención de datos. No almacenamos las
          transcripciones de audio: se borran inmediatamente después de
          convertirse a texto.
        </p>

        <h2 className="text-lg font-semibold">4. Seguridad</h2>
        <p>
          Cada médico accede únicamente a sus propios datos. Usamos cifrado en
          tránsito (HTTPS) y en reposo. La autenticación se gestiona mediante
          Supabase Auth con magic link.
        </p>

        <h2 className="text-lg font-semibold">5. Retención y eliminación</h2>
        <p>
          Puedes solicitar la eliminación de tu cuenta y todos tus datos
          escribiéndonos a hola@novaclinx.com. Los datos se eliminan en un
          plazo de 30 días.
        </p>

        <h2 className="text-lg font-semibold">6. Contacto</h2>
        <p>
          Para preguntas sobre privacidad:{" "}
          <a
            href="mailto:hola@novaclinx.com"
            className="text-primary underline"
          >
            hola@novaclinx.com
          </a>
        </p>
      </section>

      <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
        {LEGAL.FOOTER}
      </footer>
    </main>
  );
}
