'use client';

/**
 * LegalReferenceDialog — Dialog que se abre al hacer click en una card de
 * Referencias Legales. Llama POST /legal-reference/analyze que combina RAG
 * sobre el corpus legal vectorizado + análisis IA con Claude Opus 4.7.
 *
 * Muestra:
 *   - Texto literal del artículo (si se recuperó del corpus)
 *   - Análisis jurídico profundo (bien protegido, tipo, elementos, etc.)
 *   - Importancia para el caso actual
 *   - Penas / efectos
 *   - Requisitos para que aplique
 *   - Normas relacionadas (concordancias, excepciones)
 *   - Jurisprudencia clave
 *   - Estrategia de aplicación para este caso
 *   - Defensas comunes contra la norma
 *   - Red flags / errores comunes
 *   - Fuentes recuperadas del corpus (con scores)
 */

import { useEffect, useRef, useState } from 'react';
import {
  X, Scale, Loader2, AlertCircle, BookOpen, ListChecks, ShieldAlert, Target,
  Sparkles, FileText, Copy, Check, ChevronDown, ChevronRight, Gavel, Library,
  Link2, BookMarked, ShieldCheck,
} from 'lucide-react';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PenaltyOrEffect {
  type?: string;
  detail?: string;
}
interface RelatedNorm {
  norm: string;
  relation?: string;
}
interface Jurisprudence {
  reference: string;
  relevance?: string;
}

interface AnalysisResult {
  norm?: string;
  article?: string | null;
  literalText?: string | null;
  summary?: string;
  legalAnalysis?: string;
  importanceForCase?: string | null;
  penaltiesOrEffects?: PenaltyOrEffect[];
  requirements?: string[];
  relatedNorms?: RelatedNorm[];
  jurisprudence?: Jurisprudence[];
  strategyForCase?: string[];
  commonDefenses?: string[];
  redFlags?: string[];
  notes?: string | null;
}

interface SourceExcerpt {
  normTitle: string;
  excerpt: string;
  score: number;
}

interface Props {
  open: boolean;
  norm: string;
  article?: string | null;
  description?: string | null;
  caseId?: string | null;
  onClose: () => void;
}

