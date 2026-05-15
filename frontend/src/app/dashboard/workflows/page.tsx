'use client';

/**
 * Workflow Studio — página de usuario.
 *
 * El abogado elige una plantilla de flujo de trabajo, escribe su entrada,
 * y el motor ejecuta los pasos encadenados (búsqueda en corpus → generación)
 * mostrando el progreso en vivo vía SSE. El resultado final se puede copiar.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Workflow, Loader2, Play, CheckCircle2, XCircle, Clock, Copy, Check,
  ChevronRight, AlertTriangle, History, ArrowLeft, Sparkles,
  ShieldCheck, FileSearch, ExternalLink,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface TemplateStep { id: string; name: string; type: string; }
interface Template {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  inputLabel: string;
  inputPlaceholder: string;
  steps: TemplateStep[];
}
interface RunRow {
  id: string;
  templateKey: string;
  templateName: string;
  status: string;
  userInput: string | null;
  durationMs: number;
  startedAt: string;
}
interface StepProgress {
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  durationMs?: number;
  preview?: string;
  error?: string;
}
interface VerifiedNorm {
  title: string;
  hierarchy: string | null;
  docId: string;
  pdfUrl: string | null;
}
interface ArticleRef { raw: string; }
interface Verification {
  normsVerified: VerifiedNorm[];
  articleRefs: ArticleRef[];
  summary: {
    normsFound: number;
    articleRefsCount: number;
    confidence: 'alta' | 'media' | 'baja';
    message: string;
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'hace segundos';
  if (ms < 3_600_000) return `hace ${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.round(ms / 3_600_000)} h`;
  return new Date(iso).toLocaleDateString('es-EC');
}

const CATEGORY_COLOR: Record<string, string> = {
  'Investigación': 'bg-sky-100 text-sky-700',
  'Redacción': 'bg-violet-100 text-violet-700',
  'Litigación': 'bg-amber-100 text-amber-700',
};

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function WorkflowsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Template | null>(null);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepProgress[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [runError, setRunError] = useState('');
  const [copied, setCopied] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [verifying, setVerifying] = useState(false);

  // ─── LOAD ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [tplR, runsR] = await Promise.all([
        api.get<{ templates: Template[] }>('/workflows/templates'),
        api.get<{ runs: RunRow[] }>('/workflows/runs', { params: { limit: 15 } }),
      ]);
      setTemplates(tplR.data.templates ?? []);
      setRuns(runsR.data.runs ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar Workflow Studio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── SELECT TEMPLATE ──────────────────────────────────────────────────
  const selectTemplate = (t: Template) => {
    setSelected(t);
    setInput('');
    setSteps([]);
    setResult(null);
    setRunError('');
    setVerification(null);
  };

  const backToCatalog = () => {
    if (running) return;
    setSelected(null);
    setSteps([]);
    setResult(null);
    setRunError('');
    setVerification(null);
    loadAll();
  };

  // Verifica las fuentes del resultado contra el corpus jurídico.
  const verifyResult = async (text: string) => {
    setVerifying(true);
    try {
      const r = await api.post<Verification>('/citations/verify', { text });
      setVerification(r.data);
    } catch {
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  };

  // ─── RUN WORKFLOW (SSE) ───────────────────────────────────────────────
  const runWorkflow = async () => {
    if (!selected || input.trim().length < 5) return;
    setRunning(true);
    setRunError('');
    setResult(null);
    setVerification(null);
    setSteps(selected.steps.map((s) => ({ stepId: s.id, stepName: s.name, status: 'pending' })));

    try {
      const { getAuthToken } = await import('@/lib/get-auth-token');
      const token = await getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://poweria-legal-api.onrender.com';

      const r = await fetch(`${API_URL}/api/v1/workflows/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ templateKey: selected.key, input: input.trim() }),
      });
      if (!r.ok || !r.body) {
        const txt = await r.text().catch(() => '');
        throw new Error(txt || `HTTP ${r.status}`);
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

          if (event === 'step-start') {
            setSteps((prev) => prev.map((s, i) =>
              i === payload.stepIndex ? { ...s, status: 'running' } : s));
          } else if (event === 'step-done') {
            setSteps((prev) => prev.map((s, i) =>
              i === payload.stepIndex
                ? { ...s, status: 'completed', durationMs: payload.durationMs, preview: payload.outputPreview }
                : s));
          } else if (event === 'step-error') {
            setSteps((prev) => prev.map((s, i) =>
              i === payload.stepIndex ? { ...s, status: 'failed', error: payload.error } : s));
          } else if (event === 'run-complete') {
            if (payload.status === 'completed') {
              const finalText = payload.result || '';
              setResult(finalText);
              // Verificar las fuentes citadas contra el corpus.
              if (finalText.length > 10) void verifyResult(finalText);
            } else {
              setRunError('El workflow no se completó. Revisá los pasos.');
            }
          } else if (event === 'run-error') {
            setRunError(payload.error || 'Error ejecutando el workflow');
          }
        }
      }
    } catch (e: any) {
      setRunError(e?.message || 'Error ejecutando el workflow');
    } finally {
      setRunning(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
          <Workflow className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Studio</h1>
          <p className="text-sm text-gray-500">
            Flujos de trabajo jurídicos que encadenan búsqueda en el corpus y generación con IA.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ─── CATÁLOGO ──────────────────────────────────────────── */}
      {!selected && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => selectTemplate(t)}
                className="text-left p-5 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-3xl">{t.icon}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[t.category] || 'bg-gray-100 text-gray-600'}`}>
                    {t.category}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-700">{t.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{t.description}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {t.steps.map((s, i) => (
                    <span key={s.id} className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                      <span className="px-1.5 py-0.5 rounded bg-gray-100">{s.name}</span>
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Historial */}
          {runs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-500" />
                <h2 className="font-semibold text-gray-900 text-sm">Ejecuciones recientes</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {runs.map((run) => (
                  <div key={run.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {run.status === 'completed'
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          : run.status === 'failed'
                          ? <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                          : <Loader2 className="h-4 w-4 text-indigo-600 animate-spin flex-shrink-0" />}
                        <span className="font-medium text-gray-900 truncate">{run.templateName}</span>
                      </div>
                      {run.userInput && (
                        <p className="text-xs text-gray-500 truncate mt-0.5 ml-6">{run.userInput}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDuration(run.durationMs)} · {formatRelative(run.startedAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── EJECUCIÓN ─────────────────────────────────────────── */}
      {selected && (
        <div className="space-y-5">
          <button
            onClick={backToCatalog}
            disabled={running}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al catálogo
          </button>

          {/* Card del workflow */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">{selected.icon}</div>
              <div>
                <h2 className="font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.description}</p>
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {selected.inputLabel}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={running}
              rows={4}
              placeholder={selected.inputPlaceholder}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-50"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">{input.trim().length} caracteres</span>
              <button
                onClick={runWorkflow}
                disabled={running || input.trim().length < 5}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? 'Ejecutando…' : 'Ejecutar workflow'}
              </button>
            </div>
          </div>

          {/* Progreso de pasos */}
          {steps.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Progreso</h3>
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={s.stepId} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {s.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                      {s.status === 'running' && <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />}
                      {s.status === 'failed' && <XCircle className="h-5 w-5 text-rose-600" />}
                      {s.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-gray-200" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          s.status === 'pending' ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          Paso {i + 1}: {s.stepName}
                        </span>
                        {s.durationMs !== undefined && (
                          <span className="text-[10px] text-gray-400">{formatDuration(s.durationMs)}</span>
                        )}
                      </div>
                      {s.preview && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.preview}</p>
                      )}
                      {s.error && (
                        <p className="text-xs text-rose-600 mt-0.5">{s.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {runError && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              {runError}
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-900 text-sm">Resultado</h3>
                </div>
                <button
                  onClick={copyResult}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                {result}
              </div>
            </div>
          )}

          {/* Verificación de fuentes contra el corpus */}
          {result && verifying && (
            <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando las fuentes citadas contra el corpus jurídico…
            </div>
          )}
          {result && verification && (
            <CitationVerificationPanel v={verification} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── PANEL DE VERIFICACIÓN DE FUENTES ─────────────────────────────────────
function CitationVerificationPanel({ v }: { v: Verification }) {
  const conf = v.summary.confidence;
  const confMeta = {
    alta:  { label: 'Confianza alta',  cls: 'bg-emerald-100 text-emerald-800', bar: 'border-emerald-200' },
    media: { label: 'Confianza media', cls: 'bg-amber-100 text-amber-800',     bar: 'border-amber-200' },
    baja:  { label: 'Confianza baja',  cls: 'bg-gray-100 text-gray-700',       bar: 'border-gray-200' },
  }[conf];

  return (
    <div className={`bg-white rounded-xl border ${confMeta.bar} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Verificación de fuentes</h3>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confMeta.cls}`}>
          {confMeta.label}
        </span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-600">{v.summary.message}</p>

        {/* Normas confirmadas en el corpus */}
        {v.normsVerified.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Normas confirmadas en el corpus ({v.normsVerified.length})
            </h4>
            <div className="space-y-1.5">
              {v.normsVerified.map((n) => (
                <div key={n.docId} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{n.title}</div>
                    {n.hierarchy && (
                      <div className="text-[11px] text-gray-500">{n.hierarchy.replace(/_/g, ' ')}</div>
                    )}
                  </div>
                  {n.pdfUrl && (
                    <a
                      href={n.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 flex-shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                      PDF oficial
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referencias a artículos — requieren contraste manual */}
        {v.articleRefs.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Referencias a artículos ({v.articleRefs.length}) — verificá contra la norma
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {v.articleRefs.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800"
                >
                  <FileSearch className="h-3 w-3" />
                  {a.raw}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
          La verificación contrasta las normas citadas con el corpus de Poweria Legal.
          No reemplaza tu revisión profesional: confirmá siempre el texto vigente en la fuente oficial.
        </p>
      </div>
    </div>
  );
}
