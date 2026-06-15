import type { SoapSection, ParsedIndicacion } from "./types";

export function parseSoap(soap: string): SoapSection[] {
  try {
    const parsed = JSON.parse(soap);
    if (parsed && typeof parsed === "object" && "subjetivo" in parsed) {
      return ([
        { key: "S", label: "S — SUBJETIVO", content: String(parsed.subjetivo ?? "") },
        { key: "O", label: "O — OBJETIVO",   content: String(parsed.objetivo  ?? "") },
        { key: "A", label: "A — ANÁLISIS",   content: String(parsed.analisis  ?? "") },
        { key: "P", label: "P — PLAN",       content: String(parsed.plan      ?? "") },
      ] as SoapSection[]).filter((s) => s.content);
    }
  } catch { /* fall through to legacy parser */ }

  const LABELS: Record<string, string> = {
    S: "S — SUBJETIVO", O: "O — OBJETIVO", A: "A — ANÁLISIS", P: "P — PLAN",
  };
  return soap.split(/\n(?=[SOAP]:)/)
    .map((part) => {
      const m = part.match(/^([SOAP]):\s*([\s\S]*)/);
      if (!m) return null;
      return { key: m[1], label: LABELS[m[1]] ?? m[1], content: m[2].trim() };
    })
    .filter((p): p is SoapSection => p !== null && Boolean(p.content));
}

export function formatFecha(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("es-EC", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Guayaquil",
  });
}

export function formatFechaNac(fechaStr: string): string {
  const parts = fechaStr.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : fechaStr;
}

export function calcularEdadTexto(fechaNac: string | null, edadFallback: number | null): string {
  if (fechaNac) {
    const hoy = new Date();
    const nac = new Date(fechaNac + "T00:00:00");
    let anos = hoy.getFullYear() - nac.getFullYear();
    let meses = hoy.getMonth() - nac.getMonth();
    if (hoy.getDate() < nac.getDate()) meses--;
    if (meses < 0) { anos--; meses += 12; }
    anos = Math.max(0, anos);
    meses = Math.max(0, meses);
    if (anos < 5) return `${anos} año${anos !== 1 ? "s" : ""} ${meses} mes${meses !== 1 ? "es" : ""}`;
    return `${anos} años`;
  }
  if (edadFallback !== null) return `${edadFallback} años`;
  return "";
}

export function formatSexo(sexo: string | null): string {
  if (sexo === "F") return "Femenino";
  if (sexo === "M") return "Masculino";
  if (sexo === "O") return "Otro";
  return "";
}

export function formatSeguro(tipo: string | null): string {
  if (!tipo || tipo === "ninguno") return "";
  if (tipo === "iess") return "IESS";
  if (tipo === "issfa") return "ISSFA";
  if (tipo === "privado") return "Privado";
  return tipo;
}

export function formatTipoConsulta(tipo: string | null): string {
  if (tipo === "primera_vez") return "Primera vez";
  if (tipo === "subsecuente") return "Subsecuente";
  return "";
}

export function formatEspecialidad(esp: string | null): string {
  if (esp === "pediatria") return "Pediatría";
  if (esp === "ginecologia") return "Ginecología y Obstetricia";
  if (esp === "general") return "Medicina General";
  if (esp === "cirugia") return "Cirugía";
  return esp ?? "";
}

export function extractNoFarmacologico(plan: string): string {
  const m = plan.match(/No farmacológico:\s*\n([\s\S]*?)(?=\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i);
  return m ? m[1].trim() : "";
}

export function sanitizeForPdf(text: string): string {
  if (!text) return text;
  return text
    .replace(/→/g, "=")
    .replace(/←/g, "=")
    .replace(/↔/g, "=")
    .replace(/⇒/g, "=")
    .replace(/⇐/g, "=")
    .replace(/≈/g, "~")
    .replace(/≠/g, "!=")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/∞/g, "inf")
    .replace(/∼/g, "~")
    .replace(/×/g, "x")
    .replace(/·/g, ".")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"');
  // El typo "Derivaciónación" se corrige en la raíz (generarNotaSOAP →
  // corregirTypoDerivacion); ya no se parchea aquí. Se eliminó el replacer
  // /Derivaci[oó]n[a-záéíóú]{2,6}/ que corrompía el plural "derivaciones".
}

export function removeProximoControlFromPlan(plan: string): string {
  if (!plan) return plan;
  return plan
    .replace(/\n*Próximo control:[\s\S]*?(?=\n\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i, "")
    .replace(/\n*Signos de alarma:[\s\S]*?(?=\n\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i, "")
    .replace(/\n*Ex[aá]menes complementarios:[\s\S]*?(?=\n\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i, "")
    .trim();
}

export function isCanonicalDuration(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    /^(hasta\s+)?\d+\s+(día|días|semana|semanas|mes|meses|año|años)/.test(t) ||
    /^dosis\s+única/.test(t) ||
    /^(uso\s+)?continuo/.test(t) ||
    /^tratamiento\s+crónico/.test(t) ||
    /^indefinid/.test(t)
  );
}

export function detectarErrorDosis(indicacionTexto: string): boolean {
  const tiene500 = /500\s*mg\/5\s*mL/i.test(indicacionTexto);
  const volumenMayorA10 = /1[0-9],[0-9]\s*mL|[2-9][0-9],[0-9]\s*mL/i.test(indicacionTexto);
  return tiene500 && volumenMayorA10;
}

export function hasAntimicrobiano(indicaciones: string[]): boolean {
  return indicaciones.some(
    (i) => i.toLowerCase().includes("antimicrobiano") || i.toLowerCase().includes("vigencia 3 d")
  );
}

export function parseIndicacionLine(text: string): ParsedIndicacion {
  const segments = text.split(/\.\s+/);
  let medicamento = "";
  let cantidad = "";
  let via = "";
  const dosisParts: string[] = [];
  let duracion = "";
  let foundCantidad = false;
  let foundVia = false;
  let foundDuracion = false;

  for (const seg of segments) {
    const s = seg.trim();
    if (!s) continue;
    const sl = s.toLowerCase();

    if (!foundCantidad) {
      if (sl.startsWith("cantidad:")) {
        foundCantidad = true;
        cantidad = s.slice(s.indexOf(":") + 1).trim();
      } else {
        medicamento = medicamento ? medicamento + ". " + s : s;
      }
    } else if (!foundVia && (sl.startsWith("vía") || sl.startsWith("via"))) {
      foundVia = true;
      via = s;
    } else if (sl.startsWith("duración:") || sl.startsWith("duracion:")) {
      foundDuracion = true;
      duracion = s.slice(s.indexOf(":") + 1).trim();
    } else if (sl.startsWith("antimicrobiano")) {
      // shown in vigencia section — skip here
    } else if (foundVia && !foundDuracion) {
      dosisParts.push(s);
    }
  }

  if (!cantidad) {
    return { medicamento: text, cantidad: "", via: "", dosisFrecuencia: "", duracion: "" };
  }

  if (duracion && !isCanonicalDuration(duracion)) {
    duracion = "Según síntomas";
  }

  return { medicamento, cantidad, via, dosisFrecuencia: dosisParts.join(". "), duracion };
}

export function extractAlertaFromNotaSoap(soap: string): string | null {
  try {
    const parsed = JSON.parse(soap);
    const analisis = String(parsed?.soap?.analisis ?? parsed?.analisis ?? "");
    const match = analisis.match(/\[ALERTA:([\s\S]*?)\]/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}