export default function LegalReferenceDialog({
  open, norm, article, description, caseId, onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sources, setSources] = useState<SourceExcerpt[]>([]);
  const [model, setModel] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [tokensReceived, setTokensReceived] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAnalysis(null);
    setSources([]);
    setError(null);
    setModel('');
    setCopied(null);
    setProgressPct(0);
    setProgressLabel('');
    setTokensReceived(0);
  };

  useEffect(() => {
    if (!open || !norm) return;
    const ac = new AbortController();
    abortRef.current = ac;
    const run = async () => {
      reset();
      setLoading(true);
      try {
        const token = await getAuthToken();
        const r = await fetch(`${API_URL}/api/v1/legal-reference/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ norm, article, description, caseId }),
          signal: ac.signal,
        });
        if (!r.ok || !r.body) {
          const txt = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status}: ${txt.slice(0, 250)}`);
        }

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let tokens = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (ac.signal.aborted) return;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const lines = chunk.split('\n');
            const evLine = lines.find((l) => l.startsWith('event:'));
            const dataLine = lines.find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const event = evLine ? evLine.slice(6).trim() : 'message';
            let payload: any = null;
            try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { /* ignore */ }
            if (event === 'phase' && payload) {
              if (typeof payload.pct === 'number') setProgressPct(payload.pct);
              if (typeof payload.label === 'string') setProgressLabel(payload.label);
            } else if (event === 'token' && payload?.delta) {
              tokens += 1;
              setTokensReceived(tokens);
            } else if (event === 'structured' && payload) {
              setAnalysis(payload.analysis || null);
              setSources(Array.isArray(payload.sources) ? payload.sources : []);
              setModel(payload.model || '');
            } else if (event === 'done') {
              setProgressPct(100);
              setProgressLabel('Listo');
              setLoading(false);
            } else if (event === 'error') {
              setError(payload?.error || 'AI failed');
              setLoading(false);
            }
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(e?.message || 'No se pudo analizar la referencia');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, norm, article, caseId]);

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch { /* ignore */ }
  };

  const toggle = (k: string) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-3xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 grid place-items-center text-white shadow-md shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{norm}</h2>
                {article && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200">
                    {article}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
              )}
              {model && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500">
                  <Sparkles className="w-3 h-3" />
                  Análisis IA — {model}
                </div>
              )}
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 bg-gradient-to-b from-white to-gray-50/60">
          {loading && (
            <div className="p-5 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-700" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-indigo-900 truncate">
                    {progressLabel || 'Iniciando…'}
                  </div>
                  <div className="text-[11px] text-indigo-700/80">
                    Claude Opus 4.7
                    {tokensReceived > 0 && ` · ${tokensReceived} chunks recibidos`}
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-700 tabular-nums shrink-0">
                  {Math.max(0, Math.min(100, Math.round(progressPct)))}%
                </div>
              </div>
              {/* Barra de progreso */}
              <div className="relative w-full h-2.5 rounded-full bg-white border border-indigo-200 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${Math.max(2, Math.min(100, progressPct))}%` }}
                />
                {/* Pulse overlay para sensación de actividad */}
                <div
                  className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse rounded-full"
                  style={{
                    left: `${Math.max(0, Math.min(95, progressPct - 5))}%`,
                  }}
                />
              </div>
              {/* Steps mini timeline */}
              <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                {[
                  { label: 'Contexto', threshold: 10 },
                  { label: 'Embedding', threshold: 22 },
                  { label: 'RAG', threshold: 35 },
                  { label: 'Análisis IA', threshold: 60 },
                  { label: 'Estrategia', threshold: 88 },
                  { label: 'Listo', threshold: 100 },
                ].map((s, i, arr) => {
                  const reached = progressPct >= s.threshold;
                  const isCurrent = progressPct < s.threshold && (i === 0 || progressPct >= arr[i - 1].threshold);
                  return (
                    <div key={s.label} className="flex flex-col items-center flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full mb-1 transition-all ${
                        reached
                          ? 'bg-indigo-600 scale-110'
                          : isCurrent
                            ? 'bg-indigo-400 animate-pulse scale-125'
                            : 'bg-gray-300'
                      }`} />
                      <span className={`truncate ${
                        reached ? 'text-indigo-800' : isCurrent ? 'text-indigo-600' : 'text-gray-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">{error}</div>
            </div>
          )}

          {/* Texto literal */}
          {analysis?.literalText && (
            <Section
              k="literal"
              icon={<BookOpen className="w-4 h-4" />}
              title="Texto literal del artículo"
              color="indigo"
              collapsed={collapsed.literal}
              onToggle={toggle}
              rightAction={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void copy('literal', analysis.literalText!);
                  }}
                  className={`p-1 rounded-md transition ${
                    copied === 'literal'
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-gray-400 hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
                  title={copied === 'literal' ? 'Copiado' : 'Copiar texto'}
                  aria-label="Copiar texto literal"
                >
                  {copied === 'literal' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              }
            >
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-serif bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">
                {analysis.literalText}
              </div>
            </Section>
          )}

          {/* Resumen */}
          {analysis?.summary && (
            <Section k="summary" icon={<FileText className="w-4 h-4" />} title="Resumen" color="slate" collapsed={collapsed.summary} onToggle={toggle}>
              <p className="text-sm text-gray-800 leading-relaxed">{analysis.summary}</p>
            </Section>
          )}

          {/* Análisis jurídico */}
          {analysis?.legalAnalysis && (
            <Section k="legal" icon={<Gavel className="w-4 h-4" />} title="Análisis jurídico" color="blue" collapsed={collapsed.legal} onToggle={toggle}>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{analysis.legalAnalysis}</div>
            </Section>
          )}

          {/* Importancia para el caso */}
          {analysis?.importanceForCase && (
            <Section k="importance" icon={<Target className="w-4 h-4" />} title="Importancia para este caso" color="emerald" collapsed={collapsed.importance} onToggle={toggle}>
              <p className="text-sm text-gray-800 leading-relaxed">{analysis.importanceForCase}</p>
            </Section>
          )}

          {/* Penas/efectos */}
          {(analysis?.penaltiesOrEffects?.length ?? 0) > 0 && (
            <Section k="penalties" icon={<ShieldAlert className="w-4 h-4" />} title="Penas o efectos" badge={`${analysis?.penaltiesOrEffects?.length}`} color="rose" collapsed={collapsed.penalties} onToggle={toggle}>
              <ul className="space-y-2">
                {analysis?.penaltiesOrEffects?.map((p, i) => (
                  <li key={i} className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100">
                    {p.type && <div className="text-[10px] uppercase tracking-wider font-bold text-rose-700 mb-0.5">{p.type}</div>}
                    {p.detail && <div className="text-sm text-gray-800">{p.detail}</div>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Requisitos */}
          {(analysis?.requirements?.length ?? 0) > 0 && (
            <Section k="reqs" icon={<ListChecks className="w-4 h-4" />} title="Requisitos para que aplique" badge={`${analysis?.requirements?.length}`} color="amber" collapsed={collapsed.reqs} onToggle={toggle}>
              <ol className="space-y-1.5 list-decimal pl-5">
                {analysis?.requirements?.map((r, i) => (
                  <li key={i} className="text-sm text-gray-800">{r}</li>
                ))}
              </ol>
            </Section>
          )}

          {/* Normas relacionadas */}
          {(analysis?.relatedNorms?.length ?? 0) > 0 && (
            <Section k="related" icon={<Link2 className="w-4 h-4" />} title="Normas relacionadas" badge={`${analysis?.relatedNorms?.length}`} color="cyan" collapsed={collapsed.related} onToggle={toggle}>
              <ul className="space-y-1.5">
                {analysis?.relatedNorms?.map((n, i) => (
                  <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                    <span className="font-mono text-xs bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{n.norm}</span>
                    {n.relation && <span className="text-gray-600 text-xs italic mt-1">{n.relation}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Jurisprudencia */}
          {(analysis?.jurisprudence?.length ?? 0) > 0 && (
            <Section k="juris" icon={<BookMarked className="w-4 h-4" />} title="Jurisprudencia clave" badge={`${analysis?.jurisprudence?.length}`} color="purple" collapsed={collapsed.juris} onToggle={toggle}>
              <ul className="space-y-2">
                {analysis?.jurisprudence?.map((j, i) => (
                  <li key={i} className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                    <div className="text-sm font-semibold text-purple-900">{j.reference}</div>
                    {j.relevance && <div className="text-xs text-gray-700 mt-0.5">{j.relevance}</div>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Estrategia para el caso */}
          {(analysis?.strategyForCase?.length ?? 0) > 0 && (
            <Section k="strategy" icon={<Target className="w-4 h-4" />} title="Estrategia para este caso" badge={`${analysis?.strategyForCase?.length}`} color="emerald" collapsed={collapsed.strategy} onToggle={toggle}>
              <ul className="space-y-1.5">
                {analysis?.strategyForCase?.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="text-emerald-600 mt-0.5">▸</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Defensas comunes */}
          {(analysis?.commonDefenses?.length ?? 0) > 0 && (
            <Section k="defenses" icon={<ShieldCheck className="w-4 h-4" />} title="Defensas comunes" badge={`${analysis?.commonDefenses?.length}`} color="slate" collapsed={collapsed.defenses} onToggle={toggle}>
              <ul className="space-y-1.5">
                {analysis?.commonDefenses?.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="text-slate-500 mt-0.5">◆</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Red flags */}
          {(analysis?.redFlags?.length ?? 0) > 0 && (
            <Section k="redflags" icon={<ShieldAlert className="w-4 h-4" />} title="Errores comunes a evitar" badge={`${analysis?.redFlags?.length}`} color="rose" collapsed={collapsed.redflags} onToggle={toggle}>
              <ul className="space-y-1.5">
                {analysis?.redFlags?.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="text-rose-500 mt-0.5">⚠</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Notas */}
          {analysis?.notes && (
            <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 leading-relaxed">
              <strong className="text-gray-900">Nota:</strong> {analysis.notes}
            </div>
          )}

          {/* Fuentes recuperadas */}
          {sources.length > 0 && (
            <Section k="sources" icon={<Library className="w-4 h-4" />} title="Fuentes del corpus legal" badge={`${sources.length}`} color="gray" collapsed={collapsed.sources ?? true} onToggle={toggle}>
              <ul className="space-y-2">
                {sources.map((s, i) => (
                  <li key={i} className="p-2.5 rounded-lg bg-white border border-gray-200">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-xs font-bold text-gray-700 truncate">{s.normTitle}</div>
                      <span className="text-[10px] font-mono text-gray-500 shrink-0">score {s.score.toFixed(3)}</span>
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed line-clamp-4">{s.excerpt}</div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {!loading && !error && !analysis && (
            <div className="p-8 text-center text-gray-500">
              <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Esperando análisis de la IA…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500">
            {analysis ? 'Análisis generado · usa con criterio profesional' : ''}
          </div>
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-sm transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Section helper -----------------------------------------------------

interface SectionProps {
  k: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  color: 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'purple' | 'slate' | 'gray';
  collapsed?: boolean;
  onToggle: (k: string) => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

const colorRing: Record<SectionProps['color'], { ring: string; text: string; pill: string }> = {
  indigo: { ring: 'border-indigo-200', text: 'text-indigo-700', pill: 'bg-indigo-100 text-indigo-700' },
  blue: { ring: 'border-blue-200', text: 'text-blue-700', pill: 'bg-blue-100 text-blue-700' },
  emerald: { ring: 'border-emerald-200', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' },
  rose: { ring: 'border-rose-200', text: 'text-rose-700', pill: 'bg-rose-100 text-rose-700' },
  amber: { ring: 'border-amber-200', text: 'text-amber-700', pill: 'bg-amber-100 text-amber-700' },
  cyan: { ring: 'border-cyan-200', text: 'text-cyan-700', pill: 'bg-cyan-100 text-cyan-700' },
  purple: { ring: 'border-purple-200', text: 'text-purple-700', pill: 'bg-purple-100 text-purple-700' },
  slate: { ring: 'border-slate-200', text: 'text-slate-700', pill: 'bg-slate-100 text-slate-700' },
  gray: { ring: 'border-gray-200', text: 'text-gray-700', pill: 'bg-gray-100 text-gray-700' },
};

function Section({ k, icon, title, badge, color, collapsed, onToggle, rightAction, children }: SectionProps) {
  const c = colorRing[color];
  return (
    <div className={`rounded-xl border-2 ${c.ring} bg-white overflow-hidden`}>
      <div className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 transition">
        <button onClick={() => onToggle(k)} className={`flex items-center gap-2 flex-1 text-left ${c.text}`}>
          {icon}
          <span className="text-sm font-bold">{title}</span>
          {badge && (
            <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold rounded-full ${c.pill}`}>
              {badge}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1.5">
          {rightAction}
          <button onClick={() => onToggle(k)} className="text-gray-400">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {!collapsed && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}
