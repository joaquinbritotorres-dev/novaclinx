import {
  FileText,
  CalendarDays,
  MessageCircle,
  Activity,
  Package,
  BookOpen,
  FileSignature
} from "lucide-react";
import RevealOnScroll from "./RevealOnScroll";

const FUNCIONES = [
  {
    nombre: "Historia clínica alineada a la ley",
    detalle:
      "Toda la información se estructura y conserva según los lineamientos estrictos de ACESS y la Ley Orgánica de Protección de Datos Personales (LOPDP).",
    icon: BookOpen,
    span: "lg:col-span-2",
  },
  {
    nombre: "Agenda médica",
    detalle: "Sincronice sus citas en un clic.",
    icon: CalendarDays,
    span: "lg:col-span-1",
  },
  {
    nombre: "Recetas con DCI",
    detalle: "Reglamento MSP: Dosis en letras y alertas cruzadas de alergias al recetar.",
    icon: FileText,
    span: "lg:col-span-1",
  },
  {
    nombre: "Certificados",
    detalle: "Formatos de reposo, aptitud y escolares, listos para su firma.",
    icon: FileSignature,
    span: "lg:col-span-1",
  },
  {
    nombre: "Avisos por WhatsApp",
    detalle: "Reduce el ausentismo con recordatorios automáticos a pacientes.",
    icon: MessageCircle,
    span: "lg:col-span-1",
  },
  {
    nombre: "Seguimiento",
    detalle: "Alertas tempranas de pacientes crónicos con controles pendientes.",
    icon: Activity,
    span: "lg:col-span-1",
  },
  {
    nombre: "Control de inventario",
    detalle: "Gestiona vacunas e insumos médicos con alertas de bajo stock y caducidad inminente.",
    icon: Package,
    span: "lg:col-span-2",
  },
];

export default function SuiteCompleta() {
  return (
    <section className="border-t border-[var(--ln-hairline)] bg-[var(--ln-surface-alt)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-16 md:py-28 lg:px-12 lg:py-40">
        <RevealOnScroll className="mx-auto max-w-4xl text-center">
          <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--ln-teal-strong)]">
            Ecosistema Novaclinx
          </p>
          <h2 className="mt-4 text-[clamp(2.5rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ln-ink)]">
            Todo su consultorio, en un solo lugar.
          </h2>
          <p className="mx-auto mt-8 max-w-[65ch] text-[clamp(1.15rem,1.5vw,1.35rem)] leading-relaxed text-[var(--ln-secondary)]">
            Más allá del asistente de voz, Novaclinx consolida toda la operación de su práctica médica.
          </p>
        </RevealOnScroll>

        <div className="mx-auto mt-12 grid max-w-[1200px] gap-6 lg:mt-20 lg:grid-cols-3">
          {FUNCIONES.map((f, i) => {
            const Icon = f.icon;
            return (
              <RevealOnScroll
                key={f.nombre}
                delay={(i % 3) * 60}
                className={`group flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-10 transition-shadow hover:shadow-[0_8px_30px_rgba(26,26,24,0.04)] ${f.span}`}
              >
                <div>
                  <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ln-surface-alt)] text-[var(--ln-teal)] transition-colors group-hover:bg-[var(--ln-teal)] group-hover:text-white">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="text-[22px] font-bold tracking-tight text-[var(--ln-ink)]">
                    {f.nombre}
                  </h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-[var(--ln-secondary)]">
                    {f.detalle}
                  </p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
