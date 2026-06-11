"use client";

import { useState, useEffect, useRef } from "react";
import { CONSENTIMIENTO_TEXTO } from "@/lib/consentimiento";

export interface SeguroEntry {
  _key: string;
  id?: string;
  aseguradora_id: string;
  aseguradora_nombre?: string;
  numero_afiliado: string;
  numero_titular: string;
  plan: string;
  tipo_cobertura: "reembolso" | "red_prestador";
  es_titular: boolean;
  parentesco: string;
  _deleted: boolean;
}

export interface SegurosState {
  seguros: SeguroEntry[];
  consentimientoOtorgado: boolean;
}

interface Aseguradora {
  id: string;
  nombre: string;
  slug: string;
}

interface SegurosFormSectionProps {
  pacienteId?: string;
  disabled?: boolean;
  onChange?: (state: SegurosState) => void;
}

interface Draft {
  aseguradora_id: string;
  tipo_cobertura: "reembolso" | "red_prestador";
  numero_afiliado: string;
  numero_titular: string;
  plan: string;
  es_titular: boolean;
  parentesco: string;
}

const emptyDraft: Draft = {
  aseguradora_id: "",
  tipo_cobertura: "reembolso",
  numero_afiliado: "",
  numero_titular: "",
  plan: "",
  es_titular: true,
  parentesco: "",
};

