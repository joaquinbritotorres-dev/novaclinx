"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";

interface Seccion {
  key: string;
  label: string;
  content: string;
}

const ETIQUETA_RE = /^([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 ()/.\-]{1,48}):\s*([\s\S]*)$/;

type Linea =
  | { tipo: "campo"; etiqueta: string; valor: string }
  | { tipo: "cuerpo"; texto: string };

/** Vacío "general" (para decidir el resumen colapsado). */
function esVacio(valor: string): boolean {
  const v = valor.trim();
  return v === "" || v === "—" || /^\[NO REGISTRADO\]$/i.test(v);
}

/** Específicamente "[NO REGISTRADO]" — lo que invita a registrarse (no "—"/"no aplica"). */
function esNoRegistrado(valor: string): boolean {
  return /^\[NO REGISTRADO\]$/i.test(valor.trim());
}

function parsearLineas(content: string): Linea[] {
  return content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea): Linea => {
      const m = linea.match(ETIQUETA_RE);
      if (m && m[1] === m[1].toUpperCase()) {
        return { tipo: "campo", etiqueta: m[1].trim(), valor: m[2].trim() };
      }
      return { tipo: "cuerpo", texto: linea };
    });
}

/** Resumen de una línea para la cabecera colapsada: primer dato real. */
function resumenDe(lineas: Linea[]): string {
  for (const l of lineas) {
    if (l.tipo === "campo" && !esVacio(l.valor)) return l.valor;
    if (l.tipo === "cuerpo") return l.texto;
  }
  return "Sin datos registrados";
}

/** "ANTECEDENTES PERSONALES" → "Antecedentes personales" */
function aSentencia(etiqueta: string): string {
  const s = etiqueta.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Chip visual que invita a registrar un dato ausente. SIN funcionalidad real
 * aún: el clic solo muestra un aviso efímero ("Próximamente"). La data por
 * debajo sigue siendo "[NO REGISTRADO]"; esto es solo presentación.
 */
function ChipRegistrar() {
  const [aviso, setAviso] = useState(false);
  return (
    <button
      type="button"
      title="Próximamente podrás registrar este dato aquí"
      onClick={() => {
        setAviso(true);
        setTimeout(() => setAviso(false), 2200);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-[#F2EFE9] px-2.5 py-0.5 align-middle text-xs font-medium text-[#8A8780] cursor-pointer transition-colors hover:border-[#0F766E]/30 hover:bg-[#0F766E]/[0.06] hover:text-[#0F766E]"
    >
      <Pencil className="h-3 w-3 shrink-0" strokeWidth={1.75} />
      {aviso ? "Próximamente" : "Sin registrar"}
    </button>
  );
}

/** Atenúa [VERIFICAR …] y convierte [NO REGISTRADO] en el chip "Registrar". */
function conAtenuados(texto: string, keyBase: string) {
  const partes = texto.split(/(\[NO REGISTRADO\]|\[VERIFICAR[^\]]*\])/g);
  return partes.map((p, i) => {
    if (/^\[NO REGISTRADO\]$/i.test(p)) {
      return <ChipRegistrar key={`${keyBase}-${i}`} />;
    }
    if (/^\[VERIFICAR/.test(p)) {
      return (
        <span key={`${keyBase}-${i}`} className="text-[#A8A49C]">
          {p}
        </span>
      );
    }
    return <span key={`${keyBase}-${i}`}>{p}</span>;
  });
}

/** Renderiza el cuerpo: etiqueta tenue vs contenido legible; ausentes como chip. */
function Contenido({ lineas }: { lineas: Linea[] }) {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i];

    // Corre de campos "[NO REGISTRADO]" consecutivos → línea compacta + 1 chip
    if (l.tipo === "campo" && esNoRegistrado(l.valor)) {
      const run: string[] = [];
      let j = i;
      while (
        j < lineas.length &&
        lineas[j].tipo === "campo" &&
        esNoRegistrado((lineas[j] as { valor: string }).valor)
      ) {
        run.push((lineas[j] as { etiqueta: string }).etiqueta);
        j++;
      }
      if (run.length >= 2) {
        out.push(
          <div key={`e${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-sm leading-6 text-[#8A8780]">
              {run.map(aSentencia).join(", ")}
            </span>
            <ChipRegistrar />
          </div>
        );
      } else {
        out.push(
          <div key={`c${i}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8780] mb-1">
              {run[0]}
            </p>
            <ChipRegistrar />
          </div>
        );
      }
      i = j;
      continue;
    }

    if (l.tipo === "campo") {
      out.push(
        <div key={`c${i}`}>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8780] mb-1">
            {l.etiqueta}
          </p>
          <p className="text-base leading-7 text-[#1A1A18]">
            {l.valor ? conAtenuados(l.valor, `v${i}`) : <span className="text-[#A8A49C]">—</span>}
          </p>
        </div>
      );
      i++;
      continue;
    }

    out.push(
      <p key={`b${i}`} className="text-base leading-7 text-[#1A1A18]">
        {conAtenuados(l.texto, `b${i}`)}
      </p>
    );
    i++;
  }

  return <div className="max-w-[68ch] space-y-4">{out}</div>;
}

function SeccionColapsable({ sec }: { sec: Seccion }) {
  const lineas = parsearLineas(sec.content);
  // Todas las secciones inician colapsadas; el médico expande la que necesita.
  const [abierto, setAbierto] = useState(false);
  const resumen = resumenDe(lineas);

  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A8780]">
            {sec.label}
          </p>
          {!abierto && (
            <p className="mt-1.5 max-w-[60ch] truncate text-sm text-[#8A8780]">
              {resumen}
            </p>
          )}
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-[#A8A49C] transition-transform duration-200 ${
            abierto ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
        />
      </button>

      {/* Contenido siempre en el DOM; solo se oculta visualmente al colapsar. */}
      <div
        className={`grid transition-all duration-200 ${
          abierto ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <Contenido lineas={lineas} />
        </div>
      </div>
    </section>
  );
}

export default function NotaSoap({ secciones }: { secciones: Seccion[] }) {
  if (secciones.length === 0) {
    return <p className="text-base leading-7 text-[#A8A49C]">Nota no disponible.</p>;
  }
  return (
    <div className="divide-y divide-[#E7E3DB]">
      {secciones.map((sec) => (
        <SeccionColapsable key={sec.key} sec={sec} />
      ))}
    </div>
  );
}
