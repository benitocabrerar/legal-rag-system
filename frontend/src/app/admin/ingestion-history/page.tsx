'use client';

/**
 * Admin · Historial de Ingestas al Corpus
 *
 * Muestra todos los runs de ingesta (bulk approve, auto-scan, audit) con
 * stats agregados y descarga del informe HTML por run. También disparador
 * directo para ingestar todas las pubs pendientes (status='analyzed').
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, Activity, Brain, Download, FileText, Clock,
  ChevronRight, PlayCircle, Zap, TrendingUp, Layers,
} from 'lucide-react';
import { api } from '@/lib/api';

interface IngestionRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  triggered_by: string;
  source: string;
  status: string;
  total_requested: number;
  total_succeeded: number;
  total_failed: number;
  total_chunks: number;
  total_embeddings: number;
  total_vectorized: number;
  total_notified_users: number;
  total_duration_ms: number;
  count_constitucion: number;
  count_codigos_organicos: number;
  count_leyes_organicas: number;
  count_codigos_ordinarios: number;
  count_leyes_ordinarias: number;
  count_reglamentos: number;
  count_otros: number;
  html_report_path: string | null;
}

interface AggregateStats {
  total_runs: number;
  total_normas_incorporadas: number;
  total_chunks_creados: number;
  total_notifs_emitidas: number;
  sum_constitucion: number;
  sum_codigos_organicos: number;
  sum_leyes_organicas: number;
  sum_codigos_ordinarios: number;
  sum_leyes_ordinarias: number;
  sum_reglamentos: number;
}

interface BulkProgress {
  pct: number;
  total: number;
  done: number;
  currentFile: {
    sequenceIndex: number;
    title: string;
    type: string;
    step: string;
    chunkIndex?: number;
    totalChunks?: number;
  } | null;
  succeeded: number;
  failed: number;
  totalChunks: number;
  totalNotified: number;
  liveLog: Array<{
    ts: number;
    type: 'file-start' | 'step' | 'file-complete' | 'file-failed';
    text: string;
    detail?: string;
  }>;
  finished?: boolean;
  result?: any;
  error?: string;
  runId?: string;
}

export default function IngestionHistoryPage() {
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [aggregate, setAggregate] = useState<AggregateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ runs: IngestionRun[]; aggregate: AggregateStats }>('/admin/corpus/ingestion-runs');
      setRuns(r.data.runs || []);
      setAggregate(r.data.aggregate || null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const startBulkIngest = async () => {
    setRunning(true);
    setProgress({
      pct: 0, total: 0, done: 0, currentFile: null,
      succeeded: 0, failed: 0, totalChunks: 0, totalNotified: 0,
      liveLog: [],
    });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/corpus/bulk-ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ allAnalyzed: true }),
      });
      if (!r.ok || !r.body) {
        const txt = await r.text();
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }

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
          try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }

          setProgress((p) => p ? updateProgress(p, event, payload) : p);
        }
      }
    } catch (e: any) {
      setProgress((p) => p ? { ...p, error: e?.message || 'Error desconocido' } : p);
    } finally {
      setRunning(false);
      await load();
    }
  };

  const downloadReport = async (runId: string) => {
    const { getAuthToken } = await import('@/lib/get-auth-token');
    const token = await getAuthToken();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const r = await fetch(`${API_URL}/api/v1/admin/corpus/ingestion-report/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) { alert('No se pudo descargar el reporte'); return; }
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = r.headers.get('content-disposition') || '';
    const fnMatch = disposition.match(/filename="(.+?)"/);
    a.download = fnMatch ? fnMatch[1] : `informe-ingesta-${runId}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Historial de Ingestas al Corpus</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Cada run de ingesta queda registrado con sus detalles técnicos (chunks, embeddings,
            tiempo) y un informe HTML descargable. Útil para reportar a clientes qué normativa
            se ha incorporado al sistema.
          </p>
        </div>
        <Link href="/admin/registro-oficial" className="text-xs font-bold text-violet-700 hover:underline">
          ← Volver al panel del RO
        </Link>
      </div>

      {/* Aggregate stats */}
      {aggregate && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<FileText />} label="Runs totales" value={aggregate.total_runs} color="violet" />
          <StatCard icon={<Sparkles />} label="Normas incorporadas" value={aggregate.total_normas_incorporadas} color="emerald" />
          <StatCard icon={<Layers />} label="Chunks vectoriales" value={aggregate.total_chunks_creados} color="sky" />
          <StatCard icon={<Zap />} label="Notif. emitidas" value={aggregate.total_notifs_emitidas} color="amber" />
          <StatCard
            icon={<TrendingUp />}
            label="Códigos + Leyes Orgánicas"
            value={(aggregate.sum_codigos_organicos || 0) + (aggregate.sum_leyes_organicas || 0)}
            color="rose"
          />
        </div>
      )}

      {/* Bulk ingest CTA */}
      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center shadow-lg shrink-0">
            <PlayCircle className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-slate-900">Ingestar todas las publicaciones pendientes</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
              Procesa todas las <code>registry_publications</code> en status <code>analyzed</code> sin
              <code>legal_doc_id</code>. Cada norma pasa por el pipeline completo (chunks → embeddings
              → vectorizar → registrar → notificar) con tracking granular persistido.
            </p>
          </div>
          <button
            onClick={startBulkIngest}
            disabled={running}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {running ? 'Procesando…' : 'Ingestar pendientes'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">Runs anteriores</h2>
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" /></div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">Aún no se han ejecutado ingestas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => <RunRow key={r.id} run={r} onDownload={() => downloadReport(r.id)} />)}
          </div>
        )}
      </div>

      {progress && (
        <BulkProgressModal
          progress={progress}
          onClose={() => { if (!running) setProgress(null); }}
          running={running}
          onDownload={() => progress.runId && downloadReport(progress.runId)}
        />
      )}
    </div>
  );
}

