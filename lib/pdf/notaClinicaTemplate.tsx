import { Document, Page, Text, View } from "@react-pdf/renderer";
import { NotaTemplateProps } from "./shared/types";
import { S } from "./shared/styles";
import { Encabezado } from "./shared/Encabezado";
import { DatosPaciente } from "./shared/DatosPaciente";
import { FooterFirma } from "./shared/FooterFirma";
import {
  parseSoap,
  formatFecha,
  sanitizeForPdf,
  removeProximoControlFromPlan,
  extractAlertaFromNotaSoap,
} from "./shared/helpers";

export function NotaClinicaTemplate(props: NotaTemplateProps) {
  const {
    pacienteNombre, pacienteCedula, pacienteFechaNacimiento, pacienteEdad,
    pacienteSexo, pacienteNumeroHistoria, pacienteTipoSeguro,
    fechaISO, tipoConsulta, notaSoap, cie10Codigo, cie10Descripcion,
    seguimientoPlazo, seguimientoMotivo,
    medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
    medicoDireccion, medicoTelefono, medicoRuc, medicoLogoBase64,
    firmado, firmante, fechaFirma,
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
  const alertaTexto = extractAlertaFromNotaSoap(notaSoap);

  const encabezadoProps = {
    medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
    medicoDireccion, medicoTelefono, medicoRuc, fecha, medicoLogoBase64,
  };

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Encabezado {...encabezadoProps} />

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

        {alertaTexto && alertaTexto.toLowerCase().indexOf("sin discrepancia") === -1 && (
          <View style={S.alertBlock} wrap={false}>
            <Text style={S.alertTitle}>! VERIFICAR ANTES DE FIRMAR</Text>
            <Text style={S.alertText}>{alertaTexto}</Text>
          </View>
        )}

        {cie10Codigo && (
          <View style={S.cieBlock} wrap={false}>
            <Text style={S.cieLabelText}>Diagnóstico principal:</Text>
            <Text style={S.cieText}>
              {cie10Codigo}{cie10Descripcion ? ` — ${cie10Descripcion}` : ""}
            </Text>
          </View>
        )}

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

        {seguimientoPlazo && (
          <View style={S.segBlock} wrap={false}>
            <Text style={S.segTitle}>Próximo control</Text>
            <Text style={S.segPlazo}>{seguimientoPlazo}</Text>
            {seguimientoMotivo ? (
              <Text style={S.segMotivo}>{seguimientoMotivo}</Text>
            ) : null}
          </View>
        )}

        <FooterFirma
          medicoNombre={medicoNombre}
          medicoRegistroAcess={medicoRegistroAcess}
          disclaimer="Borrador generado con asistencia de IA. La nota clínica ha sido revisada y aprobada por el médico tratante. Generado con Novaclinx."
          firmado={firmado}
          firmante={firmante}
          fechaFirma={fechaFirma}
        />
      </Page>
    </Document>
  );
}
