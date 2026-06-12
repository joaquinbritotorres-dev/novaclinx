import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks de infraestructura (hoisted) ───────────────────────────────────────
vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));

const requireAuthMock = vi.fn();
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

const createClientMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => createClientMock(),
}));

const generarNotaSOAPMock = vi.fn();
vi.mock("@/lib/prompts/novaclinx-prompts-v1", () => ({
  generarNotaSOAP: (...args: unknown[]) => generarNotaSOAPMock(...args),
}));

const adaptarMock = vi.fn();
vi.mock("@/lib/scribe/adaptador", () => ({
  adaptarTranscripcion: (...args: unknown[]) => adaptarMock(...args),
  AdaptadorError: class AdaptadorError extends Error {},
}));

import { POST as crearGrabacion } from "@/app/api/grabaciones/route";
import { PATCH as patchGrabacion } from "@/app/api/grabaciones/[id]/route";
import { POST as transcribir } from "@/app/api/grabaciones/[id]/transcribir/route";
import { POST as generarNota } from "@/app/api/grabaciones/[id]/generar-nota/route";
import { POST as aprobar } from "@/app/api/grabaciones/[id]/aprobar/route";
import { POST as descartar } from "@/app/api/grabaciones/[id]/descartar/route";

// ── Fake Supabase configurable ───────────────────────────────────────────────
type Op = "select" | "update" | "insert" | "delete";
type RowResolver = unknown | null | ((op: Op) => unknown);

function fakeSupabase(cfg: {
  rows?: Record<string, RowResolver>;
  thenError?: Record<string, { message: string } | null>;
  storage?: {
    removeError?: { message: string } | null;
    signedUrl?: string | null;
  };
}) {
  const updates: { table: string; values: Record<string, unknown> }[] = [];
  const inserts: { table: string; values: Record<string, unknown> }[] = [];
  const removedPaths: string[] = [];

  const resolveRow = (table: string, op: Op) => {
    const r = cfg.rows?.[table];
    if (typeof r === "function") return (r as (op: Op) => unknown)(op);
    return r ?? null;
  };

  const from = (table: string) => {
    let op: Op = "select";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {};
    const chain = () => b;
    Object.assign(b, {
      select: chain,
      eq: chain,
      is: chain,
      in: chain,
      not: chain,
      order: chain,
      limit: chain,
      update(values: Record<string, unknown>) {
        op = "update";
        updates.push({ table, values });
        return b;
      },
      insert(values: Record<string, unknown>) {
        op = "insert";
        inserts.push({ table, values });
        return b;
      },
      delete() {
        op = "delete";
        return b;
      },
      maybeSingle: async () => ({ data: resolveRow(table, op), error: null }),
      single: async () => ({ data: resolveRow(table, op), error: null }),
      // permite `await supabase.from(t).update(...).eq(...)` sin terminal
      then(onFulfilled: (v: { data: null; error: unknown }) => unknown) {
        return Promise.resolve({
          data: null,
          error: cfg.thenError?.[table] ?? null,
        }).then(onFulfilled);
      },
    });
    return b;
  };

  const client = {
    from,
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          removedPaths.push(...paths);
          return { error: cfg.storage?.removeError ?? null };
        },
        createSignedUrl: async () =>
          cfg.storage?.signedUrl
            ? { data: { signedUrl: cfg.storage.signedUrl }, error: null }
            : { data: null, error: { message: "sin url" } },
        createSignedUploadUrl: async () => ({
          data: { path: "medico-1/paciente-1/g1.webm", token: "tok" },
          error: null,
        }),
      }),
    },
  };

  return { client, updates, inserts, removedPaths };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const USER = { id: "user-1" };
const MEDICO = { id: "medico-1", especialidad: "general" };

function req(body?: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { json: async () => body } as any;
}
const params = (id = "g1") => ({ params: Promise.resolve({ id }) });

function autenticado() {
  requireAuthMock.mockResolvedValue({ user: USER, errorResponse: null });
}

beforeEach(() => {
  requireAuthMock.mockReset();
  createClientMock.mockReset();
  generarNotaSOAPMock.mockReset();
  adaptarMock.mockReset();
  process.env.DEEPGRAM_API_KEY = "dg-test-key";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.DEEPGRAM_API_KEY;
});

// ── Ownership (403 sin médico / 404 grabación ajena) ────────────────────────
describe("ownership", () => {
  const casos: [string, (r: unknown, p: unknown) => Promise<unknown>][] = [
    ["transcribir", (r, p) => transcribir(r as never, p as never)],
    ["generar-nota", (r, p) => generarNota(r as never, p as never)],
    ["aprobar", (r, p) => aprobar(r as never, p as never)],
  ];

  for (const [nombre, handler] of casos) {
    it(`${nombre}: 403 si el usuario no tiene médico`, async () => {
      autenticado();
      const { client } = fakeSupabase({ rows: { medicos: null } });
      createClientMock.mockReturnValue(client);
      const res = (await handler(req({ consulta_id: "c1" }), params())) as { status: number };
      expect(res.status).toBe(403);
    });

    it(`${nombre}: 404 si la grabación no es del médico`, async () => {
      autenticado();
      const { client } = fakeSupabase({
        rows: { medicos: MEDICO, grabaciones_consulta: null },
      });
      createClientMock.mockReturnValue(client);
      const res = (await handler(req({ consulta_id: "c1" }), params())) as { status: number };
      expect(res.status).toBe(404);
    });
  }

  it("crear: 404 si el paciente no es del médico", async () => {
    autenticado();
    const { client } = fakeSupabase({
      rows: { medicos: MEDICO, pacientes: null },
    });
    createClientMock.mockReturnValue(client);
    const res = (await crearGrabacion(req({ paciente_id: "ajeno" }))) as { status: number };
    expect(res.status).toBe(404);
  });
});

