import { describe, it, expect } from "vitest";
import { redondearMlJeringa } from "./calcularDispensacion";

describe("redondearMlJeringa — redondeo al 0.5 mL superior (jeringas pediátricas)", () => {
  it("9.0 → 9.0 (ya múltiplo)", () => expect(redondearMlJeringa(9.0)).toBe(9.0));
  it("9.1 → 9.5", () => expect(redondearMlJeringa(9.1)).toBe(9.5));
  it("9.3 → 9.5", () => expect(redondearMlJeringa(9.3)).toBe(9.5));
  it("9.5 → 9.5 (ya múltiplo)", () => expect(redondearMlJeringa(9.5)).toBe(9.5));
  it("9.6 → 10.0", () => expect(redondearMlJeringa(9.6)).toBe(10.0));
  it("2.58 → 3.0", () => expect(redondearMlJeringa(2.58)).toBe(3.0));

  it("0.5 → 0.5 (ya múltiplo)", () => expect(redondearMlJeringa(0.5)).toBe(0.5));
  it("0.1 → 0.5", () => expect(redondearMlJeringa(0.1)).toBe(0.5));
  it("11.0 → 11.0 (ya múltiplo)", () => expect(redondearMlJeringa(11.0)).toBe(11.0));
  it("19.8 → 20.0", () => expect(redondearMlJeringa(19.8)).toBe(20.0));
  it("20.0 → 20.0 (ya múltiplo)", () => expect(redondearMlJeringa(20.0)).toBe(20.0));
});

describe("redondearMlJeringa — inmunidad a errores de punto flotante", () => {
  it("9.0 exacto en flotante no sube a 9.5", () => {
    // Verificar que 9.0 calculado como 450/50 no produzca 9.5
    const calculado = 450 / 50;
    expect(redondearMlJeringa(calculado)).toBe(9.0);
  });

  it("11.0 calculado como 550/50 no sube a 11.5", () => {
    const calculado = 550 / 50;
    expect(redondearMlJeringa(calculado)).toBe(11.0);
  });
});
