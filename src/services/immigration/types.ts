/**
 * Agente de Formularios de Inmigración — tipos.
 *
 * Un "formulario" del catálogo es un formulario oficial de USCIS
 * (I-130, I-485, N-400, …). El agente arma un PAQUETE de preparación
 * a partir de datos estructurados del cliente, pero el resultado
 * SIEMPRE nace como borrador: la revisión de un abogado de inmigración
 * con licencia en EE.UU. es obligatoria. El agente NO presta asesoría
 * legal ni presenta nada ante USCIS.
 */

/** Un campo del formulario de admisión (intake) de un trámite migratorio. */
export interface ImmigrationField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  /** Campo de texto largo (textarea). */
  multiline?: boolean;
  /** Ayuda contextual mostrada bajo el campo. */
  hint?: string;
}

/** Definición de un formulario USCIS del catálogo (del sistema, en código). */
export interface ImmigrationForm {
  /** Clave estable usada en URLs y en immigration_form_packets.form_key. */
  key: string;
  /** Código oficial USCIS: 'I-130', 'N-400', … */
  formCode: string;
  /** Nombre en español. */
  name: string;
  /** Nombre oficial en inglés. */
  nameEn: string;
  /** Agrupador: 'Familia', 'Empleo y autorización', 'Humanitario', 'Ciudadanía y residencia'. */
  category: string;
  /** Para qué sirve y quién lo presenta. */
  description: string;
  /** Nota de tasa USCIS (referencial — las tasas cambian). */
  feeNote: string;
  /** Si true, intenta recuperar contexto del dominio de corpus us-immigration. */
  useRag: boolean;
  /** Esquema del formulario: sus partes, para que el borrador se organice bien. */
  formOutline: string;
  /** Campos de admisión que carga el abogado. */
  fields: ImmigrationField[];
}

export type ReviewStatus = 'borrador' | 'revisado';

/** Un ítem de la lista de documentos de respaldo. */
export interface ChecklistItem {
  item: string;
  detail: string;
  required: boolean;
}

/** Un paquete de preparación generado para un formulario. */
export interface FormPacket {
  id: string;
  caseId: string | null;
  formKey: string;
  formCode: string;
  formName: string;
  clientName: string | null;
  inputs: Record<string, string>;
  /** Borrador del formulario, parte por parte. */
  formDraft: string | null;
  /** Documentos de respaldo a recolectar. */
  checklist: ChecklistItem[];
  /** Guía de presentación: tasa, dónde, plazos, motivos de RFE. */
  filingGuide: string | null;
  /** Contenido revisado por el abogado (reemplaza al borrador como versión final). */
  reviewedContent: string | null;
  reviewStatus: ReviewStatus;
  usedRag: boolean;
  durationMs: number;
  generatedAt: string;
  reviewedAt: string | null;
}
