/**
 * Poweria Bench — motor de evaluación.
 *
 * Una ejecución (run) corre el modelo de IA activo contra todas las
 * tareas activas del dataset. Por cada tarea:
 *
 *   1. Genera la respuesta (con o sin RAG sobre el corpus jurídico).
 *   2. Chequeo determinista — cobertura de normas esperadas y
 *      verificación de citas contra el corpus (anti-alucinación).
 *   3. Juez LLM — califica la respuesta 0-100 contra la rúbrica.
 *
 * El run corre en segundo plano: el motor persiste el avance en
 * bench_runs.completed_tasks y el frontend hace polling. Esto lo hace
 * robusto a evaluaciones largas sin depender de una conexión SSE viva.
 *
 * Fail-safe: ningún error de tarea aborta el run; se registra en la
 * fila de resultado y la ejecución continúa.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { getAiClient, getAiInfo } from '../../lib/ai-client.js';
import { retrieveLegalContextForChat } from '../legal-rag-retrieval.service.js';
import { verifyCitationsInText } from '../legal/citation-verification.service.js';
import { BENCH_SEED_TASKS } from './seed-tasks.js';
import type {
  BenchTask,
  BenchVerdict,
  BenchRunSummary,
  BenchAggregate,
} from './types.js';

// ─── PROMPTS ───────────────────────────────────────────────────────────────

const ANSWER_SYSTEM = `Sos un asistente jurídico experto en derecho ecuatoriano.
Respondés con precisión técnica, en español, citando las normas y artículos
concretos que correspondan. Si el contexto provisto no alcanza, lo decís
explícitamente. Nunca inventás artículos, números de ley ni jurisprudencia.
Sé completo pero conciso: un abogado debe poder usar la respuesta directamente.`;

const JUDGE_SYSTEM = `Sos un evaluador imparcial y exigente, experto en derecho
ecuatoriano. Calificás la respuesta de un asistente de IA a una tarea jurídica,
estrictamente según la rúbrica provista.

Criterios de calificación:
  - Corrección jurídica: ¿la respuesta es acertada en el derecho ecuatoriano?
  - Fundamentación: ¿identifica y aplica la normativa correcta?
  - Honestidad: penalizá fuerte la invención de normas, artículos o cifras.
  - Claridad y utilidad práctica para un abogado.

Escala de veredicto: aprobado (>=75), parcial (45-74), reprobado (<45).
Sé riguroso: una respuesta vaga o que inventa fundamento no debe aprobar.`;

// ─── HELPERS ───────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrae el primer objeto JSON {...} de un texto y lo parsea. */
function extractJson(raw: string): any | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function verdictFromScore(score: number): BenchVerdict {
  if (score >= 75) return 'aprobado';
  if (score >= 45) return 'parcial';
  return 'reprobado';
}

// ─── SEED ──────────────────────────────────────────────────────────────────

/** Siembra el dataset semilla. Idempotente por id (upsert). */
export async function seedBenchTasks(): Promise<number> {
  for (const t of BENCH_SEED_TASKS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.bench_tasks
         (id, category, difficulty, task_type, prompt, rubric, expected_norms, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true, now())
       ON CONFLICT (id) DO UPDATE SET
         category = EXCLUDED.category,
         difficulty = EXCLUDED.difficulty,
         task_type = EXCLUDED.task_type,
         prompt = EXCLUDED.prompt,
         rubric = EXCLUDED.rubric,
         expected_norms = EXCLUDED.expected_norms,
         updated_at = now()`,
      t.id, t.category, t.difficulty, t.taskType, t.prompt, t.rubric,
      JSON.stringify(t.expectedNorms),
    );
  }
  return BENCH_SEED_TASKS.length;
}

async function loadActiveTasks(): Promise<BenchTask[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, category, difficulty, task_type, prompt, rubric, expected_norms
       FROM public.bench_tasks
      WHERE is_active = true
      ORDER BY category, id`,
  );
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    difficulty: r.difficulty,
    taskType: r.task_type,
    prompt: r.prompt,
    rubric: r.rubric,
    expectedNorms: Array.isArray(r.expected_norms) ? r.expected_norms : [],
  }));
}

