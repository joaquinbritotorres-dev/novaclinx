import type { Medicamento } from "../../recetas/tipos";

export type { Medicamento };

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
  /** Ruta estructurada (PASO 1.5+). Tiene prioridad sobre indicaciones cuando está presente. */
  medicamentos?: Medicamento[];
  /** Ruta legado: strings opacos del LLM. Se mantiene mientras haya consultas antiguas. */
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
  firmado?: boolean;
  firmante?: string;
  fechaFirma?: string;
}

export interface SoapSection {
  key: string;
  label: string;
  content: string;
}

export interface ParsedIndicacion {
  medicamento: string;
  cantidad: string;
  via: string;
  dosisFrecuencia: string;
  duracion: string;
}

export interface CertificadoTemplateProps {
  medicoNombre: string;
  medicoEspecialidad: string | null;
  medicoRegistroAcess: string | null;
  medicoRegistroSenescyt: string | null;
  medicoDireccion: string | null;
  medicoTelefono: string | null;
  medicoRuc: string | null;
  pacienteNombre: string;
  pacienteCedula: string | null;
  pacienteFechaNacimiento: string | null;
  pacienteEdad: number | null;
  pacienteSexo: string | null;
  pacienteNumeroHistoria: string | null;
  pacienteTipoSeguro: string | null;
  fechaISO: string;
  tipoConsulta: string | null;
  cie10Codigo: string | null;
  cie10Descripcion: string | null;
  reposo: boolean;
  reposoDias: number | null;
  reposoInicio: string | null;
  mostrarDiagnostico: boolean;
  observaciones: string | null;
  firmado?: boolean;
  firmante?: string;
  fechaFirma?: string;
}
