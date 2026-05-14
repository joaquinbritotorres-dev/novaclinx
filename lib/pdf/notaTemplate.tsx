import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const SOAP_LABELS: Record<string, string> = {
  S: "Subjetivo",
  O: "Objetivo",
  A: "Análisis",
  P: "Plan",
};

function parseSoap(soap: string): { key: string; label: string; content: string }[] {
  const parts = soap.split(/\n(?=[SOAP]:)/);
  return parts
    .map((part) => {
      const match = part.match(/^([SOAP]):\s*([\s\S]*)/);
      if (!match) return null;
      const key = match[1];
      return { key, label: `${key} — ${SOAP_LABELS[key] ?? ""}`, content: match[2].trim() };
    })
    .filter((p): p is { key: string; label: string; content: string } => p !== null);
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0F766E",
    marginBottom: 2,
  },
  disclaimer: {
    fontSize: 7.5,
    color: "#64748B",
    marginBottom: 20,
  },
  patientName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginBottom: 2,
  },
  date: {
    fontSize: 9,
    color: "#64748B",
    marginBottom: 20,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 10,
    color: "#0F172A",
    lineHeight: 1.5,
    marginBottom: 14,
  },
  blockLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  indicacionItem: {
    fontSize: 10,
    color: "#0F172A",
    lineHeight: 1.5,
    marginBottom: 3,
  },
  seguimientoText: {
    fontSize: 10,
    color: "#0F172A",
    lineHeight: 1.5,
  },
  seguimientoMotivo: {
    fontSize: 10,
    color: "#475569",
    marginTop: 3,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: "#94A3B8",
    textAlign: "center",
  },
});

interface NotaTemplateProps {
  pacienteNombre: string;
  fechaISO: string;
  notaSoap: string;
  indicaciones: string[] | null;
  seguimientoPlazo: string | null;
  seguimientoMotivo: string | null;
  medicoNombre: string;
}

export function NotaTemplate({
  pacienteNombre,
  fechaISO,
  notaSoap,
  indicaciones,
  seguimientoPlazo,
  seguimientoMotivo,
  medicoNombre,
}: NotaTemplateProps) {
  const secciones = parseSoap(notaSoap);
  const fecha = new Date(fechaISO).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Novaclinx</Text>
        <Text style={styles.disclaimer}>
          Borrador generado con asistencia de IA. La nota oficial y el criterio clínico son del profesional tratante.
        </Text>

        <Text style={styles.patientName}>{pacienteNombre}</Text>
        <Text style={styles.date}>{fecha}</Text>

        <View style={styles.divider} />

        {secciones.map((sec) => (
          <View key={sec.key}>
            <Text style={styles.sectionLabel}>{sec.label}</Text>
            <Text style={styles.sectionContent}>{sec.content}</Text>
          </View>
        ))}

        {indicaciones && indicaciones.length > 0 && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.blockLabel}>Indicaciones</Text>
            {indicaciones.map((item, idx) => (
              <Text key={idx} style={styles.indicacionItem}>• {item}</Text>
            ))}
          </View>
        )}

        {seguimientoPlazo && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.blockLabel}>Seguimiento</Text>
            <Text style={styles.seguimientoText}>{seguimientoPlazo}</Text>
            {seguimientoMotivo && (
              <Text style={styles.seguimientoMotivo}>{seguimientoMotivo}</Text>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          {medicoNombre} · Generado por Novaclinx
        </Text>
      </Page>
    </Document>
  );
}
