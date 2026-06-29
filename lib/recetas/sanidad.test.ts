import { describe, it, expect } from "vitest";
import { chequearSanidad, MAX_POR_TOMA, MAX_ENVASES } from "./sanidad";
import { calcularDispensacion, type ResultadoCalculadora } from "./calcularDispensacion";

/** Construye un ResultadoCalculadora de prueba con un por-toma/envases dados. */
function res(
  volumenOUnidadesPorToma: number,
  numEnvases = 1
): ResultadoCalculadora {
  return {
    dosisPorTomaMg: 0,
    volumenOUnidadesPorToma,
    totalNecesario: 0,
    numEnvases,
    totalDispensado: 0,
  };
}

describe("chequearSanidad — bloquea lo clínicamente IMPOSIBLE", () => {
  it("2000 comprimidos/toma (el bug real) se bloquea", () => {
    const r = chequearSanidad(res(2000), "comprimido");
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("2000");
    expect(r.motivo).toContain("comprimidos por toma");
  });

  it("2000 envases se bloquea (respaldo por numEnvases)", () => {
    const r = chequearSanidad(res(2, 2000), "inhalador");
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("2000");
    expect(r.motivo).toContain("inhaladores");
  });

  it("inhalador con error de unidad (200 puffs/toma) se bloquea", () => {
    expect(chequearSanidad(res(200), "inhalador").ok).toBe(false);
  });

  it("líquido con 1000 mL/toma se bloquea", () => {
    expect(chequearSanidad(res(1000), "liquido").ok).toBe(false);
  });
});

describe("chequearSanidad — NO bloquea dosis reales por agresivas que sean", () => {
  it("prednisona 12 comprimidos/toma (dosis alta legítima) pasa", () => {
    expect(chequearSanidad(res(12), "comprimido").ok).toBe(true);
  });

  it("crisis asmática 10 puffs/toma pasa", () => {
    expect(chequearSanidad(res(10), "inhalador").ok).toBe(true);
  });

  it("suspensión 30 mL/toma (dosis grande) pasa", () => {
    expect(chequearSanidad(res(30), "liquido").ok).toBe(true);
  });

  it("amoxicilina 11 mL/toma pasa", () => {
    expect(chequearSanidad(res(11), "liquido").ok).toBe(true);
  });

  it("tratamiento crónico largo con muchos envases (290) pasa — el umbral no castiga la duración", () => {
    expect(chequearSanidad(res(2, 290), "comprimido").ok).toBe(true);
  });
});

describe("chequearSanidad — límites exactos (holgura controlada)", () => {
  it("inhalador: 20 puffs pasa, 21 bloquea", () => {
    expect(chequearSanidad(res(MAX_POR_TOMA.inhalador), "inhalador").ok).toBe(true);
    expect(chequearSanidad(res(MAX_POR_TOMA.inhalador + 1), "inhalador").ok).toBe(false);
  });
  it("comprimido: 30 pasa, 31 bloquea", () => {
    expect(chequearSanidad(res(MAX_POR_TOMA.comprimido), "comprimido").ok).toBe(true);
    expect(chequearSanidad(res(MAX_POR_TOMA.comprimido + 1), "comprimido").ok).toBe(false);
  });
  it("líquido: 60 mL pasa, 61 bloquea", () => {
    expect(chequearSanidad(res(MAX_POR_TOMA.liquido), "liquido").ok).toBe(true);
    expect(chequearSanidad(res(MAX_POR_TOMA.liquido + 1), "liquido").ok).toBe(false);
  });
  it("envases: 500 pasa, 501 bloquea", () => {
    expect(chequearSanidad(res(2, MAX_ENVASES), "comprimido").ok).toBe(true);
    expect(chequearSanidad(res(2, MAX_ENVASES + 1), "comprimido").ok).toBe(false);
  });
});

describe("integración — el resultado real de calcularDispensacion se chequea", () => {
  it("error de unidad → 2000 comprimidos/toma → bloqueado", () => {
    // dosis 1000 mg / concentración 0.5 mg-por-comprimido = 2000 comp/toma
    const calc = calcularDispensacion({
      dosisPorTomaMg: 1000,
      concentracion: 0.5,
      tomasPorDia: 1,
      diasTratamiento: 1,
      tamanoEnvase: 30,
      esPRN: false,
    });
    expect(calc.ok).toBe(true);
    if (calc.ok) {
      expect(calc.resultado.volumenOUnidadesPorToma).toBe(2000);
      expect(chequearSanidad(calc.resultado, "comprimido").ok).toBe(false);
    }
  });

  it("caso legítimo (amoxicilina 11 mL/toma) → no se bloquea", () => {
    // 550 mg / 50 mg/mL = 11 mL/toma
    const calc = calcularDispensacion({
      dosisPorTomaMg: 550,
      concentracion: 50,
      tomasPorDia: 2,
      diasTratamiento: 10,
      tamanoEnvase: 150,
      esPRN: false,
      esLiquido: true,
    });
    expect(calc.ok).toBe(true);
    if (calc.ok) {
      expect(calc.resultado.volumenOUnidadesPorToma).toBe(11);
      expect(chequearSanidad(calc.resultado, "liquido").ok).toBe(true);
    }
  });
});
