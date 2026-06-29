"use client";

import { useState, useMemo } from "react";
import type { MedicamentoPropuesto, Medicamento, UnidadDispensacion } from "@/lib/recetas/tipos";
import { calcularDispensacion } from "@/lib/recetas/calcularDispensacion";
import {
  parsearTomasPorDia,
  parsearDosis,
  buildCantidadTexto,
} from "@/lib/recetas/parsearDosis";
import { formatearDosisConfirmada } from "@/lib/recetas/gateDocumentos";
import {
  type UnidadConcentracion,
  type UnidadDosis,
  type UnidadDosisPeso,
  CONCENTRACION_POR_FORMA,
  DOSIS_OPCIONES,
  DOSIS_PESO_OPCIONES,
  normalizarConcentracion,
  normalizarDosis,
  normalizarDosisPeso,
  parsearUnidadConcentracion,
  parsearValorConcentracion,
  parsearUnidadDosis,
  parsearValorDosis,
  parsearUnidadDosisPeso,
} from "@/lib/recetas/unidades";

const INPUT =
  "w-full h-9 px-2 bg-white border border-[#D1D5DB] rounded-lg text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50";

const SELECT =
  "h-9 px-2 bg-white border border-[#D1D5DB] rounded-lg text-sm shrink-0 " +
  "focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 focus:border-[#0F766E] disabled:opacity-50 " +
  "aria-invalid:border-[#DC2626] aria-invalid:ring-1 aria-invalid:ring-[#DC2626]/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-[#374151]">{label}</span>
      {children}
    </label>
  );
}

interface Props {
  med: MedicamentoPropuesto;
  index: number;
  onConfirmar: (m: Medicamento) => void;
  disabled: boolean;
}

const SIZES_LIQUIDO = [60, 100, 150];
const SIZES_SOLIDO = [10, 20, 30];
const SIZES_INHALADOR = [100, 200];

function sizesParaUnidad(unidad: UnidadDispensacion): number[] {
  if (unidad === "liquido") return SIZES_LIQUIDO;
  if (unidad === "inhalador") return SIZES_INHALADOR;
  return SIZES_SOLIDO;
}

/**
 * Infiere la unidad a partir de la propuesta de la IA. Es solo el DEFAULT del
 * selector; el médico puede cambiarlo. La forma farmacéutica/concentración con
 * señales de aerosol gana sobre "mL"; luego "mL" ⇒ líquido; resto ⇒ comprimido.
 */
function inferirUnidad(concentracion: string, formaFarmaceutica: string): UnidadDispensacion {
  const txt = `${concentracion} ${formaFarmaceutica}`.toLowerCase();
  if (/inhalad|aerosol|spray|\bpuff|\/\s*dosis|\bmdi\b|disparo|nebuliz/.test(txt)) {
    return "inhalador";
  }
  if (/m\s*l\b/i.test(concentracion)) return "liquido";
  return "comprimido";
}

