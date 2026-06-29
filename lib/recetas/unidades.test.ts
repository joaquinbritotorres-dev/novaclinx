import { describe, it, expect } from "vitest";
import {
  FACTOR_CONCENTRACION,
  FACTOR_DOSIS,
  FACTOR_DOSIS_PESO,
  limpiarFloat,
  normalizarConcentracion,
  normalizarDosis,
  normalizarDosisPeso,
  parsearUnidadConcentracion,
  parsearValorConcentracion,
  parsearUnidadDosis,
  parsearValorDosis,
  parsearUnidadDosisPeso,
} from "./unidades";
import { calcularDispensacion } from "./calcularDispensacion";

// ─── Un test por conversión exacta de la tabla aprobada ──────────────────────

describe("normalizarConcentracion — factor exacto por unidad", () => {
  it("mg/mL ×1", () => expect(normalizarConcentracion(50, "mg/mL")).toBe(50));
  it("mg/5 mL ×0.2 (250 mg/5 mL = 50 mg/mL)", () =>
    expect(normalizarConcentracion(250, "mg/5 mL")).toBe(50));
  it("mcg/mL ×0.001", () => expect(normalizarConcentracion(200, "mcg/mL")).toBe(0.2));
  it("mg ×1 (por comprimido)", () => expect(normalizarConcentracion(500, "mg")).toBe(500));
  it("mcg ×0.001 (por comprimido)", () => expect(normalizarConcentracion(25, "mcg")).toBe(0.025));
  it("g ×1000 (por comprimido)", () => expect(normalizarConcentracion(1, "g")).toBe(1000));
  it("mcg/puff ×0.001 (100 mcg/puff = 0.1 mg/puff) — el caso del bug", () =>
    expect(normalizarConcentracion(100, "mcg/puff")).toBe(0.1));
  it("mg/puff ×1", () => expect(normalizarConcentracion(0.1, "mg/puff")).toBe(0.1));
});

describe("normalizarDosis — factor exacto por unidad", () => {
  it("mg ×1", () => expect(normalizarDosis(500, "mg")).toBe(500));
  it("mcg ×0.001 (200 mcg = 0.2 mg)", () => expect(normalizarDosis(200, "mcg")).toBe(0.2));
  it("g ×1000 (1 g = 1000 mg)", () => expect(normalizarDosis(1, "g")).toBe(1000));
});

describe("normalizarDosisPeso — factor exacto por unidad", () => {
  it("mg/kg/día ×1", () => expect(normalizarDosisPeso(50, "mg/kg/día")).toBe(50));
  it("mcg/kg/día ×0.001", () => expect(normalizarDosisPeso(8, "mcg/kg/día")).toBe(0.008));
});

describe("tablas de factores — valores exactos", () => {
  it("concentración", () => {
    expect(FACTOR_CONCENTRACION).toEqual({
      "mg/mL": 1, "mg/5 mL": 0.2, "mcg/mL": 0.001,
      mg: 1, mcg: 0.001, g: 1000,
      "mcg/puff": 0.001, "mg/puff": 1,
    });
  });
  it("dosis", () => expect(FACTOR_DOSIS).toEqual({ mg: 1, mcg: 0.001, g: 1000 }));
  it("dosis por peso", () =>
    expect(FACTOR_DOSIS_PESO).toEqual({ "mg/kg/día": 1, "mcg/kg/día": 0.001 }));
});

// ─── limpiarFloat: sin cola de punto flotante, preservando sub-mg ────────────

describe("limpiarFloat", () => {
  it("100 × 0.001 = 0.1 sin cola", () => expect(limpiarFloat(100 * 0.001)).toBe(0.1));
  it("preserva 0.001 (1 mcg en mg)", () => expect(limpiarFloat(1 * 0.001)).toBe(0.001));
  it("250 × 0.2 = 50", () => expect(limpiarFloat(250 * 0.2)).toBe(50));
  it("0 se mantiene", () => expect(limpiarFloat(0)).toBe(0));
});

// ─── Parseo del string de la IA (default del selector) ───────────────────────

