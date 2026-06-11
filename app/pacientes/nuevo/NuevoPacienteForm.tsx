"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SegurosFormSection, {
  type SegurosState,
} from "@/app/pacientes/SegurosFormSection";
import { CONSENTIMIENTO_DATOS_TEXTO } from "@/lib/consentimiento";

const SEXOS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "O", label: "Otro" },
] as const;

const SEGUROS = [
  { value: "ninguno", label: "Sin seguro" },
  { value: "iess", label: "IESS" },
  { value: "issfa", label: "ISSFA" },
  { value: "privado", label: "Privado" },
] as const;

type Sexo = (typeof SEXOS)[number]["value"];

export default function NuevoPacienteForm() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState("05");
  const [identificacion, setIdentificacion] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState<Sexo | "">("");
  const [tipoSeguro, setTipoSeguro] = useState("ninguno");
  const [alergias, setAlergias] = useState("");
  const [condicionCronica, setCondicionCronica] = useState("");
  const [proximoControl, setProximoControl] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [consentimientoDatos, setConsentimientoDatos] = useState(false);

  const [segurosState, setSegurosState] = useState<SegurosState>({
    seguros: [],
    consentimientoOtorgado: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: nombre.trim(),
          identificacion,
          tipo_identificacion: tipoIdentificacion || null,
          fecha_nacimiento: fechaNacimiento || null,
          edad: edad && !fechaNacimiento ? parseInt(edad, 10) : null,
          sexo: sexo || null,
          tipo_seguro: tipoSeguro,
          alergias,
          condicion_cronica: condicionCronica,
          proximo_control: proximoControl || null,
          direccion,
          telefono,
          consentimiento_datos: consentimientoDatos,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      const { paciente } = await res.json();

      const nuevos = segurosState.seguros.filter((s) => !s._deleted);
      if (nuevos.length > 0 || segurosState.consentimientoOtorgado) {
        await fetch(`/api/pacientes/${paciente.id}/seguros`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            seguros: nuevos,
            consentimientoOtorgado: segurosState.consentimientoOtorgado,
          }),
        });
      }

      router.push(`/consultas/nueva?paciente_id=${paciente.id}`);
    } catch {
      setError("No pudimos completar la acción. Intenta de nuevo.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50";

  const sectionLabel =
    "block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-3 mt-6 pt-4 border-t border-[#E5E7EB] first:mt-0 first:pt-0 first:border-t-0";

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-6 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-[#0F766E] hover:underline focus:outline-none"
          >
            ← Volver
          </button>
        </div>

        <h1 className="text-xl font-bold text-[#0F172A] mb-6">Nuevo paciente</h1>

        {error && (
          <div
            role="alert"
            className="mb-4 text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identificación */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-[#374151] mb-1">
              Nombre completo <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={loading}
              autoComplete="off"
              placeholder="Ej. María González Ruiz"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tipo_id" className="block text-sm font-medium text-[#374151] mb-1">
                Tipo de documento
              </label>
              <select
                id="tipo_id"
                value={tipoIdentificacion}
                onChange={(e) => setTipoIdentificacion(e.target.value)}
                disabled={loading}
                className={inputClass}
              >
                <option value="05">Cédula</option>
                <option value="04">RUC</option>
                <option value="06">Pasaporte</option>
                <option value="07">Consumidor final</option>
              </select>
            </div>
            <div>
              <label htmlFor="identificacion" className="block text-sm font-medium text-[#374151] mb-1">
                N.° de identificación
              </label>
              <input
                id="identificacion"
                type="text"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                disabled={loading}
                autoComplete="off"
                placeholder="Ej. 1712345678"
                className={inputClass}
              />
            </div>
          </div>

          {/* Datos clínicos */}
          <p className={sectionLabel}>Datos clínicos</p>

          <div>
            <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-[#374151] mb-1">
              Fecha de nacimiento
            </label>
            <input
              id="fecha_nacimiento"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              disabled={loading}
              max={new Date().toISOString().split("T")[0]}
              className={inputClass}
            />
          </div>

          {!fechaNacimiento && (
            <div>
              <label htmlFor="edad" className="block text-sm font-medium text-[#374151] mb-1">
                Edad <span className="text-xs font-normal text-[#94A3B8]">— si no hay fecha exacta</span>
              </label>
              <input
                id="edad"
                type="number"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                min={0}
                max={149}
                disabled={loading}
                placeholder="Ej. 34"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="sexo" className="block text-sm font-medium text-[#374151] mb-1">
              Sexo
            </label>
            <select
              id="sexo"
              value={sexo}
              onChange={(e) => setSexo(e.target.value as Sexo | "")}
              disabled={loading}
              className={inputClass}
            >
              <option value="">No especificar</option>
              {SEXOS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tipo_seguro" className="block text-sm font-medium text-[#374151] mb-1">
              Tipo de seguro
            </label>
            <select
              id="tipo_seguro"
              value={tipoSeguro}
              onChange={(e) => setTipoSeguro(e.target.value)}
              disabled={loading}
              className={inputClass}
            >
              {SEGUROS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="alergias" className="block text-sm font-medium text-[#374151] mb-1">
              Alergias conocidas
            </label>
            <textarea
              id="alergias"
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="Ej. Penicilina, ibuprofeno, látex"
              className="w-full px-3 py-2.5 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50 resize-none"
            />
          </div>

          <div>
            <label htmlFor="condicion_cronica" className="block text-sm font-medium text-[#374151] mb-1">
              Condición crónica
            </label>
            <input
              id="condicion_cronica"
              type="text"
              value={condicionCronica}
              onChange={(e) => setCondicionCronica(e.target.value)}
              disabled={loading}
              placeholder="Hipertensión, Diabetes, Asma…"
              className={inputClass}
            />
          </div>

          {condicionCronica.trim() && (
            <div>
              <label htmlFor="proximo_control" className="block text-sm font-medium text-[#374151] mb-1">
                Próximo control
              </label>
              <input
                id="proximo_control"
                type="date"
                value={proximoControl}
                onChange={(e) => setProximoControl(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>
          )}

          {/* Contacto */}
          <p className={sectionLabel}>Contacto (opcional)</p>

          <div>
            <label htmlFor="direccion" className="block text-sm font-medium text-[#374151] mb-1">
              Dirección
            </label>
            <input
              id="direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={loading}
              placeholder="Ej. Av. Amazonas N32-145, Quito"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-[#374151] mb-1">
              Teléfono
            </label>
            <input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={loading}
              placeholder="Ej. 0991234567"
              className={inputClass}
            />
          </div>

          {/* Consentimiento LOPDP */}
          <p className={sectionLabel}>Protección de datos (LOPDP)</p>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentimientoDatos}
              onChange={(e) => setConsentimientoDatos(e.target.checked)}
              disabled={loading}
              className="mt-0.5 w-4 h-4 accent-[#0F766E] shrink-0"
            />
            <span className="text-xs text-[#475569] leading-relaxed">
              {CONSENTIMIENTO_DATOS_TEXTO}
            </span>
          </label>

          {/* Seguros privados */}
          <p className={sectionLabel}>Seguros privados</p>
          <SegurosFormSection
            disabled={loading}
            onChange={setSegurosState}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
            >
              {loading ? "Guardando..." : "Crear paciente"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
