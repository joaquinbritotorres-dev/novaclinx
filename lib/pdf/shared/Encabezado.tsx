import { Text, View } from "@react-pdf/renderer";
import { S } from "./styles";
import { formatEspecialidad } from "./helpers";

interface EncabezadoProps {
  medicoNombre: string;
  medicoEspecialidad: string | null;
  medicoRegistroAcess: string | null;
  medicoRegistroSenescyt: string | null;
  medicoDireccion: string | null;
  medicoTelefono: string | null;
  medicoRuc: string | null;
  fecha: string;
}

export function Encabezado({
  medicoNombre, medicoEspecialidad, medicoRegistroAcess, medicoRegistroSenescyt,
  medicoDireccion, medicoTelefono, medicoRuc, fecha,
}: EncabezadoProps) {
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
          <View style={{ marginTop: 4 }}>
            {medicoDireccion ? (
              <Text style={{ fontSize: 8, color: "#475569", marginBottom: 1 }}>{medicoDireccion}</Text>
            ) : null}
            {medicoTelefono ? (
              <Text style={{ fontSize: 8, color: "#475569", marginBottom: 1 }}>Tel: {medicoTelefono}</Text>
            ) : null}
            {medicoRuc ? (
              <Text style={{ fontSize: 8, color: "#475569", marginBottom: 1 }}>RUC: {medicoRuc}</Text>
            ) : null}
          </View>
        </View>
        <View style={S.hdrRight}>
          <Text style={S.hdrFecha}>{fecha}</Text>
        </View>
      </View>
      <View style={S.hdrDivider} />
    </>
  );
}
