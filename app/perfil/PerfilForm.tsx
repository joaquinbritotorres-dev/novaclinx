"use client";

import { useState } from "react";

const ESPECIALIDADES = [
  { value: "pediatria", label: "Pediatría" },
  { value: "ginecologia", label: "Ginecología y Obstetricia" },
  { value: "general", label: "Medicina General" },
  { value: "cirugia", label: "Cirugía" },
  { value: "otro", label: "Otra especialidad" },
] as const;

type Especialidad = (typeof ESPECIALIDADES)[number]["value"];

interface MedicoPerfil {
  nombre: string;
  especialidad: string;
  registro_acess: string | null;
  registro_senescyt: string | null;
  direccion_consultorio: string | null;
  telefono_consultorio: string | null;
  ruc: string | null;
  bio: string | null;
}

interface Props {
  medico: MedicoPerfil;
}

export default function PerfilForm({ medico }: Props) {
  const [nombre, setNombre] = useState(medico.nombre);
  const [especialidad, setEspecialidad] = useState<Especialidad>(
    medico.especialidad as Especialidad
  );
  const [registroAcess, setRegistroAcess] = useState(medico.registro_acess ?? "");
  const [registroSenescyt, setRegistroSenescyt] = useState(medico.registro_senescyt ?? "");
  const [ruc, setRuc] = useState(medico.ruc ?? "");
  const [direccion, setDireccion] = useState(medico.direccion_consultorio ?? "");
  const [telefono, setTelefono] = useState(medico.telefono_consultorio ?? "");
  const [bio, setBio] = useState(medico.bio ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/medicos/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: nombre.trim(),
          especialidad,
          registro_acess: registroAcess,
          registro_senescyt: registroSenescyt,
          ruc,
          direccion_consultorio: direccion,
          telefono_consultorio: telefono,
          bio,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : undefined
        );
      }

      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos guardar los cambios. Intenta de nuevo."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Datos básicos */}
      <div>
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-3">
          Datos básicos
        </p>
        <div className="space-y-3">
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
              disabled={saving}
              autoComplete="name"
              placeholder="Ej. Dr. Carlos Andrade"
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="especialidad" className="block text-sm font-medium text-[#374151] mb-1">
              Especialidad <span className="text-[#DC2626]">*</span>
            </label>
            <select
              id="especialidad"
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value as Especialidad)}
              disabled={saving}
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            >
              {ESPECIALIDADES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Registros profesionales */}
      <div>
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-3">
          Registros profesionales
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="registro_acess" className="block text-sm font-medium text-[#374151] mb-1">
              Registro ACESS
            </label>
            <input
              id="registro_acess"
              type="text"
              value={registroAcess}
              onChange={(e) => setRegistroAcess(e.target.value)}
              disabled={saving}
              placeholder="Ej. MSP-12345"
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="registro_senescyt" className="block text-sm font-medium text-[#374151] mb-1">
              Registro SENESCYT
            </label>
            <input
              id="registro_senescyt"
              type="text"
              value={registroSenescyt}
              onChange={(e) => setRegistroSenescyt(e.target.value)}
              disabled={saving}
              placeholder="Ej. 1020-2019-1234567"
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="ruc" className="block text-sm font-medium text-[#374151] mb-1">
              RUC
            </label>
            <input
              id="ruc"
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              disabled={saving}
              placeholder="Ej. 1712345678001"
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Datos del consultorio */}
      <div>
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-3">
          Consultorio
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="direccion" className="block text-sm font-medium text-[#374151] mb-1">
              Dirección
            </label>
            <input
              id="direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={saving}
              placeholder="Ej. Av. 12 de Octubre N24-562, Quito"
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
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
              disabled={saving}
              placeholder="Ej. 022345678"
              className="w-full h-11 px-3 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Perfil público */}
      <div>
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-3">
          Perfil público
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-[#374151] mb-1">
              Biografía profesional
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Ej. Pediatra con 10 años de experiencia en Quito…"
              className="w-full px-3 py-2.5 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50 resize-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {saved && (
        <div
          role="status"
          className="text-sm text-[#065F46] bg-[#D1FAE5] rounded-lg px-3 py-2 text-center"
        >
          Perfil actualizado correctamente.
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !nombre.trim()}
        className="w-full h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
      >
        {saving ? "Guardando..." : "Guardar perfil"}
      </button>
    </form>
  );
}
