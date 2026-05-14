'use client';

/**
 * PostUploadAnalysisDialog — Análisis IA automático tras subir un documento.
 *
 * Se abre apenas el upload termina y dispara
 *   POST /cases/:caseId/documents/:docId/post-upload-analysis  (SSE)
 *
 * El stream produce 5 tipos de eventos:
 *   - started     { caseId, docId, model, at }
 *   - token       { delta }                    (texto progresivo del modelo)
 *   - structured  { ... }                      (objeto JSON parseado)
 *   - done        { analysisDocumentId, sourceDocumentId }
 *   - error       { error }
 *
 * El JSON estructurado tiene secciones que se renderizan como bloques
 * accionables: contribución del doc, acciones urgentes, plan de trabajo,
 * tareas a crear, documentos a generar, riesgos, normas aplicables y gaps.
 *
 * El análisis queda persistido como Document kind='ai_analysis' con
 * ai_generation_meta.generator='post_upload_analysis' (lo hace el backend).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, X, FileText, Loader2, AlertCircle, AlertTriangle, Check,
  Target, ListChecks, FilePlus, RefreshCw, ShieldAlert, BookMarked,
  Clock, ChevronDown, ChevronRight, Copy, ExternalLink,
} from 'lucide-react';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UrgentAction {
  action: string;
  deadline?: string;
  rationale?: string;
  priority?: 'high' | 'medium' | 'low';
}
interface ActionStep {
  step?: number;
  title: string;
  detail?: string;
  owner?: string;
}
interface TaskToCreate {
  title: string;
  dueInDays?: number | null;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
}
interface DocToGenerate {
  docType: string;
  purpose?: string;
  deadlineDays?: number | null;
  addressee?: string;
}
interface RiskFlag {
  risk: string;
  severity?: 'high' | 'medium' | 'low';
  mitigation?: string;
}
interface ApplicableNorm {
  norm: string;
  relevance?: string;
}

interface StructuredResult {
  headline?: string;
  contribution?: string;
  urgentActions?: UrgentAction[];
  actionPlan?: ActionStep[];
  tasksToCreate?: TaskToCreate[];
  documentsToGenerate?: DocToGenerate[];
  thingsToUpdate?: string[];
  riskFlags?: RiskFlag[];
  applicableNorms?: ApplicableNorm[];
  gaps?: string[];
  confidence?: number;
}

interface Props {
  caseId: string;
  documentId: string | null;
  documentTitle: string;
  open: boolean;
  onClose: () => void;
  onCreateTask?: (task: TaskToCreate) => void;
  onGenerateDoc?: (doc: DocToGenerate) => void;
  onAnalysisSaved?: (analysisDocumentId: string) => void;
}

const priorityStyle: Record<string, { bg: string; text: string; ring: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
};

export default function PostUploadAnalysisDialog({
  caseId, documentId, documentTitle, open, onClose,
  onCreateTask, onGenerateDoc, onAnalysisSaved,
}: Props) {
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState('');
  const [structured, setStructured] = useState<StructuredResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisDocId, setAnalysisDocId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setPartial('');
    setStructured(null);
    setError(null);
    setAnalysisDocId(null);
    setCopied(false);
  };

  useEffect(() => {
    if (!open || !documentId) return;
    let cancelled = false;
    const run = async () => {
      reset();
      setStreaming(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const token = await getAuthToken();
        const r = await fetch(
          `${API_URL}/api/v1/cases/${caseId}/documents/${documentId}/post-upload-analysis`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: '{}',
            signal: ac.signal,
          },
        );
        if (!r.ok || !r.body) {
          const txt = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
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
            const evLine = chunk.split('\n').find((l) => l.startsWith('event:'));
            const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const event = evLine ? evLine.slice(6).trim() : 'message';
            let payload: any = null;
            try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { /* ignore */ }
            if (cancelled) return;
            if (event === 'token' && payload?.delta) {
              setPartial((p) => p + payload.delta);
            } else if (event === 'structured' && payload) {
              setStructured(payload as StructuredResult);
            } else if (event === 'done') {
              if (payload?.analysisDocumentId) {
                setAnalysisDocId(payload.analysisDocumentId);
                onAnalysisSaved?.(payload.analysisDocumentId);
              }
              setStreaming(false);
            } else if (event === 'error') {
              setError(payload?.error || 'AI failed');
              setStreaming(false);
            }
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(e?.message || 'No se pudo analizar');
        }
      } finally {
        if (!cancelled) setStreaming(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId, caseId]);

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const copyAll = async () => {
    if (!structured) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(structured, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const toggle = (k: string) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

  const hasAnyContent = useMemo(() => {
    return !!(structured?.headline || structured?.contribution
      || (structured?.urgentActions?.length ?? 0) > 0
      || (structured?.actionPlan?.length ?? 0) > 0);
  }, [structured]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-3xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]">
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" />

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-purple-700 grid place-items-center text-white shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Análisis IA del documento
                {streaming && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5 truncate">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{documentTitle}</span>
              </p>
              {structured?.confidence != null && (
                <div className="mt-1.5 text-xs text-gray-500">
                  Confianza del modelo: <span className="font-bold text-gray-700">{Math.round((structured.confidence || 0) * 100)}%</span>
                </div>
              )}
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {structured?.headline && (
            <div className="mt-3 p-3 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50">
              <div className="text-[10px] uppercase tracking-wider font-bold text-purple-600 mb-1">Conclusión clave</div>
              <div className="text-sm font-bold text-gray-900 leading-snug">{structured.headline}</div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 bg-gradient-to-b from-white to-gray-50/60">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">{error}</div>
            </div>
          )}

          {/* Mientras streamea y todavía no hay JSON, mostramos texto crudo */}
          {streaming && !hasAnyContent && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-purple-600 mb-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analizando con Claude Opus 4.7…
              </div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">{partial.slice(-2500)}</pre>
            </div>
          )}

          {structured?.contribution && (
            <Section
              k="contribution"
              icon={<FileText className="w-4 h-4" />}
              title="Qué aporta al expediente"
              color="indigo"
              collapsed={collapsed.contribution}
              onToggle={toggle}
            >
              <p className="text-sm text-gray-800 leading-relaxed">{structured.contribution}</p>
            </Section>
          )}

          {(structured?.urgentActions?.length ?? 0) > 0 && (
            <Section
              k="urgent"
              icon={<AlertTriangle className="w-4 h-4" />}
              title="Acciones urgentes"
              badge={`${structured?.urgentActions?.length}`}
              color="red"
              collapsed={collapsed.urgent}
              onToggle={toggle}
            >
              <ul className="space-y-2">
                {structured?.urgentActions?.map((a, i) => {
                  const p = priorityStyle[a.priority || 'medium'];
                  return (
                    <li key={i} className={`p-3 rounded-lg border ${p.bg} ${p.text} ring-1 ${p.ring}`}>
                      <div className="font-semibold text-sm">{a.action}</div>
                      {a.deadline && (
                        <div className="text-xs mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Plazo: <strong>{a.deadline}</strong>
                        </div>
                      )}
                      {a.rationale && <div className="text-xs mt-1 opacity-90">{a.rationale}</div>}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {(structured?.actionPlan?.length ?? 0) > 0 && (
            <Section
              k="plan"
              icon={<Target className="w-4 h-4" />}
              title="Plan de trabajo"
              badge={`${structured?.actionPlan?.length}`}
              color="purple"
              collapsed={collapsed.plan}
              onToggle={toggle}
            >
              <ol className="space-y-2">
                {structured?.actionPlan?.map((s, i) => (
                  <li key={i} className="flex gap-3 p-2.5 rounded-lg bg-white border border-purple-100">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-purple-100 text-purple-700 grid place-items-center text-xs font-bold">
                      {s.step ?? i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                      {s.detail && <div className="text-xs text-gray-600 mt-0.5">{s.detail}</div>}
                      {s.owner && (
                        <div className="text-[10px] uppercase tracking-wider mt-1 inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                          {s.owner}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {(structured?.tasksToCreate?.length ?? 0) > 0 && (
            <Section
              k="tasks"
              icon={<ListChecks className="w-4 h-4" />}
              title="Tareas a crear"
              badge={`${structured?.tasksToCreate?.length}`}
              color="emerald"
              collapsed={collapsed.tasks}
              onToggle={toggle}
            >
              <ul className="space-y-2">
                {structured?.tasksToCreate?.map((t, i) => {
                  const p = priorityStyle[t.priority || 'medium'];
                  return (
                    <li key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-emerald-100">
                      <div className={`w-7 h-7 shrink-0 rounded-md ${p.bg} ${p.text} grid place-items-center`}>
                        <ListChecks className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{t.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600">
                          {t.dueInDays != null && (
                            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {t.dueInDays}d</span>
                          )}
                          {t.category && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100">{t.category}</span>
                          )}
                          <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${p.bg} ${p.text}`}>
                            {(t.priority || 'medium').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {onCreateTask && (
                        <button
                          onClick={() => onCreateTask(t)}
                          className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
                          title="Crear esta tarea"
                        >
                          Crear
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {(structured?.documentsToGenerate?.length ?? 0) > 0 && (
            <Section
              k="docsGen"
              icon={<FilePlus className="w-4 h-4" />}
              title="Documentos a generar"
              badge={`${structured?.documentsToGenerate?.length}`}
              color="cyan"
              collapsed={collapsed.docsGen}
              onToggle={toggle}
            >
              <ul className="space-y-2">
                {structured?.documentsToGenerate?.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-cyan-100">
                    <div className="w-7 h-7 shrink-0 rounded-md bg-cyan-50 text-cyan-700 grid place-items-center">
                      <FilePlus className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{d.docType}</div>
                      {d.purpose && <div className="text-xs text-gray-600 mt-0.5">{d.purpose}</div>}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600">
                        {d.addressee && <span>📍 {d.addressee}</span>}
                        {d.deadlineDays != null && (
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {d.deadlineDays}d</span>
                        )}
                      </div>
                    </div>
                    {onGenerateDoc && (
                      <button
                        onClick={() => onGenerateDoc(d)}
                        className="text-xs px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition"
                        title="Abrir generador con este preset"
                      >
                        Generar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(structured?.thingsToUpdate?.length ?? 0) > 0 && (
            <Section
              k="update"
              icon={<RefreshCw className="w-4 h-4" />}
              title="A actualizar ya"
              badge={`${structured?.thingsToUpdate?.length}`}
              color="amber"
              collapsed={collapsed.update}
              onToggle={toggle}
            >
              <ul className="space-y-1.5">
                {structured?.thingsToUpdate?.map((u, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="text-amber-500 mt-0.5">●</span>
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(structured?.riskFlags?.length ?? 0) > 0 && (
            <Section
              k="risks"
              icon={<ShieldAlert className="w-4 h-4" />}
              title="Riesgos detectados"
              badge={`${structured?.riskFlags?.length}`}
              color="rose"
              collapsed={collapsed.risks}
              onToggle={toggle}
            >
              <ul className="space-y-2">
                {structured?.riskFlags?.map((r, i) => {
                  const p = priorityStyle[r.severity || 'medium'];
                  return (
                    <li key={i} className={`p-2.5 rounded-lg border ${p.bg} ${p.text} ring-1 ${p.ring}`}>
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {r.risk}
                      </div>
                      {r.mitigation && (
                        <div className="text-xs mt-1 opacity-90"><strong>Mitigación:</strong> {r.mitigation}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {(structured?.applicableNorms?.length ?? 0) > 0 && (
            <Section
              k="norms"
              icon={<BookMarked className="w-4 h-4" />}
              title="Normas aplicables"
              badge={`${structured?.applicableNorms?.length}`}
              color="slate"
              collapsed={collapsed.norms}
              onToggle={toggle}
            >
              <ul className="space-y-1.5">
                {structured?.applicableNorms?.map((n, i) => (
                  <li key={i} className="text-sm text-gray-800">
                    <span className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{n.norm}</span>
                    {n.relevance && <span className="ml-2 text-gray-600 text-xs">— {n.relevance}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(structured?.gaps?.length ?? 0) > 0 && (
            <Section
              k="gaps"
              icon={<AlertCircle className="w-4 h-4" />}
              title="Información faltante"
              badge={`${structured?.gaps?.length}`}
              color="gray"
              collapsed={collapsed.gaps}
              onToggle={toggle}
            >
              <ul className="space-y-1.5">
                {structured?.gaps?.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 mt-0.5">○</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500">
            {analysisDocId ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check className="w-3.5 h-3.5" /> Guardado en el expediente
              </span>
            ) : streaming ? (
              'Analizando…'
            ) : (
              ''
            )}
          </div>
          <div className="flex items-center gap-2">
            {structured && (
              <button
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar JSON'}
              </button>
            )}
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 shadow-sm transition"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Helpers ----------------------------------------------------------

interface SectionProps {
  k: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  color: 'indigo' | 'red' | 'purple' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'gray';
  collapsed?: boolean;
  onToggle: (k: string) => void;
  children: React.ReactNode;
}

const colorRing: Record<SectionProps['color'], { ring: string; text: string; pill: string }> = {
  indigo: { ring: 'border-indigo-200', text: 'text-indigo-700', pill: 'bg-indigo-100 text-indigo-700' },
  red: { ring: 'border-red-200', text: 'text-red-700', pill: 'bg-red-100 text-red-700' },
  purple: { ring: 'border-purple-200', text: 'text-purple-700', pill: 'bg-purple-100 text-purple-700' },
  emerald: { ring: 'border-emerald-200', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' },
  cyan: { ring: 'border-cyan-200', text: 'text-cyan-700', pill: 'bg-cyan-100 text-cyan-700' },
  amber: { ring: 'border-amber-200', text: 'text-amber-700', pill: 'bg-amber-100 text-amber-700' },
  rose: { ring: 'border-rose-200', text: 'text-rose-700', pill: 'bg-rose-100 text-rose-700' },
  slate: { ring: 'border-slate-200', text: 'text-slate-700', pill: 'bg-slate-100 text-slate-700' },
  gray: { ring: 'border-gray-200', text: 'text-gray-700', pill: 'bg-gray-100 text-gray-700' },
};

function Section({ k, icon, title, badge, color, collapsed, onToggle, children }: SectionProps) {
  const c = colorRing[color];
  return (
    <div className={`rounded-xl border-2 ${c.ring} bg-white overflow-hidden`}>
      <button
        onClick={() => onToggle(k)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 transition"
      >
        <div className={`flex items-center gap-2 ${c.text}`}>
          {icon}
          <span className="text-sm font-bold">{title}</span>
          {badge && (
            <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold rounded-full ${c.pill}`}>
              {badge}
            </span>
          )}
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {!collapsed && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}
