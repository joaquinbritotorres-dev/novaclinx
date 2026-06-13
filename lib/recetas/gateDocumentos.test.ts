import { describe, it, expect } from "vitest";
import {
  detectarPlaceholders,
  documentoLimpio,
  contarVerificar,
  numeroALetras,
  frecuenciaEnPalabras,
  formatearDosisConfirmada,
} from "./gateDocumentos";

describe("detectarPlaceholders / documentoLimpio (gate receta y certificado)", () => {
  it("detecta corchetes y bloquea", () => {
    const h = detectarPlaceholders(["amoxicilina [REQUIERE PESO]", "limpio"]);
    expect(h.corchetes).toEqual(["[REQUIERE PESO]"]);
    expect(documentoLimpio(h)).toBe(false);
  });

  it("detecta rangos de dosis y bloquea", () => {
    const h = detectarPlaceholders(["50-90 mg/kg/día", "ok"]);
    expect(h.rangos.length).toBe(1);
    expect(documentoLimpio(h)).toBe(false);
  });

  it("detecta rango con guion largo y con 'a'", () => {
    expect(documentoLimpio(detectarPlaceholders(["500–1000 mg"]))).toBe(false);
    expect(documentoLimpio(detectarPlaceholders(["10 a 15 mg/kg"]))).toBe(false);
  });

  it("texto resuelto pasa el gate", () => {
    const h = detectarPlaceholders([
      "550 mg (quinientos cincuenta miligramos) = 11 mL de suspensión 250 mg/5 mL, cada 12 horas",
      "2 (dos) frascos de 150 mL",
      "oral",
    ]);
    expect(h.corchetes).toEqual([]);
    expect(h.rangos).toEqual([]);
    expect(documentoLimpio(h)).toBe(true);
  });

  it("ignora null/undefined", () => {
    expect(documentoLimpio(detectarPlaceholders([null, undefined, ""]))).toBe(true);
  });

  it("no confunde duración '7-10 días' como rango de dosis", () => {
    // El gate solo marca rangos con unidad de masa/volumen (mg/mcg/ml/ui/g)
    expect(documentoLimpio(detectarPlaceholders(["durante 7-10 días"]))).toBe(true);
  });
});

describe("contarVerificar (aviso al aprobar nota)", () => {
  it("cuenta marcadores [VERIFICAR ...] en varios campos", () => {
    expect(
      contarVerificar([
        "Dolor abdominal [VERIFICAR — intensidad no precisada]",
        "Plan estándar",
        "Peso [VERIFICAR — sin registro] y talla normal",
      ])
    ).toBe(2);
  });
  it("[NO REGISTRADO] no cuenta como verificar", () => {
    expect(contarVerificar(["Antecedentes [NO REGISTRADO]"])).toBe(0);
  });
});

describe("numeroALetras", () => {
  it("cardinales clave", () => {
    expect(numeroALetras(2)).toBe("dos");
    expect(numeroALetras(11)).toBe("once");
    expect(numeroALetras(15)).toBe("quince");
    expect(numeroALetras(21)).toBe("veintiuno");
    expect(numeroALetras(30)).toBe("treinta");
    expect(numeroALetras(45)).toBe("cuarenta y cinco");
    expect(numeroALetras(100)).toBe("cien");
    expect(numeroALetras(120)).toBe("ciento veinte");
    expect(numeroALetras(250)).toBe("doscientos cincuenta");
    expect(numeroALetras(500)).toBe("quinientos");
    expect(numeroALetras(550)).toBe("quinientos cincuenta");
    expect(numeroALetras(1000)).toBe("mil");
    expect(numeroALetras(1100)).toBe("mil cien");
    expect(numeroALetras(4000)).toBe("cuatro mil");
  });
});

describe("frecuenciaEnPalabras", () => {
  it("convierte abreviaturas", () => {
    expect(frecuenciaEnPalabras("c/12h")).toBe("cada 12 horas");
    expect(frecuenciaEnPalabras("c/8h")).toBe("cada 8 horas");
    expect(frecuenciaEnPalabras("cada 6 horas")).toBe("cada 6 horas");
    expect(frecuenciaEnPalabras("dosis única")).toBe("dosis única");
    expect(frecuenciaEnPalabras("1 vez al día")).toBe("una vez al día");
  });
});

describe("formatearDosisConfirmada (números y letras AM 00031-2020)", () => {
  it("líquido — formato objetivo del caso de prueba", () => {
    expect(
      formatearDosisConfirmada({
        dosisPorTomaMg: 550,
        volumenOUnidadesPorToma: 11,
        esLiquido: true,
        concentracion: "250 mg/5 mL",
        formaFarmaceutica: "suspensión",
        frecuencia: "c/12h",
      })
    ).toBe(
      "550 mg (quinientos cincuenta miligramos) = 11 mL de suspensión 250 mg/5 mL, cada 12 horas"
    );
  });

  it("líquido con decimales de mL", () => {
    expect(
      formatearDosisConfirmada({
        dosisPorTomaMg: 375,
        volumenOUnidadesPorToma: 7.5,
        esLiquido: true,
        concentracion: "250 mg/5 mL",
        formaFarmaceutica: "suspensión",
        frecuencia: "c/8h",
      })
    ).toBe(
      "375 mg (trescientos setenta y cinco miligramos) = 7.5 mL de suspensión 250 mg/5 mL, cada 8 horas"
    );
  });

  it("sólido — comprimidos", () => {
    expect(
      formatearDosisConfirmada({
        dosisPorTomaMg: 500,
        volumenOUnidadesPorToma: 1,
        esLiquido: false,
        concentracion: "500 mg",
        formaFarmaceutica: "comprimido",
        frecuencia: "c/8h",
      })
    ).toBe("500 mg (quinientos miligramos) = 1 comprimido de 500 mg, cada 8 horas");
  });
});