// ─── GENERACIÓN Y CALIFICACIÓN ─────────────────────────────────────────────

async function generateAnswer(task: BenchTask, useRag: boolean): Promise<string> {
  let context = '';
  if (useRag) {
    try {
      const r = await retrieveLegalContextForChat(task.prompt, {
        limit: 8,
        filterCountryCode: 'EC',
      });
      context = r.formattedPrompt || '';
    } catch {
      // Sin contexto: el modelo responde con su conocimiento base.
      context = '';
    }
  }
  const ai = await getAiClient();
  const userContent = context
    ? `CONTEXTO NORMATIVO (extractos del corpus jurídico de Ecuador):\n${context}\n\n` +
      `CONSIGNA:\n${task.prompt}`
    : `CONSIGNA:\n${task.prompt}`;
  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: ANSWER_SYSTEM },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1400,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

interface JudgeResult {
  score: number;
  verdict: BenchVerdict;
  rationale: string;
}

async function judgeAnswer(task: BenchTask, answer: string): Promise<JudgeResult> {
  const ai = await getAiClient();
  const prompt =
    `TIPO DE TAREA: ${task.taskType}\n` +
    `MATERIA: ${task.category} · DIFICULTAD: ${task.difficulty}\n\n` +
    `CONSIGNA PLANTEADA:\n${task.prompt}\n\n` +
    `RÚBRICA DE CALIFICACIÓN (qué debe contener una buena respuesta):\n${task.rubric}\n\n` +
    `RESPUESTA DEL ASISTENTE A EVALUAR:\n${answer}\n\n` +
    `Calificá la respuesta. Devolvé EXCLUSIVAMENTE un objeto JSON válido, sin texto ` +
    `adicional ni markdown, con esta forma exacta:\n` +
    `{"score": <entero 0-100>, "verdict": "aprobado"|"parcial"|"reprobado", ` +
    `"rationale": "<2 a 3 frases justificando el puntaje>"}`;

  // Hasta dos intentos: el JSON del juez es crítico para el puntaje.
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: JUDGE_SYSTEM },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0,
    });
    const raw = completion.choices[0]?.message?.content || '';
    const parsed = extractJson(raw);
    if (parsed && (typeof parsed.score === 'number' || typeof parsed.score === 'string')) {
      const score = clampScore(parsed.score);
      const verdict: BenchVerdict =
        parsed.verdict === 'aprobado' || parsed.verdict === 'parcial' || parsed.verdict === 'reprobado'
          ? parsed.verdict
          : verdictFromScore(score);
      const rationale = String(parsed.rationale || '').slice(0, 800)
        || 'El juez no entregó una justificación.';
      return { score, verdict, rationale };
    }
  }
  throw new Error('El juez no devolvió un JSON de calificación válido.');
}

/** Cuenta cuántas normas esperadas aparecen mencionadas en la respuesta. */
function countNormCoverage(task: BenchTask, answer: string): number {
  if (task.expectedNorms.length === 0) return 0;
  const haystack = normalize(answer);
  return task.expectedNorms.filter((n) => haystack.includes(normalize(n))).length;
}

// ─── PERSISTENCIA ──────────────────────────────────────────────────────────

async function recordResult(
  runId: string,
  task: BenchTask,
  data: {
    answer: string;
    score: number | null;
    verdict: BenchVerdict | null;
    rationale: string;
    normsFound: number;
    citationsVerified: number;
    citationsUnverified: number;
    durationMs: number;
    error: string | null;
  },
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.bench_results
       (run_id, task_id, category, difficulty, task_type, answer, score, verdict,
        rationale, norms_expected, norms_found, citations_verified, citations_unverified,
        duration_ms, error_message)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    runId, task.id, task.category, task.difficulty, task.taskType,
    data.answer.slice(0, 60_000), data.score, data.verdict, data.rationale.slice(0, 2_000),
    task.expectedNorms.length, data.normsFound, data.citationsVerified,
    data.citationsUnverified, data.durationMs, data.error,
  );
}

