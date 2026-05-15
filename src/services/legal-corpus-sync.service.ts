/**
 * Legal Corpus Sync — Orquestador unificado de sincronización del corpus jurídico.
 *
 * Coordina DOS fuentes:
 *   FASE RO  : Registro Oficial Ecuador (RSS /feed/) — alta frecuencia
 *   FASE AN  : Asamblea Nacional Ecuador (CSV export) — baja frecuencia
 *
 * Flujo de runFullSync():
 *   1. Crear registro en corpus_sync_runs
 *   2. Fase RO: runMonitor() → detecta nuevas ediciones + reformas
 *   3. Fase AN: syncAsambleaToCorpus() → diff vs corpus → descarga → sube
 *   4. Actualizar corpus_sync_runs con métricas finales
 *   5. Notificar admin si hay alertas críticas (new_detected > 0)
 *
 * Garantías:
 *   - Idempotente por fuente (skip si ya existe en corpus)
 *   - Fault-tolerant: error en RO no para AN y viceversa
 *   - Cada run persiste en corpus_sync_runs para auditoría
 *   - Rate limiting integrado en los servicios de fuente
 */
import { prisma } from '../lib/prisma.js';
import { randomUUID } from 'crypto';
import { runMonitor, type MonitorResult } from './norm-monitor.service.js';
import { syncAsambleaToCorpus, type SyncResult as AsambleaSyncResult } from './asamblea-nacional.service.js';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface UnifiedSyncResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  sources: {
    ro: RoPhaseResult | null;
    asamblea: AsambleaPhaseResult | null;
  };
  totals: {
    newDetected: number;
    ingestedOk: number;
    ingestedFail: number;
    alertsCreated: number;
  };
  errors: string[];
  status: 'completed' | 'partial' | 'failed';
}

export interface RoPhaseResult {
  alertsCreated: number;
  feedItemsProcessed: number;
  newEditions: number;
  potentialReforms: number;
  newLaws: number;
  outdatedDocs: number;
  durationMs: number;
  errors: string[];
}

export interface AsambleaPhaseResult {
  newDetected: number;
  ingestedOk: number;
  ingestedFail: number;
  skipped: number;
  durationMs: number;
  errors: string[];
}

export type SyncProgressCallback = (event: string, data: unknown) => void;

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Ejecuta sincronización completa desde todas las fuentes.
 * Uso estándar desde rutas SSE del panel admin o cron programado.
 */
