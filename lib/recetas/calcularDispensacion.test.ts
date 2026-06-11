import { describe, it, expect } from "vitest";
import { calcularDispensacion } from "./calcularDispensacion";

// ────────────────────────────────────────────────────────────────
// Caso base: amoxicilina 250 mg/5 mL (50 mg/mL), niño 22 kg, c/12h × 10 días
// ────────────────────────────────────────────────────────────────
const BASE = {
  concentracion: 50,   // mg/mL → 250 mg/5 mL
  tomasPorDia: 2,      // c/12h
  diasTratamiento: 10,
  esPRN: false,
  pesoKg: 22,
} as const;

describe("calcularDispensacion — amoxicilina 250 mg/5 mL, 22 kg, c/12h × 10 días", () => {
  describe("50 mg/kg/día", () => {
    const resultado = calcularDispensacion({ ...BASE, dosisMgKgDia: 50, tamanoEnvase: 150 });

    it("ok === true", () => {
      expect(resultado.ok).toBe(true);
    });

    it("dosis por toma: 550 mg", () => {
      expect(resultado.ok && resultado.resultado.dosisPorTomaMg).toBe(550);
    });

    it("volumen por toma: 11 mL", () => {
      expect(resultado.ok && resultado.resultado.volumenOUnidadesPorToma).toBe(11);
    });

    it("total necesario: 220 mL", () => {
      expect(resultado.ok && resultado.resultado.totalNecesario).toBe(220);
    });

    it("2 frascos de 150 mL", () => {
      expect(resultado.ok && resultado.resultado.numEnvases).toBe(2);
    });

    it("totalDispensado con 150 mL: 300 mL", () => {
      expect(resultado.ok && resultado.resultado.totalDispensado).toBe(300);
    });

    it("3 frascos de 100 mL", () => {
      const r = calcularDispensacion({ ...BASE, dosisMgKgDia: 50, tamanoEnvase: 100 });
      expect(r.ok && r.resultado.numEnvases).toBe(3);
    });
  });

  describe("90 mg/kg/día", () => {
    const resultado = calcularDispensacion({ ...BASE, dosisMgKgDia: 90, tamanoEnvase: 150 });

    it("ok === true", () => {
      expect(resultado.ok).toBe(true);
    });

    it("dosis por toma: 990 mg", () => {
      expect(resultado.ok && resultado.resultado.dosisPorTomaMg).toBe(990);
    });

    it("volumen por toma: 19,8 mL", () => {
      expect(resultado.ok && resultado.resultado.volumenOUnidadesPorToma).toBe(19.8);
    });

    it("total necesario: 396 mL", () => {
      expect(resultado.ok && resultado.resultado.totalNecesario).toBe(396);
    });

    it("3 frascos de 150 mL", () => {
      expect(resultado.ok && resultado.resultado.numEnvases).toBe(3);
    });

    it("totalDispensado con 150 mL: 450 mL", () => {
      expect(resultado.ok && resultado.resultado.totalDispensado).toBe(450);
    });

    it("4 frascos de 100 mL", () => {
      const r = calcularDispensacion({ ...BASE, dosisMgKgDia: 90, tamanoEnvase: 100 });
      expect(r.ok && r.resultado.numEnvases).toBe(4);
    });
  });
});

describe("calcularDispensacion — dosis directa por toma (sólidos)", () => {
  it("paracetamol 500 mg/comp, 500 mg/toma, c/8h × 5 días, envase 20 comp → 10 comp, 1 envase", () => {
    const r = calcularDispensacion({
      dosisPorTomaMg: 500,
      concentracion: 500,
      tomasPorDia: 3,
      diasTratamiento: 5,
      tamanoEnvase: 20,
      esPRN: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resultado.volumenOUnidadesPorToma).toBe(1);    // 1 comprimido
      expect(r.resultado.totalNecesario).toBe(15);            // 15 comprimidos
      expect(r.resultado.numEnvases).toBe(1);                 // 1 caja de 20
    }
  });
});

describe("calcularDispensacion — PRN", () => {
  it("esPRN=true devuelve requiereCantidadManual=true", () => {
    const r = calcularDispensacion({
      dosisMgKgDia: 15,
      pesoKg: 20,
      concentracion: 100,
      tomasPorDia: 4,
      diasTratamiento: 5,
      tamanoEnvase: 60,
      esPRN: true,
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.requiereCantidadManual).toBe(true);
    expect(!r.ok && r.razon).toBe("PRN");
  });
});

describe("calcularDispensacion — inputs inválidos", () => {
  it("sin dosis devuelve error", () => {
    const r = calcularDispensacion({
      concentracion: 50,
      tomasPorDia: 2,
      diasTratamiento: 10,
      tamanoEnvase: 150,
      esPRN: false,
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.requiereCantidadManual).toBe(false);
  });

  it("concentración 0 devuelve error", () => {
    const r = calcularDispensacion({
      dosisPorTomaMg: 500,
      concentracion: 0,
      tomasPorDia: 2,
      diasTratamiento: 10,
      tamanoEnvase: 150,
      esPRN: false,
    });
    expect(r.ok).toBe(false);
  });
});
