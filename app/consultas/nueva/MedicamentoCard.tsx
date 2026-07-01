"use client";

import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { MedicamentoPropuesto, Medicamento, UnidadDispensacion } from "@/lib/recetas/tipos";
import { calcularDispensacion } from "@/lib/recetas/calcularDispensacion";
import { chequearSanidad, type ChequeoSanidad } from "@/lib/recetas/sanidad";
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
  CONCENTRACION_GRUPOS,
  DOSIS_PESO_OPCIONES,
  dosisOpcionesPorForma,
  esUnidadDosisDirecta,
  formaDeUnidadConcentracion,
  normalizarConcentracion,
  normalizarDosis,
  normalizarDosisPeso,
  parsearValorConcentracion,
  parsearValorDosis,
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
const SIZES_TOPICO = [15, 30, 60];

function sizesParaUnidad(unidad: UnidadDispensacion): number[] {
  if (unidad === "liquido") return SIZES_LIQUIDO;
  if (unidad === "inhalador") return SIZES_INHALADOR;
  if (unidad === "topico") return SIZES_TOPICO;
  return SIZES_SOLIDO;
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

/** Detecta prescripción "a demanda" (PRN): sin tomas fijas, no se calcula la
 *  cantidad total automáticamente; el médico indica cuánto dispensar. */
function detectarPRN(frecuencia: string, dosis: string, indicacion?: string | null): boolean {
  const txt = `${frecuencia} ${dosis} ${indicacion ?? ""}`.toLowerCase();
  return /seg[uú]n necesidad|a demanda|si precisa|si es necesario|raz[oó]n necesaria|\bprn\b/.test(
    txt
  );
}

export default function MedicamentoCard({ med, index, onConfirmar, disabled }: Props) {
  const dosisParsed = useMemo(() => parsearDosis(med.dosis), [med.dosis]);
  const tomasIniciales = useMemo(() => parsearTomasPorDia(med.frecuencia), [med.frecuencia]);

  // Solo el VALOR numérico se pre-rellena de la IA (ayuda visible y editable).
  // La UNIDAD/medida NUNCA se preselecciona: el médico SIEMPRE la elige.
  const concValorInicial  = useMemo(() => parsearValorConcentracion(med.concentracion), [med.concentracion]);
  const dosisValorInicial = useMemo(() => parsearValorDosis(med.dosis), [med.dosis]);

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

  // Medidas: SIEMPRE arrancan sin elegir (null). La IA no adivina la unidad.
  const [unidadConc, setUnidadConc] = useState<UnidadConcentracion | null>(null);
  const [unidadDosis, setUnidadDosis] = useState<UnidadDosis | null>(null);
  const [unidadDosisPeso, setUnidadDosisPeso] = useState<UnidadDosisPeso | null>(null);

  // La FORMA (líquido/comprimido/inhalador) se DERIVA de la medida de
  // concentración elegida — el médico no la elige aparte.
  const forma: UnidadDispensacion | null = unidadConc
    ? formaDeUnidadConcentracion(unidadConc)
    : null;
  const esLiquido = forma === "liquido";
  const esInhalador = forma === "inhalador";
  const esTopico = forma === "topico";
  const sizesDefault = forma ? sizesParaUnidad(forma) : [];

  const [tomas, setTomas] = useState(String(tomasIniciales));
  const [tamano, setTamano] = useState("");
  const [esPorPeso, setEsPorPeso] = useState(() => dosisParsed.esPorPeso);
  // "Según necesidad" (PRN): sin tomas fijas; el médico indica cuánto dispensar.
  const [segunNecesidad, setSegunNecesidad] = useState(() =>
    detectarPRN(med.frecuencia, med.dosis, med.indicacion)
  );
  const [envasesADispensar, setEnvasesADispensar] = useState("1");
  // La cantidad la decide el médico (no se calcula) en PRN y SIEMPRE en tópicos
  // (una crema no tiene "gramos por aplicación" estándar para calcular tubos).
  const cantidadManual = segunNecesidad || esTopico;
  const [confirmadoLocal, setConfirmadoLocal] = useState(false);
  const [cantidadTexto, setCantidadTexto] = useState("");
  // Concentración canónica (número + unidad elegidos por el médico): único punto
  // de verdad que va a pantalla, DB y PDF.
  const [concentracionConfirmada, setConcentracionConfirmada] = useState("");

  // Al elegir la medida de concentración, la forma queda derivada. Reseteamos el
  // tamaño de envase al default de esa forma (un frasco de 150 mL no aplica a un
  // inhalador).
  function cambiarUnidadConc(u: UnidadConcentracion | null) {
    setUnidadConc(u);
    // La unidad de dosis depende de la forma → se re-elige. En inhalador la dosis
    // se prescribe en puff (directa) y no se dosifica por peso.
    setUnidadDosis(null);
    if (u) {
      const formaNueva = formaDeUnidadConcentracion(u);
      const sizes = sizesParaUnidad(formaNueva);
      setTamano(String(sizes[sizes.length - 1]));
      if (formaNueva === "inhalador" || formaNueva === "topico") setEsPorPeso(false);
    } else {
      setTamano("");
    }
  }

  // Etiquetas de dispensación (la concentración y la dosis llevan su selector).
  const labelEnvase =
    forma === "liquido" ? "mL" : forma === "inhalador" ? "dosis" : forma === "topico" ? "g" : "unidades";
  const labelTotal =
    forma === "liquido" ? "mL" : forma === "inhalador" ? "dosis" : forma === "topico" ? "g" : "u";
  // Unidades de dosis por toma disponibles según la forma (inhalador → puff).
  const opcionesDosis = dosisOpcionesPorForma(forma ?? "comprimido");

  const resultado = useMemo(() => {
    const conc = parseFloat(concNum);
    // Con cantidad manual (PRN o tópico) no hay tomas/días fijos: se usa 1/1 para
    // obtener el volumen por toma (documentación); la CANTIDAD la indica el médico.
    const tom = cantidadManual ? 1 : parseInt(tomas);
    const dias = cantidadManual ? 1 : med.duracionDias;
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
        diasTratamiento: dias,
        tamanoEnvase: tam,
        esPRN: false,
        esLiquido,
        esInhalador,
      });
    }

    const df = parseFloat(dosisFija);
    if (!df || df <= 0) return null;
    if (unidadDosis === null) return null;

    // Dosis DIRECTA (ej. 2 puff): se pasa tal cual, sin dividir por concentración.
    if (esUnidadDosisDirecta(unidadDosis)) {
      return calcularDispensacion({
        unidadesPorTomaDirectas: df,
        concentracion: concBase,
        tomasPorDia: tom,
        diasTratamiento: dias,
        tamanoEnvase: tam,
        esPRN: false,
        esLiquido,
        esInhalador,
      });
    }

    // Dosis por MASA: se normaliza a mg y la calculadora la divide por concentración.
    const dfBase = normalizarDosis(df, unidadDosis);
    return calcularDispensacion({
      dosisPorTomaMg: dfBase,
      concentracion: concBase,
      tomasPorDia: tom,
      diasTratamiento: dias,
      tamanoEnvase: tam,
      esPRN: false,
      esLiquido,
      esInhalador,
    });
  }, [pesoKg, dosisMgKg, dosisFija, concNum, tomas, tamano, esPorPeso, cantidadManual,
      unidadConc, unidadDosis, unidadDosisPeso, esLiquido, esInhalador, med.duracionDias]);

  // Con cantidad manual (PRN/tópico) la decide el médico (nº de envases); en modo
  // normal se calcula. Nº de envases efectivo para mostrar/confirmar.
  const envasesManual = Math.max(1, Math.floor(parseFloat(envasesADispensar) || 0));
  const numEnvasesFinal =
    cantidadManual ? envasesManual : resultado?.ok ? resultado.resultado.numEnvases : 0;

  function handleConfirmar() {
    if (!resultado?.ok || unidadConc === null || forma === null || !sanidad?.ok) return;
    const r = resultado.resultado;
    const tam = parseFloat(tamano);
    const cantidad = buildCantidadTexto(numEnvasesFinal, tam, forma);
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
      unidad: forma,
      concentracion: concentracionCanonica,
      formaFarmaceutica: med.formaFarmaceutica,
      frecuencia: segunNecesidad ? "según necesidad" : med.frecuencia,
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

  // Red de seguridad: sobre el resultado YA calculado (no recalcula). Si el
  // número es clínicamente imposible (error de unidad), bloquea el verde y el
  // botón Confirmar. No reemplaza el criterio médico; atrapa errores de dedo.
  const sanidad = useMemo<ChequeoSanidad | null>(() => {
    if (!resultado?.ok || forma === null) return null;
    return chequearSanidad(resultado.resultado, forma);
  }, [resultado, forma]);

  const isCustomTamano = !sizesDefault.includes(parseFloat(tamano));
  const listo = Boolean(resultado?.ok && sanidad?.ok);
  const alertaSanidad = Boolean(resultado?.ok && sanidad && !sanidad.ok);

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

      {/* Tipo de cálculo — el médico puede cambiar lo que infirió la IA. En
          inhalador/tópico no aplica dosificar por peso. */}
      {forma !== "inhalador" && forma !== "topico" && (
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
      )}

      {/* Según necesidad (PRN) — sin tomas fijas; el médico indica cuánto dispensar */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={segunNecesidad}
          onChange={(e) => setSegunNecesidad(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 accent-[#0F766E]"
        />
        <span className="text-xs font-medium text-[#374151]">
          Según necesidad (a demanda / PRN)
        </span>
      </label>

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
                  <option value="" disabled>Elige la medida</option>
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
                <option value="" disabled>Elige la medida</option>
                {opcionesDosis.map((u) => (
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
              onChange={(e) => cambiarUnidadConc((e.target.value || null) as UnidadConcentracion | null)}
              disabled={disabled}
              aria-invalid={unidadConc === null}
              aria-label="Medida de concentración"
              className={SELECT}
            >
              <option value="" disabled>Elige la medida</option>
              {CONCENTRACION_GRUPOS.map((grupo) => (
                <optgroup key={grupo.label} label={grupo.label}>
                  {grupo.unidades.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </Field>
        {!cantidadManual && (
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
        )}
      </div>

      {/* Envase selector — la forma (mL/unidades/dosis) la define la medida.
          En inhalador el "tamaño" son los disparos (puff) del envase, no la dosis. */}
      <Field
        label={
          !forma
            ? "Tamaño de envase"
            : forma === "inhalador"
              ? "Disparos por inhalador (puff)"
              : forma === "topico"
                ? "Tamaño del tubo (g)"
                : `Tamaño de envase (${labelEnvase})`
        }
      >
        {forma ? (
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
        ) : (
          <p className="text-xs text-[#94A3B8]">Elige la medida de concentración primero.</p>
        )}
      </Field>

      {/* Cantidad a dispensar (PRN o tópico): sin tomas fijas, la decide el médico */}
      {cantidadManual && forma && (
        <Field
          label={`Cantidad a dispensar (${
            forma === "inhalador"
              ? "inhaladores"
              : forma === "liquido"
                ? "frascos"
                : forma === "topico"
                  ? "tubos"
                  : "envases"
          })`}
        >
          <input
            type="number"
            value={envasesADispensar}
            onChange={(e) => setEnvasesADispensar(e.target.value)}
            min={1}
            step={1}
            disabled={disabled}
            className={`${INPUT} w-24`}
            aria-label="Cantidad a dispensar"
          />
        </Field>
      )}

      {/* Calculation result */}
      {listo && resultado?.ok && (
        <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-lg px-3 py-2">
          <p className="text-sm font-medium text-[#166534]">
            {esInhalador
              ? `${fmt(resultado.resultado.volumenOUnidadesPorToma)} ${resultado.resultado.volumenOUnidadesPorToma === 1 ? "puff" : "puffs"}/toma`
              : esTopico
                ? `${fmt(resultado.resultado.volumenOUnidadesPorToma)} ${resultado.resultado.volumenOUnidadesPorToma === 1 ? "aplicación" : "aplicaciones"}/toma`
                : <>
                    {fmt(resultado.resultado.dosisPorTomaMg)} mg/toma
                    {esLiquido
                      ? ` · ${fmt(resultado.resultado.volumenOUnidadesPorToma)} mL/toma`
                      : ` · ${fmt(resultado.resultado.volumenOUnidadesPorToma)} ${resultado.resultado.volumenOUnidadesPorToma === 1 ? "comprimido" : "comprimidos"}/toma`}
                  </>}
            {segunNecesidad && <span className="text-[#166534]/80"> · según necesidad</span>}
            {" · "}
            <strong>
              {numEnvasesFinal}{" "}
              {esLiquido ? "frasco" : esInhalador ? "inhalador" : esTopico ? "tubo" : "envase"}
              {numEnvasesFinal > 1 ? (esInhalador ? "es" : "s") : ""} de {tamano}{" "}
              {labelTotal}
              {cantidadManual ? " a dispensar" : ""}
            </strong>
            {!cantidadManual &&
              resultado.resultado.totalDispensado > resultado.resultado.totalNecesario && (
                <span className="text-[#166534]/70">
                  {" "}({fmt(resultado.resultado.totalNecesario)} {labelTotal} necesarios)
                </span>
              )}
          </p>
        </div>
      )}
      {/* Alerta de cordura — resultado calculado pero clínicamente imposible */}
      {alertaSanidad && sanidad?.motivo && (
        <div
          role="alert"
          className="flex items-start gap-2 bg-[#FFFBEB] border border-[#FCD34D] rounded-lg px-3 py-2"
        >
          <AlertTriangle className="h-4 w-4 text-[#B45309] shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-sm text-[#92400E]">{sanidad.motivo}</p>
        </div>
      )}
      {resultado && !resultado.ok && !resultado.requiereCantidadManual && (
        <p className="text-xs text-[#DC2626]">{resultado.razon}</p>
      )}
      {!resultado?.ok && (
        <p className="text-xs text-[#94A3B8]">
          {unidadConc === null || (esPorPeso ? unidadDosisPeso === null : unidadDosis === null)
            ? "Elige la medida de cada valor para calcular."
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