/** Limpia la cola de punto flotante para mostrar: 1.0999… → "1.1", 9.0 → "9". */
function fmt(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

function extraerPesoKg(dosis: string, indicacion?: string | null): string {
  const patron = /\bpeso[:\s]*(\d+(?:[.,]\d+)?)\s*kg/i;
  const enDosis = dosis.match(patron);
  if (enDosis) return enDosis[1].replace(",", ".");
  const enIndicacion = indicacion ? indicacion.match(patron) : null;
  if (enIndicacion) return enIndicacion[1].replace(",", ".");
  return "";
}

export default function MedicamentoCard({ med, index, onConfirmar, disabled }: Props) {
  const dosisParsed = useMemo(() => parsearDosis(med.dosis), [med.dosis]);
  const tomasIniciales = useMemo(() => parsearTomasPorDia(med.frecuencia), [med.frecuencia]);
  const unidadInicial = useMemo(
    () => inferirUnidad(med.concentracion, med.formaFarmaceutica),
    [med.concentracion, med.formaFarmaceutica]
  );

  // Defaults de unidad y valor crudo desde el string de la IA. Si no se reconoce
  // la unidad, queda null y "Confirmar" se bloquea hasta que el médico elija
  // (nunca se asume mg).
  const concValorInicial   = useMemo(() => parsearValorConcentracion(med.concentracion), [med.concentracion]);
  const unidadConcInicial  = useMemo(() => parsearUnidadConcentracion(med.concentracion), [med.concentracion]);
  const dosisValorInicial  = useMemo(() => parsearValorDosis(med.dosis), [med.dosis]);
  const unidadDosisInicial = useMemo(() => parsearUnidadDosis(med.dosis), [med.dosis]);
  const unidadDosisPesoInicial = useMemo(() => parsearUnidadDosisPeso(med.dosis), [med.dosis]);

  const [unidad, setUnidad] = useState<UnidadDispensacion>(unidadInicial);
  const esLiquido = unidad === "liquido";
  const sizesDefault = sizesParaUnidad(unidad);

  const [pesoKg, setPesoKg] = useState(() => extraerPesoKg(med.dosis, med.indicacion));
  const [dosisMgKg, setDosisMgKg] = useState(
    dosisParsed.dosisMgKgDia !== null ? String(dosisParsed.dosisMgKgDia) : ""
  );
  const [dosisFija, setDosisFija] = useState(
    dosisValorInicial !== null ? String(dosisValorInicial) : ""
  );
  const [concNum, setConcNum] = useState(
    concValorInicial !== null ? String(concValorInicial) : ""
  );

  // Unidades elegidas por el médico (default: lo parseado de la IA, o null).
  const [unidadConc, setUnidadConc] = useState<UnidadConcentracion | null>(
    unidadConcInicial && CONCENTRACION_POR_FORMA[unidadInicial].includes(unidadConcInicial)
      ? unidadConcInicial
      : null
  );
  const [unidadDosis, setUnidadDosis] = useState<UnidadDosis | null>(unidadDosisInicial);
  const [unidadDosisPeso, setUnidadDosisPeso] = useState<UnidadDosisPeso | null>(
    unidadDosisPesoInicial ?? "mg/kg/día"
  );

  const [tomas, setTomas] = useState(String(tomasIniciales));
  const [tamano, setTamano] = useState(
    () => String(sizesParaUnidad(unidadInicial)[sizesParaUnidad(unidadInicial).length - 1])
  );
  const [esPorPeso, setEsPorPeso] = useState(() => dosisParsed.esPorPeso);
  const [confirmadoLocal, setConfirmadoLocal] = useState(false);
  const [cantidadTexto, setCantidadTexto] = useState("");
  // Concentración canónica (número + unidad elegidos por el médico): único punto
  // de verdad que va a pantalla, DB y PDF.
  const [concentracionConfirmada, setConcentracionConfirmada] = useState("");

  // Opciones de unidad de concentración para la forma actual.
  const opcionesConc = CONCENTRACION_POR_FORMA[unidad];

  // Al cambiar la forma, el médico manda sobre la IA. Reseteamos el tamaño de
  // envase y la unidad de concentración (un frasco de 150 mL o "mg/mL" no aplican
  // a un inhalador): el médico vuelve a elegir la unidad — nunca se asume.
  function cambiarUnidad(u: UnidadDispensacion) {
    setUnidad(u);
    const sizes = sizesParaUnidad(u);
    setTamano(String(sizes[sizes.length - 1]));
    setUnidadConc(null);
  }

  // Etiquetas de dispensación (la concentración y la dosis llevan su selector).
  const labelEnvase = unidad === "liquido" ? "mL" : unidad === "inhalador" ? "dosis" : "unidades";
  const labelTotal = unidad === "liquido" ? "mL" : unidad === "inhalador" ? "dosis" : "u";

  const resultado = useMemo(() => {
    const conc = parseFloat(concNum);
    const tom = parseInt(tomas);
    const tam = parseFloat(tamano);
    if (!conc || conc <= 0 || !tom || !tam || tam <= 0) return null;

    // Sin unidad elegida no se calcula: jamás se asume una unidad base.
    if (unidadConc === null) return null;
    const concBase = normalizarConcentracion(conc, unidadConc);

    if (esPorPeso) {
      const peso = parseFloat(pesoKg);
      const dkg = parseFloat(dosisMgKg);
      if (!peso || peso <= 0 || !dkg || dkg <= 0) return null;
      if (unidadDosisPeso === null) return null;
      const dkgBase = normalizarDosisPeso(dkg, unidadDosisPeso);
      return calcularDispensacion({
        dosisMgKgDia: dkgBase,
        pesoKg: peso,
        concentracion: concBase,
        tomasPorDia: tom,
        diasTratamiento: med.duracionDias,
        tamanoEnvase: tam,
        esPRN: false,
        esLiquido,
        esInhalador: unidad === "inhalador",
      });
    }

    const df = parseFloat(dosisFija);
    if (!df || df <= 0) return null;
    if (unidadDosis === null) return null;
    const dfBase = normalizarDosis(df, unidadDosis);
    return calcularDispensacion({
      dosisPorTomaMg: dfBase,
      concentracion: concBase,
      tomasPorDia: tom,
      diasTratamiento: med.duracionDias,
      tamanoEnvase: tam,
      esPRN: false,
      esLiquido,
      esInhalador: unidad === "inhalador",
    });
  }, [pesoKg, dosisMgKg, dosisFija, concNum, tomas, tamano, esPorPeso, unidad,
      unidadConc, unidadDosis, unidadDosisPeso, esLiquido, med.duracionDias]);

  function handleConfirmar() {
    if (!resultado?.ok || unidadConc === null) return;
    const r = resultado.resultado;
    const tam = parseFloat(tamano);
    const cantidad = buildCantidadTexto(r.numEnvases, tam, unidad);
    // Concentración canónica = número + unidad ELEGIDOS por el médico (sin cola
    // de float: usa el texto crudo del input). Único punto de verdad para
    // pantalla, DB y PDF; reemplaza el string de la IA.
    const concentracionCanonica = `${concNum} ${unidadConc}`;
    // Dosis confirmada en números y letras a partir de los valores CALCULADOS
    // (no del texto crudo de la IA): esto es lo único que se imprime.
    const dosisConfirmadaTexto = formatearDosisConfirmada({
      dosisPorTomaMg: r.dosisPorTomaMg,
      volumenOUnidadesPorToma: r.volumenOUnidadesPorToma,
      esLiquido,
      unidad,
      concentracion: concentracionCanonica,
      formaFarmaceutica: med.formaFarmaceutica,
      frecuencia: med.frecuencia,
    });
    setCantidadTexto(cantidad);
    setConcentracionConfirmada(concentracionCanonica);
    setConfirmadoLocal(true);
    onConfirmar({
      ...med,
      concentracion: concentracionCanonica,
      confirmado: true,
      cantidadTexto: cantidad,
      dosisConfirmadaTexto,
    });
  }

  const isCustomTamano = !sizesDefault.includes(parseFloat(tamano));
  const listo = Boolean(resultado?.ok);

  // ── Confirmed view ──────────────────────────────────────────────────────────
  if (confirmadoLocal) {
    return (
      <div className="border border-[#6EE7B7] bg-[#F0FDFB] rounded-lg px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-[#059669] font-bold shrink-0 mt-0.5">✓</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0F172A]">
                {med.dci}
                {med.nombreComercial ? ` (${med.nombreComercial})` : ""}
                {" "}{med.formaFarmaceutica} {concentracionConfirmada || med.concentracion}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                {med.dosis} · {med.frecuencia} · {med.duracionDias} días
              </p>
              <p className="text-xs font-semibold text-[#0F766E] mt-1">
                Cantidad: {cantidadTexto}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => { setConfirmadoLocal(false); setCantidadTexto(""); }}
              className="text-xs text-[#64748B] hover:text-[#0F766E] underline shrink-0 mt-0.5"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Pending view ────────────────────────────────────────────────────────────
  return (
    <div className="border border-[#E2E8F0] rounded-lg px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-[#0F172A]">
          {index + 1}.{" "}
          <span className="capitalize">{med.dci}</span>
          {med.nombreComercial ? ` (${med.nombreComercial})` : ""}
          {" "}{med.formaFarmaceutica}
        </p>
        <p className="text-xs text-[#64748B] mt-0.5">
          {med.concentracion} · vía {med.via} · {med.dosis} · {med.frecuencia} · {med.duracionDias} días
          {med.indicacion ? <> — <em>{med.indicacion}</em></> : null}
        </p>
      </div>

      {/* Tipo de cálculo — el médico puede cambiar lo que infirió la IA */}
      <div>
        <span className="text-xs font-medium text-[#374151]">Tipo de dosis</span>
        <div className="mt-1 inline-flex items-center gap-0.5 rounded-lg bg-[#F1F5F9] p-0.5">
          <button
            type="button"
            onClick={() => setEsPorPeso(true)}
            disabled={disabled}
            className={`h-8 rounded-md px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
              esPorPeso
                ? "bg-white text-[#0F766E] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Por peso (mg/kg/día)
          </button>
          <button
            type="button"
            onClick={() => setEsPorPeso(false)}
            disabled={disabled}
            className={`h-8 rounded-md px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
              !esPorPeso
                ? "bg-white text-[#0F766E] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Dosis fija por toma
          </button>
        </div>
      </div>

      {/* Unidad de dispensación — el médico la elige; la IA solo sugiere el default */}
      <div>
        <span className="text-xs font-medium text-[#374151]">Forma / unidad</span>
        <div className="mt-1 inline-flex items-center gap-0.5 rounded-lg bg-[#F1F5F9] p-0.5">
          {([
            ["liquido", "Líquido (mL)"],
            ["comprimido", "Comprimido (u)"],
            ["inhalador", "Inhalador (puffs)"],
          ] as [UnidadDispensacion, string][]).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => cambiarUnidad(val)}
              disabled={disabled}
              className={`h-8 rounded-md px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
                unidad === val
                  ? "bg-white text-[#0F766E] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dose inputs */}
      <div className="grid grid-cols-2 gap-3">
        {esPorPeso && (
          <>
            <Field label="Peso del paciente (kg)">
              <input
                type="number"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                min={0.5}
                step={0.1}
                disabled={disabled}
                placeholder="ej. 22"
                className={INPUT}
              />
            </Field>
            <Field label="Dosis">
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={dosisMgKg}
                  onChange={(e) => setDosisMgKg(e.target.value)}
                  min={0.1}
                  step={0.1}
                  disabled={disabled}
                  className={`${INPUT} flex-1 min-w-0`}
                  aria-label="Valor de dosis por peso"
                />
                <select
                  value={unidadDosisPeso ?? ""}
                  onChange={(e) => setUnidadDosisPeso((e.target.value || null) as UnidadDosisPeso | null)}
                  disabled={disabled}
                  aria-invalid={unidadDosisPeso === null}
                  aria-label="Unidad de dosis por peso"
                  className={SELECT}
                >
                  <option value="" disabled>— unidad —</option>
                  {DOSIS_PESO_OPCIONES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </Field>
          </>
        )}
        {!esPorPeso && (
          <Field label="Dosis por toma">
            <div className="flex gap-1.5">
              <input
                type="number"
                value={dosisFija}
                onChange={(e) => setDosisFija(e.target.value)}
                min={0}
                step="any"
                disabled={disabled}
                className={`${INPUT} flex-1 min-w-0`}
                aria-label="Valor de dosis por toma"
              />
              <select
                value={unidadDosis ?? ""}
                onChange={(e) => setUnidadDosis((e.target.value || null) as UnidadDosis | null)}
                disabled={disabled}
                aria-invalid={unidadDosis === null}
                aria-label="Unidad de dosis por toma"
                className={SELECT}
              >
                <option value="" disabled>— unidad —</option>
                {DOSIS_OPCIONES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </Field>
        )}
        <Field label="Concentración">
          <div className="flex gap-1.5">
            <input
              type="number"
              value={concNum}
              onChange={(e) => setConcNum(e.target.value)}
              min={0}
              step="any"
              disabled={disabled}
              className={`${INPUT} flex-1 min-w-0`}
              aria-label="Valor de concentración"
            />
            <select
              value={unidadConc ?? ""}
              onChange={(e) => setUnidadConc((e.target.value || null) as UnidadConcentracion | null)}
              disabled={disabled}
              aria-invalid={unidadConc === null}
              aria-label="Unidad de concentración"
              className={SELECT}
            >
              <option value="" disabled>— unidad —</option>
              {opcionesConc.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Tomas por día">
          <input
            type="number"
            value={tomas}
            onChange={(e) => setTomas(e.target.value)}
            min={1}
            max={8}
            disabled={disabled}
            className={INPUT}
          />
        </Field>
      </div>

      {/* Envase selector */}
      <Field label={`Tamaño de envase (${labelEnvase})`}>
        <div className="flex gap-1.5 flex-wrap items-center">
          {sizesDefault.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTamano(String(t))}
              disabled={disabled}
              className={`h-8 px-3 text-xs rounded-lg border transition-colors disabled:opacity-50 ${
                tamano === String(t) && !isCustomTamano
                  ? "bg-[#0F766E] text-white border-[#0F766E]"
                  : "bg-white text-[#374151] border-[#D1D5DB] hover:border-[#0F766E]"
              }`}
            >
              {t}
            </button>
          ))}
          <input
            type="number"
            min={1}
            disabled={disabled}
            placeholder="otro"
            value={isCustomTamano ? tamano : ""}
            onChange={(e) => { if (e.target.value) setTamano(e.target.value); }}
            className="h-8 w-16 px-2 bg-white border border-[#D1D5DB] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 disabled:opacity-50"
          />
        </div>
      </Field>

      {/* Calculation result */}
      {listo && resultado?.ok && (
        <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-lg px-3 py-2">
          <p className="text-sm font-medium text-[#166534]">
            {unidad === "inhalador"
              ? `${fmt(resultado.resultado.volumenOUnidadesPorToma)} ${resultado.resultado.volumenOUnidadesPorToma === 1 ? "puff" : "puffs"}/toma`
              : <>
                  {fmt(resultado.resultado.dosisPorTomaMg)} mg/toma
                  {unidad === "liquido"
                    ? ` · ${fmt(resultado.resultado.volumenOUnidadesPorToma)} mL/toma`
                    : ` · ${fmt(resultado.resultado.volumenOUnidadesPorToma)} ${resultado.resultado.volumenOUnidadesPorToma === 1 ? "comprimido" : "comprimidos"}/toma`}
                </>}
            {" · "}
            <strong>
              {resultado.resultado.numEnvases}{" "}
              {unidad === "liquido" ? "frasco" : unidad === "inhalador" ? "inhalador" : "envase"}
              {resultado.resultado.numEnvases > 1 ? (unidad === "inhalador" ? "es" : "s") : ""} de {tamano}{" "}
              {labelTotal}
            </strong>
            {resultado.resultado.totalDispensado > resultado.resultado.totalNecesario && (
              <span className="text-[#166534]/70">
                {" "}({fmt(resultado.resultado.totalNecesario)} {labelTotal} necesarios)
              </span>
            )}
          </p>
        </div>
      )}
      {resultado && !resultado.ok && !resultado.requiereCantidadManual && (
        <p className="text-xs text-[#DC2626]">{resultado.razon}</p>
      )}
      {!listo && (
        <p className="text-xs text-[#94A3B8]">
          {unidadConc === null || (esPorPeso ? unidadDosisPeso === null : unidadDosis === null)
            ? "Elige la unidad de cada valor para calcular."
            : esPorPeso
              ? "Ingresa peso y dosis para calcular."
              : "Ingresa dosis para calcular."}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirmar}
        disabled={disabled || !listo}
        className="w-full h-9 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirmar dosis
      </button>
    </div>
  );
}
