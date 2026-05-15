/**
 * Workflow Studio — motor de ejecución.
 *
 * Ejecuta una plantilla paso a paso, acumulando las salidas en un
 * contexto compartido. Cada paso reutiliza un servicio existente:
 *   - rag_search   → retrieveLegalContextForChat (corpus jurídico)
 *   - llm_generate → getAiClient().chat.completions.create
 *
 * Persiste la ejecución en workflow_runs / workflow_run_steps y emite
 * eventos de progreso (consumidos por la ruta SSE).
 *
 * Fail-safe: el error de un paso marca el run como 'failed' pero no
 * lanza — el caller siempre recibe un WorkflowRunResult.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { getAiClient } from '../../lib/ai-client.js';
import { retrieveLegalContextForChat } from '../legal-rag-retrieval.service.js';
import type {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowProgressCallback,
  WorkflowRunResult,
} from './types.js';

interface RunOptions {
  userId: string;
  caseId?: string | null;
  onProgress?: WorkflowProgressCallback;
}

/** Interpola {{input}} y {{steps.<id>}} en una plantilla de texto. */
function interpolate(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    return ctx[key] ?? '';
  });
}

function previewOf(text: string, n = 280): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n) + '…' : clean;
}

// ─── EJECUCIÓN DE UN PASO ──────────────────────────────────────────────

async function runStep(
  step: WorkflowStep,
  ctx: Record<string, string>,
): Promise<string> {
  if (step.type === 'rag_search') {
    const query = interpolate(step.queryTemplate || '{{input}}', ctx);
    const result = await retrieveLegalContextForChat(query, {
      limit: step.ragLimit ?? 8,
      filterCountryCode: 'EC',
    });
    // Guardamos el contexto formateado y, aparte, las citas para reutilizar.
    if (result.citationsList) {
      ctx[`steps.${step.id}.citations`] = result.citationsList;
    }
    return result.formattedPrompt
      || 'No se encontró normativa específica en el corpus para esta búsqueda.';
  }

  if (step.type === 'llm_generate') {
    const prompt = interpolate(step.promptTemplate || '{{input}}', ctx);
    const ai = await getAiClient();
    const completion = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: step.systemPrompt || 'Sos un asistente jurídico experto.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: step.maxTokens ?? 1500,
    });
    return completion.choices[0]?.message?.content?.trim()
      || 'El modelo no devolvió contenido para este paso.';
  }

  throw new Error(`Tipo de paso no soportado: ${(step as WorkflowStep).type}`);
}

// ─── PERSISTENCIA ──────────────────────────────────────────────────────

async function createRun(
  runId: string,
  userId: string,
  template: WorkflowTemplate,
  userInput: string,
  caseId: string | null,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.workflow_runs
       (id, user_id, template_key, template_name, status, user_input, case_id)
     VALUES ($1::uuid, $2, $3, $4, 'running', $5, $6)`,
    runId, userId, template.key, template.name, userInput, caseId,
  );
}

async function recordStep(
  runId: string,
  stepIndex: number,
  step: WorkflowStep,
  status: 'completed' | 'failed',
  output: string,
  durationMs: number,
  error: string | null,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.workflow_run_steps
       (run_id, step_index, step_id, step_name, step_type, status, output, error_message, duration_ms)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)`,
    runId, stepIndex, step.id, step.name, step.type, status,
    output.slice(0, 100_000), error, durationMs,
  );
}

