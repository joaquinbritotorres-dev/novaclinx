import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizarResultado, IntegrarAnadidoError } from "./integrar-anadido";

describe("normalizarResultado — validación defensiva de la salida del modelo", () => {
  it("acepta una respuesta bien formada", () => {
    const r = normalizarResultado({
      seccion: "objetivo",
      texto_a_anadir: "Temperatura: 38.5 °C.",
      requiere_verificar: false,
    });
    expect(r.seccion).toBe("objetivo");
    expect(r.textoAAnadir).toBe("Temperatura: 38.5 °C.");
    expect(r.requiereVerificar).toBe(false);
  });

  it("recorta el texto a añadir", () => {
    const r = normalizarResultado({
      seccion: "plan",
      texto_a_anadir: "  Reposo relativo 48 horas.  ",
      requiere_verificar: false,
    });
    expect(r.textoAAnadir).toBe("Reposo relativo 48 horas.");
  });

  it("deriva requiereVerificar del marcador [VERIFICAR] aunque el flag venga en false", () => {
    const r = normalizarResultado({
      seccion: "subjetivo",
      texto_a_anadir: "Refiere dolor de [VERIFICAR] intensidad.",
      requiere_verificar: false,
    });
    expect(r.requiereVerificar).toBe(true);
  });

  it("respeta requiereVerificar=true aunque no haya marcador", () => {
    const r = normalizarResultado({
      seccion: "analisis",
      texto_a_anadir: "Cuadro compatible con faringitis.",
      requiere_verificar: true,
    });
    expect(r.requiereVerificar).toBe(true);
  });

  it("rechaza una sección fuera del enum (no inventa destino)", () => {
    expect(() =>
      normalizarResultado({
        seccion: "recetas",
        texto_a_anadir: "Amoxicilina 500 mg",
        requiere_verificar: false,
      })
    ).toThrow(IntegrarAnadidoError);
  });

  it("rechaza texto a añadir vacío", () => {
    expect(() =>
      normalizarResultado({
        seccion: "plan",
        texto_a_anadir: "   ",
        requiere_verificar: false,
      })
    ).toThrow(IntegrarAnadidoError);
  });

  it("rechaza estructura no objeto", () => {
    expect(() => normalizarResultado(null)).toThrow(IntegrarAnadidoError);
    expect(() => normalizarResultado("texto")).toThrow(IntegrarAnadidoError);
  });
});
