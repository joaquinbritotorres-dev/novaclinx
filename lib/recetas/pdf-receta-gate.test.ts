import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      isJson: true,
    }),
  },
}));
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: async () => new Uint8Array([37, 80, 68, 70]), // "%PDF"
}));
vi.mock("@/lib/pdf/recetaTemplate", () => ({ RecetaTemplate: () => null }));
vi.mock("@/lib/firma/firmar", () => ({ firmarPdf: async (b: Buffer) => b }));

const requireAuthMock = vi.fn();
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: (...a: unknown[]) => requireAuthMock(...a),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: fromMock }),
}));

import { GET } from "@/app/api/consultas/[id]/pdf-receta/route";

const MEDICO = { id: "medico-1", nombre: "Dra. Torres" };

function setupSupabase(indicacionesJson: string) {
  fromMock.mockImplementation((table: string) => {
    const row =
      table === "medicos"
        ? MEDICO
        : {
            id: "c1",
            fecha: "2026-06-13T10:00:00Z",
            nota_soap: "{}",
            indicaciones: indicacionesJson,
            signos_alarma: null,
            cie10_codigo: "J03.9",
            cie10_descripcion: "Amigdalitis aguda",
            seguimiento_plazo: null,
            seguimiento_motivo: null,
            tipo_consulta: "primera_vez",
            pacientes: { id: "p1", nombre: "Emilia", cedula: null, identificacion: null },
          };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {};
    Object.assign(b, {
      select: () => b,
      eq: () => b,
      maybeSingle: async () => ({ data: row, error: null }),
    });
    return b;
  });
}

function med(extra: Record<string, unknown>) {
  return {
    dci: "amoxicilina",
    formaFarmaceutica: "suspensión",
    concentracion: "250 mg/5 mL",
    via: "oral",
    dosis: "50 mg/kg/día",
    frecuencia: "c/12h",
    duracionDias: 10,
    origenDosis: "sugerencia_ia",
    confirmado: true,
    cantidadTexto: "2 (dos) frascos de 150 mL",
    ...extra,
  };
}

const req = () =>
  ({ nextUrl: { searchParams: new URLSearchParams() } }) as never;
const params = () => ({ params: Promise.resolve({ id: "c1" }) });

beforeEach(() => {
  requireAuthMock.mockReset();
  requireAuthMock.mockResolvedValue({ user: { id: "u1" }, errorResponse: null });
  fromMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("pdf-receta — gate de documento legal", () => {
  it("bloquea (400) si hay medicamento sin confirmar", async () => {
    setupSupabase(JSON.stringify([med({ confirmado: false, cantidadTexto: null })]));
    const res = (await GET(req(), params())) as unknown as { status: number };
    expect(res.status).toBe(400);
  });

  it("bloquea (422) si la dosis confirmada contiene un corchete", async () => {
    setupSupabase(
      JSON.stringify([
        med({ dosisConfirmadaTexto: "500 mg [REQUIERE CONFIRMACIÓN] cada 12 horas" }),
      ])
    );
    const res = (await GET(req(), params())) as unknown as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(422);
    expect(res.body.error).toContain("[REQUIERE CONFIRMACIÓN]");
  });

  it("bloquea (422) si queda un rango de dosis sin resolver", async () => {
    setupSupabase(JSON.stringify([med({ dosisConfirmadaTexto: "50-90 mg/kg/día" })]));
    const res = (await GET(req(), params())) as unknown as { status: number };
    expect(res.status).toBe(422);
  });

  it("emite el PDF (200) cuando la dosis confirmada está limpia", async () => {
    setupSupabase(
      JSON.stringify([
        med({
          dosisConfirmadaTexto:
            "550 mg (quinientos cincuenta miligramos) = 11 mL de suspensión 250 mg/5 mL, cada 12 horas",
        }),
      ])
    );
    const res = await GET(req(), params());
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Content-Type")).toBe("application/pdf");
  });

  it("gate legado: bloquea (422) corchete en indicación legado", async () => {
    setupSupabase(JSON.stringify(["amoxicilina 50-90 mg/kg/día [REQUIERE PESO]"]));
    const res = (await GET(req(), params())) as unknown as { status: number };
    expect(res.status).toBe(422);
  });
});