export async function runFullSync(opts: {
  triggeredBy?: string;
  skipRo?: boolean;
  skipAsamblea?: boolean;
  asambleaPeriodo?: string;
  onProgress?: SyncProgressCallback;
}): Promise<UnifiedSyncResult> {
  const emit: SyncProgressCallback = opts.onProgress ?? (() => {});
  const triggeredBy = opts.triggeredBy ?? 'system:full-sync';
  const startedAt = Date.now();

  // 1. Crear run record
  const runId = await createSyncRun(triggeredBy, 'full');
  emit('run-start', { runId, startedAt: new Date(startedAt).toISOString(), triggeredBy });

  const errors: string[] = [];
  let roPhase: RoPhaseResult | null = null;
  let anPhase: AsambleaPhaseResult | null = null;

  // 2. FASE RO — Registro Oficial (siempre primero, más frecuente)
  if (!opts.skipRo) {
    emit('phase', { phase: 'ro-start', label: 'Fase Registro Oficial — verificando RSS y corpus…', pct: 5, source: 'ro' });
    try {
      roPhase = await runRoPhase(runId, triggeredBy, emit);
      emit('phase', {
        phase: 'ro-done',
        label: `RO: ${roPhase.alertsCreated} alertas, ${roPhase.newEditions} ediciones nuevas`,
        pct: 45,
        source: 'ro',
        result: roPhase,
      });
    } catch (e: any) {
      const msg = `Fase RO falló: ${e?.message || 'unknown'}`;
      errors.push(msg);
      emit('phase', { phase: 'ro-error', label: msg, pct: 45, source: 'ro' });
    }
  }

  // 3. FASE AN — Asamblea Nacional
  if (!opts.skipAsamblea) {
    emit('phase', { phase: 'an-start', label: 'Fase Asamblea Nacional — sincronizando leyes aprobadas…', pct: 50, source: 'asamblea' });
    try {
      anPhase = await runAsambleaPhase(runId, triggeredBy, emit, opts.asambleaPeriodo);
      emit('phase', {
        phase: 'an-done',
        label: `AN: ${anPhase.newDetected} nuevas, ${anPhase.ingestedOk} ok, ${anPhase.skipped} skipped`,
        pct: 95,
        source: 'asamblea',
        result: anPhase,
      });
    } catch (e: any) {
      const msg = `Fase AN falló: ${e?.message || 'unknown'}`;
      errors.push(msg);
      emit('phase', { phase: 'an-error', label: msg, pct: 95, source: 'asamblea' });
    }
  }

  // 4. Calcular métricas finales
  const totalDurationMs = Date.now() - startedAt;
  const newDetected = (roPhase?.newEditions ?? 0) + (anPhase?.newDetected ?? 0);
  const ingestedOk = anPhase?.ingestedOk ?? 0;
  const ingestedFail = anPhase?.ingestedFail ?? 0;
  const alertsCreated = roPhase?.alertsCreated ?? 0;

  errors.push(...(roPhase?.errors ?? []), ...(anPhase?.errors ?? []));

  const bothFailed = !opts.skipRo && !opts.skipAsamblea && roPhase === null && anPhase === null;
  const anyFailed = errors.length > 0;
  const status: UnifiedSyncResult['status'] = bothFailed
    ? 'failed'
    : anyFailed
    ? 'partial'
    : 'completed';

  // 5. Actualizar run record
  await closeSyncRun(runId, {
    status,
    newDetected,
    ingestedOk,
    ingestedFail,
    totalDurationMs,
    errorMessage: errors.length > 0 ? errors.slice(0, 5).join(' | ').slice(0, 2000) : null,
  });

  const result: UnifiedSyncResult = {
    runId,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs,
    sources: { ro: roPhase, asamblea: anPhase },
    totals: { newDetected, ingestedOk, ingestedFail, alertsCreated },
    errors,
    status,
  };

  // Alerta al operador vía Telegram — solo si hay algo digno de avisar:
  // normas nuevas detectadas o un fallo. Best-effort, no rompe el run.
  try {
    if (status === 'failed' || newDetected > 0) {
      const { notifyOperatorViaTelegram } = await import('./telegram-notify.service.js');
      if (status === 'failed') {
        await notifyOperatorViaTelegram(
          'Sync de corpus falló',
          `El run ${runId.slice(0, 8)} terminó con estado "failed".\n${errors.slice(0, 3).join('\n') || 'Sin detalle.'}`,
          { level: 'error' },
        );
      } else {
        await notifyOperatorViaTelegram(
          'Sync de corpus — normas nuevas',
          `Se detectaron ${newDetected} norma(s) nueva(s). Ingestadas: ${ingestedOk}. Revisá el panel para aprobar las pendientes.`,
          { level: 'success' },
        );
      }
    }
  } catch { /* non-critical */ }

  emit('run-complete', result);
  return result;
}

/**
 * Solo la fase Registro Oficial.
 */
export async function runRoSync(opts: {
  triggeredBy?: string;
  onProgress?: SyncProgressCallback;
}): Promise<UnifiedSyncResult> {
  return runFullSync({ ...opts, skipAsamblea: true });
}

/**
 * Solo la fase Asamblea Nacional.
 */
export async function runAsambleaSync(opts: {
  triggeredBy?: string;
  periodo?: string;
  onProgress?: SyncProgressCallback;
}): Promise<UnifiedSyncResult> {
  return runFullSync({ ...opts, skipRo: true, asambleaPeriodo: opts.periodo });
}

// ─── PHASE RUNNERS ────────────────────────────────────────────────────────────

