import { Document, Page, Text, View } from "@react-pdf/renderer";
import { NotaTemplateProps } from "./shared/types";
import type { Medicamento } from "../recetas/tipos";
import { S } from "./shared/styles";
import { Encabezado } from "./shared/Encabezado";
import { FooterFirma } from "./shared/FooterFirma";
import {
  parseSoap,
  formatFecha,
  sanitizeForPdf,
  extractNoFarmacologico,
  calcularEdadTexto,
  detectarErrorDosis,
  hasAntimicrobiano,
  parseIndicacionLine,
} from "./shared/helpers";

// Prefijos DCI que activan vigencia de 3 días (AM 00031-2020 MSP Ecuador)
const ANTIMICROBIANOS_DCI = [
  "amoxicilina", "ampicilina", "azitromicina", "cefalexina", "cefuroxima",
  "ciprofloxacino", "claritromicina", "clindamicina", "eritromicina",
  "metronidazol", "nitrofurantoina", "trimetoprim",
];

function esAntimicrobianoMed(m: Medicamento): boolean {
  const dci = m.dci.toLowerCase();
  return ANTIMICROBIANOS_DCI.some((k) => dci.includes(k));
}

export function RecetaTemplate(props: NotaTemplateProps) {
  const {
    pacienteNombre, pacienteCedula, pacienteFechaNacimiento, pacienteEdad,
    pacienteAlergias, fechaISO, notaSoap, cie10Codigo, cie10Descripcion,
    medicamentos, indicaciones, signosAlarma,
    medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
    medicoDireccion, medicoTelefono, medicoRuc, medicoLogoBase64,
    firmado, firmante, fechaFirma,
  } = props;

  const usarEstructurado = Boolean(medicamentos && medicamentos.length > 0);
  const usarLegado = !usarEstructurado && Boolean(indicaciones && indicaciones.length > 0);

  if (!usarEstructurado && !usarLegado) return <Document />;

  const fecha = formatFecha(fechaISO);
  const secciones = parseSoap(notaSoap);
  const planContent = secciones.find((s) => s.key === "P")?.content ?? "";
  const noFarmText = extractNoFarmacologico(planContent);

  const tieneAntimicrobiano = usarEstructurado
    ? medicamentos!.some(esAntimicrobianoMed)
    : hasAntimicrobiano(indicaciones!);

  const encabezadoProps = {
    medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
    medicoDireccion, medicoTelefono, medicoRuc, fecha, medicoLogoBase64,
  };

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Encabezado {...encabezadoProps} />

        <Text style={S.rxTitle}>Receta Médica</Text>

        <View style={S.rxPatRow} wrap={false}>
          <Text>
            {"Paciente: " + pacienteNombre +
              (pacienteCedula ? " | Cédula: " + pacienteCedula : "") +
              " | Edad: " + (calcularEdadTexto(pacienteFechaNacimiento, pacienteEdad) || "—") +
              (cie10Codigo ? " | Dx: " + cie10Codigo + (cie10Descripcion ? " — " + cie10Descripcion : "") : "") +
              " | Alergias: " + (pacienteAlergias || "Sin alergias registradas")}
          </Text>
        </View>

        <View style={{ marginBottom: 10 }}>
          <View style={S.tblHdrRow}>
            <Text style={[S.tblHdrCell, S.colMed]}>Medicamento (DCI)</Text>
            <Text style={[S.tblHdrCell, S.colCant, S.colSepLeft]}>Cantidad</Text>
            <Text style={[S.tblHdrCell, S.colVia, S.colSepLeft]}>Vía</Text>
            <Text style={[S.tblHdrCell, S.colDosis, S.colSepLeft]}>Dosis y Frecuencia</Text>
            <Text style={[S.tblHdrCell, S.colDur, S.colSepLeft]}>Duración</Text>
          </View>

          {usarEstructurado
            ? medicamentos!.map((m, idx) => {
                const rowStyle = idx % 2 === 0 ? S.tblRow : S.tblRowAlt;
                const nombreMed = [
                  m.dci,
                  m.nombreComercial ? `(${m.nombreComercial})` : null,
                  m.formaFarmaceutica,
                  m.concentracion,
                ].filter(Boolean).join(" ");
                return (
                  <View key={idx} style={rowStyle} wrap={false}>
                    <Text style={[S.tblCell, S.colMed]}>{nombreMed}</Text>
                    <Text style={[S.tblCell, S.colCant, S.colSepLeft]}>{m.cantidadTexto}</Text>
                    <Text style={[S.tblCell, S.colVia, S.colSepLeft]}>{m.via}</Text>
                    <Text style={[S.tblCell, S.colDosis, S.colSepLeft]}>{m.dosisConfirmadaTexto ?? (m.dosis + " " + m.frecuencia)}</Text>
                    <Text style={[S.tblCell, S.colDur, S.colSepLeft]}>{m.duracionDias + " días"}</Text>
                  </View>
                );
              })
            : indicaciones!.map((indicacion, idx) => {
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
              })
          }
        </View>

        {signosAlarma && signosAlarma.length > 0 && (
          <View style={S.almBlock} wrap={false}>
            <Text style={S.almTitle}>Signos de alarma — consulte inmediatamente</Text>
            {signosAlarma.map((signo, idx) => (
              <Text key={idx} style={S.almItem}>{"• " + sanitizeForPdf(signo)}</Text>
            ))}
          </View>
        )}

        {noFarmText ? (
          <View style={S.nofarmBlock} wrap={false}>
            <Text style={S.nofarmTitle}>Indicaciones no farmacológicas</Text>
            <Text style={S.nofarmText}>{sanitizeForPdf(noFarmText)}</Text>
          </View>
        ) : null}

        {tieneAntimicrobiano ? (
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

        <FooterFirma
          medicoNombre={medicoNombre}
          medicoRegistroAcess={medicoRegistroAcess}
          disclaimer="Receta generada conforme AM 00031-2020 MSP Ecuador. Generado con Novaclinx."
          firmado={firmado}
          firmante={firmante}
          fechaFirma={fechaFirma}
        />
      </Page>
    </Document>
  );
}
