import { describe, it, expect } from "vitest";
import { parseUtterances } from "./transcripcion";

describe("parseUtterances", () => {
  it("agrupa utterances consecutivas del mismo speaker en un turno", () => {
    const r = parseUtterances([
      { speaker: 0, transcript: "Buenos días, ¿qué le trae por aquí?" },
      { speaker: 1, transcript: "Tengo dolor de cabeza." },
      { speaker: 1, transcript: "Desde hace tres días." },
      { speaker: 0, transcript: "¿Ha tomado algo?" },
    ]);

    expect(r.turnos).toEqual([
      { hablante: 1, texto: "Buenos días, ¿qué le trae por aquí?" },
      { hablante: 2, texto: "Tengo dolor de cabeza. Desde hace tres días." },
      { hablante: 1, texto: "¿Ha tomado algo?" },
    ]);
  });

  it("expone hablantes 1-based en el texto plano", () => {
    const r = parseUtterances([
      { speaker: 0, transcript: "Hola." },
      { speaker: 1, transcript: "Hola doctor." },
    ]);
    expect(r.texto).toBe("Hablante 1: Hola.\nHablante 2: Hola doctor.");
  });

  it("ignora utterances vacías y sin transcript", () => {
    const r = parseUtterances([
      { speaker: 0, transcript: "  " },
      { speaker: 0 },
      { speaker: 1, transcript: "Algo." },
    ]);
    expect(r.turnos).toEqual([{ hablante: 2, texto: "Algo." }]);
  });

  it("speaker ausente se trata como Hablante 1", () => {
    const r = parseUtterances([{ transcript: "Texto sin speaker." }]);
    expect(r.turnos).toEqual([{ hablante: 1, texto: "Texto sin speaker." }]);
  });

  it("lista vacía → sin turnos y texto vacío", () => {
    const r = parseUtterances([]);
    expect(r.turnos).toEqual([]);
    expect(r.texto).toBe("");
  });
});