function updateProgress(p: BulkProgress, event: string, payload: any): BulkProgress {
  switch (event) {
    case 'run-start':
      return { ...p, total: payload.total, runId: payload.runId };
    case 'file-start':
      return {
        ...p,
        pct: payload.pct ?? p.pct,
        currentFile: {
          sequenceIndex: payload.sequenceIndex,
          title: payload.title,
          type: payload.type || '—',
          step: 'iniciando',
        },
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(),
          type: 'file-start',
          text: `[${payload.sequenceIndex}/${payload.total}] ${payload.title}`,
        }],
      };
    case 'step':
      return {
        ...p,
        currentFile: p.currentFile ? {
          ...p.currentFile,
          step: stepLabel(payload.step),
          chunkIndex: payload.chunkIndex,
          totalChunks: payload.totalChunks,
        } : p.currentFile,
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(),
          type: 'step',
          text: `   ↳ ${stepLabel(payload.step)}`,
          detail: payload.chunkIndex && payload.totalChunks
            ? `${payload.chunkIndex}/${payload.totalChunks} chunks`
            : undefined,
        }],
      };
    case 'file-complete':
      return {
        ...p,
        pct: payload.pct ?? p.pct,
        done: p.done + 1,
        succeeded: p.succeeded + 1,
        totalChunks: p.totalChunks + (payload.chunksCreated || 0),
        totalNotified: p.totalNotified + (payload.notifiedUsers || 0),
        currentFile: null,
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(),
          type: 'file-complete',
          text: `   ✓ ${payload.chunksCreated} chunks · ${payload.embeddingsVectorized} vectorizados · ${formatDur(payload.durationMs)}`,
        }],
      };
    case 'file-failed':
      return {
        ...p,
        done: p.done + 1,
        failed: p.failed + 1,
        currentFile: null,
        liveLog: [...p.liveLog.slice(-29), {
          ts: Date.now(),
          type: 'file-failed',
          text: `   ✗ ${payload.title}`,
          detail: payload.error?.slice(0, 80),
        }],
      };
    case 'run-complete':
    case 'done':
      return { ...p, pct: 100, finished: true, result: payload };
    case 'error':
      return { ...p, error: payload.error };
    default:
      return p;
  }
}

