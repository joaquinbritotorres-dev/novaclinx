import { describe, it, expect } from "vitest";
import { buildCantidadTexto } from "./parsearDosis";

describe("buildCantidadTexto — cantidad a dispensar (AM 00031-2020)", () => {
  describe("líquido", () => {
    it("2 frascos de 150 mL", () => {
      expect(buildCantidadTexto(2, 150, "liquido")).toBe("2 (dos) frascos de 150 mL");
    });
    it("1 frasco usa singular", () => {
      expect(buildCantidadTexto(1, 60, "liquido")).toBe("1 (un) frasco de 60 mL");
    });
  });

  describe("comprimido", () => {
    it("total = numEnvases × tamaño en comprimidos", () => {
      expect(buildCantidadTexto(1, 30, "comprimido")).toBe("30 (treinta) comprimidos");
    });
    it("1 comprimido usa singular", () => {
      expect(buildCantidadTexto(1, 1, "comprimido")).toBe("1 (un) comprimido");
    });
  });

  describe("inhalador", () => {
    it("1 inhalador de 200 dosis", () => {
      expect(buildCantidadTexto(1, 200, "inhalador")).toBe("1 (un) inhalador de 200 dosis");
    });
    it("2 inhaladores usa plural 'es'", () => {
      expect(buildCantidadTexto(2, 100, "inhalador")).toBe("2 (dos) inhaladores de 100 dosis");
    });
  });
});

describe("buildCantidadTexto — tópico", () => {
  it("1 tubo de 30 g", () => {
    expect(buildCantidadTexto(1, 30, "topico")).toBe("1 (un) tubo de 30 g");
  });
  it("2 tubos de 15 g", () => {
    expect(buildCantidadTexto(2, 15, "topico")).toBe("2 (dos) tubos de 15 g");
  });
});
