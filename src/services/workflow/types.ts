/**
 * Workflow Studio — tipos.
 *
 * Un "workflow" es una secuencia de pasos encadenados. Cada paso produce
 * una salida que se acumula en un contexto compartido; los pasos
 * siguientes interpolan ese contexto en sus prompts mediante {{variables}}.
 *
 * En v1 las plantillas están definidas en código (templates.ts) — son del
 * sistema. El editor visual de workflows custom es v2.
 */

/** Tipos de paso disponibles en v1. Cada uno reutiliza un servicio existente. */
export type WorkflowStepType =
  | 'rag_search'    // busca en el corpus jurídico (legal-rag-retrieval)
  | 'llm_generate'; // genera texto con el LLM (ai-client)

export interface WorkflowStep {
  /** Identificador único dentro del workflow — se usa como clave de contexto. */
  id: string;
  /** Nombre legible para mostrar en la UI de progreso. */
  name: string;
  type: WorkflowStepType;

  // ── rag_search ──────────────────────────────────────────────
  /** Plantilla del query de búsqueda. Soporta {{input}} y {{steps.<id>}}. */
  queryTemplate?: string;
  /** Cuántos chunks recuperar (default 8). */
  ragLimit?: number;

  // ── llm_generate ────────────────────────────────────────────
  /** System prompt fijo del paso. */
  systemPrompt?: string;
  /** Plantilla del user prompt. Soporta {{input}} y {{steps.<id>}}. */
  promptTemplate?: string;
  /** Límite de tokens de la respuesta (default 1500). */
  maxTokens?: number;
}

export interface WorkflowTemplate {
  /** Clave estable usada en URLs y en workflow_runs.template_key. */
  key: string;
  name: string;
  description: string;
  /** Emoji o ícono para la tarjeta. */
  icon: string;
  /** Especialidad / categoría para agrupar. */
  category: string;
  /** Etiqueta del campo de entrada que se le pide al usuario. */
  inputLabel: string;
  inputPlaceholder: string;
  /** Pasos en orden de ejecución. */
  steps: WorkflowStep[];
}

/** Eventos emitidos durante la ejecución (consumidos vía SSE). */
export type WorkflowProgressEvent =
  | { event: 'run-start'; runId: string; templateName: string; totalSteps: number }
  | { event: 'step-start'; stepIndex: number; stepId: string; stepName: string }
  | { event: 'step-done'; stepIndex: number; stepId: string; durationMs: number; outputPreview: string }
  | { event: 'step-error'; stepIndex: number; stepId: string; error: string }
  | { event: 'run-complete'; runId: string; status: 'completed' | 'failed'; result: string; durationMs: number }
  | { event: 'run-error'; error: string };

export type WorkflowProgressCallback = (ev: WorkflowProgressEvent) => void;

export interface WorkflowRunResult {
  runId: string;
  status: 'completed' | 'failed';
  result: string;
  durationMs: number;
  steps: Array<{
    stepId: string;
    stepName: string;
    status: 'completed' | 'failed';
    output: string;
    durationMs: number;
    error?: string;
  }>;
}