function stepLabel(step: string): string {
  const map: Record<string, string> = {
    'load-publication': 'cargando publicación',
    'insert-legal-doc': 'creando registro en legal_documents',
    'chunking-start': 'iniciando chunking',
    'chunking-done': 'chunking listo',
    'embedding-progress': 'generando embedding',
    'embedding-done': 'embedding listo',
    'vector-copy-start': 'copiando vector pgvector',
    'vector-copy-done': 'vector pgvector OK',
    'mark-ingested': 'marcando como ingestada',
    'broadcast-start': 'notificando usuarios',
    'broadcast-done': 'notificados',
    'complete': 'completado',
  };
  return map[step] || step;
}

function formatDur(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function RunRow({ run, onDownload }: { run: IngestionRun; onDownload: () => void }) {
  const dt = new Date(run.started_at).toLocaleString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const isDone = run.status === 'completed';
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${
          isDone ? 'bg-emerald-100 text-emerald-700' : run.status === 'running' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {isDone ? <CheckCircle2 className="w-5 h-5" /> : run.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{dt}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{run.source}</span>
            <span className="text-[10px] text-slate-500">por {run.triggered_by}</span>
          </div>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>{run.total_succeeded}</strong>/{run.total_requested} ok</span>
            {run.total_failed > 0 && <span className="text-rose-700">✗ {run.total_failed} fallos</span>}
            <span>📦 <strong>{run.total_chunks.toLocaleString('es-EC')}</strong> chunks</span>
            <span>🔔 {run.total_notified_users} notif</span>
            <span>⏱ {formatDur(run.total_duration_ms)}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-2">
            {run.count_constitucion > 0 && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded">🏛 {run.count_constitucion} Constitución</span>}
            {run.count_codigos_organicos > 0 && <span className="px-1.5 py-0.5 bg-violet-50 text-violet-800 rounded">⚖ {run.count_codigos_organicos} Cód.Org</span>}
            {run.count_leyes_organicas > 0 && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 rounded">📜 {run.count_leyes_organicas} L.Org</span>}
            {run.count_codigos_ordinarios > 0 && <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-800 rounded">📕 {run.count_codigos_ordinarios} Cód.Ord</span>}
            {run.count_leyes_ordinarias > 0 && <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 rounded">📄 {run.count_leyes_ordinarias} L.Ord</span>}
            {run.count_reglamentos > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">⚙ {run.count_reglamentos} Reglam</span>}
            {run.count_otros > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">📋 {run.count_otros} otros</span>}
          </div>
        </div>
        <button
          onClick={onDownload}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition"
        >
          <Download className="w-3 h-3" />
          HTML
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'violet' | 'emerald' | 'sky' | 'amber' | 'rose';
}) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-900 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    sky: 'bg-sky-50 text-sky-900 border-sky-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
  };
  return (
    <div className={`rounded-xl border-2 ${colorMap[color]} p-3`}>
      <div className="flex items-center justify-between mb-1">
        <div className="w-8 h-8 rounded-lg bg-white/60 grid place-items-center">{icon}</div>
        <div className="text-2xl font-black">{value.toLocaleString('es-EC')}</div>
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-75 mt-1">{label}</div>
    </div>
  );
}

function BulkProgressModal({ progress, onClose, running, onDownload }: {
  progress: BulkProgress;
  onClose: () => void;
  running: boolean;
  onDownload: () => void;
}) {
  const isFinished = progress.finished === true;
  const hasError = progress.error !== undefined;
  const canClose = !running || isFinished || hasError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <div className="w-full max-w-4xl bg-gradient-to-br from-slate-950 via-amber-950/80 to-slate-950 rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        <div className="px-6 pt-5 pb-4 border-b border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0 ${
              isFinished && !hasError ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              hasError ? 'bg-gradient-to-br from-rose-500 to-red-600' :
              'bg-gradient-to-br from-amber-500 to-orange-600 animate-pulse'
            }`}>
              {isFinished && !hasError ? <CheckCircle2 className="w-6 h-6" /> :
               hasError ? <AlertTriangle className="w-6 h-6" /> :
               <Zap className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-white">
                Ingesta al Corpus en Curso
                {!isFinished && !hasError && <Loader2 className="w-4 h-4 animate-spin text-amber-400 inline-block ml-2" />}
              </h2>
              <div className="text-xs text-amber-300/80 mt-0.5">
                {progress.done}/{progress.total} normas procesadas · {progress.succeeded} ok · {progress.failed} fallaron
              </div>
            </div>
            {canClose && (
              <button onClick={onClose} className="shrink-0 text-amber-300/60 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-4xl font-black bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                {Math.round(progress.pct)}
              </span>
              <span className="text-xl font-black text-amber-300/50">%</span>
              {progress.currentFile && (
                <span className="ml-auto text-xs text-amber-300/70 truncate max-w-[280px]" title={progress.currentFile.title}>
                  procesando: <strong>{progress.currentFile.title.slice(0, 50)}</strong>
                </span>
              )}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-500" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>

          {/* Current file detail */}
          {progress.currentFile && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="text-[10px] font-bold text-amber-300/70 uppercase tracking-wide mb-1">
                Archivo actual ({progress.currentFile.sequenceIndex}/{progress.total})
              </div>
              <div className="text-sm font-bold text-white truncate" title={progress.currentFile.title}>
                {progress.currentFile.title}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-amber-200/70">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                  {progress.currentFile.type.replace(/_/g, ' ')}
                </span>
                <span>↳ <em>{progress.currentFile.step}</em></span>
                {progress.currentFile.chunkIndex && progress.currentFile.totalChunks && (
                  <span className="font-mono">{progress.currentFile.chunkIndex}/{progress.currentFile.totalChunks} chunks</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            <StatPill value={progress.succeeded} label="OK" color="emerald" />
            <StatPill value={progress.failed} label="Fallos" color="rose" />
            <StatPill value={progress.totalChunks} label="Chunks" color="violet" />
            <StatPill value={progress.totalNotified} label="Notif." color="sky" />
          </div>
        </div>

        {/* Live log */}
        <div className="flex-1 overflow-y-auto px-6 py-3 bg-slate-950/60 font-mono">
          <div className="text-[10px] font-bold text-amber-300/60 uppercase tracking-wide mb-2 font-sans">
            Pipeline en tiempo real
          </div>
          {progress.liveLog.length === 0 ? (
            <div className="text-xs text-amber-300/40 italic py-3 font-sans">Esperando primeros eventos…</div>
          ) : (
            <ul className="space-y-0.5">
              {progress.liveLog.slice().reverse().map((l, i) => (
                <li key={i} className={`text-[11px] py-0.5 ${
                  l.type === 'file-start' ? 'text-amber-300 font-bold mt-2' :
                  l.type === 'file-complete' ? 'text-emerald-300' :
                  l.type === 'file-failed' ? 'text-rose-300' :
                  'text-amber-100/60'
                }`}>
                  <span className="whitespace-pre">{l.text}</span>
                  {l.detail && <span className="ml-2 text-amber-300/50">[{l.detail}]</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Final */}
        {isFinished && progress.result && (
          <div className="p-4 border-t border-amber-500/20 bg-emerald-500/5">
            <div className="text-xs font-bold text-emerald-300 mb-2">
              ✓ {progress.result.totalSucceeded || progress.succeeded} normas incorporadas al corpus · {progress.result.totalChunks || progress.totalChunks} chunks · {formatDur(progress.result.totalDurationMs)}
            </div>
            <button
              onClick={onDownload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition shadow-md"
            >
              <Download className="w-4 h-4" />
              Descargar informe HTML del run
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {hasError && (
          <div className="p-4 border-t border-rose-500/20 bg-rose-500/10">
            <div className="text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <strong>Error:</strong> {progress.error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ value, label, color }: { value: number; label: string; color: 'emerald' | 'rose' | 'violet' | 'sky' }) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-300',
    rose: 'bg-rose-500/20 text-rose-300',
    violet: 'bg-violet-500/20 text-violet-300',
    sky: 'bg-sky-500/20 text-sky-300',
  };
  return (
    <div className={`rounded-lg p-2 ${map[color]}`}>
      <div className="text-lg font-black tabular-nums">{value.toLocaleString('es-EC')}</div>
      <div className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}