// ─── EJECUCIÓN ─────────────────────────────────────────────────────────────

interface StartOptions {
  triggeredBy: string | null;
  useRag: boolean;
  isPublic: boolean;
  notes?: string | null;
}

/** ¿Hay un run del bench actualmente en curso? */
export async function hasRunningBench(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT 1 FROM public.bench_runs WHERE status = 'running'
       AND started_at > now() - interval '45 minutes' LIMIT 1`,
  );
  return rows.length > 0;
}

/**
 * Inicia una evaluación. Crea la fila de run, dispara la ejecución en
 * segundo plano y devuelve el runId de inmediato. El frontend hace polling.
 */
export async function startBenchRun(opts: StartOptions): Promise<{ runId: string; totalTasks: number }> {
  await seedBenchTasks(); // garantiza que el dataset exista
  const tasks = await loadActiveTasks();
  if (tasks.length === 0) {
    throw new Error('No hay tareas activas en el dataset del bench.');
  }

  const ai = await getAiInfo();
  const runId = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.bench_runs
       (id, triggered_by, provider, model, use_rag, is_public, status, total_tasks, notes)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, 'running', $7, $8)`,
    runId, opts.triggeredBy, ai.provider, ai.model, opts.useRag, opts.isPublic,
    tasks.length, opts.notes ?? null,
  );

  // Fire-and-forget: la ejecución corre en segundo plano.
  void executeBenchRun(runId, tasks, opts.useRag);

  return { runId, totalTasks: tasks.length };
}

/** Ejecuta el run completo. Nunca lanza: marca el run como failed ante error fatal. */
async function executeBenchRun(runId: string, tasks: BenchTask[], useRag: boolean): Promise<void> {
  const startedAt = Date.now();
  try {
    for (const task of tasks) {
      const taskStart = Date.now();
      try {
        const answer = await generateAnswer(task, useRag);
        if (!answer || answer.length < 20) {
          throw new Error('El modelo no devolvió una respuesta evaluable.');
        }

        const normsFound = countNormCoverage(task, answer);

        let citationsVerified = 0;
        let citationsUnverified = 0;
        try {
          const cv = await verifyCitationsInText(answer);
          citationsVerified = cv.summary.normsFound;
          citationsUnverified = cv.summary.articleRefsCount;
        } catch {
          // La verificación de citas es complementaria; su fallo no aborta la tarea.
        }

        const judge = await judgeAnswer(task, answer);

        await recordResult(runId, task, {
          answer,
          score: judge.score,
          verdict: judge.verdict,
          rationale: judge.rationale,
          normsFound,
          citationsVerified,
          citationsUnverified,
          durationMs: Date.now() - taskStart,
          error: null,
        });
      } catch (e: any) {
        await recordResult(runId, task, {
          answer: '',
          score: null,
          verdict: null,
          rationale: '',
          normsFound: 0,
          citationsVerified: 0,
          citationsUnverified: 0,
          durationMs: Date.now() - taskStart,
          error: (e?.message || 'Error desconocido en la tarea').slice(0, 500),
        }).catch(() => {});
      }
      // Avance incremental — el frontend hace polling sobre completed_tasks.
      await prisma.$executeRawUnsafe(
        `UPDATE public.bench_runs SET completed_tasks = completed_tasks + 1 WHERE id = $1::uuid`,
        runId,
      ).catch(() => {});
    }

    // Promedio sobre tareas calificadas (las que erraron no cuentan).
    const agg = await prisma.$queryRawUnsafe<any[]>(
      `SELECT AVG(score)::numeric(5,2) AS avg_score
         FROM public.bench_results
        WHERE run_id = $1::uuid AND error_message IS NULL AND score IS NOT NULL`,
      runId,
    );
    const avgScore = agg[0]?.avg_score != null ? Number(agg[0].avg_score) : 0;

    await prisma.$executeRawUnsafe(
      `UPDATE public.bench_runs
          SET status = 'completed', avg_score = $2, duration_ms = $3, completed_at = now()
        WHERE id = $1::uuid`,
      runId, avgScore, Date.now() - startedAt,
    );
  } catch (e: any) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.bench_runs
          SET status = 'failed', error_message = $2, duration_ms = $3, completed_at = now()
        WHERE id = $1::uuid`,
      runId, (e?.message || 'Error fatal en la ejecución').slice(0, 500), Date.now() - startedAt,
    ).catch(() => {});
  }
}

// ─── CONSULTAS ─────────────────────────────────────────────────────────────

function aggregate(rows: any[], key: 'category' | 'difficulty'): BenchAggregate[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    if (r.error_message || r.score == null) continue;
    const k = r[key] as string;
    const cur = map.get(k) || { sum: 0, count: 0 };
    cur.sum += Number(r.score);
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([k, v]) => ({
      category: k,
      avgScore: v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0,
      count: v.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

function rowToSummary(run: any, results: any[]): BenchRunSummary {
  return {
    runId: run.id,
    status: run.status,
    provider: run.provider,
    model: run.model,
    useRag: run.use_rag,
    isPublic: run.is_public,
    totalTasks: Number(run.total_tasks ?? 0),
    completedTasks: Number(run.completed_tasks ?? 0),
    avgScore: run.avg_score != null ? Number(run.avg_score) : 0,
    durationMs: Number(run.duration_ms ?? 0),
    notes: run.notes ?? null,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    byCategory: aggregate(results, 'category'),
    byDifficulty: aggregate(results, 'difficulty'),
  };
}

export async function listBenchRuns(limit = 25): Promise<BenchRunSummary[]> {
  const runs = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, provider, model, use_rag, is_public, status, total_tasks,
            completed_tasks, avg_score, duration_ms, notes, started_at, completed_at
       FROM public.bench_runs
      ORDER BY started_at DESC
      LIMIT $1`,
    Math.min(100, limit),
  );
  return runs.map((r) => rowToSummary(r, []));
}