describe("parsearUnidadConcentracion", () => {
  it("100 mcg/puff → mcg/puff (lo que el parser viejo NO leía)", () =>
    expect(parsearUnidadConcentracion("100 mcg/puff")).toBe("mcg/puff"));
  it("100 mcg/dosis → mcg/puff (dosis = puff en MDI)", () =>
    expect(parsearUnidadConcentracion("100 mcg/dosis")).toBe("mcg/puff"));
  it("0.1 mg/puff → mg/puff", () =>
    expect(parsearUnidadConcentracion("0.1 mg/puff")).toBe("mg/puff"));
  it("250 mg/5 mL → mg/5 mL (lo que el parser viejo NO leía como tal)", () =>
    expect(parsearUnidadConcentracion("250 mg/5 mL")).toBe("mg/5 mL"));
  it("100 mg/mL → mg/mL", () => expect(parsearUnidadConcentracion("100 mg/mL")).toBe("mg/mL"));
  it("200 mcg/mL → mcg/mL", () => expect(parsearUnidadConcentracion("200 mcg/mL")).toBe("mcg/mL"));
  it("500 mg → mg", () => expect(parsearUnidadConcentracion("500 mg")).toBe("mg"));
  it("25 mcg → mcg", () => expect(parsearUnidadConcentracion("25 mcg")).toBe("mcg"));
  it("1 g → g", () => expect(parsearUnidadConcentracion("1 g")).toBe("g"));
  it("string desconocido → null (sin asumir)", () =>
    expect(parsearUnidadConcentracion("vía inhalatoria")).toBeNull());
  it("/10 mL fuera de tabla → null", () =>
    expect(parsearUnidadConcentracion("100 mg/10 mL")).toBeNull());
});

describe("parsearValorConcentracion — valor crudo, no normalizado", () => {
  it("250 de '250 mg/5 mL' (no 50)", () =>
    expect(parsearValorConcentracion("250 mg/5 mL")).toBe(250));
  it("100 de '100 mcg/puff'", () =>
    expect(parsearValorConcentracion("100 mcg/puff")).toBe(100));
  it("0.1 de '0.1 mg/puff'", () =>
    expect(parsearValorConcentracion("0.1 mg/puff")).toBe(0.1));
  it("null si no hay número con unidad", () =>
    expect(parsearValorConcentracion("aerosol")).toBeNull());
});

describe("parsearUnidadDosis / parsearValorDosis", () => {
  it("'200 mcg' → mcg, 200", () => {
    expect(parsearUnidadDosis("200 mcg")).toBe("mcg");
    expect(parsearValorDosis("200 mcg")).toBe(200);
  });
  it("'500 mg c/8h' → mg, 500", () => {
    expect(parsearUnidadDosis("500 mg c/8h")).toBe("mg");
    expect(parsearValorDosis("500 mg c/8h")).toBe(500);
  });
  it("'1 g' → g, 1", () => {
    expect(parsearUnidadDosis("1 g")).toBe("g");
    expect(parsearValorDosis("1 g")).toBe(1);
  });
  it("dosis por peso 'mg/kg' no se confunde con dosis fija", () => {
    expect(parsearUnidadDosis("50 mg/kg/día")).toBeNull();
    expect(parsearValorDosis("50 mg/kg/día")).toBeNull();
  });
});

describe("parsearUnidadDosisPeso", () => {
  it("'50 mg/kg/día' → mg/kg/día", () =>
    expect(parsearUnidadDosisPeso("50 mg/kg/día")).toBe("mg/kg/día"));
  it("'8 mcg/kg/día' → mcg/kg/día", () =>
    expect(parsearUnidadDosisPeso("8 mcg/kg/día")).toBe("mcg/kg/día"));
  it("sin /kg → null", () => expect(parsearUnidadDosisPeso("500 mg")).toBeNull());
});

// ─── EQUIVALENCIA: la normalización da el MISMO resultado que ingresar en mg ──

describe("equivalencia — normalizar mcg ≡ ingresar en mg", () => {
  it("'100 mcg/puff' + '200 mcg' == '0.1 mg/puff' + '0.2 mg'", () => {
    const base = {
      tomasPorDia: 4,
      diasTratamiento: 7,
      tamanoEnvase: 200,
      esPRN: false as const,
      esInhalador: true,
    };
    const viaUnidades = calcularDispensacion({
      ...base,
      dosisPorTomaMg: normalizarDosis(200, "mcg"),
      concentracion: normalizarConcentracion(100, "mcg/puff"),
    });
    const viaMg = calcularDispensacion({
      ...base,
      dosisPorTomaMg: 0.2,
      concentracion: 0.1,
    });
    expect(viaUnidades).toEqual(viaMg);
    expect(viaUnidades.ok && viaUnidades.resultado.volumenOUnidadesPorToma).toBe(2); // 2 puffs
  });

  it("'250 mg/5 mL' ≡ '50 mg/mL' en cálculo de líquido", () => {
    const base = {
      dosisPorTomaMg: 550,
      tomasPorDia: 2,
      diasTratamiento: 10,
      tamanoEnvase: 150,
      esPRN: false as const,
      esLiquido: true,
    };
    const viaUnidades = calcularDispensacion({
      ...base,
      concentracion: normalizarConcentracion(250, "mg/5 mL"),
    });
    const viaMgMl = calcularDispensacion({ ...base, concentracion: 50 });
    expect(viaUnidades).toEqual(viaMgMl);
    expect(viaUnidades.ok && viaUnidades.resultado.volumenOUnidadesPorToma).toBe(11); // 11 mL
  });
});