async function runRoPhase(
  runId: string,
  triggeredBy: string,
  emit: SyncProgressCallback,
): Promise<RoPhaseResult> {
  const phaseStart = Date.now();
  const result: MonitorResult = await runMonitor({
    triggeredBy,
    onProgress: (event, data) => emit(`ro:${event}`, data),
  });

  // Registrar items de la fase RO en corpus_sync_items
  if (result.newEditionsDetected > 0 || result.newLawsDetected > 0) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.corpus_sync_items
           (run_id, canonical_name, source, action, status, created_at)
         VALUES ($1::uuid, $2, 'registro_oficial_ec', 'monitor', $3, now())`,
        runId,
        `RO Monitor: ${result.feedItemsProcessed} items, ${result.alertsCreated} alertas`,
        result.errors.length > 0 ? 'partial' : 'ok',
      );
    } catch { /* non-critical */ }
  }

  return {
    alertsCreated: result.alertsCreated,
    feedItemsProcessed: result.feedItemsProcessed,
    newEditions: result.newEditionsDetected,
    potentialReforms: result.potentialReformsDetected,
    newLaws: result.newLawsDetected,
    outdatedDocs: result.outdatedDocsDetected,
    durationMs: Date.now() - phaseStart,
    errors: result.errors,
  };
}

async function runAsambleaPhase(
  runId: string,
  triggeredBy: string,
  emit: SyncProgressCallback,
  periodo?: string,
): Promise<AsambleaPhaseResult> {
  const phaseStart = Date.now();
  const result: AsambleaSyncResult = await syncAsambleaToCorpus({
    periodo,
    triggeredBy,
    runId,
    onProgress: (event, data) => emit(`an:${event}`, data),
  });

  return {
    newDetected: result.newDetected,
    ingestedOk: result.ingestedOk,
    ingestedFail: result.ingestedFail,
    skipped: result.skipped,
    durationMs: Date.now() - phaseStart,
    errors: result.errors,
  };
}

// ─── PERSISTENCE HELPERS ──────────────────────────────────────────────────────

async function createSyncRun(triggeredBy: string, source: string): Promise<string> {
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.corpus_sync_runs
       (id, started_at, source, status, triggered_by, new_detected,
        ingested_ok, ingested_fail, total_duration_ms)
     VALUES ($1::uuid, now(), $2, 'running', $3, 0, 0, 0, 0)`,
    id, source, triggeredBy,
  );
  return id;
}

