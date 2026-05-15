/**
 * Agente de Trámites — tipos.
 *
 * Un "trámite tipo" es un escrito estandarizado del foro ecuatoriano
 * (contestación, anuncio de prueba, convocatoria, etc.). El agente lo
 * autocompleta a partir de campos estructurados, pero el resultado
 * SIEMPRE nace como borrador: la revisión del abogado es obligatoria
 * antes de considerarlo utilizable.
 */

/** Un campo del formulario de un trámite. */
export interface TramiteField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  /** Campo de texto largo (textarea). */
  multiline?: boolean;
  /** Ayuda contextual mostrada bajo el campo. */
  hint?: string;
}

/** Definición de un trámite tipo del catálogo (del sistema, en código). */
export interface TramiteType {
  /** Clave estable usada en URLs y en tramite_runs.tramite_key. */
  key: string;
  name: string;
  description: string;
  icon: string;
  /** Agrupador: 'Judicial', 'Societario', … */
  category: string;
  /** Si true, recupera normativa del corpus antes de redactar. */
  useRag: boolean;
  fields: TramiteField[];
  systemPrompt: string;
  /**
   * Plantilla del user prompt. Interpola {{<field.key>}} con los valores
   * del formulario y {{rag}} con el contexto normativo recuperado.
   */
  promptTemplate: string;
}

export type ReviewStatus = 'borrador' | 'aprobado';

/** Norma confirmada contra el corpus, asociada al borrador generado. */
export interface TramiteCitation {
  title: string;
  hierarchy: string | null;
  pdfUrl: string | null;
}

export interface TramiteRun {
  id: string;
  caseId: string | null;
  tramiteKey: string;
  tramiteName: string;
  inputs: Record<string, string>;
  draft: string | null;
  reviewedContent: string | null;
  reviewStatus: ReviewStatus;
  citations: TramiteCitation[];
  usedRag: boolean;
  durationMs: number;
  generatedAt: string;
  reviewedAt: string | null;
}
