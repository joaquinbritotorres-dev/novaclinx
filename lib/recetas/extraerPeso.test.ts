import { describe, it, expect } from "vitest";
import { extraerPesoKg } from "./extraerPeso";

describe("extraerPesoKg", () => {
  it("extrae peso de nota SOAP en JSON (bloque objetivo)", () => {
    const nota = JSON.stringify({
      subjetivo: "Tos",
      objetivo: "Signos vitales estables. Peso: 22 kg, talla 104 cm.",
      analisis: "J03.9",
      plan: "Amoxicilina",
    });
    expect(extraerPesoKg(nota)).toBe(22);
  });

  it("extrae peso de nota legada en texto plano", () => {
    expect(extraerPesoKg("Paciente estable, peso 13,5 kg, afebril")).toBe(13.5);
  });

  it("acepta 'peso 30kg' sin espacio", () => {
    expect(extraerPesoKg("peso 30kg")).toBe(30);
  });

  it("devuelve null si no hay peso", () => {
    expect(extraerPesoKg(JSON.stringify({ objetivo: "sin antropometría" }))).toBeNull();
    expect(extraerPesoKg(null)).toBeNull();
    expect(extraerPesoKg("")).toBeNull();
  });

  it("descarta valores fuera de rango plausible", () => {
    expect(extraerPesoKg("peso 900 kg")).toBeNull();
    expect(extraerPesoKg("peso 0 kg")).toBeNull();
  });
});
