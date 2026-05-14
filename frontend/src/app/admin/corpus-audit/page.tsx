'use client';

/**
 * Admin · Corpus Audit
 *
 * Disparador de la auditoría completa del corpus contra el catálogo
 * curado de leyes nacionales vigentes de Ecuador. Modal SSE con
 * progress live + descarga del informe HTML al finalizar.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, RefreshCw, ScrollText, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, Activity, Brain, TrendingUp, BookOpen, Download,
  PlayCircle, ChevronRight, FileText, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';

interface AuditRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  triggered_by: string;
  status: string;
  total_expected: number;
  total_present: number;
  total_missing: number;
  total_ingested_ok: number;
  total_ingested_fail: number;
  total_chunks_added: number;
  catalog_version: string | null;
  html_report_path: string | null;
}

interface AuditProgress {
  pct: number;
  label: string;
  phase: string;
  currentItem?: string;
  currentIndex?: number;
  total?: number;
  presentCount: number;
  ingestedOkCount: number;
  ingestedFailCount: number;
  missingCount: number;
  unreachableCount: number;
  liveLog: Array<{
    ts: number;
    type: 'present' | 'ingested' | 'failed' | 'searching' | 'phase';
    name: string;
    detail?: string;
  }>;
  finished?: boolean;
  error?: string;
  result?: any;
  runId?: string;
}

export default function CorpusAuditPage() {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ runs: AuditRun[] }>('/admin/corpus/audit-runs');
      setRuns(r.data.runs || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadRuns(); }, []);

  const startAudit = async () => {
    setRunning(true);
    setProgress({
      pct: 0, label: 'Conectando…', phase: 'connecting',
      presentCount: 0, ingestedOkCount: 0, ingestedFailCount: 0,
      missingCount: 0, unreachableCount: 0, liveLog: [],
    });
    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/corpus/audit-full`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirm: true, dryRun }),
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
          try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }

          setProgress((p) => p ? updateProgress(p, event, payload) : p);
        }
      }
    } catch (e: any) {
      setProgress((p) => p ? { ...p, error: e?.message || 'Error desconocido' } : p);
    } finally {
      setRunning(false);
      await loadRuns();
    }
  };

  const downloadReport = (runId: string) => {
    void (async () => {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API_URL}/api/v1/admin/corpus/audit-report/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        alert('No se pudo descargar el reporte');
        return;
      }
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = r.headers.get('content-disposition') || '';
      const fnMatch = disposition.match(/filename="(.+?)"/);
      a.download = fnMatch ? fnMatch[1] : `auditoria-corpus-${runId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    })();
  };

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Auditoría de Corpus Normativo</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Compara el corpus interno contra el catálogo curado de leyes nacionales vigentes
            del Ecuador. Para las normas faltantes intenta buscarlas en el sitio del Registro
            Oficial y ejecuta el pipeline completo de ingesta (chunks + embeddings + broadcast).
          </p>
        </div>
        <Link href="/admin/registro-oficial" className="text-xs font-bold text-violet-700 hover:underline">
          ← Volver al panel del RO
        </Link>
      </div>

      {/* Disparador */}
      <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center shadow-lg shrink-0">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-slate-900">Disparar auditoría completa</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Itera todo el catálogo (~55 normas core: Constitución, Códigos Orgánicos, Leyes
              Orgánicas/Ordinarias, Tratados Internacionales). Las faltantes se buscan automáticamente
              en el Registro Oficial. Tiempo estimado: 5-30 min según cuántas haya que descargar.
            </p>
            <label className="inline-flex items-center gap-2 mt-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              <span><strong>Modo dry-run</strong> — solo reporta diff, no descarga ni ingresa nada</span>
            </label>
          </div>
          <button
            onClick={startAudit}
            disabled={running}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
            {running ? 'Auditando…' : 'Iniciar auditoría'}
          </button>
        </div>
      </div>

      {/* Historial de runs */}
      <div>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">
          Historial de auditorías
        </h2>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">Aún no se han ejecutado auditorías</p>
            <p className="text-xs mt-1">Dispara la primera con el botón de arriba.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => <RunRow key={r.id} run={r} onDownload={() => downloadReport(r.id)} />)}
          </div>
        )}
      </div>

      {/* Modal SSE */}
      {progress && (
        <AuditProgressModal
          progress={progress}
          onClose={() => { if (!running) setProgress(null); }}
          running={running}
          onDownload={() => progress.runId && downloadReport(progress.runId)}
        />
      )}
    </div>
  );
}

