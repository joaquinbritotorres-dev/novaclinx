"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SegurosFormSection, {
  type SegurosState,
} from "@/app/pacientes/SegurosFormSection";
import { CONSENTIMIENTO_DATOS_TEXTO } from "@/lib/consentimiento";

interface PacienteEditable {
  id: string;
  nombre: string;
  edad: number | null;
  sexo: string | null;
  cedula: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  telefono: string | null;
  tipo_seguro: string | null;
  alergias: string | null;
  identificacion: string | null;
  tipo_identificacion: string | null;
  email: string | null;
  condicion_cronica: string | null;
  proximo_control: string | null;
  consentimiento_datos_at: string | null;
}

export default function EditarPacienteModal({
  paciente,
}: {
  paciente: PacienteEditable;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [segurosState, setSegurosState] = useState<SegurosState>({
    seguros: [],
    consentimientoOtorgado: false,
  });

  const [consentimientoDatos, setConsentimientoDatos] = useState(false);

  const [form, setForm] = useState({
    nombre: paciente.nombre,
    edad: paciente.edad != null ? String(paciente.edad) : "",
    sexo: paciente.sexo ?? "",
    fecha_nacimiento: paciente.fecha_nacimiento ?? "",
    direccion: paciente.direccion ?? "",
    telefono: paciente.telefono ?? "",
    tipo_seguro: paciente.tipo_seguro ?? "ninguno",
    alergias: paciente.alergias ?? "",
    identificacion: paciente.identificacion ?? "",
    tipo_identificacion: paciente.tipo_identificacion ?? "05",
    email: paciente.email ?? "",
    condicion_cronica: paciente.condicion_cronica ?? "",
    proximo_control: paciente.proximo_control ?? "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const guardar = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          edad: form.edad ? Number(form.edad) : null,
          sexo: form.sexo || null,
          tipo_identificacion: form.tipo_identificacion || null,
          proximo_control: form.proximo_control || null,
          consentimiento_datos: consentimientoDatos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "No pudimos completar la acción. Intenta de nuevo.");
        return;
      }

      // Save seguros changes
      const nuevos = segurosState.seguros.filter((s) => !s.id && !s._deleted);
      const eliminados = segurosState.seguros.filter((s) => s.id && s._deleted);

      if (nuevos.length > 0) {
        const segRes = await fetch(`/api/pacientes/${paciente.id}/seguros`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            seguros: nuevos,
            consentimientoOtorgado: segurosState.consentimientoOtorgado,
          }),
        });
        if (!segRes.ok) {
          setErrorMsg("No pudimos completar la acción. Intenta de nuevo.");
          return;
        }
      }

      for (const s of eliminados) {
        const delRes = await fetch(
          `/api/pacientes/${paciente.id}/seguros/${s.id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!delRes.ok) {
          setErrorMsg("No pudimos completar la acción. Intenta de nuevo.");
          return;
        }
      }

      setEditOpen(false);
      router.refresh();
    } catch {
      setErrorMsg("No pudimos completar la acción. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const eliminar = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Error al eliminar.");
      } else {
        router.push("/pacientes");
      }
    } catch {
      setErrorMsg("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100";
  const labelClass = "block text-xs font-medium text-[#374151] mb-1";

  return (
    <>
      {/* Trigger buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => { setEditOpen(true); setErrorMsg(null); }}
          className="flex-1 h-11 border border-[#0F766E] text-[#0F766E] text-sm font-medium rounded-lg hover:bg-[#F0FDFB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:ring-offset-2"
        >
          Editar paciente
        </button>
        <button
          onClick={() => { setDeleteOpen(true); setErrorMsg(null); }}
          className="h-11 px-4 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300/50 focus:ring-offset-2"
        >
          Eliminar
        </button>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0F172A]">Editar paciente</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="h-8 w-8 flex items-center justify-center text-[#64748B] hover:text-[#0F172A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto max-h-[70vh] space-y-4">
              {/* Datos básicos */}
              <div>
                <label className={labelClass}>Nombre completo *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={set("nombre")}
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Sexo</label>
                  <select value={form.sexo} onChange={set("sexo")} className={inputClass} disabled={isLoading}>
                    <option value="">—</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Seguro</label>
                  <select value={form.tipo_seguro} onChange={set("tipo_seguro")} className={inputClass} disabled={isLoading}>
                    <option value="ninguno">Sin seguro</option>
                    <option value="iess">IESS</option>
                    <option value="issfa">ISSFA</option>
                    <option value="privado">Privado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={set("fecha_nacimiento")}
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className={labelClass}>Edad (años)</label>
                  <input
                    type="number"
                    min={1}
                    max={149}
                    value={form.edad}
                    onChange={set("edad")}
                    className={inputClass}
                    disabled={isLoading || !!form.fecha_nacimiento}
                    placeholder={form.fecha_nacimiento ? "Calculada" : ""}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={set("telefono")}
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={set("direccion")}
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className={labelClass}>Alergias</label>
                <textarea
                  value={form.alergias}
                  onChange={set("alergias")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100 resize-none"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Condición crónica</label>
                  <input
                    type="text"
                    value={form.condicion_cronica}
                    onChange={set("condicion_cronica")}
                    className={inputClass}
                    disabled={isLoading}
                    placeholder="Hipertensión, Diabetes…"
                  />
                </div>
                <div>
                  <label className={labelClass}>Próximo control</label>
                  <input
                    type="date"
                    value={form.proximo_control}
                    onChange={set("proximo_control")}
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Facturación SRI */}
              <div className="border-t border-[#E5E7EB] pt-4">
                <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wide mb-3">
                  Datos de facturación (SRI)
                </p>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Tipo de identificación</label>
                    <select
                      value={form.tipo_identificacion}
                      onChange={set("tipo_identificacion")}
                      className={inputClass}
                      disabled={isLoading}
                    >
                      <option value="05">Cédula de ciudadanía</option>
                      <option value="04">RUC</option>
                      <option value="06">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>N.° identificación</label>
                    <input
                      type="text"
                      value={form.identificacion}
                      onChange={set("identificacion")}
                      className={inputClass}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Correo electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Consentimiento LOPDP — solo si aún no está registrado */}
              {!paciente.consentimiento_datos_at && (
                <div className="border-t border-[#E5E7EB] pt-4">
                  <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wide mb-3">
                    Protección de datos (LOPDP)
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentimientoDatos}
                      onChange={(e) => setConsentimientoDatos(e.target.checked)}
                      disabled={isLoading}
                      className="mt-0.5 w-4 h-4 accent-[#0F766E] shrink-0"
                    />
                    <span className="text-xs text-[#475569] leading-relaxed">
                      {CONSENTIMIENTO_DATOS_TEXTO}
                    </span>
                  </label>
                </div>
              )}

              {/* Seguros privados */}
              <div className="border-t border-[#E5E7EB] pt-4">
                <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wide mb-3">
                  Seguros privados
                </p>
                <SegurosFormSection
                  pacienteId={paciente.id}
                  disabled={isLoading}
                  onChange={setSegurosState}
                />
              </div>
            </div>

            {errorMsg && (
              <p className="px-5 pb-2 text-xs text-red-600">{errorMsg}</p>
            )}

            <div className="px-5 py-4 border-t border-[#E5E7EB] flex gap-3">
              <button
                onClick={() => setEditOpen(false)}
                disabled={isLoading}
                className="flex-1 h-11 border border-[#E5E7EB] text-[#374151] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={isLoading || !form.nombre.trim()}
                className="flex-1 h-11 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              >
                {isLoading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-base font-semibold text-[#0F172A] mb-2">
              Eliminar paciente
            </h2>
            <p className="text-sm text-[#475569] mb-3">
              ¿Seguro que quieres eliminar a <strong>{paciente.nombre}</strong> de tu lista?
            </p>
            <p className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 mb-5">
              De acuerdo con la LOPDP, los datos clínicos se conservan por 15 años. El paciente desaparecerá de tu lista, pero su información permanece protegida en el sistema.
            </p>

            {errorMsg && (
              <p className="text-xs text-red-600 mb-3">{errorMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={isLoading}
                className="flex-1 h-11 border border-[#E5E7EB] text-[#374151] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                disabled={isLoading}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300/50"
              >
                {isLoading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
