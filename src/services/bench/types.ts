/**
 * Poweria Bench — tipos.
 *
 * Un "bench" es un conjunto de tareas de derecho ecuatoriano validadas.
 * Cada ejecución (run) corre el modelo de IA activo contra todas las
 * tareas activas, califica cada respuesta y produce un puntaje agregado.
 *
 * El objetivo es credibilidad pública: un benchmark abierto, propio del
 * dominio EC, que ningún competidor generalista tiene.
 */

export type BenchDifficulty = 'basico' | 'intermedio' | 'avanzado';

/**
 * Tipo de tarea — define qué se mide:
 *   norm_identification → ¿identifica la norma correcta?
 *   rule_application    → ¿aplica bien la regla a un caso?
 *   citation_accuracy   → ¿cita normas reales sin inventar?
 *   open_analysis       → análisis jurídico abierto
 */
export type BenchTaskType =
  | 'norm_identification'
  | 'rule_application'
  | 'citation_accuracy'
  | 'open_analysis';

export interface BenchTask {
  /** Slug estable, ej. 'laboral-002'. */
  id: string;
  /** Especialidad / materia. */
  category: string;
  difficulty: BenchDifficulty;
  taskType: BenchTaskType;
  /** La consigna que se le plantea al modelo. */
  prompt: string;
  /** Criterios con los que el juez califica la respuesta. */
  rubric: string;
  /**
   * Fragmentos de títulos de normas que una buena respuesta debería
   * mencionar (en minúsculas, sin acentos). Usados para el chequeo
   * determinista de cobertura normativa.
   */
  expectedNorms: string[];
}

export type BenchVerdict = 'aprobado' | 'parcial' | 'reprobado';

export interface BenchTaskResult {
  taskId: string;
  category: string;
  difficulty: BenchDifficulty;
  taskType: BenchTaskType;
  /** Respuesta generada por el modelo. */
  answer: string;
  /** Puntaje 0-100 asignado por el juez. */
  score: number;
  verdict: BenchVerdict;
  /** Justificación del juez (2-3 frases). */
  rationale: string;
  /** Normas esperadas y cuántas aparecieron en la respuesta. */
  normsExpected: number;
  normsFound: number;
  /** Citas verificadas contra el corpus / referencias sin contraste. */
  citationsVerified: number;
  citationsUnverified: number;
  durationMs: number;
  error?: string;
}

export interface BenchAggregate {
  category: string;
  avgScore: number;
  count: number;
}

export interface BenchRunSummary {
  runId: string;
  status: 'running' | 'completed' | 'failed';
  provider: string;
  model: string;
  useRag: boolean;
  isPublic: boolean;
  totalTasks: number;
  completedTasks: number;
  avgScore: number;
  durationMs: number;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  byCategory: BenchAggregate[];
  byDifficulty: BenchAggregate[];
}
