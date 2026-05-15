'use client';

/**
 * Panel Admin · Corpus Sync
 *
 * Visualización y control del sistema de auto-sync del corpus jurídico
 * desde las dos fuentes oficiales: Registro Oficial + Asamblea Nacional.
 *
 *  - KPIs: última sync, próxima programada, nuevas detectadas 7d, total runs
 *  - Disparo manual con SSE en vivo (full / RO / AN)
 *  - Tabla histórico de runs (drill-down a items)
 *  - Lista de publicaciones pendientes de aprobar
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Activity, AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown,
  ChevronRight, Clock, Database, ExternalLink, FileText, Globe, Layers,
  Loader2, Play, RefreshCw, ScrollText, Settings, Sparkles, TrendingUp,
  X, XCircle, Zap,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface SyncRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  source: string;
  status: string;
  newDetected: number;
  ingestedOk: number;
  ingestedFail: number;
  totalDurationMs: number;
  errorMessage: string | null;
  triggeredBy: string;
}

interface SyncRunItem {
  id: string;
  canonicalName: string;
  source: string;
  action: string;
  status: string;
  legalDocId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface SyncStats {
  lastSync: string | null;
  lastSyncStatus: string | null;
  nextScheduledRo: string;
  nextScheduledAsamblea: string;
  newDetectedLast7d: number;
  ingestedLast7d: number;
  totalRuns: number;
  runsBySource: Array<{ source: string; count: number }>;
}

interface AnalyzedPublication {
  id: string;
  edition_number: string | null;
  edition_date: string | null;
  publication_type: string | null;
  title: string;
  issuing_entity: string | null;
  ai_summary: string | null;
  ai_classification: string | null;
  ai_relevance_score: number | null;
  status: string;
  created_at: string;
}

interface SyncProgress {
  pct: number;
  label: string;
  phase: string;
  source?: 'full' | 'ro' | 'asamblea';
  runId?: string;
  startedAt?: string;
  events: Array<{ ts: number; event: string; label: string; level: 'info' | 'ok' | 'warn' | 'err' }>;
  finished?: {
    status: string;
    totalDurationMs: number;
    newDetected: number;
    ingestedOk: number;
    ingestedFail: number;
    alertsCreated: number;
    errors: string[];
  };
  error?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
const SOURCE_META: Record<string, { label: string; color: string; icon: string }> = {
  full:     { label: 'Sync completa',      color: 'violet', icon: '⚡' },
  ro:       { label: 'Registro Oficial',   color: 'sky',    icon: '📜' },
  asamblea: { label: 'Asamblea Nacional',  color: 'emerald', icon: '🏛️' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; text: string }> = {
  running:    { label: 'En curso',   color: 'indigo',  bg: 'bg-indigo-50',  border: 'border-indigo-200', text: 'text-indigo-700' },
  completed:  { label: 'Completado', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  partial:    { label: 'Parcial',    color: 'amber',   bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700' },
  failed:     { label: 'Falló',      color: 'rose',    bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700' },
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'nunca';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'hace segundos';
  if (ms < 3_600_000) return `hace ${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.round(ms / 3_600_000)} h`;
  if (ms < 7 * 86_400_000) return `hace ${Math.round(ms / 86_400_000)} d`;
  return new Date(iso).toLocaleDateString('es-EC');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function CorpusSyncPage() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [pending, setPending] = useState<AnalyzedPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [syncing, setSyncing] = useState<'full' | 'ro' | 'asamblea' | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<{ items: SyncRunItem[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── LOAD ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError('');
    setRefreshing(true);
    try {
      const [statsR, runsR, pendingR] = await Promise.all([
        api.get<SyncStats>('/admin/corpus/sync/stats'),
        api.get<{ runs: SyncRun[]; total: number }>('/admin/corpus/sync/runs', { params: { limit: 25 } }),
        api.get<{ items: AnalyzedPublication[]; total: number }>('/admin/registro-oficial/publications', {
          params: { status: 'analyzed', limit: 10 },
        }).catch(() => ({ data: { items: [], total: 0 } })),
      ]);
      setStats(statsR.data);
      setRuns(runsR.data.runs ?? []);
      setPending(pendingR.data.items ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── RUN DETAIL ───────────────────────────────────────────────────────
  const toggleRunDetail = async (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null);
      setRunDetail(null);
      return;
    }
    setExpandedRun(runId);
    setRunDetail(null);
    setLoadingDetail(true);
    try {
      const r = await api.get<{ run: SyncRun; items: SyncRunItem[] }>(`/admin/corpus/sync/runs/${runId}`);
      setRunDetail({ items: r.data.items ?? [] });
    } catch (e: any) {
      setRunDetail({ items: [] });
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── TRIGGER SYNC (SSE) ───────────────────────────────────────────────
  const triggerSync = async (kind: 'full' | 'ro' | 'asamblea') => {
    setSyncing(kind);
    setProgress({
      pct: 0,
      label: 'Conectando con el servidor…',
      phase: 'connecting',
      source: kind,
      events: [],
    });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://poweria-legal-api.onrender.com';
      const endpoint =
        kind === 'full'     ? '/api/v1/admin/corpus/sync/run-full' :
        kind === 'ro'       ? '/api/v1/admin/corpus/sync/run-ro' :
                              '/api/v1/admin/corpus/sync/run-asamblea';

      const r = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = chunk.split('\n').filter((l) => !l.startsWith(':'));
          const evLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const event = evLine ? evLine.slice(6).trim() : 'message';
          let payload: any = null;
          try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { /* ignore */ }
          if (!payload) continue;

          if (event === 'connected' || event === 'run-start') {
            setProgress((p) => p ? {
              ...p,
              startedAt: payload.startedAt,
              runId: payload.runId ?? p.runId,
              label: payload.label || 'Iniciando sincronización…',
              events: [...p.events, { ts: Date.now(), event, label: `Run ${payload.runId?.slice(0, 8) ?? ''} iniciado`, level: 'info' }],
            } : p);
          } else if (event === 'phase') {
            const level: 'err' | 'ok' | 'info' =
              payload.phase?.includes('error') ? 'err' :
              payload.phase?.includes('done')  ? 'ok'  : 'info';
            setProgress((p) => p ? {
              ...p,
              pct: payload.pct ?? p.pct,
              label: payload.label ?? p.label,
              phase: payload.phase ?? p.phase,
              events: [...p.events, {
                ts: Date.now(),
                event: payload.phase as string,
                label: String(payload.label ?? ''),
                level,
              }],
            } : p);
          } else if (event === 'done' || event === 'run-complete') {
            const doneLevel: 'ok' | 'warn' = payload.status === 'completed' ? 'ok' : 'warn';
            setProgress((p) => p ? {
              ...p,
              pct: 100,
              label: 'Completado',
              phase: 'done',
              finished: {
                status: payload.status,
                totalDurationMs: payload.totalDurationMs,
                newDetected: payload.totals?.newDetected ?? 0,
                ingestedOk: payload.totals?.ingestedOk ?? 0,
                ingestedFail: payload.totals?.ingestedFail ?? 0,
                alertsCreated: payload.totals?.alertsCreated ?? 0,
                errors: payload.errors ?? [],
              },
              events: [...p.events, { ts: Date.now(), event: 'done', label: `Run finalizado: ${payload.status}`, level: doneLevel }],
            } : p);
          } else if (event === 'error') {
            setProgress((p) => p ? {
              ...p,
              error: payload.error,
              events: [...p.events, { ts: Date.now(), event: 'error', label: payload.error || 'Error', level: 'err' }],
            } : p);
          } else if (event.startsWith('ro:') || event.startsWith('an:')) {
            const phaseLabel = typeof payload === 'string'
              ? payload
              : String(payload?.label ?? payload?.msg ?? event);
            setProgress((p) => p ? {
              ...p,
              events: [...p.events, {
                ts: Date.now(),
                event,
                label: phaseLabel,
                level: 'info' as const,
              }].slice(-50),
            } : p);
          }
        }
      }
      await loadAll();
    } catch (e: any) {
      setProgress((p) => p ? {
        ...p,
        error: e?.message || 'Error en sincronización',
        events: [...p.events, { ts: Date.now(), event: 'error', label: e?.message || 'Error', level: 'err' }],
      } : p);
    } finally {
      setSyncing(null);
    }
  };

  const closeProgress = () => setProgress(null);

  // ─── APPROVE ─────────────────────────────────────────────────────────
  const approvePublication = async (id: string) => {
    if (!confirm('¿Aprobar e ingestar al corpus legal vectorizado?')) return;
    try {
      await api.post(`/admin/registro-oficial/publications/${id}/approve`);
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'No se pudo aprobar');
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando panel de sincronización…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ─── HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Corpus Sync</h1>
              <p className="text-sm text-gray-500">
                Sincronización automática desde Registro Oficial y Asamblea Nacional
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={loadAll}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      {/* ─── KPI CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Última sync"
          value={stats?.lastSync ? formatRelativeTime(stats.lastSync) : 'Aún no'}
          sub={stats?.lastSyncStatus ? STATUS_META[stats.lastSyncStatus]?.label : ''}
          color={stats?.lastSyncStatus === 'completed' ? 'emerald' : stats?.lastSyncStatus === 'failed' ? 'rose' : 'gray'}
        />
        <KpiCard
          icon={<Calendar className="h-5 w-5" />}
          label="Próxima programada"
          value={stats?.nextScheduledRo || '—'}
          sub="Registro Oficial · cada 6h"
          color="sky"
        />
        <KpiCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Detectadas últimos 7d"
          value={String(stats?.newDetectedLast7d ?? 0)}
          sub={`${stats?.ingestedLast7d ?? 0} ingestadas`}
          color="violet"
        />
        <KpiCard
          icon={<Database className="h-5 w-5" />}
          label="Total runs"
          value={String(stats?.totalRuns ?? 0)}
          sub={stats?.runsBySource?.map((s) => `${SOURCE_META[s.source]?.icon || ''} ${s.count}`).join(' · ') || ''}
          color="indigo"
        />
      </div>

      {/* ─── SYNC TRIGGERS ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-600" />
                Sincronizar ahora
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Dispara manualmente un ciclo de sincronización. Útil para validar
                cambios o adelantarse al cron programado.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <SyncButton
            kind="full"
            title="Sync completa"
            subtitle="Ambas fuentes · ~3–5 min"
            icon="⚡"
            gradient="from-violet-600 to-fuchsia-600"
            disabled={syncing !== null}
            onClick={() => triggerSync('full')}
          />
          <SyncButton
            kind="ro"
            title="Solo Registro Oficial"
            subtitle="RSS feed · ~1–2 min"
            icon="📜"
            gradient="from-sky-600 to-blue-600"
            disabled={syncing !== null}
            onClick={() => triggerSync('ro')}
          />
          <SyncButton
            kind="asamblea"
            title="Solo Asamblea Nacional"
            subtitle="CSV + PDF download · ~2–4 min"
            icon="🏛️"
            gradient="from-emerald-600 to-teal-600"
            disabled={syncing !== null}
            onClick={() => triggerSync('asamblea')}
          />
        </div>
      </div>

      {/* ─── PENDING PUBLICATIONS ──────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Pendientes de aprobar
                {pending.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                    {pending.length}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Normas detectadas por el sync, esperando revisión del admin antes
                de entrar al corpus vectorizado.
              </p>
            </div>
            <Link
              href="/admin/registro-oficial"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {pending.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-3 rounded-full bg-emerald-50 mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600">
              No hay publicaciones pendientes. El admin está al día.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pending.map((pub) => (
              <div key={pub.id} className="p-5 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {pub.ai_classification && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-indigo-100 text-indigo-700">
                          {pub.ai_classification}
                        </span>
                      )}
                      {pub.ai_relevance_score !== null && pub.ai_relevance_score !== undefined && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-violet-100 text-violet-700 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {Math.round(pub.ai_relevance_score * 100)}% relevancia
                        </span>
                      )}
                      {pub.edition_number && (
                        <span className="text-xs text-gray-500">RO #{pub.edition_number}</span>
                      )}
                      {pub.edition_date && (
                        <span className="text-xs text-gray-500">· {new Date(pub.edition_date).toLocaleDateString('es-EC')}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{pub.title}</h3>
                    {pub.ai_summary && (
                      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{pub.ai_summary}</p>
                    )}
                  </div>
                  <button
                    onClick={() => approvePublication(pub.id)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprobar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── RUN HISTORY ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-indigo-600" />
            Histórico de ejecuciones
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Últimas {runs.length} sincronizaciones. Click para ver detalle item por item.
          </p>
        </div>
        {runs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            Aún no hay ejecuciones registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-8"></th>
                  <th className="px-4 py-3 text-left font-semibold">Inicio</th>
                  <th className="px-4 py-3 text-left font-semibold">Fuente</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Nuevas</th>
                  <th className="px-4 py-3 text-right font-semibold">Ingestadas</th>
                  <th className="px-4 py-3 text-right font-semibold">Fallidas</th>
                  <th className="px-4 py-3 text-right font-semibold">Duración</th>
                  <th className="px-4 py-3 text-left font-semibold">Triggered by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const isExpanded = expandedRun === run.id;
                  const srcMeta = SOURCE_META[run.source] || { label: run.source, color: 'gray', icon: '•' };
                  const stMeta = STATUS_META[run.status] || { label: run.status, color: 'gray', bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
                  return (
                    <>
                      <tr
                        key={run.id}
                        onClick={() => toggleRunDetail(run.id)}
                        className="hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-gray-400" />
                            : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-900 font-medium">{formatDateTime(run.startedAt)}</div>
                          <div className="text-xs text-gray-500">{formatRelativeTime(run.startedAt)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-gray-700">
                            <span>{srcMeta.icon}</span>
                            {srcMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${stMeta.bg} ${stMeta.border} ${stMeta.text}`}>
                            {run.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {stMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-900">{run.newDetected}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">{run.ingestedOk}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700">{run.ingestedFail || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                          {run.totalDurationMs > 0 ? formatDuration(run.totalDurationMs) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{run.triggeredBy}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <div className="bg-gray-50 border-t border-gray-100 p-5">
                              {loadingDetail ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Cargando detalle…
                                </div>
                              ) : runDetail && runDetail.items.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    {runDetail.items.length} items procesados
                                  </div>
                                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                    {runDetail.items.map((item) => (
                                      <div key={item.id} className="flex items-start gap-2 text-xs bg-white p-2 rounded border border-gray-100">
                                        <ItemStatusDot status={item.status} />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate">{item.canonicalName}</div>
                                          <div className="text-gray-500">
                                            {item.source} · {item.action} · {formatRelativeTime(item.createdAt)}
                                            {item.errorMessage && <span className="text-rose-600"> · {item.errorMessage}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  Sin items detallados.
                                  {run.errorMessage && (
                                    <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-700">
                                      {run.errorMessage}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── INFO PANEL ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl border border-sky-200 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white shadow-sm">
            <Settings className="h-5 w-5 text-sky-600" />
          </div>
          <div className="flex-1 text-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Sobre el sistema de sync</h3>
            <p className="text-gray-700 mb-2">
              El corpus se sincroniza automáticamente desde dos fuentes oficiales:
            </p>
            <ul className="space-y-1 text-gray-600">
              <li><strong>📜 Registro Oficial</strong> · cada 6 horas vía RSS · fuente primaria con valor jurídico oficial</li>
              <li><strong>🏛️ Asamblea Nacional</strong> · diario a las 23:00 EC vía CSV · fuente secundaria de leyes aprobadas</li>
            </ul>
            <p className="text-gray-600 mt-2 text-xs">
              Las nuevas normas detectadas quedan en estado <code className="bg-white px-1 py-0.5 rounded text-xs">analyzed</code> hasta
              que el admin las apruebe. No hay auto-ingest al corpus vectorizado.
            </p>
          </div>
        </div>
      </div>

      {/* ─── PROGRESS MODAL ────────────────────────────────────── */}
      {progress && (
        <ProgressModal
          progress={progress}
          syncing={syncing !== null}
          onClose={closeProgress}
        />
      )}
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    ring: 'ring-rose-100' },
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-600',     ring: 'ring-sky-100' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  ring: 'ring-violet-100' },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  ring: 'ring-indigo-100' },
    gray:    { bg: 'bg-gray-50',    text: 'text-gray-600',    ring: 'ring-gray-100' },
  };
  const c = colorMap[color] || colorMap.gray;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${c.bg} ${c.text}`}>
          {icon}
        </div>
      </div>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1 truncate">{sub}</div>}
    </div>
  );
}

function SyncButton({
  kind, title, subtitle, icon, gradient, disabled, onClick,
}: {
  kind: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden p-5 rounded-xl text-left transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 bg-gradient-to-br ${gradient} text-white`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{icon}</div>
        <Play className="h-5 w-5 opacity-70 group-hover:opacity-100 transition" />
      </div>
      <div className="font-bold text-sm mb-0.5">{title}</div>
      <div className="text-xs opacity-80">{subtitle}</div>
    </button>
  );
}