export default function SegurosFormSection({
  pacienteId,
  disabled = false,
  onChange,
}: SegurosFormSectionProps) {
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [seguros, setSeguros] = useState<SeguroEntry[]>([]);
  const [consentimientoOtorgado, setConsentimientoOtorgado] = useState(false);
  const [loadingData, setLoadingData] = useState(!!pacienteId);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftConsent, setDraftConsent] = useState(false);

  // Stable ref so onChange changes don't re-trigger the notify effect
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    fetch("/api/aseguradoras", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAseguradoras(data.aseguradoras ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pacienteId) return;
    setLoadingData(true);
    fetch(`/api/pacientes/${pacienteId}/seguros`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        type RawSeguro = {
          id: string;
          aseguradora_id: string;
          aseguradoras: { nombre: string } | null;
          numero_afiliado: string | null;
          numero_titular: string | null;
          plan: string | null;
          tipo_cobertura: "reembolso" | "red_prestador";
          es_titular: boolean;
          parentesco: string | null;
        };
        const loaded: SeguroEntry[] = (data.seguros ?? []).map(
          (s: RawSeguro) => ({
            _key: s.id,
            id: s.id,
            aseguradora_id: s.aseguradora_id,
            aseguradora_nombre: s.aseguradoras?.nombre,
            numero_afiliado: s.numero_afiliado ?? "",
            numero_titular: s.numero_titular ?? "",
            plan: s.plan ?? "",
            tipo_cobertura: s.tipo_cobertura,
            es_titular: s.es_titular,
            parentesco: s.parentesco ?? "",
            _deleted: false,
          })
        );
        setSeguros(loaded);
        setConsentimientoOtorgado(data.consentimientoOtorgado ?? false);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [pacienteId]);

  useEffect(() => {
    onChangeRef.current?.({ seguros, consentimientoOtorgado });
  }, [seguros, consentimientoOtorgado]);

  function agregarSeguro() {
    if (!draft.aseguradora_id || !draftConsent) return;
    const aseg = aseguradoras.find((a) => a.id === draft.aseguradora_id);
    const entry: SeguroEntry = {
      _key: crypto.randomUUID(),
      aseguradora_id: draft.aseguradora_id,
      aseguradora_nombre: aseg?.nombre,
      numero_afiliado: draft.numero_afiliado.trim(),
      numero_titular: draft.numero_titular.trim(),
      plan: draft.plan.trim(),
      tipo_cobertura: draft.tipo_cobertura,
      es_titular: draft.es_titular,
      parentesco: draft.parentesco.trim(),
      _deleted: false,
    };
    setSeguros((prev) => [...prev, entry]);
    setConsentimientoOtorgado(true);
    setDraft(emptyDraft);
    setDraftConsent(false);
    setShowForm(false);
  }

  function eliminarSeguro(key: string) {
    setSeguros((prev) =>
      prev
        .map((s): SeguroEntry | null => {
          if (s._key !== key) return s;
          return s.id ? { ...s, _deleted: true } : null;
        })
        .filter((s): s is SeguroEntry => s !== null)
    );
  }

  const activeSeguros = seguros.filter((s) => !s._deleted);

  const inputClass =
    "w-full h-9 px-2.5 rounded-lg border border-gray-300 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:bg-gray-100";
  const labelClass = "block text-xs font-medium text-[#374151] mb-1";

  if (loadingData) {
    return (
      <p className="py-3 text-sm text-[#94A3B8]">Cargando seguros...</p>
    );
  }

  return (
    <div className="space-y-3">
      {activeSeguros.length > 0 && (
        <ul className="space-y-2">
          {activeSeguros.map((s) => (
            <li
              key={s._key}
              className="flex items-start justify-between gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2.5 bg-[#F8FAFC]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F172A] truncate">
                  {s.aseguradora_nombre ?? s.aseguradora_id}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {s.tipo_cobertura === "reembolso" ? "Reembolso" : "Red prestador"}
                  {s.plan ? ` · ${s.plan}` : ""}
                  {s.numero_afiliado ? ` · Af. ${s.numero_afiliado}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => eliminarSeguro(s._key)}
                disabled={disabled}
                className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 mt-0.5 focus:outline-none"
                aria-label="Quitar seguro"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={disabled}
          className="text-sm text-[#0F766E] hover:underline focus:outline-none disabled:opacity-40"
        >
          + Agregar seguro privado
        </button>
      ) : (
        <div className="rounded-xl border border-[#E5E7EB] p-4 space-y-3 bg-white">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
            Nuevo seguro
          </p>

          <div>
            <label className={labelClass}>Aseguradora *</label>
            <select
              value={draft.aseguradora_id}
              onChange={(e) =>
                setDraft((d) => ({ ...d, aseguradora_id: e.target.value }))
              }
              className={inputClass}
              disabled={disabled}
            >
              <option value="">— Seleccionar —</option>
              {aseguradoras.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tipo de cobertura *</label>
            <select
              value={draft.tipo_cobertura}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  tipo_cobertura: e.target.value as "reembolso" | "red_prestador",
                }))
              }
              className={inputClass}
              disabled={disabled}
            >
              <option value="reembolso">Reembolso</option>
              <option value="red_prestador">Red prestador</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>N.° de afiliado</label>
              <input
                type="text"
                value={draft.numero_afiliado}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, numero_afiliado: e.target.value }))
                }
                placeholder="Ej. 12345678"
                className={inputClass}
                disabled={disabled}
              />
            </div>
            <div>
              <label className={labelClass}>Plan</label>
              <input
                type="text"
                value={draft.plan}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, plan: e.target.value }))
                }
                placeholder="Ej. Oro"
                className={inputClass}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="seg_es_titular"
              type="checkbox"
              checked={draft.es_titular}
              onChange={(e) =>
                setDraft((d) => ({ ...d, es_titular: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]/50"
              disabled={disabled}
            />
            <label
              htmlFor="seg_es_titular"
              className="text-xs text-[#374151] cursor-pointer"
            >
              El paciente es titular de la póliza
            </label>
          </div>

          {!draft.es_titular && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>N.° del titular</label>
                <input
                  type="text"
                  value={draft.numero_titular}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, numero_titular: e.target.value }))
                  }
                  placeholder="Ej. 87654321"
                  className={inputClass}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className={labelClass}>Parentesco</label>
                <input
                  type="text"
                  value={draft.parentesco}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, parentesco: e.target.value }))
                  }
                  placeholder="Ej. Hijo, Cónyuge"
                  className={inputClass}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* LOPDP consent — must be explicit, never pre-checked */}
          <div className="rounded-lg bg-[#F0FDFB] border border-[#99F6E4] px-3 py-3">
            <div className="flex items-start gap-2.5">
              <input
                id="seg_consent"
                type="checkbox"
                checked={draftConsent}
                onChange={(e) => setDraftConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]/50"
                disabled={disabled}
              />
              <label
                htmlFor="seg_consent"
                className="text-xs text-[#374151] leading-relaxed cursor-pointer"
              >
                {CONSENTIMIENTO_TEXTO}
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setDraft(emptyDraft);
                setDraftConsent(false);
              }}
              disabled={disabled}
              className="flex-1 h-9 border border-[#E5E7EB] text-[#374151] text-xs font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={agregarSeguro}
              disabled={disabled || !draft.aseguradora_id || !draftConsent}
              className="flex-1 h-9 bg-[#0F766E] text-white text-xs font-medium rounded-lg hover:bg-[#0F766E]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
