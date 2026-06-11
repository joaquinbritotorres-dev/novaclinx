import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CertificadoTemplateProps } from "./shared/types";
import { S } from "./shared/styles";
import { Encabezado } from "./shared/Encabezado";
import { DatosPaciente } from "./shared/DatosPaciente";
import { FooterFirma } from "./shared/FooterFirma";
import { formatFecha, formatEspecialidad, sanitizeForPdf } from "./shared/helpers";

function formatFechaLarga(isoStr: string): string {
  const parts = isoStr.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

function addDaysToIso(isoStr: string, days: number): string {
  const dt = new Date(isoStr + "T12:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + days - 1);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function CertificadoTemplate(props: CertificadoTemplateProps) {
  const {
    pacienteNombre, pacienteCedula, pacienteFechaNacimiento, pacienteEdad,
    pacienteSexo, pacienteNumeroHistoria, pacienteTipoSeguro, tipoConsulta,
    fechaISO, cie10Codigo, cie10Descripcion,
    reposo, reposoDias, reposoInicio,
    mostrarDiagnostico, observaciones,
    medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
    medicoDireccion, medicoTelefono, medicoRuc,
    firmado, firmante, fechaFirma,
  } = props;

  const fecha = formatFecha(fechaISO);
  const especialidad = formatEspecialidad(medicoEspecialidad);

  const credenciales: string[] = [];
  if (medicoRegistroAcess) credenciales.push(`Registro ACESS No. ${medicoRegistroAcess}`);
  if (medicoRegistroSenescyt) credenciales.push(`SENESCYT No. ${medicoRegistroSenescyt}`);

  const generoStr = pacienteSexo === "F" ? "a" : "o";

  const introText = [
    `El/La suscrito/a, Dr(a). ${medicoNombre}`,
    especialidad ? `, ${especialidad}` : "",
    credenciales.length > 0 ? `, con ${credenciales.join(", ")}` : "",
    ":",
  ].join("");

  const mainText = [
    `Que el/la paciente ${pacienteNombre}`,
    pacienteCedula ? `, portador/a de identificación Nro. ${pacienteCedula}` : "",
    `, fue valorad${generoStr} en consulta médica el día ${fecha}.`,
  ].join("");

  let reposoText: string | null = null;
  if (reposo && reposoDias && reposoInicio) {
    const fin = addDaysToIso(reposoInicio, reposoDias);
    reposoText = `Se indica reposo médico por ${reposoDias} día${reposoDias !== 1 ? "s" : ""}, comprendido desde el ${formatFechaLarga(reposoInicio)} hasta el ${formatFechaLarga(fin)}, inclusive.`;
  }

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Encabezado
          medicoNombre={medicoNombre}
          medicoEspecialidad={medicoEspecialidad}
          medicoRegistroAcess={medicoRegistroAcess}
          medicoRegistroSenescyt={medicoRegistroSenescyt}
          medicoDireccion={medicoDireccion}
          medicoTelefono={medicoTelefono}
          medicoRuc={medicoRuc}
          fecha={fecha}
        />

        <Text style={{
          fontFamily: "Helvetica-Bold",
          fontSize: 13,
          color: "#0F766E",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 1.2,
          marginBottom: 14,
        }}>
          Certificado Médico
        </Text>

        <DatosPaciente
          nombre={pacienteNombre}
          cedula={pacienteCedula}
          fechaNac={pacienteFechaNacimiento}
          edad={pacienteEdad}
          sexo={pacienteSexo}
          numeroHistoria={pacienteNumeroHistoria}
          tipoSeguro={pacienteTipoSeguro}
          tipoConsulta={tipoConsulta}
          soloBasicos={true}
        />

        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 9, color: "#0F172A", lineHeight: 1.7, marginBottom: 10 }}>
            {introText}
          </Text>

          <Text style={{
            fontFamily: "Helvetica-Bold",
            fontSize: 10,
            color: "#0F766E",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}>
            Certifica
          </Text>

          <Text style={{ fontSize: 9, color: "#0F172A", lineHeight: 1.7, marginBottom: 12 }}>
            {mainText}
          </Text>

          {mostrarDiagnostico && cie10Codigo && (
            <View style={S.cieBlock} wrap={false}>
              <Text style={S.cieLabelText}>Diagnóstico principal</Text>
              <Text style={S.cieText}>
                {cie10Codigo}{cie10Descripcion ? ` — ${cie10Descripcion}` : ""}
              </Text>
            </View>
          )}

          {reposoText && (
            <View style={S.segBlock} wrap={false}>
              <Text style={S.segTitle}>Reposo médico</Text>
              <Text style={{ fontSize: 9, color: "#0F172A", lineHeight: 1.6 }}>{reposoText}</Text>
            </View>
          )}

          {observaciones && observaciones.trim() && (
            <View style={{ marginBottom: 12 }} wrap={false}>
              <Text style={{
                fontFamily: "Helvetica-Bold",
                fontSize: 7,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 3,
              }}>
                Observaciones
              </Text>
              <Text style={{ fontSize: 9, color: "#0F172A", lineHeight: 1.6 }}>
                {sanitizeForPdf(observaciones.trim())}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 9, color: "#475569", lineHeight: 1.7, marginTop: 6 }}>
            El presente certificado se extiende a petición del interesado para los fines legales que estime convenientes.
          </Text>
        </View>

        <FooterFirma
          medicoNombre={medicoNombre}
          medicoRegistroAcess={medicoRegistroAcess}
          disclaimer="Certificado médico emitido por el médico tratante. Generado con Novaclinx."
          firmado={firmado}
          firmante={firmante}
          fechaFirma={fechaFirma}
        />
      </Page>
    </Document>
  );
}
