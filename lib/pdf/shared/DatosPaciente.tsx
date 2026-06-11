import { Text, View } from "@react-pdf/renderer";
import { S } from "./styles";
import {
  calcularEdadTexto,
  formatFechaNac,
  formatSexo,
  formatSeguro,
  formatTipoConsulta,
} from "./helpers";

interface DatosPacienteProps {
  nombre: string;
  cedula: string | null;
  fechaNac: string | null;
  edad: number | null;
  sexo: string | null;
  numeroHistoria: string | null;
  tipoSeguro: string | null;
  tipoConsulta: string | null;
  soloBasicos?: boolean;
}

export function DatosPaciente({
  nombre, cedula, fechaNac, edad, sexo, numeroHistoria, tipoSeguro, tipoConsulta,
  soloBasicos = false,
}: DatosPacienteProps) {
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
    ...(!soloBasicos ? [
      { label: "N° Historia Clínica",  value: numeroHistoria },
      { label: "Tipo de seguro",       value: seguroTxt || null },
      { label: "Tipo de consulta",     value: consulta || null },
    ] : []),
  ].filter((f) => f.value);

  if (allFields.length <= 4) {
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
