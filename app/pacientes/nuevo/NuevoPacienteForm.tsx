"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SEXOS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "O", label: "Otro" },
] as const;

type Sexo = (typeof SEXOS)[number]["value"];

export default function NuevoPacienteForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState<Sexo | "">("");
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
          edad: edad ? parseInt(edad, 10) : null,
          sexo: sexo || null,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      const { paciente } = await res.json();
      router.push(`/consultas/nueva?paciente_id=${paciente.id}`);
    } catch {
      setError("No pudimos completar la acción. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
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
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-[#374151] mb-1"
            >
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
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
              placeholder="Ej. María González"
            />
          </div>

          <div>
            <label
              htmlFor="edad"
              className="block text-sm font-medium text-[#374151] mb-1"
            >
              Edad
            </label>
            <input
              id="edad"
              type="number"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              min={1}
              max={149}
              disabled={loading}
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
              placeholder="Ej. 34"
            />
          </div>

          <div>
            <label
              htmlFor="sexo"
              className="block text-sm font-medium text-[#374151] mb-1"
            >
              Sexo
            </label>
            <select
              id="sexo"
              value={sexo}
              onChange={(e) => setSexo(e.target.value as Sexo | "")}
              disabled={loading}
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            >
              <option value="">No especificar</option>
              {SEXOS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !nombre.trim()}
            className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
          >
            {loading ? "Guardando..." : "Crear paciente"}
          </button>
        </form>
      </div>
    </main>
  );
}