function ItemStatusDot({ status }: { status: string }) {
  const meta: Record<string, string> = {
    ok:       'bg-emerald-500',
    skipped:  'bg-gray-400',
    failed:   'bg-rose-500',
    partial:  'bg-amber-500',
    error:    'bg-rose-500',
  };
  return (
    <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${meta[status] || 'bg-gray-400'}`} />
  );
}

function ProgressModal({
  progress, syncing, onClose,
}: {
  progress: SyncProgress;
  syncing: boolean;
  onClose: () => void;
}) {
  const srcMeta = progress.source ? SOURCE_META[progress.source] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{srcMeta?.icon || '⚡'}</div>
              <div>
                <h3 className="font-bold text-lg">{srcMeta?.label || 'Sincronización'}</h3>
                <p className="text-xs text-white/80">
                  {progress.runId ? `Run ID: ${progress.runId.slice(0, 8)}…` : 'Iniciando…'}
                </p>
              </div>
            </div>
            {!syncing && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">{progress.label}</span>
            <span className="font-mono text-gray-600">{progress.pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress.error ? 'bg-rose-500' :
                progress.finished ? 'bg-emerald-500' :
                'bg-gradient-to-r from-violet-500 to-indigo-500'
              }`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>

        {/* Finished summary */}
        {progress.finished && (
          <div className="p-5 border-b border-gray-100 bg-emerald-50">
            <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Sincronización completada
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-xs text-emerald-700">Detectadas</div>
                <div className="text-xl font-bold text-emerald-900">{progress.finished.newDetected}</div>
              </div>
              <div>
                <div className="text-xs text-emerald-700">Ingestadas</div>
                <div className="text-xl font-bold text-emerald-900">{progress.finished.ingestedOk}</div>
              </div>
              <div>
                <div className="text-xs text-emerald-700">Fallidas</div>
                <div className="text-xl font-bold text-emerald-900">{progress.finished.ingestedFail}</div>
              </div>
              <div>
                <div className="text-xs text-emerald-700">Duración</div>
                <div className="text-xl font-bold text-emerald-900">{formatDuration(progress.finished.totalDurationMs)}</div>
              </div>
            </div>
            {progress.finished.errors.length > 0 && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <strong>Advertencias ({progress.finished.errors.length}):</strong>{' '}
                {progress.finished.errors.slice(0, 3).join(' · ')}
              </div>
            )}
          </div>
        )}

        {progress.error && (
          <div className="p-4 border-b border-gray-100 bg-rose-50 text-rose-800 text-sm flex items-start gap-2">
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Error: </strong>{progress.error}
            </div>
          </div>
        )}

        {/* Event log */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900 font-mono text-xs">
          {progress.events.length === 0 ? (
            <div className="text-gray-500">Esperando eventos…</div>
          ) : (
            <div className="space-y-1">
              {progress.events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-gray-500 flex-shrink-0">
                    [{new Date(ev.ts).toLocaleTimeString('es-EC', { hour12: false })}]
                  </span>
                  <span className={
                    ev.level === 'ok'   ? 'text-emerald-400' :
                    ev.level === 'err'  ? 'text-rose-400' :
                    ev.level === 'warn' ? 'text-amber-400' :
                                          'text-sky-300'
                  }>
                    {ev.event}
                  </span>
                  <span className="text-gray-300 flex-1">{ev.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={syncing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {syncing ? 'Sincronización en curso…' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
