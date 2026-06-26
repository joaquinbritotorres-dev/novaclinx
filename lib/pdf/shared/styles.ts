import { StyleSheet } from "@react-pdf/renderer";

export const S = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 40,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  // ── Header ──
  hdrStripe: { height: 3, backgroundColor: "#0F766E", marginBottom: 8 },
  hdrRow: { flexDirection: "row", marginBottom: 6, alignItems: "center" },
  hdrLogoCol: { width: 68, marginRight: 10, alignItems: "center", justifyContent: "center" },
  hdrLogoImg: { maxWidth: 64, maxHeight: 56 },
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
  ftrWrapper: {},

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
  colMed:      { flex: 2.5 },
  colCant:     { flex: 1.1 },
  colVia:      { flex: 0.9 },
  colDosis:    { flex: 2.2 },
  colDur:      { flex: 1.1 },
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
