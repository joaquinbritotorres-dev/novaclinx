import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotaTemplateProps {
  pacienteNombre: string;
  pacienteCedula: string | null;
  pacienteFechaNacimiento: string | null;
  pacienteEdad: number | null;
  pacienteSexo: string | null;
  pacienteNumeroHistoria: string | null;
  pacienteTipoSeguro: string | null;
  pacienteAlergias: string | null;
  fechaISO: string;
  tipoConsulta: string | null;
  notaSoap: string;
  cie10Codigo: string | null;
  cie10Descripcion: string | null;
  indicaciones: string[] | null;
  signosAlarma: string[] | null;
  seguimientoPlazo: string | null;
  seguimientoMotivo: string | null;
  medicoNombre: string;
  medicoEspecialidad: string | null;
  medicoRegistroAcess: string | null;
  medicoRegistroSenescyt: string | null;
  medicoDireccion: string | null;
  medicoTelefono: string | null;
  medicoRuc: string | null;
}

interface SoapSection {
  key: string;
  label: string;
  content: string;
}

interface ParsedIndicacion {
  medicamento: string;
  cantidad: string;
  via: string;
  dosisFrecuencia: string;
  duracion: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSoap(soap: string): SoapSection[] {
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

function formatFecha(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("es-EC", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Guayaquil",
  });
}

function formatFechaNac(fechaStr: string): string {
  const parts = fechaStr.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : fechaStr;
}

function calcularEdadTexto(fechaNac: string | null, edadFallback: number | null): string {
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

function formatSexo(sexo: string | null): string {
  if (sexo === "F") return "Femenino";
  if (sexo === "M") return "Masculino";
  if (sexo === "O") return "Otro";
  return "";
}

function formatSeguro(tipo: string | null): string {
  if (!tipo || tipo === "ninguno") return "";
  if (tipo === "iess") return "IESS";
  if (tipo === "issfa") return "ISSFA";
  if (tipo === "privado") return "Privado";
  return tipo;
}

function formatTipoConsulta(tipo: string | null): string {
  if (tipo === "primera_vez") return "Primera vez";
  if (tipo === "subsecuente") return "Subsecuente";
  return "";
}

function formatEspecialidad(esp: string | null): string {
  if (esp === "pediatria") return "Pediatría";
  if (esp === "ginecologia") return "Ginecología y Obstetricia";
  if (esp === "general") return "Medicina General";
  if (esp === "cirugia") return "Cirugía";
  return esp ?? "";
}

function extractNoFarmacologico(plan: string): string {
  const m = plan.match(/No farmacológico:\s*\n([\s\S]*?)(?=\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i);
  return m ? m[1].trim() : "";
}

function sanitizeForPdf(text: string): string {
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
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/Derivaci[oó]n[aá]ci[oó]n/gi, "Derivación")
    .replace(/Derivaci[oó]n[a-záéíóú]{2,6}/gi, "Derivación")
    .replace(/Derivaci[oó]n[oó]/gi, "Derivación")
    .replace(/Derivaci[oó]ní[oó]n/gi, "Derivación");
}

function removeProximoControlFromPlan(plan: string): string {
  if (!plan) return plan;
  return plan
    .replace(/\n*Próximo control:[\s\S]*?(?=\n\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i, "")
    .replace(/\n*Signos de alarma:[\s\S]*?(?=\n\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i, "")
    .replace(/\n*Ex[aá]menes complementarios:[\s\S]*?(?=\n\n[A-ZÁÉÍÓÚa-záéíóú][^:\n]*:|$)/i, "")
    .trim();
}

function isCanonicalDuration(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    /^(hasta\s+)?\d+\s+(día|días|semana|semanas|mes|meses|año|años)/.test(t) ||
    /^dosis\s+única/.test(t) ||
    /^(uso\s+)?continuo/.test(t) ||
    /^tratamiento\s+crónico/.test(t) ||
    /^indefinid/.test(t)
  );
}

function detectarErrorDosis(indicacionTexto: string): boolean {
  const tiene500 = /500\s*mg\/5\s*mL/i.test(indicacionTexto);
  const volumenMayorA10 = /1[0-9],[0-9]\s*mL|[2-9][0-9],[0-9]\s*mL/i.test(indicacionTexto);
  return tiene500 && volumenMayorA10;
}

function hasAntimicrobiano(indicaciones: string[]): boolean {
  return indicaciones.some(
    (i) => i.toLowerCase().includes("antimicrobiano") || i.toLowerCase().includes("vigencia 3 d")
  );
}

function parseIndicacionLine(text: string): ParsedIndicacion {
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
    dosisParts.push("Duración: " + duracion);
    duracion = "Según síntomas";
  }

  return { medicamento, cantidad, via, dosisFrecuencia: dosisParts.join(". "), duracion };
}

function extractAlertaFromNotaSoap(soap: string): string | null {
  try {
    const parsed = JSON.parse(soap);
    const analisis = String(parsed?.soap?.analisis ?? parsed?.analisis ?? "");
    const match = analisis.match(/\[ALERTA:([\s\S]*?)\]/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 160,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  // ── Header ──
  hdrStripe: { height: 3, backgroundColor: "#0F766E", marginBottom: 8 },
  hdrRow: { flexDirection: "row", marginBottom: 6 },
  hdrLeft: { flex: 3, paddingRight: 12 },
  hdrRight: { flex: 2, alignItems: "flex-end" },
  hdrName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 2,
  },
  hdrEsp: { fontSize: 9, color: "#475569", marginBottom: 1 },
  hdrReg: { fontSize: 8, color: "#475569", marginBottom: 1 },
  hdrContacto: { fontSize: 8, color: "#475569", textAlign: "right", marginBottom: 1 },
  hdrFecha: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#0F172A",
    textAlign: "right",
    marginBottom: 1,
  },
  hdrDivider: {
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
    borderStyle: "solid",
    marginBottom: 10,
  },

  // ── CIE-10 ──
  cieBlock: {
    backgroundColor: "#F0FDFB",
    borderLeftWidth: 3,
    borderLeftColor: "#0F766E",
    borderStyle: "solid",
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  cieLabelText: { fontSize: 7, color: "#475569", marginBottom: 2 },
  cieText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#0F766E",
  },

  // ── Alert block ──
  alertBlock: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    borderStyle: "solid",
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#92400E",
    marginBottom: 2,
  },
  alertText: { fontSize: 8, color: "#78350F" },

  // ── Patient block ──
  patBlock: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#0F766E",
    borderStyle: "solid",
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginBottom: 10,
  },
  patTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  patRow: { flexDirection: "row", marginBottom: 0 },
  patCol: { flex: 1, paddingRight: 6 },
  patField: { marginBottom: 4 },
  patLabel: { fontSize: 7, color: "#475569", marginBottom: 1 },
  patValue: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#0F172A" },
  patRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
    marginVertical: 4,
  },

  // ── SOAP ──
  secWrapper: { marginBottom: 16 },
  secLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  secDivider: { borderBottomWidth: 1, borderBottomColor: "#0F766E", marginBottom: 4 },
  secContent: { fontSize: 9, color: "#0F172A", lineHeight: 1.6 },

  // ── Seguimiento ──
  segBlock: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#0F766E",
    borderStyle: "solid",
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  segTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  segPlazo: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#0F172A" },
  segMotivo: { fontSize: 9, color: "#475569", marginTop: 2 },

  // ── Footer (flow) ──
  ftrDivider: { borderTopWidth: 1, borderTopColor: "#E2E8F0", marginTop: 16, marginBottom: 10 },
  ftrRow: { flexDirection: "row", marginBottom: 6 },
  ftrLeft: { flex: 1, paddingRight: 20 },
  ftrRight: { width: 140 },
  ftrSignLabel: { fontSize: 8, color: "#475569", marginBottom: 36 },
  ftrSignLine: { borderTopWidth: 1, borderTopColor: "#0F172A", marginBottom: 3 },
  ftrFechaLine: { fontSize: 7.5, color: "#475569", marginBottom: 3 },
  ftrSignName: { fontSize: 7.5, color: "#0F172A" },
  ftrSignAcess: { fontSize: 7, color: "#475569", marginTop: 1 },
  ftrSignBox: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    height: 60,
    width: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  ftrSignBoxTxt: { fontSize: 7, color: "#94A3B8", textAlign: "center" },
  ftrDisclaimer: { fontSize: 7, color: "#94A3B8", textAlign: "center", marginTop: 6 },
  ftrWrapper: { position: "absolute", bottom: 40, left: 40, right: 40 },

  // ── Receta ──
  rxTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#0F766E",
    textTransform: "uppercase",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 10,
  },
  rxPatRow: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 10,
    fontSize: 8,
    color: "#0F172A",
    lineHeight: 1.5,
  },

  // Table
  tblHdrRow: { flexDirection: "row", backgroundColor: "#0F766E" },
  tblRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
  },
  tblRowAlt: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
  },
  tblHdrCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#FFFFFF",
    textTransform: "uppercase",
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  tblCell: {
    fontSize: 8,
    color: "#0F172A",
    paddingHorizontal: 5,
    paddingVertical: 8,
    lineHeight: 1.4,
  },
  colMed:      { flex: 3.2 },
  colCant:     { flex: 1.2 },
  colVia:      { flex: 1 },
  colDosis:    { flex: 1.6 },
  colDur:      { flex: 0.8 },
  colSepLeft:  { borderLeftWidth: 0.5, borderLeftColor: "#E2E8F0", borderStyle: "solid" },

  // Signos alarma
  almBlock: {
    backgroundColor: "#FFF7ED",
    borderLeftWidth: 3,
    borderLeftColor: "#EA580C",
    borderStyle: "solid",
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 10,
  },
  almTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#DC2626",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  almItem: { fontSize: 8, color: "#7C2D12", lineHeight: 1.4, marginBottom: 2 },

  // No farmacologico
  nofarmBlock: { marginBottom: 10 },
  nofarmTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nofarmText: { fontSize: 8, color: "#0F172A", lineHeight: 1.4 },

  // Vigencia
  vigAntiBlock: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
    borderStyle: "solid",
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  vigAntiText: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#DC2626" },
  vigNorm: { fontSize: 8, color: "#475569", marginBottom: 8 },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function Encabezado({
  medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
  medicoDireccion, medicoTelefono, medicoRuc, fecha,
}: {
  medicoNombre: string;
  medicoEspecialidad: string | null;
  medicoRegistroAcess: string | null;
  medicoRegistroSenescyt: string | null;
  medicoDireccion: string | null;
  medicoTelefono: string | null;
  medicoRuc: string | null;
  fecha: string;
}) {
  const esp = formatEspecialidad(medicoEspecialidad);
  return (
    <>
      <View style={S.hdrStripe} />
      <View style={S.hdrRow}>
        <View style={S.hdrLeft}>
          <Text style={S.hdrName}>{medicoNombre}</Text>
          {esp ? <Text style={S.hdrEsp}>{esp}</Text> : null}
          {medicoRegistroAcess ? (
            <Text style={S.hdrReg}>Reg. ACESS: {medicoRegistroAcess}</Text>
          ) : null}
          {medicoRegistroSenescyt ? (
            <Text style={S.hdrReg}>Reg. SENESCYT: {medicoRegistroSenescyt}</Text>
          ) : null}
        </View>
        <View style={S.hdrRight}>
          <Text style={S.hdrFecha}>{fecha}</Text>
          {medicoDireccion ? (
            <Text style={S.hdrContacto}>{medicoDireccion}</Text>
          ) : null}
          {medicoTelefono ? (
            <Text style={S.hdrContacto}>Tel: {medicoTelefono}</Text>
          ) : null}
          {medicoRuc ? (
            <Text style={S.hdrContacto}>RUC: {medicoRuc}</Text>
          ) : null}
        </View>
      </View>
      <View style={S.hdrDivider} />
    </>
  );
}