async function closeRun(
  runId: string,
  status: 'completed' | 'failed',
  result: string,
  durationMs: number,
  error: string | null,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE public.workflow_runs
        SET status = $2, result = $3, duration_ms = $4,
            error_message = $5, completed_at = now()
      WHERE id = $1::uuid`,
    runId, status, result.slice(0, 200_000), durationMs, error,
  );
}

// ─── API PÚBLICA ───────────────────────────────────────────────────────

/**
 * Ejecuta un workflow completo. Emite progreso vía opts.onProgress.
 * Nunca lanza: ante un error devuelve un resultado con status 'failed'.
 */
export async function runWorkflow(
  template: WorkflowTemplate,
  userInput: string,
  opts: RunOptions,
): Promise<WorkflowRunResult> {
  const emit: WorkflowProgressCallback = opts.onProgress ?? (() => {});
  const runId = randomUUID();
  const startedAt = Date.now();
  const ctx: Record<string, string> = { input: userInput.trim() };
  const stepResults: WorkflowRunResult['steps'] = [];

  try {
    await createRun(runId, opts.userId, template, userInput, opts.caseId ?? null);
  } catch (e: any) {
    return {
      runId, status: 'failed', result: '',
      durationMs: Date.now() - startedAt,
      steps: [{ stepId: 'init', stepName: 'Inicialización', status: 'failed', output: '', durationMs: 0, error: e?.message }],
    };
  }

  emit({ event: 'run-start', runId, templateName: template.name, totalSteps: template.steps.length });

  let lastOutput = '';
  let runStatus: 'completed' | 'failed' = 'completed';
  let runError: string | null = null;

  for (let i = 0; i < template.steps.length; i++) {
    const step = template.steps[i];
    emit({ event: 'step-start', stepIndex: i, stepId: step.id, stepName: step.name });
    const stepStart = Date.now();

    try {
      const output = await runStep(step, ctx);
      ctx[`steps.${step.id}`] = output;
      lastOutput = output;
      const durationMs = Date.now() - stepStart;

      await recordStep(runId, i, step, 'completed', output, durationMs, null);
      stepResults.push({ stepId: step.id, stepName: step.name, status: 'completed', output, durationMs });
      emit({ event: 'step-done', stepIndex: i, stepId: step.id, durationMs, outputPreview: previewOf(output) });
    } catch (e: any) {
      const durationMs = Date.now() - stepStart;
      const msg = e?.message || 'Error desconocido en el paso';
      await recordStep(runId, i, step, 'failed', '', durationMs, msg).catch(() => {});
      stepResults.push({ stepId: step.id, stepName: step.name, status: 'failed', output: '', durationMs, error: msg });
      emit({ event: 'step-error', stepIndex: i, stepId: step.id, error: msg });
      runStatus = 'failed';
      runError = `Paso "${step.name}": ${msg}`;
      break; // un paso fallido detiene el workflow
    }
  }

  const durationMs = Date.now() - startedAt;
  const finalResult = runStatus === 'completed' ? lastOutput : '';
  await closeRun(runId, runStatus, finalResult, durationMs, runError).catch(() => {});

  emit({ event: 'run-complete', runId, status: runStatus, result: finalResult, durationMs });

  return { runId, status: runStatus, result: finalResult, durationMs, steps: stepResults };
}

// ─── HISTORIAL ─────────────────────────────────────────────────────────

export async function listWorkflowRuns(userId: string, limit = 20): Promise<Array<{
  id: string;
  templateKey: string;
  templateName: string;
  status: string;
  userInput: string | null;
  durationMs: number;
  startedAt: Date;
  completedAt: Date | null;
}>> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, template_key, template_name, status, user_input,
            duration_ms, started_at, completed_at
       FROM public.workflow_runs
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2`,
    userId, Math.min(100, limit),
  );
  return rows.map((r) => ({
    id: r.id,
    templateKey: r.template_key,
    templateName: r.template_name,
    status: r.status,
    userInput: r.user_input,
    durationMs: Number(r.duration_ms ?? 0),
    startedAt: r.started_at,
    completedAt: r.completed_at,
  }));
}

export async function getWorkflowRunDetail(userId: string, runId: string): Promise<{
  run: any;
  steps: any[];
} | null> {
  const runRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, template_key, template_name, status, user_input, case_id,
            result, error_message, duration_ms, started_at, completed_at
       FROM public.workflow_runs
      WHERE id = $1::uuid AND user_id = $2`,
    runId, userId,
  );
  if (runRows.length === 0) return null;

  const stepRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT step_index, step_id, step_name, step_type, status,
            output, error_message, duration_ms
       FROM public.workflow_run_steps
      WHERE run_id = $1::uuid
      ORDER BY step_index ASC`,
    runId,
  );

  const r = runRows[0];
  return {
    run: {
      id: r.id,
      templateKey: r.template_key,
      templateName: r.template_name,
      status: r.status,
      userInput: r.user_input,
      caseId: r.case_id,
      result: r.result,
      errorMessage: r.error_message,
      durationMs: Number(r.duration_ms ?? 0),
      startedAt: r.started_at,
      completedAt: r.completed_at,
    },
    steps: stepRows.map((s) => ({
      stepIndex: s.step_index,
      stepId: s.step_id,
      stepName: s.step_name,
      stepType: s.step_type,
      status: s.status,
      output: s.output,
      errorMessage: s.error_message,
      durationMs: Number(s.duration_ms ?? 0),
    })),
  };
}
