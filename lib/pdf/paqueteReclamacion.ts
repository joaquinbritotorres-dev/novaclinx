import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PDFDocument } from "pdf-lib";

import { NotaClinicaTemplate } from "./notaClinicaTemplate";
import { RecetaTemplate } from "./recetaTemplate";
import { PortadaTemplate } from "./portadaTemplate";
import { parseIndicaciones } from "../recetas/parseIndicaciones";
import type { Medicamento } from "../recetas/tipos";

const A4_W = 595.28;
const A4_H = 841.89;

function safeFilename(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseJsonArray(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    return null;
  } catch {
    return null;
  }
}

async function appendPdf(
  merged: PDFDocument,
  bytes: ArrayBuffer | Buffer | Uint8Array
): Promise<void> {
  const src = await PDFDocument.load(bytes);
  const pages = await merged.copyPages(src, src.getPageIndices());
  pages.forEach((p) => merged.addPage(p));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function armarPaqueteReclamacion(
  reclamacionId: string,
  supabase: AnyClient,
  serviceClient: AnyClient,
  firmaOpts?: { firmante: string; fechaFirma: string }
): Promise<{ bytes: Uint8Array; filename: string }> {
  // ── Médico (necesario para las plantillas de nota y receta) ────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado.");

  const { data: medico } = await supabase
    .from("medicos")
    .select(
      "id, nombre, especialidad, registro_acess, registro_senescyt, direccion_consultorio, telefono_consultorio, ruc"
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (!medico) throw new Error("Médico no encontrado.");

  // ── Reclamación con joins ──────────────────────────────────────
  const { data: reclamacion } = await supabase
    .from("reclamaciones")
    .select(`
      id, tipo, fecha_atencion, consulta_id,
      aseguradoras ( nombre ),
      pacientes ( id, nombre, cedula, identificacion, fecha_nacimiento, edad, sexo, tipo_seguro, alergias, numero_historia ),
      paciente_seguros ( numero_afiliado )
    `)
    .eq("id", reclamacionId)
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!reclamacion) throw new Error("Reclamación no encontrada.");

  const aseguradora = reclamacion.aseguradoras as { nombre: string } | null;
  const paciente = reclamacion.pacientes as {
    nombre: string; cedula: string | null; identificacion: string | null;
    fecha_nacimiento: string | null; edad: number | null; sexo: string | null;
    tipo_seguro: string | null; alergias: string | null; numero_historia: string | null;
  } | null;
  const pacienteSeguro = reclamacion.paciente_seguros as { numero_afiliado: string | null } | null;

  if (!reclamacion.consulta_id) {
    throw new Error("La reclamación no tiene consulta asociada.");
  }

  // ── Consulta ──────────────────────────────────────────────────
  const { data: consulta } = await supabase
    .from("consultas")
    .select(
      "id, fecha, nota_soap, indicaciones, signos_alarma, cie10_codigo, cie10_descripcion, seguimiento_plazo, seguimiento_motivo, tipo_consulta"
    )
    .eq("id", reclamacion.consulta_id)
    .eq("medico_id", medico.id)
    .maybeSingle();

  if (!consulta) throw new Error("Consulta asociada no encontrada.");

  // ── Factura ───────────────────────────────────────────────────
  const { data: factura } = await supabase
    .from("facturas")
    .select("datil_id, numero, estado")
    .eq("consulta_id", consulta.id)
    .in("estado", ["emitida", "autorizada"])
    .maybeSingle();

  // ── Documentos (soportes) ─────────────────────────────────────
  const { data: documentos } = await supabase
    .from("documentos")
    .select("object_key, nombre_archivo, mime, tipo")
    .eq("reclamacion_id", reclamacionId)
    .order("tipo", { ascending: true })
    .order("created_at", { ascending: true });

  const docList: Array<{ object_key: string; nombre_archivo: string; mime: string; tipo: string }> =
    documentos ?? [];

  // ── Lista de documentos para la portada ───────────────────────
  const docsIncluidos: string[] = ["Nota clinica"];

  const parsedIndicaciones = parseIndicaciones(consulta.indicaciones);
  if (parsedIndicaciones) docsIncluidos.push("Receta medica");
  if (factura?.datil_id) {
    docsIncluidos.push(`Factura electronica${factura.numero ? ` N. ${factura.numero}` : ""}`);
  }
  const TIPO_LABELS: Record<string, string> = {
    factura: "Factura", examen: "Examen", informe: "Informe", receta: "Receta", otro: "Otro",
  };
  for (const doc of docList) {
    docsIncluidos.push(`${TIPO_LABELS[doc.tipo] ?? doc.tipo}: ${doc.nombre_archivo}`);
  }

  // ── Portada ───────────────────────────────────────────────────
  const tipoCobertura = reclamacion.tipo === "red" ? "Red de Prestadores" : "Reembolso";
  const fechaDisplay = reclamacion.fecha_atencion
    ? new Date(reclamacion.fecha_atencion + "T00:00:00").toLocaleDateString("es-EC", {
        timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const portadaEl = createElement(PortadaTemplate, {
    aseguradora: aseguradora?.nombre ?? "Aseguradora",
    paciente: paciente?.nombre ?? "Paciente",
    numeroAfiliado: pacienteSeguro?.numero_afiliado ?? null,
    tipoCobertura,
    fechaAtencion: fechaDisplay,
    numeroFactura: factura?.numero ?? null,
    reclamacionId,
    documentosIncluidos: docsIncluidos,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const portadaBuffer = await renderToBuffer(portadaEl);

  // ── Nota clínica ──────────────────────────────────────────────
  // Replica EXACTA del pdf-nota route para que las notas sean idénticas
  const indicacionesLegacy = parseJsonArray(consulta.indicaciones);
  const signosAlarma = parseJsonArray(consulta.signos_alarma);

  const notaEl = createElement(NotaClinicaTemplate, {
    medicoNombre: medico.nombre ?? "Médico",
    medicoEspecialidad: medico.especialidad ?? null,
    medicoRegistroAcess: medico.registro_acess ?? null,
    medicoRegistroSenescyt: medico.registro_senescyt ?? null,
    medicoDireccion: medico.direccion_consultorio ?? null,
    medicoTelefono: medico.telefono_consultorio ?? null,
    medicoRuc: medico.ruc ?? null,
    pacienteNombre: paciente?.nombre ?? "Paciente",
    pacienteCedula: paciente?.identificacion || paciente?.cedula || null,
    pacienteFechaNacimiento: paciente?.fecha_nacimiento ?? null,
    pacienteEdad: paciente?.edad ?? null,
    pacienteSexo: paciente?.sexo ?? null,
    pacienteNumeroHistoria: paciente?.numero_historia ?? null,
    pacienteTipoSeguro: paciente?.tipo_seguro ?? null,
    pacienteAlergias: paciente?.alergias ?? null,
    fechaISO: consulta.fecha,
    tipoConsulta: consulta.tipo_consulta ?? null,
    notaSoap: consulta.nota_soap ?? "",
    cie10Codigo: consulta.cie10_codigo ?? null,
    cie10Descripcion: consulta.cie10_descripcion ?? null,
    indicaciones: indicacionesLegacy,
    signosAlarma,
    seguimientoPlazo: consulta.seguimiento_plazo ?? null,
    seguimientoMotivo: consulta.seguimiento_motivo ?? null,
    firmado: !!firmaOpts,
    firmante: firmaOpts?.firmante,
    fechaFirma: firmaOpts?.fechaFirma,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const notaBuffer = await renderToBuffer(notaEl);

  // ── Receta (solo si hay medicamentos) ─────────────────────────
  // Replica EXACTA del pdf-receta route
  let recetaBuffer: Buffer | null = null;
  if (parsedIndicaciones) {
    let indicaciones: string[] | null = null;
    let medicamentos: Medicamento[] | undefined = undefined;

    if (parsedIndicaciones.tipo === "legado") {
      indicaciones = parsedIndicaciones.indicaciones;
    } else {
      const todos = parsedIndicaciones.medicamentos;
      if (todos.every((m) => m.confirmado)) {
        medicamentos = todos as Medicamento[];
      } else {
        indicaciones = null; // medicamentos sin confirmar: omitir receta del paquete
      }
    }

    if (indicaciones !== null || medicamentos !== undefined) {
      const recetaEl = createElement(RecetaTemplate, {
        medicoNombre: medico.nombre ?? "Médico",
        medicoEspecialidad: medico.especialidad ?? null,
        medicoRegistroAcess: medico.registro_acess ?? null,
        medicoRegistroSenescyt: medico.registro_senescyt ?? null,
        medicoDireccion: medico.direccion_consultorio ?? null,
        medicoTelefono: medico.telefono_consultorio ?? null,
        medicoRuc: medico.ruc ?? null,
        pacienteNombre: paciente?.nombre ?? "Paciente",
        pacienteCedula: paciente?.identificacion || paciente?.cedula || null,
        pacienteFechaNacimiento: paciente?.fecha_nacimiento ?? null,
        pacienteEdad: paciente?.edad ?? null,
        pacienteSexo: paciente?.sexo ?? null,
        pacienteNumeroHistoria: paciente?.numero_historia ?? null,
        pacienteTipoSeguro: paciente?.tipo_seguro ?? null,
        pacienteAlergias: paciente?.alergias ?? null,
        fechaISO: consulta.fecha,
        tipoConsulta: consulta.tipo_consulta ?? null,
        notaSoap: consulta.nota_soap ?? "",
        cie10Codigo: consulta.cie10_codigo ?? null,
        cie10Descripcion: consulta.cie10_descripcion ?? null,
        medicamentos,
        indicaciones,
        signosAlarma,
        seguimientoPlazo: consulta.seguimiento_plazo ?? null,
        seguimientoMotivo: consulta.seguimiento_motivo ?? null,
        firmado: !!firmaOpts,
        firmante: firmaOpts?.firmante,
        fechaFirma: firmaOpts?.fechaFirma,
      }) as unknown as Parameters<typeof renderToBuffer>[0];

      recetaBuffer = await renderToBuffer(recetaEl);
    }
  }

  // ── RIDE (Dátil) ──────────────────────────────────────────────
  let rideBytes: ArrayBuffer | null = null;
  if (factura?.datil_id) {
    const rideRes = await fetch(
      `https://app.datil.co/ver/${factura.datil_id}/pdf`
    );
    if (!rideRes.ok) {
      throw Object.assign(
        new Error(
          "No se pudo obtener la factura de Dátil. Verifica que la factura esté emitida y accesible."
        ),
        { isDatilError: true }
      );
    }
    rideBytes = await rideRes.arrayBuffer();
  }

  // ── Descargar soportes ────────────────────────────────────────
  const soportes: Array<{ mime: string; bytes: ArrayBuffer; nombre: string }> = [];
  for (const doc of docList) {
    const { data: blob, error } = await serviceClient.storage
      .from("soportes-reclamaciones")
      .download(doc.object_key);
    if (error || !blob) {
      throw new Error(
        `No se pudo descargar el soporte "${doc.nombre_archivo}". Verifica que el archivo exista en Storage.`
      );
    }
    soportes.push({
      mime: doc.mime,
      bytes: await blob.arrayBuffer(),
      nombre: doc.nombre_archivo,
    });
  }

  // ── Unir con pdf-lib ──────────────────────────────────────────
  const merged = await PDFDocument.create();

  await appendPdf(merged, portadaBuffer);
  await appendPdf(merged, notaBuffer);
  if (recetaBuffer) await appendPdf(merged, recetaBuffer);
  if (rideBytes) await appendPdf(merged, rideBytes);

  for (const { mime, bytes, nombre } of soportes) {
    try {
      if (mime === "application/pdf") {
        await appendPdf(merged, bytes);
      } else if (mime === "image/jpeg") {
        const img = await merged.embedJpg(new Uint8Array(bytes));
        const { width, height } = img.size();
        const scale = Math.min(A4_W / width, A4_H / height);
        const page = merged.addPage([A4_W, A4_H]);
        page.drawImage(img, {
          x: (A4_W - width * scale) / 2,
          y: (A4_H - height * scale) / 2,
          width: width * scale,
          height: height * scale,
        });
      } else if (mime === "image/png") {
        const img = await merged.embedPng(new Uint8Array(bytes));
        const { width, height } = img.size();
        const scale = Math.min(A4_W / width, A4_H / height);
        const page = merged.addPage([A4_W, A4_H]);
        page.drawImage(img, {
          x: (A4_W - width * scale) / 2,
          y: (A4_H - height * scale) / 2,
          width: width * scale,
          height: height * scale,
        });
      } else {
        throw new Error(`Tipo de archivo no soportado: ${mime}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`No se pudo procesar el soporte "${nombre}": ${msg}`);
    }
  }

  const bytes = await merged.save();

  // ── Nombre del archivo ────────────────────────────────────────
  const partes = (paciente?.nombre ?? "").trim().split(/\s+/);
  const apellido = partes.length > 1 ? partes[partes.length - 1] : partes[0] ?? "paciente";
  const filename = [
    "paquete",
    safeFilename(aseguradora?.nombre ?? "aseguradora"),
    safeFilename(apellido),
    reclamacion.fecha_atencion?.replace(/-/g, "") ?? "sf",
  ]
    .filter(Boolean)
    .join("-") + ".pdf";

  return { bytes, filename };
}
