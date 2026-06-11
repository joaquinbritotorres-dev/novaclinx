import { Text, View } from "@react-pdf/renderer";
import { S } from "./styles";

interface FooterFirmaProps {
  medicoNombre: string;
  medicoRegistroAcess: string | null;
  disclaimer: string;
  firmado?: boolean;
  firmante?: string;
  fechaFirma?: string;
}

export function FooterFirma({
  medicoNombre,
  medicoRegistroAcess,
  disclaimer,
  firmado,
  firmante,
  fechaFirma,
}: FooterFirmaProps) {
  return (
    <View style={S.ftrWrapper} wrap={false}>
      <View style={S.ftrDivider} />
      {firmado && firmante && fechaFirma ? (
        <View
          style={{
            backgroundColor: "#F0FDFB",
            borderWidth: 1,
            borderColor: "#99F6E4",
            borderStyle: "solid",
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontFamily: "Helvetica-Bold",
              fontSize: 8,
              color: "#0F766E",
              marginBottom: 2,
            }}
          >
            {`Firmado electrónicamente por ${firmante}`}
          </Text>
          <Text style={{ fontSize: 7.5, color: "#134E4A", marginBottom: 3 }}>
            {`Fecha: ${fechaFirma}`}
          </Text>
          <Text style={{ fontSize: 7, color: "#475569" }}>
            Documento con firma electrónica (PAdES) — validez verificable en el archivo PDF
          </Text>
        </View>
      ) : (
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
      )}
      <Text style={S.ftrDisclaimer}>{disclaimer}</Text>
      <Text
        style={{ fontSize: 7, color: "#CBD5E1", textAlign: "center", marginTop: 4 }}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}
