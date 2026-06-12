import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: createMock };
  },
}));

import {
  adaptarTranscripcion,
  AdaptadorError,
  ADAPTADOR_MODEL,
  ADAPTADOR_SYSTEM_PROMPT,
} from "./adaptador";

const TRANSCRIPCION = "Hablante 1: ¿Qué le trae?\nHablante 2: Dolor abdominal.";

describe("adaptarTranscripcion", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("devuelve la descripción (shape del contrato del modo escrito)", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "  Paciente refiere dolor abdominal de 2 días. [VERIFICAR] intensidad.  " }],
    });

    const out = await adaptarTranscripcion(TRANSCRIPCION);

    expect(typeof out).toBe("string");
    expect(out).toBe("Paciente refiere dolor abdominal de 2 días. [VERIFICAR] intensidad.");
    expect(out.trim().length).toBeGreaterThanOrEqual(10); // mínimo del contrato
    expect(out.length).toBeLessThanOrEqual(4999); // máximo del contrato
  });

  it("llama a Claude con el modelo y system prompt del condensador", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "Descripción clínica válida de prueba." }],
    });

    await adaptarTranscripcion(TRANSCRIPCION);

    expect(createMock).toHaveBeenCalledTimes(1);
    const args = createMock.mock.calls[0][0];
    expect(args.model).toBe(ADAPTADOR_MODEL);
    expect(args.system).toBe(ADAPTADOR_SYSTEM_PROMPT);
    expect(args.messages[0].content).toContain(TRANSCRIPCION);
  });

  it("recorta la salida a 4999 caracteres (tope del contrato)", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "x".repeat(6000) }],
    });
    const out = await adaptarTranscripcion(TRANSCRIPCION);
    expect(out.length).toBe(4999);
  });

  it("falla explícito sin ANTHROPIC_API_KEY (fail-fast)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(adaptarTranscripcion(TRANSCRIPCION)).rejects.toThrow(AdaptadorError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("falla si la transcripción está vacía", async () => {
    await expect(adaptarTranscripcion("   ")).rejects.toThrow(AdaptadorError);
  });

  it("falla si la salida no alcanza el mínimo del contrato", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "corto" }] });
    await expect(adaptarTranscripcion(TRANSCRIPCION)).rejects.toThrow(AdaptadorError);
  });
});
