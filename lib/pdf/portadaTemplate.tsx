import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const PS = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingHorizontal: 48,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
  },
  stripe: { height: 4, backgroundColor: "#0F766E", marginBottom: 28 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: "#0F766E",
    marginBottom: 4,
  },
  subtitle: { fontSize: 9, color: "#94A3B8", marginBottom: 28 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 20,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  cell: { width: "50%", marginBottom: 12 },
  label: {
    fontSize: 7,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#0F172A",
  },
  listTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  docItem: { fontSize: 9, color: "#475569", marginBottom: 4, paddingLeft: 4 },
  footer: {
    fontSize: 7,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: "auto",
    paddingTop: 24,
  },
});

export interface PortadaProps {
  aseguradora: string;
  paciente: string;
  numeroAfiliado: string | null;
  tipoCobertura: string;
  fechaAtencion: string | null;
  numeroFactura: string | null;
  reclamacionId: string;
  documentosIncluidos: string[];
}

export function PortadaTemplate({
  aseguradora,
  paciente,
  numeroAfiliado,
  tipoCobertura,
  fechaAtencion,
  numeroFactura,
  reclamacionId,
  documentosIncluidos,
}: PortadaProps) {
  return (
    <Document>
      <Page size="A4" style={PS.page}>
        <View style={PS.stripe} />
        <Text style={PS.title}>Paquete de Reclamación</Text>
        <Text style={PS.subtitle}>Novaclinx — documento generado automáticamente</Text>

        <View style={PS.divider} />

        <View style={PS.grid}>
          <View style={PS.cell}>
            <Text style={PS.label}>Aseguradora</Text>
            <Text style={PS.value}>{aseguradora}</Text>
          </View>
          <View style={PS.cell}>
            <Text style={PS.label}>Paciente</Text>
            <Text style={PS.value}>{paciente}</Text>
          </View>
          <View style={PS.cell}>
            <Text style={PS.label}>N° de Afiliado</Text>
            <Text style={PS.value}>{numeroAfiliado ?? "—"}</Text>
          </View>
          <View style={PS.cell}>
            <Text style={PS.label}>Tipo de Cobertura</Text>
            <Text style={PS.value}>{tipoCobertura}</Text>
          </View>
          <View style={PS.cell}>
            <Text style={PS.label}>Fecha de Atención</Text>
            <Text style={PS.value}>{fechaAtencion ?? "—"}</Text>
          </View>
          <View style={PS.cell}>
            <Text style={PS.label}>N° de Factura</Text>
            <Text style={PS.value}>{numeroFactura ?? "Pendiente"}</Text>
          </View>
          <View style={PS.cell}>
            <Text style={PS.label}>N° de Reclamación</Text>
            <Text style={PS.value}>{reclamacionId.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={PS.divider} />

        <Text style={PS.listTitle}>Documentos incluidos</Text>
        {documentosIncluidos.map((doc, i) => (
          <Text key={i} style={PS.docItem}>
            {i + 1}. {doc}
          </Text>
        ))}

        <Text style={PS.footer}>
          Este paquete fue generado por Novaclinx. El criterio clínico y la
          decisión final son del médico tratante.
        </Text>
      </Page>
    </Document>
  );
}
