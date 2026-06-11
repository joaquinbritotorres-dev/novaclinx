import { describe, it, expect } from "vitest";
import {
  DOSIS_VERIFICADAS,
  buscarDosis,
  buscarDosisPorDci,
  crearEntradaPendiente,
} from "./dosisVerificadas";

describe("DOSIS_VERIFICADAS — integridad de la tabla", () => {
  it("contiene exactamente 2 entradas verificadas", () => {
    const verificadas = DOSIS_VERIFICADAS.filter((e) => e.estado === "verificado");
    expect(verificadas).toHaveLength(2);
  });

  it("no contiene entradas PENDIENTE_VERIFICACION_MEDICA en la tabla base", () => {
    const pendientes = DOSIS_VERIFICADAS.filter(
      (e) => e.estado === "PENDIENTE_VERIFICACION_MEDICA"
    );
    expect(pendientes).toHaveLength(0);
  });

  it("todos los ids son únicos", () => {
    const ids = DOSIS_VERIFICADAS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todas las entradas tienen fuente no vacía", () => {
    for (const e of DOSIS_VERIFICADAS) {
      expect(e.fuente.length).toBeGreaterThan(0);
    }
  });
});

describe("Entrada: amoxicilina — faringoamigdalitis estreptocócica", () => {
  const entrada = buscarDosis("amoxicilina", "faringoamigdalitis estreptocócica");

  it("se encuentra", () => expect(entrada).not.toBeNull());
  it("poblacion pediatrico_por_peso", () => expect(entrada?.poblacion).toBe("pediatrico_por_peso"));
  it("dosis 50 mg/kg/día exacta (no rango)", () => {
    expect(entrada?.dosisMgKgDiaMin).toBe(50);
    expect(entrada?.dosisMgKgDiaMax).toBe(50);
  });
  it("tomasPorDia default 2 (c/12h)", () => expect(entrada?.tomasPorDia).toBe(2));
  it("máx diario 1 000 mg", () => expect(entrada?.dosisMaxDiariaMg).toBe(1000));
  it("techo absoluto 1 000 mg/día", () => expect(entrada?.techoAbsolutoMgDia).toBe(1000));
  it("duración 10 días", () => expect(entrada?.duracionTipicaDias).toBe(10));
  it("fuente contiene IDSA", () => expect(entrada?.fuente).toContain("IDSA"));
  it("tiene presentación 250 mg/5 mL (50 mg/mL)", () => {
    const p = entrada?.presentaciones.find((p) => p.concentracion === 50);
    expect(p).toBeDefined();
    expect(p?.esLiquido).toBe(true);
    expect(p?.tamanos).toContain(150);
  });
  it("tiene presentación 500 mg/5 mL (100 mg/mL)", () => {
    const p = entrada?.presentaciones.find((p) => p.concentracion === 100);
    expect(p).toBeDefined();
  });
});

describe("Entrada: amoxicilina — otitis media aguda", () => {
  const entrada = buscarDosis("amoxicilina", "otitis media aguda");

  it("se encuentra", () => expect(entrada).not.toBeNull());
  it("dosis rango 80–90 mg/kg/día", () => {
    expect(entrada?.dosisMgKgDiaMin).toBe(80);
    expect(entrada?.dosisMgKgDiaMax).toBe(90);
  });
  it("frecuencia c/12h, 2 tomas/día", () => {
    expect(entrada?.frecuencia).toBe("c/12h");
    expect(entrada?.tomasPorDia).toBe(2);
  });
  it("máx diario null (depende del peso)", () => expect(entrada?.dosisMaxDiariaMg).toBeNull());
  it("techo absoluto 4 000 mg/día", () => expect(entrada?.techoAbsolutoMgDia).toBe(4000));
  it("fuente contiene AAP", () => expect(entrada?.fuente).toContain("AAP"));
});

describe("buscarDosis — insensible a tildes y mayúsculas", () => {
  it("faringOAMIGdalitis ESTREPTOCOCICA (sin tilde) → encontrada", () => {
    const r = buscarDosis("AMOXICILINA", "faringoamigdalitis estreptococica");
    expect(r).not.toBeNull();
  });

  it("Amoxicilina con mayúscula → encontrada", () => {
    expect(buscarDosis("Amoxicilina", "otitis media aguda")).not.toBeNull();
  });
});

describe("buscarDosisPorDci", () => {
  it("amoxicilina devuelve 2 entradas", () => {
    expect(buscarDosisPorDci("amoxicilina")).toHaveLength(2);
  });

  it("fármaco inexistente devuelve []", () => {
    expect(buscarDosisPorDci("azitromicina")).toHaveLength(0);
  });
});

describe("crearEntradaPendiente", () => {
  it("genera entrada con estado PENDIENTE_VERIFICACION_MEDICA", () => {
    const p = crearEntradaPendiente("ibuprofeno", "dolor leve");
    expect(p.estado).toBe("PENDIENTE_VERIFICACION_MEDICA");
    expect(p.dci).toBe("ibuprofeno");
    expect(p.indicacion).toBe("dolor leve");
  });

  it("no agrega la entrada a DOSIS_VERIFICADAS", () => {
    crearEntradaPendiente("cualquier-farmaco", "cualquier-indicacion");
    expect(buscarDosis("cualquier-farmaco", "cualquier-indicacion")).toBeNull();
  });
});