function updateProgress(p: AuditProgress, event: string, payload: any): AuditProgress {
  switch (event) {
    case 'connected':
      return { ...p, total: payload.totalExpected, runId: payload.runId, pct: 1, phase: 'connected', label: `Conectado — ${payload.totalExpected} normas a verificar` };
    case 'phase':
      return {
        ...p,
        pct: payload.pct ?? p.pct,
        label: payload.label,
        phase: payload.phase,
        liveLog: [...p.liveLog.slice(-19), { ts: Date.now(), type: 'phase', name: payload.label }],
      };
    case 'item-start':
      return {
        ...p,
        pct: payload.pct ?? p.pct,
        currentItem: payload.canonicalName,
        currentIndex: payload.index,
        total: payload.total,
        label: `Verificando ${payload.index}/${payload.total}: ${payload.canonicalName}`,
        phase: 'item-start',
      };
    case 'item-present':
      return {
        ...p,
        presentCount: p.presentCount + 1,
        liveLog: [...p.liveLog.slice(-19), { ts: Date.now(), type: 'present', name: payload.canonicalName, detail: `match ${Math.round(payload.similarity * 100)}%` }],
      };
    case 'item-searching':
      return {
        ...p,
        liveLog: [...p.liveLog.slice(-19), { ts: Date.now(), type: 'searching', name: payload.canonicalName, detail: 'buscando en RO…' }],
      };
    case 'item-ingested':
      return {
        ...p,
        ingestedOkCount: p.ingestedOkCount + 1,
        liveLog: [...p.liveLog.slice(-19), { ts: Date.now(), type: 'ingested', name: payload.canonicalName, detail: `${payload.chunksCreated} chunks · ${(payload.durationMs / 1000).toFixed(1)}s` }],
      };
    case 'item-failed':
      return {
        ...p,
        ingestedFailCount: p.ingestedFailCount + 1,
        liveLog: [...p.liveLog.slice(-19), { ts: Date.now(), type: 'failed', name: payload.canonicalName, detail: (payload.error || '').slice(0, 80) }],
      };
    case 'item-missing':
      return {
        ...p,
        missingCount: p.missingCount + 1,
      };
    case 'completed':
    case 'done':
      return { ...p, pct: 100, label: '✓ Auditoría completada', phase: 'done', finished: true, result: payload };
    case 'error':
      return { ...p, error: payload.error };
    default:
      return p;
  }
}

