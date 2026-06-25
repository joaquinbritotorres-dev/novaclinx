// Server Component: solo renderiza datos (filter/map) y delega la interacción
// al hijo cliente <BotonWhatsApp>. No envía JS propio al navegador.
import Link from "next/link";
import BotonWhatsApp from "@/components/BotonWhatsApp";

export interface PacienteCronico {
  id: string;
  nombre: string;
  telefono: string | null;
  condicion_cronica: string;
  proximo_control: string | null; // YYYY-MM-DD
}

interface Props {
  pacientes: PacienteCronico[];
  hoy: string; // YYYY-MM-DD en Guayaquil
}

function diasHasta(hoy: string, fecha: string): number {
  const a = new Date(hoy + "T00:00:00Z").getTime();
  const b = new Date(fecha + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

function formatFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SeguimientoView({ pacientes, hoy }: Props) {
  const vencidos = pacientes.filter(
    (p) => p.proximo_control && diasHasta(hoy, p.proximo_control) < 0
  ).length;
  const proximos = pacientes.filter((p) => {
    if (!p.proximo_control) return false;
    const d = diasHasta(hoy, p.proximo_control);
    return d >= 0 && d <= 7;
  }).length;

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#0F172A]">Seguimiento de crónicos</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Pacientes con condiciones crónicas y sus próximos controles.
          </p>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-xs text-[#64748B] uppercase tracking-wide">Total crónicos</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{pacientes.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-xs text-[#64748B] uppercase tracking-wide">Controles vencidos</p>
            <p className={`text-2xl font-bold mt-1 ${vencidos > 0 ? "text-[#DC2626]" : "text-[#0F172A]"}`}>
              {vencidos}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-xs text-[#64748B] uppercase tracking-wide">Próximos 7 días</p>
            <p className={`text-2xl font-bold mt-1 ${proximos > 0 ? "text-[#B45309]" : "text-[#0F172A]"}`}>
              {proximos}
            </p>
          </div>
        </div>

        {/* Tabla */}
        {pacientes.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
            <p className="text-sm text-[#64748B]">
              No tienes pacientes con condición crónica registrada. Agrégala desde la
              ficha del paciente (campo &quot;Condición crónica&quot;).
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                    Condición
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wide">
                    Próximo control
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wide text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => {
                  const dias =
                    p.proximo_control != null ? diasHasta(hoy, p.proximo_control) : null;
                  const fechaTexto = p.proximo_control
                    ? formatFecha(p.proximo_control)
                    : null;
                  const textoWhatsApp = fechaTexto
                    ? `Hola ${p.nombre}, le recuerdo su control de ${p.condicion_cronica} agendado para el ${fechaTexto}.`
                    : `Hola ${p.nombre}, le recuerdo que tiene pendiente agendar su control de ${p.condicion_cronica}.`;

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/pacientes/${p.id}`}
                          className="font-medium text-[#0F766E] hover:underline"
                        >
                          {p.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#0F172A]">{p.condicion_cronica}</td>
                      <td className="px-4 py-3">
                        {fechaTexto ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-[#0F172A]">{fechaTexto}</span>
                            {dias !== null && dias < 0 && (
                              <span className="text-xs font-semibold text-[#DC2626] bg-[#FEE2E2] rounded-full px-2 py-0.5">
                                Vencido
                              </span>
                            )}
                            {dias !== null && dias >= 0 && dias <= 7 && (
                              <span className="text-xs font-semibold text-[#B45309] bg-[#FEF3C7] rounded-full px-2 py-0.5">
                                Pronto
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">Sin fecha</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BotonWhatsApp
                          telefono={p.telefono}
                          texto={textoWhatsApp}
                          tipo="recordatorio"
                          paciente_id={p.id}
                          label="Recordar por WhatsApp"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