export async function getBenchRunDetail(runId: string): Promise<{
  run: BenchRunSummary;
  results: any[];
} | null> {
  const runRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, provider, model, use_rag, is_public, status, total_tasks,
            completed_tasks, avg_score, duration_ms, notes, error_message,
            started_at, completed_at
       FROM public.bench_runs WHERE id = $1::uuid`,
    runId,
  );
  if (runRows.length === 0) return null;

  const results = await prisma.$queryRawUnsafe<any[]>(
    `SELECT task_id, category, difficulty, task_type, answer, score, verdict,
            rationale, norms_expected, norms_found, citations_verified,
            citations_unverified, duration_ms, error_message
       FROM public.bench_results
      WHERE run_id = $1::uuid
      ORDER BY category, task_id`,
    runId,
  );

  return {
    run: rowToSummary(runRows[0], results),
    results: results.map((r) => ({
      taskId: r.task_id,
      category: r.category,
      difficulty: r.difficulty,
      taskType: r.task_type,
      answer: r.answer,
      score: r.score != null ? Number(r.score) : null,
      verdict: r.verdict,
      rationale: r.rationale,
      normsExpected: Number(r.norms_expected ?? 0),
      normsFound: Number(r.norms_found ?? 0),
      citationsVerified: Number(r.citations_verified ?? 0),
      citationsUnverified: Number(r.citations_unverified ?? 0),
      durationMs: Number(r.duration_ms ?? 0),
      error: r.error_message,
    })),
  };
}

/** La última evaluación pública y completada — alimenta el leaderboard abierto. */
export async function getPublicLeaderboard(): Promise<{
  run: BenchRunSummary;
  results: any[];
} | null> {
  const runRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM public.bench_runs
      WHERE is_public = true AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST
      LIMIT 1`,
  );
  if (runRows.length === 0) return null;
  return getBenchRunDetail(runRows[0].id);
}

export async function listBenchTasks(): Promise<BenchTask[]> {
  await seedBenchTasks();
  return loadActiveTasks();
}