function RunRow({ run, onDownload }: { run: AuditRun; onDownload: () => void }) {
  const dt = new Date(run.started_at).toLocaleString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const coverage = run.total_expected > 0
    ? Math.round(((run.total_present + run.total_ingested_ok) / run.total_expected) * 100)
    : 0;
  const isDone = run.status === 'completed';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${
        isDone ? 'bg-emerald-100 text-emerald-700' : run.status === 'running' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
      }`}>
        {isDone ? <CheckCircle2 className="w-5 h-5" /> : run.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{dt}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
            {run.catalog_version || 'sin versión'}
          </span>
          <span className="text-[10px] text-slate-500">por {run.triggered_by}</span>
        </div>
        <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span>📚 <strong>{run.total_expected}</strong> esperadas</span>
          <span className="text-emerald-700">✓ {run.total_present} presentes</span>
          <span className="text-amber-700">+ {run.total_ingested_ok} ingestadas</span>
          {run.total_ingested_fail > 0 && <span className="text-rose-700">✗ {run.total_ingested_fail} fallaron</span>}
          <span>📦 {run.total_chunks_added.toLocaleString('es-EC')} chunks añadidos</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="text-2xl font-black text-violet-700">{coverage}%</div>
        {isDone && run.html_report_path && (
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition"
          >
            <Download className="w-3 h-3" />
            HTML
          </button>
        )}
      </div>
    </div>
  );
}

function AuditProgressModal({ progress, onClose, running, onDownload }: {
  progress: AuditProgress;
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
      <div className="w-full max-w-3xl bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-950 rounded-2xl shadow-2xl border border-violet-500/30 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

        <div className="px-6 pt-5 pb-3 border-b border-violet-500/20">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0 ${
              isFinished && !hasError ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              hasError ? 'bg-gradient-to-br from-rose-500 to-red-600' :
              'bg-gradient-to-br from-violet-500 to-fuchsia-600 animate-pulse'
            }`}>
              {isFinished && !hasError ? <CheckCircle2 className="w-6 h-6" /> :
               hasError ? <AlertTriangle className="w-6 h-6" /> :
               <Brain className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Auditoría de Corpus Normativo
                {!isFinished && !hasError && <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
              </h2>
              <p className="text-xs text-violet-300/80 mt-0.5 truncate">{progress.label}</p>
            </div>
            {canClose && (
              <button onClick={onClose} className="shrink-0 text-violet-300/60 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-4xl font-black bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                {Math.round(progress.pct)}
              </span>
              <span className="text-xl font-black text-violet-300/50">%</span>
              {progress.currentIndex && progress.total && (
                <span className="ml-auto text-xs text-violet-300/70">{progress.currentIndex} / {progress.total}</span>
              )}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>

          {/* Stats live */}
          <div className="grid grid-cols-5 gap-2 mt-3 text-center">
            <StatPill icon={<CheckCircle2 className="w-3 h-3" />} value={progress.presentCount} label="Presentes" color="emerald" />
            <StatPill icon={<Sparkles className="w-3 h-3" />} value={progress.ingestedOkCount} label="Ingestadas" color="amber" />
            <StatPill icon={<XCircle className="w-3 h-3" />} value={progress.ingestedFailCount} label="Fallaron" color="rose" />
            <StatPill icon={<Clock className="w-3 h-3" />} value={progress.missingCount - progress.ingestedOkCount - progress.ingestedFailCount} label="Pendientes" color="slate" />
            <StatPill icon={<TrendingUp className="w-3 h-3" />} value={progress.result?.totalChunksAdded || 0} label="Chunks" color="violet" />
          </div>
        </div>

        {/* Live log */}
        <div className="flex-1 overflow-y-auto px-6 py-3 bg-slate-950/50">
          <div className="text-[10px] font-bold text-violet-300/60 uppercase tracking-wide mb-2">
            Actividad en tiempo real
          </div>
          {progress.liveLog.length === 0 ? (
            <div className="text-xs text-violet-300/40 italic py-4">
              Esperando primeros eventos del backend…
            </div>
          ) : (
            <ul className="space-y-1">
              {progress.liveLog.slice().reverse().map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] py-1 border-b border-violet-500/10">
                  <span className={`shrink-0 mt-0.5 ${
                    l.type === 'present' ? 'text-emerald-400' :
                    l.type === 'ingested' ? 'text-amber-400' :
                    l.type === 'failed' ? 'text-rose-400' :
                    l.type === 'searching' ? 'text-sky-400' :
                    'text-violet-400'
                  }`}>
                    {l.type === 'present' ? '✓' :
                     l.type === 'ingested' ? '+' :
                     l.type === 'failed' ? '✗' :
                     l.type === 'searching' ? '⟳' : '►'}
                  </span>
                  <span className="text-violet-100 flex-1 truncate" title={l.name}>{l.name}</span>
                  {l.detail && <span className="text-violet-300/60 shrink-0 text-[10px]">{l.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Final */}
        {isFinished && progress.result && (
          <div className="p-4 border-t border-violet-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-emerald-300">Auditoría completada</div>
              <div className="text-xs text-emerald-100/70">
                {progress.result.totalIngestedOk} ingestadas · {progress.result.totalChunksAdded} chunks · {((progress.result.durationMs || 0) / 1000).toFixed(0)}s
              </div>
            </div>
            <button
              onClick={onDownload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition shadow-md"
            >
              <Download className="w-4 h-4" />
              Descargar informe HTML
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

function StatPill({ icon, value, label, color }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
}) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-300',
    amber:   'bg-amber-500/20 text-amber-300',
    rose:    'bg-rose-500/20 text-rose-300',
    slate:   'bg-slate-500/20 text-slate-300',
    violet:  'bg-violet-500/20 text-violet-300',
  };
  return (
    <div className={`rounded-lg p-2 ${map[color]}`}>
      <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide opacity-70">
        {icon} {label}
      </div>
      <div className="text-lg font-black mt-0.5">{value}</div>
    </div>
  );
}