// ── Transiciones de estado ───────────────────────────────────────────────────
describe("transiciones de estado", () => {
  it("PATCH: rechaza estados distintos de 'subida' (400)", async () => {
    autenticado();
    const res = (await patchGrabacion(
      req({ estado: "aprobada", duracion_segundos: 60 }),
      params()
    )) as { status: number };
    expect(res.status).toBe(400);
  });

  it("PATCH: 404 si la fila no está en 'consentida' (transición inválida)", async () => {
    autenticado();
    const { client } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        // el UPDATE condicionado por estado='consentida' no matchea
        grabaciones_consulta: (op: Op) => (op === "update" ? null : { id: "g1" }),
      },
    });
    createClientMock.mockReturnValue(client);
    const res = (await patchGrabacion(
      req({ estado: "subida", duracion_segundos: 60 }),
      params()
    )) as { status: number };
    expect(res.status).toBe(404);
  });

  it("transcribir: 409 desde estado no transcribible", async () => {
    autenticado();
    const { client } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: { id: "g1", estado: "consentida", audio_path: "a.webm" },
      },
    });
    createClientMock.mockReturnValue(client);
    const res = (await transcribir(req(), params())) as { status: number };
    expect(res.status).toBe(409);
  });

  it("generar-nota: 409 sin transcripción lista", async () => {
    autenticado();
    const { client } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: {
          id: "g1",
          estado: "subida",
          paciente_id: "p1",
          transcripcion: null,
        },
      },
    });
    createClientMock.mockReturnValue(client);
    const res = (await generarNota(req(), params())) as { status: number };
    expect(res.status).toBe(409);
  });

  it("aprobar: 409 si no está en nota_generada", async () => {
    autenticado();
    const { client } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: { id: "g1", estado: "transcrita", audio_path: "a.webm", paciente_id: "p1" },
      },
    });
    createClientMock.mockReturnValue(client);
    const res = (await aprobar(req({ consulta_id: "c1" }), params())) as { status: number };
    expect(res.status).toBe(409);
  });

  it("descartar: 409 si ya está cerrada", async () => {
    autenticado();
    const { client } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: { id: "g1", estado: "aprobada", audio_path: null },
      },
    });
    createClientMock.mockReturnValue(client);
    const res = (await descartar(req(), params())) as { status: number };
    expect(res.status).toBe(409);
  });
});

// ── Transcripción (Deepgram mockeado) ────────────────────────────────────────
describe("transcribir", () => {
  it("fail-fast: 500 sin DEEPGRAM_API_KEY", async () => {
    delete process.env.DEEPGRAM_API_KEY;
    autenticado();
    const res = (await transcribir(req(), params())) as { status: number };
    expect(res.status).toBe(500);
  });

  it("flujo feliz: guarda turnos y marca transcrita", async () => {
    autenticado();
    const { client, updates } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: { id: "g1", estado: "subida", audio_path: "m/p/g1.webm" },
      },
      storage: { signedUrl: "https://signed.example/audio" },
    });
    createClientMock.mockReturnValue(client);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: {
            utterances: [
              { speaker: 0, transcript: "¿Qué siente?" },
              { speaker: 1, transcript: "Dolor de garganta." },
            ],
          },
        }),
      }))
    );

    const res = (await transcribir(req(), params())) as unknown as {
      status: number;
      body: { turnos: number };
    };

    expect(res.status).toBe(200);
    expect(res.body.turnos).toBe(2);
    const final = updates.find((u) => u.values.estado === "transcrita");
    expect(final).toBeTruthy();
    const transcripcion = final!.values.transcripcion as {
      turnos: unknown[];
      texto: string;
    };
    expect(transcripcion.texto).toBe(
      "Hablante 1: ¿Qué siente?\nHablante 2: Dolor de garganta."
    );
  });

  it("error de Deepgram → estado error + 502 (reintentable)", async () => {
    autenticado();
    const { client, updates } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: { id: "g1", estado: "subida", audio_path: "m/p/g1.webm" },
      },
      storage: { signedUrl: "https://signed.example/audio" },
    });
    createClientMock.mockReturnValue(client);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));

    const res = (await transcribir(req(), params())) as { status: number };

    expect(res.status).toBe(502);
    expect(updates.some((u) => u.values.estado === "error")).toBe(true);
  });
});