function DatosPaciente({
  nombre, cedula, fechaNac, edad, sexo, numeroHistoria, tipoSeguro, tipoConsulta,
}: {
  nombre: string;
  cedula: string | null;
  fechaNac: string | null;
  edad: number | null;
  sexo: string | null;
  numeroHistoria: string | null;
  tipoSeguro: string | null;
  tipoConsulta: string | null;
}) {
  const edadTxt = calcularEdadTexto(fechaNac, edad);
  const sexoTxt = formatSexo(sexo);
  const seguroTxt = formatSeguro(tipoSeguro);
  const consulta = formatTipoConsulta(tipoConsulta);

  const allFields = [
    { label: "Nombre completo",      value: nombre },
    { label: "Cédula / Pasaporte",   value: cedula },
    { label: "Fecha de nacimiento",  value: fechaNac ? formatFechaNac(fechaNac) : null },
    { label: "Edad",                 value: edadTxt || null },
    { label: "Sexo",                 value: sexoTxt || null },
    { label: "N° Historia Clínica",  value: numeroHistoria },
    { label: "Tipo de seguro",       value: seguroTxt || null },
    { label: "Tipo de consulta",     value: consulta || null },
  ].filter((f) => f.value);

  if (allFields.length <= 4) {
    // Single horizontal row for sparse patient data
    return (
      <View style={S.patBlock} wrap={false}>
        <Text style={S.patTitle}>Datos del Paciente</Text>
        <View style={S.patRow}>
          {allFields.map((f, i) => (
            <View key={i} style={S.patCol}>
              <Text style={S.patLabel}>{f.label}</Text>
              <Text style={S.patValue}>{f.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Row-based pairs with divider between each row
  const pairs: typeof allFields[] = [];
  for (let i = 0; i < allFields.length; i += 2) {
    pairs.push(allFields.slice(i, i + 2));
  }

  return (
    <View style={S.patBlock} wrap={false}>
      <Text style={S.patTitle}>Datos del Paciente</Text>
      {pairs.map((pair, rowIdx) => (
        <View key={rowIdx}>
          {rowIdx > 0 && <View style={S.patRowDivider} />}
          <View style={S.patRow}>
            {pair.map((f, i) => (
              <View key={i} style={S.patCol}>
                <Text style={S.patLabel}>{f.label}</Text>
                <Text style={S.patValue}>{f.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function FooterFirma({
  medicoNombre,
  medicoRegistroAcess,
  disclaimer,
}: {
  medicoNombre: string;
  medicoRegistroAcess: string | null;
  disclaimer: string;
}) {
  return (
    <View style={S.ftrWrapper}>
      <View style={S.ftrDivider} />
      <View style={S.ftrRow}>
        <View style={S.ftrLeft}>
          <Text style={S.ftrSignLabel}>Firma del profesional:</Text>
          <View style={S.ftrSignLine} />
          <Text style={S.ftrFechaLine}>Fecha: ___________</Text>
          <Text style={S.ftrSignName}>{medicoNombre}</Text>
          {medicoRegistroAcess ? (
            <Text style={S.ftrSignAcess}>Reg. ACESS: {medicoRegistroAcess}</Text>
          ) : null}
        </View>
        <View style={S.ftrRight}>
          <View style={S.ftrSignBox}>
            <Text style={S.ftrSignBoxTxt}>
              {"Espacio reservado\npara firma\nelectrónica BCE"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={S.ftrDisclaimer}>{disclaimer}</Text>
      <Text
        style={{
          fontSize: 7,
          color: "#CBD5E1",
          textAlign: "center",
          marginTop: 4,
        }}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NotaTemplate(props: NotaTemplateProps) {
  const {
    pacienteNombre, pacienteCedula, pacienteFechaNacimiento, pacienteEdad,
    pacienteSexo, pacienteNumeroHistoria, pacienteTipoSeguro, pacienteAlergias,
    fechaISO, tipoConsulta, notaSoap, cie10Codigo, cie10Descripcion,
    indicaciones, signosAlarma, seguimientoPlazo, seguimientoMotivo,
    medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
    medicoDireccion, medicoTelefono, medicoRuc,
  } = props;

  const fecha = formatFecha(fechaISO);
  const secciones = parseSoap(notaSoap);
  const seccionesLimpias = secciones.map((s) => {
    let content = sanitizeForPdf(s.content);
    if (s.key === "P" && seguimientoPlazo) {
      content = removeProximoControlFromPlan(content);
    }
    return { ...s, content };
  });
  const tieneReceta = Array.isArray(indicaciones) && indicaciones.length > 0;
  const alertaTexto = extractAlertaFromNotaSoap(notaSoap);

  const encabezadoProps = {
    medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
    medicoDireccion, medicoTelefono, medicoRuc, fecha,
  };

  const planContent = seccionesLimpias.find((s) => s.key === "P")?.content ?? "";
  const noFarmText = extractNoFarmacologico(planContent);

  return (
    <Document>
      {/* ══════════════════════════════ PÁGINA 1 — NOTA CLÍNICA ══════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <Encabezado {...encabezadoProps} />

        {/* Datos del paciente */}
        <DatosPaciente
          nombre={pacienteNombre}
          cedula={pacienteCedula}
          fechaNac={pacienteFechaNacimiento}
          edad={pacienteEdad}
          sexo={pacienteSexo}
          numeroHistoria={pacienteNumeroHistoria}
          tipoSeguro={pacienteTipoSeguro}
          tipoConsulta={tipoConsulta}
        />

        {/* Bloque de alerta de inconsistencia */}
        {alertaTexto && (
          <View style={S.alertBlock} wrap={false}>
            <Text style={S.alertTitle}>! VERIFICAR ANTES DE FIRMAR</Text>
            <Text style={S.alertText}>{alertaTexto}</Text>
          </View>
        )}

        {/* CIE-10 */}
        {cie10Codigo && (
          <View style={S.cieBlock} wrap={false}>
            <Text style={S.cieLabelText}>Diagnóstico principal:</Text>
            <Text style={S.cieText}>
              {cie10Codigo}{cie10Descripcion ? ` — ${cie10Descripcion}` : ""}
            </Text>
          </View>
        )}

        {/* Secciones SOAP */}
        {seccionesLimpias.map((sec) => (
          <View key={sec.key} style={S.secWrapper} wrap={false}>
            <Text style={S.secLabel}>{sec.label}</Text>
            <View style={S.secDivider} />
            <Text style={S.secContent}>
              {sec.content.split("\n").map((line, i) => (
                <Text
                  key={i}
                  style={/^\s*\d+\./.test(line) ? { color: "#0F766E" } : {}}
                >
                  {(i > 0 ? "\n" : "") + line}
                </Text>
              ))}
            </Text>
          </View>
        ))}

        {/* Seguimiento */}
        {seguimientoPlazo && (
          <View style={S.segBlock} wrap={false}>
            <Text style={S.segTitle}>Próximo control</Text>
            <Text style={S.segPlazo}>{seguimientoPlazo}</Text>
            {seguimientoMotivo ? (
              <Text style={S.segMotivo}>{seguimientoMotivo}</Text>
            ) : null}
          </View>
        )}

        {/* Footer Página 1 */}
        <FooterFirma
          medicoNombre={medicoNombre}
          medicoRegistroAcess={medicoRegistroAcess}
          disclaimer="Borrador generado con asistencia de IA. La nota clínica ha sido revisada y aprobada por el médico tratante. Generado con Novaclinx."
        />
      </Page>

      {/* ══════════════════════════════ PÁGINA 2 — RECETA MÉDICA ══════════════════════════════ */}
      {tieneReceta && (
        <Page size="A4" style={S.page}>
          <Encabezado {...encabezadoProps} />

          <Text style={S.rxTitle}>Receta Médica</Text>

          {/* Datos del paciente en receta (compacto) */}
          <View style={S.rxPatRow} wrap={false}>
            <Text>
              {"Paciente: " + pacienteNombre +
                (pacienteCedula ? " | Cédula: " + pacienteCedula : "") +
                " | Edad: " + (calcularEdadTexto(pacienteFechaNacimiento, pacienteEdad) || "—") +
                (cie10Codigo ? " | Dx: " + cie10Codigo + (cie10Descripcion ? " — " + cie10Descripcion : "") : "") +
                " | Alergias: " + (pacienteAlergias || "Sin alergias registradas")}
            </Text>
          </View>

          {/* Tabla de medicamentos */}
          <View style={{ marginBottom: 10 }}>
            <View style={S.tblHdrRow}>
              <Text style={[S.tblHdrCell, S.colMed]}>Medicamento (DCI)</Text>
              <Text style={[S.tblHdrCell, S.colCant, S.colSepLeft]}>Cantidad</Text>
              <Text style={[S.tblHdrCell, S.colVia, S.colSepLeft]}>Vía</Text>
              <Text style={[S.tblHdrCell, S.colDosis, S.colSepLeft]}>Dosis y Frecuencia</Text>
              <Text style={[S.tblHdrCell, S.colDur, S.colSepLeft]}>Duración</Text>
            </View>
            {indicaciones!.map((indicacion, idx) => {
              const parsed = parseIndicacionLine(sanitizeForPdf(indicacion));
              const rowStyle = idx % 2 === 0 ? S.tblRow : S.tblRowAlt;
              return (
                <View key={idx} style={rowStyle} wrap={false}>
                  <Text style={[S.tblCell, S.colMed]}>{parsed.medicamento}</Text>
                  <Text style={[S.tblCell, S.colCant, S.colSepLeft]}>{parsed.cantidad}</Text>
                  <Text style={[S.tblCell, S.colVia, S.colSepLeft]}>{parsed.via}</Text>
                  <Text style={[S.tblCell, S.colDosis, S.colSepLeft]}>
                    {parsed.dosisFrecuencia}
                    {detectarErrorDosis(indicacion) && (
                      <Text style={{ color: "#DC2626" }}>{" — VERIFICAR DOSIS"}</Text>
                    )}
                  </Text>
                  <Text style={[S.tblCell, S.colDur, S.colSepLeft]}>{parsed.duracion}</Text>
                </View>
              );
            })}
          </View>

          {/* Signos de alarma */}
          {signosAlarma && signosAlarma.length > 0 && (
            <View style={S.almBlock} wrap={false}>
              <Text style={S.almTitle}>Signos de alarma — consulte inmediatamente</Text>
              {signosAlarma.map((signo, idx) => (
                <Text key={idx} style={S.almItem}>{"• " + sanitizeForPdf(signo)}</Text>
              ))}
            </View>
          )}

          {/* Indicaciones no farmacológicas */}
          {noFarmText ? (
            <View style={S.nofarmBlock} wrap={false}>
              <Text style={S.nofarmTitle}>Indicaciones no farmacológicas</Text>
              <Text style={S.nofarmText}>{sanitizeForPdf(noFarmText)}</Text>
            </View>
          ) : null}

          {/* Vigencia */}
          {hasAntimicrobiano(indicaciones!) ? (
            <View style={S.vigAntiBlock} wrap={false}>
              <Text style={S.vigAntiText}>
                VIGENCIA: 3 días desde la fecha de prescripción (medicamento antimicrobiano — AM 00031-2020 MSP Ecuador)
              </Text>
            </View>
          ) : (
            <Text style={S.vigNorm}>
              VIGENCIA: 30 días desde la fecha de prescripción
            </Text>
          )}

          {/* Footer Página 2 */}
          <FooterFirma
            medicoNombre={medicoNombre}
            medicoRegistroAcess={medicoRegistroAcess}
            disclaimer="Receta generada conforme AM 00031-2020 MSP Ecuador. Generado con Novaclinx."
          />
        </Page>
      )}
    </Document>
  );
}
