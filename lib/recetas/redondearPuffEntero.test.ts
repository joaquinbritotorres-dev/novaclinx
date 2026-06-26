import { describe, it, expect } from "vitest";
import { redondearPuffEntero, calcularDispensacion } from "./calcularDispensacion";

describe("redondearPuffEntero — puffs al entero más cercano (mín. 1)", () => {
  it("enteros exactos no cambian", () => {
    expect(redondearPuffEntero(1)).toBe(1);
    expect(redondearPuffEntero(2)).toBe(2);
    expect(redondearPuffEntero(4)).toBe(4);
  });

  it("redondea al más cercano (no siempre hacia arriba, a diferencia de la jeringa)", () => {
    expect(redondearPuffEntero(2.4)).toBe(2);
    expect(redondearPuffEntero(2.6)).toBe(3);
    expect(redondearPuffEntero(1.9)).toBe(2);
  });

  it("el límite .5 sube (round half-up)", () => {
    expect(redondearPuffEntero(2.5)).toBe(3);
    expect(redondearPuffEntero(1.5)).toBe(2);
  });

  it("piso de 1: nunca devuelve 0 puffs", () => {
    expect(redondearPuffEntero(0.4)).toBe(1);
    expect(redondearPuffEntero(0)).toBe(1);
    expect(redondearPuffEntero(0.1)).toBe(1);
  });
});

describe("calcularDispensacion — inhalador (esInhalador)", () => {
  // Salbutamol 100 mcg/dosis = 0.1 mg/dosis, 2 puffs/toma (0.2 mg), c/6h × 7 días,
  // inhalador de 200 dosis.
  it("2 puffs exactos, total y envases consistentes", () => {
    const r = calcularDispensacion({
      dosisPorTomaMg: 0.2,
      concentracion: 0.1,
      tomasPorDia: 4,
      diasTratamiento: 7,
      tamanoEnvase: 200,
      esPRN: false,
      esInhalador: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resultado.volumenOUnidadesPorToma).toBe(2); // 2 puffs
      expect(r.resultado.totalNecesario).toBe(56);         // 2 × 4 × 7
      expect(r.resultado.numEnvases).toBe(1);              // ceil(56/200)
    }
  });

  it("puffs fraccionarios se redondean al más cercano y el total queda consistente", () => {
    // 0.25 mg / 0.1 = 2.5 puffs → redondea a 3
    const r = calcularDispensacion({
      dosisPorTomaMg: 0.25,
      concentracion: 0.1,
      tomasPorDia: 2,
      diasTratamiento: 10,
      tamanoEnvase: 200,
      esPRN: false,
      esInhalador: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resultado.volumenOUnidadesPorToma).toBe(3); // 2.5 → 3
      expect(r.resultado.totalNecesario).toBe(60);         // 3 × 2 × 10 (no 2.5×…)
    }
  });

  it("esInhalador no aplica el redondeo de jeringa (0.5)", () => {
    // Mismo input pero como inhalador: 2.5 → 3 (entero), no 2.5 (jeringa)
    const r = calcularDispensacion({
      dosisPorTomaMg: 0.25,
      concentracion: 0.1,
      tomasPorDia: 2,
      diasTratamiento: 10,
      tamanoEnvase: 200,
      esPRN: false,
      esInhalador: true,
    });
    expect(r.ok && r.resultado.volumenOUnidadesPorToma).toBe(3);
  });
});