// ── Generar nota (adaptador + pipeline mockeados) ────────────────────────────
describe("generar-nota", () => {
  it("transcrita → adaptador → generarNotaSOAP → nota_generada", async () => {
    autenticado();
    adaptarMock.mockResolvedValue("Paciente con faringitis, plan sintomático.");
    generarNotaSOAPMock.mockResolvedValue({
      soap: { subjetivo: "s", objetivo: "o", analisis: "a", plan: "p" },
      resumen_corto: "r",
    });
    const { client, updates } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: {
          id: "g1",
          estado: "transcrita",
          paciente_id: "p1",
          transcripcion: { texto: "Hablante 1: hola" },
        },
        pacientes: { id: "p1", nombre: "Ana", edad: 30, sexo: "F", fecha_nacimiento: null, cedula: null },
        consultas: null, // sin historial → primera_vez
      },
    });
    createClientMock.mockReturnValue(client);

    const res = (await generarNota(req(), params())) as unknown as {
      status: number;
      body: { descripcion: string; tipo_consulta: string };
    };

    expect(res.status).toBe(200);
    expect(adaptarMock).toHaveBeenCalledWith("Hablante 1: hola");
    expect(generarNotaSOAPMock).toHaveBeenCalledTimes(1);
    const input = generarNotaSOAPMock.mock.calls[0][0];
    expect(input.descripcion_libre_del_medico).toBe(
      "Paciente con faringitis, plan sintomático."
    );
    expect(input.tipo_consulta).toBe("primera_vez");
    expect(res.body.descripcion).toBe("Paciente con faringitis, plan sintomático.");
    expect(updates.some((u) => u.values.estado === "nota_generada")).toBe(true);
  });

  it("fallo del adaptador → estado error + 500", async () => {
    autenticado();
    adaptarMock.mockRejectedValue(new Error("boom"));
    const { client, updates } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: {
          id: "g1",
          estado: "transcrita",
          paciente_id: "p1",
          transcripcion: { texto: "Hablante 1: hola" },
        },
        pacientes: { id: "p1", nombre: "Ana", edad: 30, sexo: "F", fecha_nacimiento: null, cedula: null },
        consultas: null,
      },
    });
    createClientMock.mockReturnValue(client);

    const res = (await generarNota(req(), params())) as { status: number };
    expect(res.status).toBe(500);
    expect(updates.some((u) => u.values.estado === "error")).toBe(true);
    expect(generarNotaSOAPMock).not.toHaveBeenCalled();
  });
});

// ── Borrado efectivo ─────────────────────────────────────────────────────────
describe("borrado de audio y transcripción", () => {
  it("aprobar: borra el audio, anula transcripción y vincula consulta", async () => {
    autenticado();
    const { client, updates, removedPaths } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: {
          id: "g1",
          estado: "nota_generada",
          audio_path: "m/p/g1.webm",
          paciente_id: "p1",
        },
        consultas: { id: "c1" },
      },
    });
    createClientMock.mockReturnValue(client);

    const res = (await aprobar(req({ consulta_id: "c1" }), params())) as { status: number };

    expect(res.status).toBe(200);
    expect(removedPaths).toEqual(["m/p/g1.webm"]);
    const cierre = updates.find((u) => u.values.estado === "aprobada");
    expect(cierre).toBeTruthy();
    expect(cierre!.values).toMatchObject({
      consulta_id: "c1",
      transcripcion: null,
      audio_path: null,
    });
  });

  it("aprobar: si el borrado del audio falla NO se marca aprobada", async () => {
    autenticado();
    const { client, updates } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: {
          id: "g1",
          estado: "nota_generada",
          audio_path: "m/p/g1.webm",
          paciente_id: "p1",
        },
        consultas: { id: "c1" },
      },
      storage: { removeError: { message: "storage caído" } },
    });
    createClientMock.mockReturnValue(client);

    const res = (await aprobar(req({ consulta_id: "c1" }), params())) as { status: number };

    expect(res.status).toBe(500);
    expect(updates.some((u) => u.values.estado === "aprobada")).toBe(false);
  });

  it("aprobar: 404 si la consulta es de otro paciente/médico", async () => {
    autenticado();
    const { client } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: {
          id: "g1",
          estado: "nota_generada",
          audio_path: "m/p/g1.webm",
          paciente_id: "p1",
        },
        consultas: null,
      },
    });
    createClientMock.mockReturnValue(client);
    const res = (await aprobar(req({ consulta_id: "c-ajena" }), params())) as { status: number };
    expect(res.status).toBe(404);
  });

  it("descartar: borra audio y anula transcripción", async () => {
    autenticado();
    const { client, updates, removedPaths } = fakeSupabase({
      rows: {
        medicos: MEDICO,
        grabaciones_consulta: { id: "g1", estado: "transcrita", audio_path: "m/p/g1.webm" },
      },
    });
    createClientMock.mockReturnValue(client);

    const res = (await descartar(req(), params())) as { status: number };

    expect(res.status).toBe(200);
    expect(removedPaths).toEqual(["m/p/g1.webm"]);
    const cierre = updates.find((u) => u.values.estado === "descartada");
    expect(cierre).toBeTruthy();
    expect(cierre!.values).toMatchObject({ transcripcion: null, audio_path: null });
  });
});
