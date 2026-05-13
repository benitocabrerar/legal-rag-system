'use client';

/**
 * DeepAnalysisDialog — Análisis IA profundo del caso.
 *
 * Llama POST /cases/:id/deep-analysis (SSE) y renderiza el dictamen
 * streameado en tiempo real con:
 *   - Indicador del modelo + fuentes legales reales usadas
 *   - Markdown progresivo con secciones colapsables al terminar
 *   - Descarga como .md y copiar al portapapeles
 *   - Audit log automático en backend (no requiere acción extra)
 *
 * Diseño: full-screen drawer right-side, glassmorphism, gradient accents.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, X, Brain, Scale, Copy, Check, Download, ChevronDown, ChevronRight,
  Loader2, FileSignature, AlertCircle, BookOpen, FileText, Calendar, BookMarked,
  Gavel, Target, AlertTriangle, Lightbulb, ListChecks, TrendingUp, TrendingDown,
  ShieldAlert, ShieldCheck, Clock,
} from 'lucide-react';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StartPayload {
  caseId: string;
  country: string;
  model: string;
  provider: string;
  documents: number;
  events: number;
  legalSourcesUsed: number;
  hasBrain: boolean;
}

interface LegalSourcesPayload {
  count: number;
  titles: string[];
}

interface Props {
  caseId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function DeepAnalysisDialog({ caseId, open, onClose, onSaved }: Props) {
  const [content, setContent] = useState('');
  const [meta, setMeta] = useState<StartPayload | null>(null);
  const [sourceTitles, setSourceTitles] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duration, setDuration] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const contentEndRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Evitar relanzar el análisis si el modal se re-renderiza
    if (startedRef.current === caseId) return;
    startedRef.current = caseId;

    setContent('');
    setMeta(null);
    setSourceTitles([]);
    setDone(false);
    setError(null);

    const ac = new AbortController();
    abortRef.current = ac;

    const run = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${API_URL}/api/v1/cases/${caseId}/deep-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: '{}',
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${t.slice(0, 200) || 'sin respuesta'}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const ev of events) {
            const eventLine = ev.split('\n').find((l) => l.startsWith('event: '));
            const dataLine  = ev.split('\n').find((l) => l.startsWith('data: '));
            if (!eventLine || !dataLine) continue;
            const name = eventLine.slice(7).trim();
            let payload: any;
            try { payload = JSON.parse(dataLine.slice(6)); } catch { continue; }
            if (name === 'start') setMeta(payload as StartPayload);
            else if (name === 'legal-sources') setSourceTitles((payload as LegalSourcesPayload).titles || []);
            else if (name === 'chunk' && payload?.content) {
              setContent((prev) => prev + payload.content);
            } else if (name === 'done') {
              setDone(true);
              if (typeof payload?.durationMs === 'number') setDuration(payload.durationMs);
            } else if (name === 'error') {
              setError(payload?.message || 'Error en el análisis');
              setDone(true);
            }
          }
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Conexión interrumpida');
        setDone(true);
      }
    };
    run();
    return () => { ac.abort(); abortRef.current = null; };
  }, [open, caseId]);

  // Auto-scroll mientras streamea
  useEffect(() => {
    if (!done && contentEndRef.current) {
      contentEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [content, done]);

  // Cuando se cierra el modal, resetear startedRef para permitir re-análisis al re-abrir
  useEffect(() => {
    if (!open) startedRef.current = null;
  }, [open]);

  // Split del markdown en secciones a partir de "## "
  const sections = useMemo(() => {
    if (!content) return [];
    const parts = content.split(/\n(?=## )/);
    return parts.map((p, i) => {
      const titleMatch = p.match(/^##\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Sección ${i + 1}`;
      const body = p.replace(/^##\s+.+\n?/m, '').trim();
      return { title, body, key: `sec-${i}` };
    });
  }, [content]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const onDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dictamen-${caseId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onSaveToCase = async () => {
    if (!content || saving || saved) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      const title = `Dictamen IA — ${new Date().toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const r = await fetch(`${API_URL}/api/v1/cases/${caseId}/save-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          content,
          model: meta?.model,
          sourcesUsed: meta?.legalSourcesUsed,
          durationMs: duration,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaved(true);
      onSaved?.();
    } catch {
      // si falla, dejamos el botón disponible para reintentar
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full sm:max-w-3xl lg:max-w-4xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white/60 transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-start gap-3 pr-10">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur opacity-50 animate-pulse" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 grid place-items-center text-white">
                {done && !error ? <Scale className="w-6 h-6" /> : error ? <AlertCircle className="w-6 h-6" /> : <Brain className="w-6 h-6 animate-pulse" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {error ? 'Error en el análisis' : done ? 'Dictamen interno · Análisis IA profundo' : 'Generando análisis legal profundo…'}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {meta ? (
                  <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {meta.model}
                    </span>
                    <span>·</span>
                    <span>{meta.documents} documento{meta.documents === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{meta.events} evento{meta.events === 1 ? '' : 's'}</span>
                    {meta.legalSourcesUsed > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                          <BookOpen className="w-3 h-3" />
                          {meta.legalSourcesUsed} fuentes legales reales
                        </span>
                      </>
                    )}
                  </span>
                ) : 'Conectando con el asistente legal…'}
              </p>
            </div>
          </div>
        </div>

        {/* Sources strip */}
        {sourceTitles.length > 0 && (
          <div className="px-6 py-2 border-b border-gray-100 bg-indigo-50/40">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span className="font-semibold text-indigo-900 flex-shrink-0">Marco normativo consultado:</span>
              <div className="overflow-x-auto whitespace-nowrap text-indigo-700">
                {sourceTitles.slice(0, 8).map((t, i) => (
                  <span key={i} className="inline-block mr-2">
                    {t.slice(0, 50)}{i < Math.min(7, sourceTitles.length - 1) ? ' ·' : ''}
                  </span>
                ))}
                {sourceTitles.length > 8 && (
                  <span className="text-indigo-500">+{sourceTitles.length - 8} más</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gradient-to-b from-white to-gray-50/50">
          {error && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900 mb-4">
              <div className="font-semibold mb-1">No se pudo completar el análisis</div>
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {!content && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm text-gray-700 font-medium">El especialista IA está revisando el expediente</p>
              <p className="text-xs text-gray-500 mt-1">Cargando documentos · indexando normativa · estructurando dictamen</p>
            </div>
          )}

          {/* Streaming view (during) o secciones colapsables (cuando termina) */}
          {!done && content && (
            <div className="prose prose-sm max-w-none">
              <MarkdownLike content={content} />
              <div ref={contentEndRef} />
              <div className="inline-flex items-center gap-1.5 text-xs text-indigo-600 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="font-medium">Generando…</span>
              </div>
            </div>
          )}

          {done && !error && sections.length > 0 && (
            <DictamenRenderer
              sections={sections}
              collapsed={collapsedSections}
              onToggle={(k) => setCollapsedSections((prev) => ({ ...prev, [k]: !prev[k] }))}
              meta={meta}
            />
          )}
        </div>

        {/* Footer */}
        {done && !error && content && (
          <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-gray-500">
              <Check className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              Análisis completo · {content.length.toLocaleString()} caracteres
              {meta?.legalSourcesUsed ? ` · ${meta.legalSourcesUsed} fuentes legales` : ''}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar .md
              </button>
              <button
                onClick={onSaveToCase}
                disabled={saving || saved}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm
                  ${saved
                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'}
                  ${saving ? 'opacity-60 cursor-wait' : ''}`}
                title="Guarda este dictamen como documento del caso (kind=ai_analysis) para que la IA lo use como referencia interna en futuros análisis"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : <FileSignature className="w-3.5 h-3.5" />}
                {saved ? 'Guardado al expediente' : saving ? 'Guardando…' : 'Guardar al expediente'}
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm transition"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Render minimal de markdown sin dependencias: headings, **bold**, listas y párrafos.
 * No es un parser completo pero cubre el output esperado del modelo.
 */
function MarkdownLike({ content }: { content: string }) {
  const lines = content.split('\n');
  const out: React.ReactNode[] = [];
  let buf: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushPara = () => {
    if (buf.length) {
      out.push(<p key={key++} className="text-sm text-gray-800 leading-relaxed">{renderInline(buf.join(' '))}</p>);
      buf = [];
    }
  };
  const flushList = () => {
    if (inList) {
      const items = buf.map((t, i) => <li key={i} className="text-sm text-gray-800 leading-relaxed">{renderInline(t)}</li>);
      out.push(inList === 'ul'
        ? <ul key={key++} className="list-disc pl-5 space-y-1 my-2">{items}</ul>
        : <ol key={key++} className="list-decimal pl-5 space-y-1 my-2">{items}</ol>);
      inList = null;
      buf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (/^###\s+/.test(line)) {
      flushPara(); flushList();
      out.push(<h4 key={key++} className="text-sm font-bold text-gray-900 mt-3 mb-1">{renderInline(line.replace(/^###\s+/, ''))}</h4>);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushPara(); flushList();
      out.push(<h3 key={key++} className="text-base font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-200">{renderInline(line.replace(/^##\s+/, ''))}</h3>);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushPara(); flushList();
      out.push(<h2 key={key++} className="text-lg font-extrabold text-gray-900 mt-4 mb-2">{renderInline(line.replace(/^#\s+/, ''))}</h2>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (inList !== 'ul') { flushPara(); flushList(); inList = 'ul'; }
      buf.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== 'ol') { flushPara(); flushList(); inList = 'ol'; }
      buf.push(line.replace(/^\s*\d+\.\s+/, ''));
      continue;
    }
    if (inList) { flushList(); }
    buf.push(line);
  }
  flushPara(); flushList();
  return <>{out}</>;
}

function renderInline(text: string): React.ReactNode {
  // **bold** y `code`
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[CITA POR VERIFICAR[^\]]*\]|\[DATO REQUERIDO[^\]]*\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      out.push(<strong key={i++} className="font-semibold text-gray-900">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      out.push(<code key={i++} className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-800">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('[CITA')) {
      out.push(<span key={i++} className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-mono mx-0.5">{tok}</span>);
    } else if (tok.startsWith('[DATO')) {
      out.push(<span key={i++} className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-mono mx-0.5">{tok}</span>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// =============================================================================
// DictamenRenderer — visualización high-end por sección
// =============================================================================
//
// Lugar de markdown plano cuando termina el stream. Detecta el tipo de cada
// sección (I-VIII) y la renderiza con un layout específico:
//   I.  Resumen     → card-portada con tipografía editorial
//   II. Hechos      → timeline vertical con dots
//   III. Marco norm.→ grid de citas como pills/cards
//   IV. Análisis    → cards de subsunción
//   V.  FODA        → grid 2x2 coloreado
//   VI. Riesgos     → lista con badges de severidad
//   VII. Estrategia → 3 columnas (corto/medio/largo)
//   VIII. Acción    → checklist numerado con priority

interface DictamenSection { title: string; body: string; key: string }

interface DictamenRendererProps {
  sections: DictamenSection[];
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  meta: any;
}

function DictamenRenderer({ sections, collapsed, onToggle, meta }: DictamenRendererProps) {
  // Detectar nivel de riesgo desde sección VI (Riesgos)
  const globalRisk = detectGlobalRisk(sections);

  return (
    <div className="space-y-4">
      {/* Cover card */}
      <CoverCard meta={meta} risk={globalRisk} sectionCount={sections.length} />

      {/* Secciones temáticas */}
      {sections.map((s, i) => {
        const type = detectSectionType(s.title, i);
        const isOpen = !collapsed[s.key];
        return (
          <SectionWrapper key={s.key} type={type} index={i} title={s.title} isOpen={isOpen} onToggle={() => onToggle(s.key)}>
            {isOpen && <SectionBody type={type} body={s.body} />}
          </SectionWrapper>
        );
      })}
    </div>
  );
}

type SectionType = 'summary' | 'facts' | 'norms' | 'analysis' | 'swot' | 'risks' | 'strategy' | 'actions' | 'generic';

function detectSectionType(title: string, idx: number): SectionType {
  const t = title.toLowerCase();
  if (/resumen|ejecutivo|sumilla/.test(t)) return 'summary';
  if (/hecho/.test(t)) return 'facts';
  if (/marco|normativ|aplicabl/.test(t)) return 'norms';
  if (/análisis|analisis|jurídic|juridic|subsunción|subsuncion/.test(t)) return 'analysis';
  if (/foda|fortalez|debilidad|oportunidad|amenaza/.test(t)) return 'swot';
  if (/riesgo|plazo/.test(t)) return 'risks';
  if (/estrategia|recomendad/.test(t)) return 'strategy';
  if (/acción|accion|plan/.test(t)) return 'actions';
  // Fallback por orden
  return (['summary','facts','norms','analysis','swot','risks','strategy','actions'][idx] as SectionType) || 'generic';
}

const SECTION_META: Record<SectionType, { Icon: React.ComponentType<{ className?: string }>; label: string; accent: string; bg: string; ring: string }> = {
  summary:  { Icon: FileText,       label: 'Resumen ejecutivo',    accent: 'from-slate-700 to-slate-900',   bg: 'from-slate-50/60 to-blue-50/30',   ring: 'ring-slate-200' },
  facts:    { Icon: Clock,          label: 'Hechos relevantes',     accent: 'from-blue-600 to-indigo-700',   bg: 'from-blue-50/40 to-white',         ring: 'ring-blue-200' },
  norms:    { Icon: BookMarked,     label: 'Marco normativo',       accent: 'from-purple-600 to-indigo-700', bg: 'from-purple-50/40 to-white',       ring: 'ring-purple-200' },
  analysis: { Icon: Gavel,          label: 'Análisis jurídico',     accent: 'from-indigo-600 to-purple-700', bg: 'from-indigo-50/40 to-white',       ring: 'ring-indigo-200' },
  swot:     { Icon: Target,         label: 'FODA jurídico',         accent: 'from-emerald-600 to-cyan-700',  bg: 'from-emerald-50/40 to-white',      ring: 'ring-emerald-200' },
  risks:    { Icon: AlertTriangle,  label: 'Riesgos y plazos',      accent: 'from-amber-600 to-red-700',     bg: 'from-amber-50/40 to-white',        ring: 'ring-amber-200' },
  strategy: { Icon: Lightbulb,      label: 'Estrategia',            accent: 'from-violet-600 to-fuchsia-700',bg: 'from-violet-50/40 to-white',       ring: 'ring-violet-200' },
  actions:  { Icon: ListChecks,     label: 'Plan de acción',        accent: 'from-rose-600 to-pink-700',     bg: 'from-rose-50/40 to-white',         ring: 'ring-rose-200' },
  generic:  { Icon: FileText,       label: '',                      accent: 'from-gray-600 to-gray-800',     bg: 'from-gray-50 to-white',            ring: 'ring-gray-200' },
};

function SectionWrapper({
  type, index, title, isOpen, onToggle, children,
}: {
  type: SectionType;
  index: number;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const m = SECTION_META[type];
  const cleanTitle = title.replace(/^[IVX]+\.\s*/, '');
  const romanNum = (title.match(/^([IVX]+)\./) || [, String(index + 1)])[1];
  return (
    <section className={`rounded-2xl border bg-gradient-to-br ${m.bg} shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden ${m.ring} ring-1`}>
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/40 transition">
        <div className="relative flex-shrink-0">
          <div className={`absolute -inset-0.5 bg-gradient-to-br ${m.accent} rounded-xl blur opacity-25`} />
          <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${m.accent} grid place-items-center text-white shadow-sm`}>
            <m.Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">Sección {romanNum}</div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">{cleanTitle}</h3>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-white/60 pt-4">{children}</div>}
    </section>
  );
}

function SectionBody({ type, body }: { type: SectionType; body: string }) {
  switch (type) {
    case 'summary':  return <SummaryView body={body} />;
    case 'facts':    return <FactsTimeline body={body} />;
    case 'norms':    return <NormsCards body={body} />;
    case 'swot':     return <SwotGrid body={body} />;
    case 'risks':    return <RisksList body={body} />;
    case 'strategy': return <StrategyColumns body={body} />;
    case 'actions':  return <ActionsChecklist body={body} />;
    case 'analysis':
    case 'generic':
    default:
      return <div className="prose prose-sm max-w-none"><MarkdownLike content={body} /></div>;
  }
}

// — Cover ——————————————————————————————————————————————————————————
function CoverCard({ meta, risk, sectionCount }: { meta: any; risk: 'high' | 'medium' | 'low' | null; sectionCount: number }) {
  const riskMeta = {
    high:   { label: 'Riesgo Alto',   color: 'bg-red-100 text-red-800 ring-red-200',         Icon: ShieldAlert },
    medium: { label: 'Riesgo Medio',  color: 'bg-amber-100 text-amber-800 ring-amber-200',   Icon: ShieldAlert },
    low:    { label: 'Riesgo Bajo',   color: 'bg-emerald-100 text-emerald-800 ring-emerald-200', Icon: ShieldCheck },
  };
  const r = risk ? riskMeta[risk] : null;
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-6 shadow-xl">
      <div className="absolute inset-0 opacity-30 pointer-events-none"
           style={{ background: 'radial-gradient(circle at 80% 20%, rgba(168,85,247,0.3), transparent 50%), radial-gradient(circle at 20% 80%, rgba(59,130,246,0.25), transparent 50%)' }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Dictamen Interno · Análisis Profundo</div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Estudio jurídico completo del caso</h2>
            <p className="mt-1 text-sm text-indigo-200/80">Análisis estructurado en {sectionCount} secciones · generado por IA con corpus normativo vectorizado</p>
          </div>
          {r && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ${r.color}`}>
              <r.Icon className="w-3.5 h-3.5" />
              {r.label}
            </div>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <CoverStat label="Modelo IA" value={meta?.model || '—'} />
          <CoverStat label="Documentos" value={meta?.documents ?? '—'} />
          <CoverStat label="Eventos" value={meta?.events ?? '—'} />
          <CoverStat label="Fuentes legales" value={meta?.legalSourcesUsed ?? 0} highlight={meta?.legalSourcesUsed > 0} />
        </div>
      </div>
    </div>
  );
}
function CoverStat({ label, value, highlight = false }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`rounded-lg backdrop-blur ${highlight ? 'bg-emerald-400/20 ring-1 ring-emerald-400/40' : 'bg-white/5 ring-1 ring-white/10'} px-3 py-2`}>
      <div className="text-[9px] uppercase tracking-wider text-indigo-200/80 font-bold">{label}</div>
      <div className="text-sm font-bold mt-0.5 truncate">{String(value)}</div>
    </div>
  );
}

// — Summary ————————————————————————————————————————————————————————
function SummaryView({ body }: { body: string }) {
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim());
  return (
    <div className="space-y-3 [&_p]:!leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i} className={`text-sm text-gray-800 ${i === 0 ? 'text-base first-letter:text-3xl first-letter:font-bold first-letter:mr-1 first-letter:float-left first-letter:leading-none first-letter:text-slate-800' : ''}`}>
          {renderInline(p.replace(/\n/g, ' '))}
        </p>
      ))}
    </div>
  );
}

// — Hechos: timeline ————————————————————————————————————————————————
function FactsTimeline({ body }: { body: string }) {
  // Detectar items: "3.1 — ..." o "1. ..." o "- ..."
  const items = parseListItems(body);
  if (items.length === 0) return <MarkdownLike content={body} />;
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-400 via-indigo-300 to-transparent" />
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow" />
            <p className="text-sm text-gray-800 leading-relaxed">{renderInline(it)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// — Marco Normativo: pills/cards ——————————————————————————————————————
function NormsCards({ body }: { body: string }) {
  const items = parseListItems(body);
  if (items.length === 0) return <MarkdownLike content={body} />;
  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {items.map((it, i) => {
        // Detectar si tiene formato "Art. X — descripción"
        const m = it.match(/^\*?\*?(Art\.?\s*\d+[\w.°º]*[^—:*]*?)[\*]?[—:](.+)$/i);
        const title = m ? m[1].trim() : '';
        const desc = m ? m[2].trim() : it;
        const hasCitaPorVerificar = /\[CITA POR VERIFICAR/i.test(it);
        return (
          <div
            key={i}
            className={`rounded-lg p-3 bg-white border ${hasCitaPorVerificar ? 'border-amber-200' : 'border-purple-200/60'} shadow-sm hover:shadow transition`}
          >
            {title && (
              <div className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-purple-100 text-purple-800">
                <BookMarked className="w-3 h-3 opacity-70" />
                {title}
              </div>
            )}
            <div className="text-sm text-gray-800 leading-relaxed">{renderInline(desc)}</div>
          </div>
        );
      })}
    </div>
  );
}

// — FODA: grid 2x2 ——————————————————————————————————————————————————
function SwotGrid({ body }: { body: string }) {
  // Buscar sub-secciones ### Fortalezas / Debilidades / Oportunidades / Amenazas
  const findSection = (re: RegExp): string[] => {
    const m = body.match(new RegExp(`###\\s+${re.source}[\\s\\S]+?(?=###|$)`, 'i'));
    if (!m) return [];
    return parseListItems(m[0]);
  };
  const fortalezas = findSection(/fortalez/);
  const debilidades = findSection(/debilidad/);
  const oportunidades = findSection(/oportunidad/);
  const amenazas = findSection(/amenaza/);
  if (!fortalezas.length && !debilidades.length && !oportunidades.length && !amenazas.length) {
    return <MarkdownLike content={body} />;
  }
  const Cell = ({ items, Icon, title, accent }: any) => (
    <div className={`rounded-xl p-4 ${accent.bg} ${accent.border} border`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent.text} mb-2`}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </div>
      <ul className="space-y-1.5">
        {items.length === 0 && <li className="text-xs text-gray-400 italic">—</li>}
        {items.map((it: string, i: number) => (
          <li key={i} className="text-xs text-gray-800 leading-relaxed flex gap-1.5">
            <span className={`mt-1 flex-shrink-0 w-1 h-1 rounded-full ${accent.dot}`} />
            <span>{renderInline(it)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Cell items={fortalezas}   Icon={TrendingUp}      title="Fortalezas"   accent={{ bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' }} />
      <Cell items={oportunidades} Icon={Lightbulb}       title="Oportunidades" accent={{ bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    dot: 'bg-blue-500' }} />
      <Cell items={debilidades}  Icon={TrendingDown}    title="Debilidades"  accent={{ bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   dot: 'bg-amber-500' }} />
      <Cell items={amenazas}     Icon={ShieldAlert}     title="Amenazas"     accent={{ bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     dot: 'bg-red-500' }} />
    </div>
  );
}

// — Riesgos: lista con badges ——————————————————————————————————————
function RisksList({ body }: { body: string }) {
  const items = parseListItems(body);
  if (items.length === 0) return <MarkdownLike content={body} />;
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => {
        const lower = it.toLowerCase();
        const severity: 'high' | 'medium' | 'low' = /urgent|crític|vencid|inminente|prescripc|caducid/.test(lower) ? 'high'
          : /próxim|plazo|cautelar/.test(lower) ? 'medium' : 'low';
        const colors = severity === 'high' ? 'bg-red-50 border-red-200' : severity === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200';
        const badge = severity === 'high' ? 'bg-red-100 text-red-800' : severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700';
        return (
          <li key={i} className={`rounded-lg border p-3 ${colors} flex gap-3`}>
            <span className={`inline-flex items-center px-2 py-0.5 h-fit rounded-full text-[10px] font-bold uppercase ${badge}`}>
              {severity === 'high' ? 'Alto' : severity === 'medium' ? 'Medio' : 'Bajo'}
            </span>
            <p className="text-sm text-gray-800 leading-relaxed flex-1">{renderInline(it)}</p>
          </li>
        );
      })}
    </ul>
  );
}

// — Estrategia: 3 columnas ————————————————————————————————————————
function StrategyColumns({ body }: { body: string }) {
  const findHorizon = (re: RegExp): string[] => {
    const m = body.match(new RegExp(`###\\s+(?:[^\\n]*?${re.source})[\\s\\S]+?(?=###|$)`, 'i'));
    if (!m) return [];
    return parseListItems(m[0]);
  };
  const corto = findHorizon(/corto/);
  const medio = findHorizon(/medio/);
  const largo = findHorizon(/largo/);
  if (!corto.length && !medio.length && !largo.length) {
    return <MarkdownLike content={body} />;
  }
  const Col = ({ items, title, accent }: any) => (
    <div className={`rounded-xl p-4 ${accent.bg} border ${accent.border}`}>
      <div className={`text-[11px] font-bold uppercase tracking-wider ${accent.text} mb-2`}>{title}</div>
      <ul className="space-y-1.5">
        {items.length === 0 ? <li className="text-xs text-gray-400 italic">—</li> :
          items.map((it: string, i: number) => (
            <li key={i} className="text-xs text-gray-800 leading-relaxed flex gap-1.5">
              <span className={`mt-1 flex-shrink-0 w-1 h-1 rounded-full ${accent.dot}`} />
              <span>{renderInline(it)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <Col items={corto} title="Corto plazo (0-30 días)"   accent={{ bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    dot: 'bg-rose-500' }} />
      <Col items={medio} title="Mediano plazo (1-6 meses)" accent={{ bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-800',  dot: 'bg-violet-500' }} />
      <Col items={largo} title="Largo plazo (>6 meses)"    accent={{ bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-800',  dot: 'bg-indigo-500' }} />
    </div>
  );
}

// — Plan de acción: checklist numerado ———————————————————————————————
function ActionsChecklist({ body }: { body: string }) {
  const items = parseListItems(body);
  if (items.length === 0) return <MarkdownLike content={body} />;
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => {
        const lower = it.toLowerCase();
        const priority: 'high' | 'medium' | 'low' = /(alta|urgente|inmediat)/.test(lower) ? 'high'
          : /(media|importante)/.test(lower) ? 'medium' : 'low';
        const badge = priority === 'high' ? 'bg-red-100 text-red-700' : priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
        return (
          <li key={i} className="rounded-lg border border-gray-200 bg-white p-3 flex gap-3 hover:shadow-sm transition">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white grid place-items-center text-xs font-bold shadow">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 leading-snug">{renderInline(it)}</p>
              <span className={`mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badge}`}>
                Prioridad {priority === 'high' ? 'Alta' : priority === 'medium' ? 'Media' : 'Baja'}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// — Helpers compartidos ——————————————————————————————————————————————
function parseListItems(body: string): string[] {
  const lines = body.split('\n');
  const items: string[] = [];
  let current = '';
  const flush = () => { if (current.trim()) items.push(current.trim()); current = ''; };
  for (const line of lines) {
    if (/^\s*(?:[-*•]|\d+(?:\.\d+)*[.)\-])\s+/.test(line)) {
      flush();
      current = line.replace(/^\s*(?:[-*•]|\d+(?:\.\d+)*[.)\-])\s+/, '');
    } else if (current && line.trim()) {
      current += ' ' + line.trim();
    } else if (!current && line.trim() && !line.startsWith('#')) {
      // párrafo suelto, no es item de lista
    }
  }
  flush();
  return items.filter(Boolean);
}

function detectGlobalRisk(sections: DictamenSection[]): 'high' | 'medium' | 'low' | null {
  const risksSection = sections.find((s) => /riesgo|plazo/i.test(s.title));
  if (!risksSection) return null;
  const body = risksSection.body.toLowerCase();
  const highHits  = (body.match(/\b(alto|crítico|urgente|inminente|vencido|prescripción|caducidad)\b/g) || []).length;
  const mediumHits = (body.match(/\b(medio|moderado|próximo)\b/g) || []).length;
  if (highHits >= 2) return 'high';
  if (highHits >= 1 || mediumHits >= 2) return 'medium';
  return 'low';
}
