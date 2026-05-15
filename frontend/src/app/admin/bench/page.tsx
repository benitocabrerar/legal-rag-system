'use client';

/**
 * Panel Admin · Poweria Bench
 *
 * Benchmark abierto de derecho ecuatoriano. Mide la calidad del modelo de
 * IA activo contra un dataset de tareas jurídicas validadas.
 *
 *  - KPIs: último puntaje, total de evaluaciones, tamaño del dataset
 *  - Disparo de evaluación (con/sin RAG · pública o interna)
 *  - Progreso en vivo por polling
 *  - Histórico de runs con drill-down a resultados por tarea
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2, ChevronDown, ChevronRight,
  Database, ExternalLink, Gauge, Loader2, Play, RefreshCw, Sparkles, Target,
  XCircle,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface BenchAggregate { category: string; avgScore: number; count: number }

interface BenchRun {
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

interface BenchResult {
  taskId: string;
  category: string;
  difficulty: string;
  taskType: string;
  answer: string | null;
  score: number | null;
  verdict: 'aprobado' | 'parcial' | 'reprobado' | null;
  rationale: string | null;
  normsExpected: number;
  normsFound: number;
  citationsVerified: number;
  citationsUnverified: number;
  durationMs: number;
  error: string | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function scoreColor(s: number | null): string {
  if (s == null) return 'text-gray-400';
  if (s >= 75) return 'text-emerald-600';
  if (s >= 45) return 'text-amber-600';
  return 'text-rose-600';
}
function scoreBg(s: number | null): string {
  if (s == null) return 'bg-gray-300';
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 45) return 'bg-amber-500';
  return 'bg-rose-500';
}
function formatDuration(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}
function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
const TASK_TYPE_LABEL: Record<string, string> = {
  norm_identification: 'Identificación de norma',
  rule_application: 'Aplicación de regla',
  citation_accuracy: 'Exactitud de citas',
  open_analysis: 'Análisis abierto',
};
const DIFFICULTY_LABEL: Record<string, string> = {
  basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado',
};

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function BenchPage() {
  const [runs, setRuns] = useState<BenchRun[]>([]);
  const [taskCount, setTaskCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [useRag, setUseRag] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [notes, setNotes] = useState('');
  const [starting, setStarting] = useState(false);

  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ run: BenchRun; results: BenchResult[] } | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── LOAD ─────────────────────────────────────────────────────────────
  const loadRuns = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const [runsR, tasksR] = await Promise.all([
        api.get<{ runs: BenchRun[] }>('/bench/runs', { params: { limit: 30 } }),
        api.get<{ total: number }>('/bench/tasks').catch(() => ({ data: { total: 0 } })),
      ]);
      const list = runsR.data.runs ?? [];
      setRuns(list);
      setTaskCount(tasksR.data.total ?? 0);
      // Reanudar polling si quedó una evaluación en curso.
      const running = list.find((r) => r.status === 'running');
      if (running && !liveRunId) setLiveRunId(running.runId);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [liveRunId]);

  useEffect(() => { loadRuns(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── POLLING DEL RUN EN VIVO ──────────────────────────────────────────
  useEffect(() => {
    if (!liveRunId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const r = await api.get<{ run: BenchRun; results: BenchResult[] }>(`/bench/runs/${liveRunId}`);
        if (cancelled) return;
        setDetail(r.data);
        setExpandedRun(liveRunId);
        if (r.data.run.status !== 'running') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setLiveRunId(null);
          loadRuns();
        }
      } catch { /* reintenta en el próximo tick */ }
    };

    tick();
    pollRef.current = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [liveRunId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── TRIGGER ──────────────────────────────────────────────────────────
  const startRun = async () => {
    setStarting(true);
    setError('');
    try {
      const r = await api.post<{ runId: string }>('/bench/runs', { useRag, isPublic, notes });
      setLiveRunId(r.data.runId);
      setDetail(null);
      await loadRuns();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'No se pudo iniciar la evaluación');
    } finally {
      setStarting(false);
    }
  };

  // ─── RUN DETAIL ───────────────────────────────────────────────────────
  const toggleRunDetail = async (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null);
      return;
    }
    setExpandedRun(runId);
    if (liveRunId === runId) return; // ya lo trae el polling
    setDetail(null);
    try {
      const r = await api.get<{ run: BenchRun; results: BenchResult[] }>(`/bench/runs/${runId}`);
      setDetail(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo cargar el detalle');
    }
  };

  const lastCompleted = runs.find((r) => r.status === 'completed');
  const isRunning = liveRunId !== null;

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando Poweria Bench…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Poweria Bench</h1>
            <p className="text-sm text-gray-500">
              Benchmark abierto de derecho ecuatoriano · mide la calidad del modelo de IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/bench"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
          >
            <ExternalLink className="h-4 w-4" />
            Página pública
          </Link>
          <button
            onClick={loadRuns}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      {/* ─── KPI CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Gauge className="h-5 w-5" />}
          label="Último puntaje global"
          value={lastCompleted ? `${lastCompleted.avgScore.toFixed(1)}` : '—'}
          sub={lastCompleted ? `Modelo ${lastCompleted.model}` : 'Sin evaluaciones aún'}
          color={lastCompleted ? (lastCompleted.avgScore >= 75 ? 'emerald' : lastCompleted.avgScore >= 45 ? 'amber' : 'rose') : 'gray'}
        />
        <KpiCard
          icon={<Database className="h-5 w-5" />}
          label="Tareas en el dataset"
          value={String(taskCount)}
          sub="Derecho ecuatoriano validado"
          color="indigo"
        />
        <KpiCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Evaluaciones corridas"
          value={String(runs.length)}
          sub={`${runs.filter((r) => r.isPublic).length} públicas`}
          color="violet"
        />
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          label="Estado"
          value={isRunning ? 'En curso' : 'Inactivo'}
          sub={isRunning ? 'Evaluación ejecutándose' : 'Listo para evaluar'}
          color={isRunning ? 'amber' : 'emerald'}
        />
      </div>

      {/* ─── TRIGGER PANEL ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Ejecutar evaluación
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Corre el modelo de IA activo contra las {taskCount} tareas del dataset. La
            evaluación se ejecuta en segundo plano; el progreso se actualiza solo.
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Toggle
              checked={useRag}
              onChange={setUseRag}
              title="Usar corpus jurídico (RAG)"
              desc="El modelo recibe normativa del corpus antes de responder. Desactivá para medir el conocimiento base del modelo."
            />
            <Toggle
              checked={isPublic}
              onChange={setIsPublic}
              title="Publicar resultado"
              desc="Marca esta evaluación como pública: se mostrará en la página abierta del benchmark."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Ej: baseline con Opus 4.7 + corpus completo"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={startRun}
            disabled={starting || isRunning}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {starting || isRunning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {isRunning ? 'Evaluación en curso…' : 'Iniciando…'}</>
              : <><Play className="h-4 w-4" /> Iniciar evaluación</>}
          </button>
        </div>
      </div>

      {/* ─── LIVE RUN ───────────────────────────────────────────── */}
      {isRunning && detail && (
        <LiveRunCard run={detail.run} results={detail.results} />
      )}

      {/* ─── RUN HISTORY ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Histórico de evaluaciones
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Click en una fila para ver el detalle tarea por tarea.
          </p>
        </div>
        {runs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            Todavía no se corrió ninguna evaluación.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {runs.map((run) => {
              const open = expandedRun === run.runId;
              return (
                <div key={run.runId}>
                  <button
                    onClick={() => toggleRunDetail(run.runId)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left"
                  >
                    {open
                      ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                    <div className={`text-2xl font-bold tabular-nums ${scoreColor(run.status === 'completed' ? run.avgScore : null)}`}>
                      {run.status === 'completed' ? run.avgScore.toFixed(0) : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{run.model}</span>
                        <RunStatusPill status={run.status} />
                        {run.isPublic && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700">PÚBLICA</span>
                        )}
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                          {run.useRag ? 'con RAG' : 'sin RAG'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {formatDateTime(run.startedAt)} · {run.completedTasks}/{run.totalTasks} tareas
                        {run.durationMs > 0 && ` · ${formatDuration(run.durationMs)}`}
                        {run.notes && ` · ${run.notes}`}
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="bg-gray-50 border-t border-gray-100 p-5">
                      {liveRunId === run.runId && detail
                        ? <RunDetailBody run={detail.run} results={detail.results} expandedResult={expandedResult} setExpandedResult={setExpandedResult} />
                        : detail && detail.run.runId === run.runId
                          ? <RunDetailBody run={detail.run} results={detail.results} expandedResult={expandedResult} setExpandedResult={setExpandedResult} />
                          : <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" /> Cargando detalle…
                            </div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  const map: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600' },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
    gray:    { bg: 'bg-gray-50',    text: 'text-gray-600' },
  };
  const c = map[color] || map.gray;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${c.bg} ${c.text}`}>{icon}</div>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1 truncate">{sub}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, title, desc }: {
  checked: boolean; onChange: (v: boolean) => void; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition ${
        checked ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 h-5 w-9 rounded-full transition relative ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
    </button>
  );
}

function RunStatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    running:   { label: 'En curso',   cls: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completada', cls: 'bg-emerald-100 text-emerald-700' },
    failed:    { label: 'Falló',      cls: 'bg-rose-100 text-rose-700' },
  };
  const m = meta[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${m.cls}`}>
      {status === 'running' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {m.label.toUpperCase()}
    </span>
  );
}

function VerdictPill({ verdict }: { verdict: string | null }) {
  const meta: Record<string, string> = {
    aprobado:  'bg-emerald-100 text-emerald-700',
    parcial:   'bg-amber-100 text-amber-700',
    reprobado: 'bg-rose-100 text-rose-700',
  };
  if (!verdict) return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-500">ERROR</span>;
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${meta[verdict] || 'bg-gray-100 text-gray-600'}`}>
      {verdict.toUpperCase()}
    </span>
  );
}

function AggregateBars({ title, items }: { title: string; items: BenchAggregate[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.category} className="flex items-center gap-3">
            <div className="w-32 text-xs text-gray-700 truncate flex-shrink-0">
              {DIFFICULTY_LABEL[it.category] || it.category}
            </div>
            <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full ${scoreBg(it.avgScore)} transition-all`}
                style={{ width: `${Math.max(2, it.avgScore)}%` }}
              />
            </div>
            <div className={`w-12 text-right text-xs font-bold tabular-nums ${scoreColor(it.avgScore)}`}>
              {it.avgScore.toFixed(0)}
            </div>
            <div className="w-8 text-right text-[10px] text-gray-400">×{it.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveRunCard({ run, results }: { run: BenchRun; results: BenchResult[] }) {
  const pct = run.totalTasks > 0 ? Math.round((run.completedTasks / run.totalTasks) * 100) : 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-amber-200 overflow-hidden">
      <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
            Evaluación en curso
          </h2>
          <span className="text-sm font-mono text-gray-600">{run.completedTasks}/{run.totalTasks} tareas</span>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-white overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          El modelo responde, se verifican las citas contra el corpus y un juez LLM
          califica cada respuesta. Podés cerrar esta página: la evaluación sigue corriendo.
        </p>
      </div>
      {results.length > 0 && (
        <div className="p-5 max-h-72 overflow-y-auto">
          <div className="space-y-1.5">
            {results.map((r) => (
              <div key={r.taskId} className="flex items-center gap-3 text-sm">
                <div className={`w-9 text-right font-bold tabular-nums ${scoreColor(r.score)}`}>
                  {r.score != null ? r.score.toFixed(0) : '—'}
                </div>
                <span className="text-gray-700 flex-1 truncate">{r.taskId} · {r.category}</span>
                <VerdictPill verdict={r.verdict} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RunDetailBody({ run, results, expandedResult, setExpandedResult }: {
  run: BenchRun;
  results: BenchResult[];
  expandedResult: string | null;
  setExpandedResult: (v: string | null) => void;
}) {
  if (run.status === 'failed') {
    return (
      <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
        <XCircle className="h-5 w-5 flex-shrink-0" />
        <div>La evaluación falló. Se completaron {run.completedTasks} de {run.totalTasks} tareas.</div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {(run.byCategory.length > 0 || run.byDifficulty.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-lg border border-gray-100 p-4">
          <AggregateBars title="Puntaje por materia" items={run.byCategory} />
          <AggregateBars title="Puntaje por dificultad" items={run.byDifficulty} />
        </div>
      )}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          {results.length} resultados
        </div>
        {results.map((r) => {
          const open = expandedResult === r.taskId;
          return (
            <div key={r.taskId} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedResult(open ? null : r.taskId)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition text-left"
              >
                <div className={`w-9 text-right text-lg font-bold tabular-nums ${scoreColor(r.score)}`}>
                  {r.score != null ? r.score.toFixed(0) : '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{r.taskId}</span>
                    <VerdictPill verdict={r.verdict} />
                    <span className="text-[10px] text-gray-500">{r.category}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {DIFFICULTY_LABEL[r.difficulty] || r.difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-shrink-0">
                  {r.normsExpected > 0 && (
                    <span title="Normas esperadas mencionadas">
                      📚 {r.normsFound}/{r.normsExpected}
                    </span>
                  )}
                  <span title="Citas verificadas contra el corpus" className="text-emerald-600">
                    ✓ {r.citationsVerified}
                  </span>
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Tipo · {TASK_TYPE_LABEL[r.taskType] || r.taskType}
                    </div>
                  </div>
                  {r.error ? (
                    <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                      {r.error}
                    </div>
                  ) : (
                    <>
                      {r.rationale && (
                        <div>
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Veredicto del juez
                          </div>
                          <p className="text-sm text-gray-700">{r.rationale}</p>
                        </div>
                      )}
                      {r.answer && (
                        <div>
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Respuesta del modelo
                          </div>
                          <p className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-3 max-h-60 overflow-y-auto">
                            {r.answer}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