async function closeSyncRun(runId: string, opts: {
  status: string;
  newDetected: number;
  ingestedOk: number;
  ingestedFail: number;
  totalDurationMs: number;
  errorMessage: string | null;
}): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE public.corpus_sync_runs
        SET completed_at      = now(),
            status            = $2,
            new_detected      = $3,
            ingested_ok       = $4,
            ingested_fail     = $5,
            total_duration_ms = $6,
            error_message     = $7
      WHERE id = $1::uuid`,
    runId,
    opts.status,
    opts.newDetected,
    opts.ingestedOk,
    opts.ingestedFail,
    opts.totalDurationMs,
    opts.errorMessage,
  );
}

/**
 * Historial de runs — para GET /admin/corpus/sync/runs
 */
export async function listSyncRuns(limit = 20): Promise<Array<{
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  source: string;
  status: string;
  newDetected: number;
  ingestedOk: number;
  ingestedFail: number;
  totalDurationMs: number;
  errorMessage: string | null;
  triggeredBy: string;
}>> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    started_at: Date;
    completed_at: Date | null;
    source: string;
    status: string;
    new_detected: number;
    ingested_ok: number;
    ingested_fail: number;
    total_duration_ms: number;
    error_message: string | null;
    triggered_by: string;
  }>>(
    `SELECT id, started_at, completed_at, source, status,
            new_detected, ingested_ok, ingested_fail, total_duration_ms,
            error_message, triggered_by
       FROM public.corpus_sync_runs
      ORDER BY started_at DESC
      LIMIT $1`,
    Math.min(100, limit),
  );

  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    source: r.source,
    status: r.status,
    newDetected: Number(r.new_detected ?? 0),
    ingestedOk: Number(r.ingested_ok ?? 0),
    ingestedFail: Number(r.ingested_fail ?? 0),
    totalDurationMs: Number(r.total_duration_ms ?? 0),
    errorMessage: r.error_message,
    triggeredBy: r.triggered_by,
  }));
}

/**
 * Detalle de un run — incluye corpus_sync_items asociados.
 */
export async function getSyncRunDetail(runId: string): Promise<{
  run: ReturnType<typeof listSyncRuns> extends Promise<Array<infer T>> ? T : never;
  items: Array<{
    id: string;
    canonicalName: string;
    source: string;
    action: string;
    status: string;
    legalDocId: string | null;
    errorMessage: string | null;
    createdAt: Date;
  }>;
} | null> {
  const runRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    started_at: Date;
    completed_at: Date | null;
    source: string;
    status: string;
    new_detected: number;
    ingested_ok: number;
    ingested_fail: number;
    total_duration_ms: number;
    error_message: string | null;
    triggered_by: string;
  }>>(
    `SELECT id, started_at, completed_at, source, status,
            new_detected, ingested_ok, ingested_fail, total_duration_ms,
            error_message, triggered_by
       FROM public.corpus_sync_runs WHERE id = $1::uuid`,
    runId,
  );
  if (runRows.length === 0) return null;

  const r = runRows[0];
  const run = {
    id: r.id,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    source: r.source,
    status: r.status,
    newDetected: Number(r.new_detected ?? 0),
    ingestedOk: Number(r.ingested_ok ?? 0),
    ingestedFail: Number(r.ingested_fail ?? 0),
    totalDurationMs: Number(r.total_duration_ms ?? 0),
    errorMessage: r.error_message,
    triggeredBy: r.triggered_by,
  };

  const itemRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    canonical_name: string;
    source: string;
    action: string;
    status: string;
    legal_doc_id: string | null;
    error_message: string | null;
    created_at: Date;
  }>>(
    `SELECT id, canonical_name, source, action, status,
            legal_doc_id, error_message, created_at
       FROM public.corpus_sync_items
      WHERE run_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 500`,
    runId,
  );

  return {
    run,
    items: itemRows.map((i) => ({
      id: i.id,
      canonicalName: i.canonical_name,
      source: i.source,
      action: i.action,
      status: i.status,
      legalDocId: i.legal_doc_id,
      errorMessage: i.error_message,
      createdAt: i.created_at,
    })),
  };
}

/**
 * KPIs para GET /admin/corpus/sync/stats
 */
export async function getSyncStats(): Promise<{
  lastSync: Date | null;
  lastSyncStatus: string | null;
  nextScheduledRo: string;
  nextScheduledAsamblea: string;
  newDetectedLast7d: number;
  ingestedLast7d: number;
  totalRuns: number;
  runsBySource: Array<{ source: string; count: number }>;
}> {
  const [lastRun, kpis, bySource] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ started_at: Date; status: string }>>(
      `SELECT started_at, status FROM public.corpus_sync_runs ORDER BY started_at DESC LIMIT 1`,
    ),
    prisma.$queryRawUnsafe<Array<{
      new_7d: bigint;
      ingested_7d: bigint;
      total_runs: bigint;
    }>>(
      `SELECT
         COALESCE(SUM(new_detected) FILTER (WHERE started_at >= now() - interval '7 days'), 0)::bigint AS new_7d,
         COALESCE(SUM(ingested_ok)  FILTER (WHERE started_at >= now() - interval '7 days'), 0)::bigint AS ingested_7d,
         COUNT(*)::bigint AS total_runs
       FROM public.corpus_sync_runs`,
    ),
    prisma.$queryRawUnsafe<Array<{ source: string; n: bigint }>>(
      `SELECT source, COUNT(*)::bigint AS n
         FROM public.corpus_sync_runs
        GROUP BY source
        ORDER BY n DESC`,
    ),
  ]);

  const k = kpis[0] ?? { new_7d: 0n, ingested_7d: 0n, total_runs: 0n };

  return {
    lastSync: lastRun[0]?.started_at ?? null,
    lastSyncStatus: lastRun[0]?.status ?? null,
    // Próximas ejecuciones son orientativas — cron configurado en Render
    nextScheduledRo: 'cada 6 horas (configurado en Render)',
    nextScheduledAsamblea: 'cada 24 horas (configurado en Render)',
    newDetectedLast7d: Number(k.new_7d),
    ingestedLast7d: Number(k.ingested_7d),
    totalRuns: Number(k.total_runs),
    runsBySource: bySource.map((r) => ({ source: r.source, count: Number(r.n) })),
  };
}
