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
  Loader2, FileSignature, AlertCircle, BookOpen,
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
}

export default function DeepAnalysisDialog({ caseId, open, onClose }: Props) {
  const [content, setContent] = useState('');
  const [meta, setMeta] = useState<StartPayload | null>(null);
  const [sourceTitles, setSourceTitles] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
            <div className="space-y-3">
              {sections.map((s, i) => {
                const isCollapsed = !!collapsedSections[s.key];
                return (
                  <section
                    key={s.key}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setCollapsedSections((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 grid place-items-center text-indigo-700 text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <h3 className="flex-1 text-sm font-bold text-gray-900">{s.title.replace(/^[IVX]+\.\s*/, '')}</h3>
                      {isCollapsed
                        ? <ChevronRight className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    {!isCollapsed && (
                      <div className="px-4 pb-4 prose prose-sm max-w-none border-t border-gray-100 pt-3">
                        <MarkdownLike content={s.body} />
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
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
