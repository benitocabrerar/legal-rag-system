'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Loader2, Sparkles, Copy, Check, Trash2, RefreshCcw, Paperclip, ChevronDown,
  Settings2, Download, MessageSquarePlus, Bot, User as UserIcon, AlertTriangle, X,
} from 'lucide-react';
import { caseChatAPI, type CaseChatSuggestion } from '@/lib/api';
import { documentsAPI } from '@/lib/api';
import { getAuthToken } from '@/lib/get-auth-token';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

type Tone = 'formal' | 'practico' | 'didactico';
type Length = 'corta' | 'estandar' | 'detallada';
type Lang = 'es' | 'en';

const STORAGE = (caseId: string) => `case-chat:${caseId}`;
const PREFS = (caseId: string) => `case-chat-prefs:${caseId}`;

interface Props {
  caseId: string;
  onDocumentUploaded?: () => void;
}

export function CaseAIChat({ caseId, onDocumentUploaded }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggested prompts
  const [suggestions, setSuggestions] = useState<CaseChatSuggestion[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);

  // Advanced options
  const [showOptions, setShowOptions] = useState(false);
  const [tone, setTone] = useState<Tone>('formal');
  const [length, setLength] = useState<Length>('estandar');
  const [language, setLanguage] = useState<Lang>('es');

  // Restore persisted state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE(caseId));
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setMessages(arr.slice(-20));
      } catch { /* */ }
    }
    const prefRaw = window.localStorage.getItem(PREFS(caseId));
    if (prefRaw) {
      try {
        const p = JSON.parse(prefRaw);
        if (p.tone) setTone(p.tone);
        if (p.length) setLength(p.length);
        if (p.language) setLanguage(p.language);
      } catch { /* */ }
    }
  }, [caseId]);

  // Persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (messages.length > 0) {
      window.localStorage.setItem(STORAGE(caseId), JSON.stringify(messages.slice(-20)));
    }
  }, [messages, caseId]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PREFS(caseId), JSON.stringify({ tone, length, language }));
  }, [tone, length, language, caseId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, partial]);

  // Load suggestions on mount
  const fetchSuggestions = async () => {
    setLoadingSugg(true);
    try {
      const r = await caseChatAPI.suggestions(caseId);
      setSuggestions(r.suggestions);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSugg(false);
    }
  };
  useEffect(() => { void fetchSuggestions(); /* eslint-disable-next-line */ }, [caseId]);

  const sendMessage = async (override?: string) => {
    const message = (override ?? input).trim();
    if (!message || streaming) return;

    const next = [...messages, { role: 'user' as const, content: message, ts: Date.now() }];
    setMessages(next);
    setInput('');
    setError('');
    setStreaming(true);
    setPartial('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getAuthToken();
      const res = await fetch(caseChatAPI.streamUrl(caseId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          history: messages.map(({ role, content }) => ({ role, content })),
          tone, length, language,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      let evt = 'message';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let i;
        while ((i = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) evt = line.slice(6).trim();
            else if (line.startsWith('data:')) {
              try {
                const j = JSON.parse(line.slice(5).trim());
                if (evt === 'chunk' && j.content) {
                  acc += j.content;
                  setPartial(acc);
                } else if (evt === 'error') {
                  setError(j.message || 'Error de IA');
                }
              } catch { /* */ }
            }
          }
        }
      }
      if (acc) {
        setMessages((m) => [...m, { role: 'assistant', content: acc, ts: Date.now() }]);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message ?? 'Error en la conexión');
    } finally {
      setStreaming(false);
      setPartial('');
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const regenerate = async () => {
    if (streaming) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx < 0) return;
    const idxFromStart = messages.length - 1 - lastUserIdx;
    const trimmed = messages.slice(0, idxFromStart);
    const lastUser = messages[idxFromStart];
    setMessages(trimmed);
    await sendMessage(lastUser.content);
  };

  const clear = () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE(caseId));
    setMessages([]);
    setPartial('');
    setError('');
  };

  const exportConversation = () => {
    if (messages.length === 0) return;
    const md = messages
      .map((m) => `### ${m.role === 'user' ? '👤 Usuario' : '🤖 Asistente'}\n\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([`# Conversación con el Asistente Legal\n\n${md}`], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chat-caso-${caseId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onAttachClick = () => fileInputRef.current?.click();
  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    const tmp: ChatMessage = {
      role: 'user',
      content: `📎 Adjunté el documento "${file.name}" al expediente.`,
      ts: Date.now(),
    };
    setMessages((m) => [...m, tmp]);
    try {
      await documentsAPI.upload(caseId, file);
      onDocumentUploaded?.();
      // re-pide sugerencias para reflejar el nuevo doc en los quick prompts
      void fetchSuggestions();
      // y le da contexto al modelo en el siguiente turno
      await sendMessage(`Analiza el documento "${file.name}" que acabo de adjuntar al expediente y dime qué partes del caso son relevantes.`);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? `No pude subir "${file.name}"`);
    }
  };

  const showWelcome = messages.length === 0 && !partial;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow shadow-violet-500/30 shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">Asistente Legal IA</div>
            <div className="text-[10px] text-slate-500">Claude Opus · contexto del caso pre-cargado</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowOptions((v) => !v)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showOptions ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'
            )}
            title="Opciones avanzadas"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={exportConversation}
            disabled={messages.length === 0}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            title="Exportar conversación (.md)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={clear}
            disabled={messages.length === 0}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
            title="Limpiar conversación"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced options */}
      {showOptions && (
        <div className="px-4 py-3 border-b border-gray-100 bg-slate-50/60 grid grid-cols-3 gap-2 text-[11px]">
          <SelectField label="Tono" value={tone} onChange={(v) => setTone(v as Tone)} options={[
            ['formal', 'Forense'],
            ['practico', 'Práctico'],
            ['didactico', 'Didáctico'],
          ]} />
          <SelectField label="Largo" value={length} onChange={(v) => setLength(v as Length)} options={[
            ['corta', 'Corta'],
            ['estandar', 'Estándar'],
            ['detallada', 'Detallada'],
          ]} />
          <SelectField label="Idioma" value={language} onChange={(v) => setLanguage(v as Lang)} options={[
            ['es', 'Español'],
            ['en', 'English'],
          ]} />
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {showWelcome && (
          <Welcome
            suggestions={suggestions}
            isLoading={loadingSugg}
            onPick={(p) => sendMessage(p)}
            onRefresh={fetchSuggestions}
          />
        )}
        {messages.map((m, i) => (
          <Bubble key={`${m.ts}-${i}`} role={m.role} content={m.content} onCopy={() => undefined} onRegenerate={i === messages.length - 1 && m.role === 'assistant' ? regenerate : undefined} />
        ))}
        {partial && <Bubble role="assistant" content={partial} streaming />}
        {error && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 inline-flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <button
            onClick={onAttachClick}
            disabled={streaming}
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            title="Adjuntar documento al expediente"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
            onChange={onFilePicked}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Pregunta lo que necesites sobre este caso…"
            rows={2}
            className="flex-1 resize-none px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 placeholder:text-slate-400"
          />
          {streaming ? (
            <button
              onClick={stop}
              className="h-10 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detener
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className={cn(
                'h-10 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all',
                input.trim()
                  ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              <Send className="w-3.5 h-3.5" /> Enviar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

const CATEGORY_STYLE: Record<string, string> = {
  analisis:      'from-sky-500 to-cyan-500',
  redaccion:     'from-violet-500 to-fuchsia-500',
  investigacion: 'from-emerald-500 to-teal-500',
  estrategia:    'from-amber-500 to-orange-500',
  riesgo:        'from-rose-500 to-pink-500',
  cliente:       'from-indigo-500 to-blue-500',
};

function Welcome({
  suggestions, isLoading, onPick, onRefresh,
}: {
  suggestions: CaseChatSuggestion[];
  isLoading: boolean;
  onPick: (p: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 border border-violet-200/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-900">¡Hola! Soy tu Asistente Legal IA</h3>
        </div>
        <p className="text-[12px] text-slate-600 leading-relaxed">
          Conozco los documentos, eventos y partes de este caso. Puedo analizar el expediente,
          buscar fundamentos legales, redactar piezas procesales o sugerir estrategia.
          Responderé en tu jurisdicción y citaré con honestidad — si una norma o jurisprudencia
          no la conozco con certeza, lo diré.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1.5">
            <MessageSquarePlus className="w-3 h-3" />
            Sugerencias para este caso
          </h4>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="text-[11px] text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 disabled:opacity-50"
            title="Regenerar sugerencias"
          >
            <RefreshCcw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
            Refrescar
          </button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic">Sin sugerencias todavía. Pregunta libremente.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((s, i) => {
              const grad = CATEGORY_STYLE[s.category] ?? 'from-slate-500 to-slate-600';
              return (
                <button
                  key={i}
                  onClick={() => onPick(s.prompt)}
                  className="group/sug flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-md text-left transition-all"
                >
                  <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0 bg-gradient-to-br', grad)}>
                    {s.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-900 leading-snug truncate">{s.label}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-2">{s.prompt}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({
  role, content, streaming = false, onCopy, onRegenerate,
}: {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';
  const copy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.();
  };

  return (
    <div className={cn('flex gap-2 group/bub', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mt-1">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={cn('relative max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed', isUser
        ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-[13px]'
        : 'bg-slate-50 text-slate-800 border border-slate-200 text-[13px]'
      )}>
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <MarkdownLite text={content} />
        )}
        {streaming && <span className="inline-block w-1.5 h-3.5 bg-violet-400 ml-1 animate-pulse" />}

        {!isUser && !streaming && (
          <div className="absolute -bottom-3 right-0 flex items-center gap-1 opacity-0 group-hover/bub:opacity-100 transition-opacity">
            <button
              onClick={copy}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1 shadow-sm"
              title="Copiar"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1 shadow-sm"
                title="Regenerar"
              >
                <RefreshCcw className="w-3 h-3 text-slate-500" />
                Regenerar
              </button>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 shrink-0 rounded-lg bg-slate-200 flex items-center justify-center mt-1">
          <UserIcon className="w-3.5 h-3.5 text-slate-600" />
        </div>
      )}
    </div>
  );
}

/**
 * Tiny markdown renderer — handles ## headings, ### sub-headings,
 * **bold**, paragraphs and `- ` lists. We do this inline to avoid
 * adding a markdown library dep.
 */
function MarkdownLite({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === 'h2') {
          return <h3 key={i} className="text-[14px] font-bold text-slate-900">{renderInline(b.text)}</h3>;
        }
        if (b.type === 'h3') {
          return <h4 key={i} className="text-[13px] font-bold text-slate-800">{renderInline(b.text)}</h4>;
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
            </ul>
          );
        }
        return <p key={i} className="leading-relaxed">{renderInline(b.text)}</p>;
      })}
    </div>
  );
}

interface Block {
  type: 'p' | 'h2' | 'h3' | 'ul';
  text: string;
  items: string[];
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const out: Block[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length > 0) {
      out.push({ type: 'ul', text: '', items: [...listBuf] });
      listBuf = [];
    }
  };
  let paraBuf: string[] = [];
  const flushPara = () => {
    if (paraBuf.length > 0) {
      out.push({ type: 'p', text: paraBuf.join(' '), items: [] });
      paraBuf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+/.test(line)) {
      flushList(); flushPara();
      out.push({ type: 'h2', text: line.replace(/^##\s+/, ''), items: [] });
    } else if (/^###\s+/.test(line)) {
      flushList(); flushPara();
      out.push({ type: 'h3', text: line.replace(/^###\s+/, ''), items: [] });
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      listBuf.push(line.replace(/^[-*]\s+/, ''));
    } else if (line === '') {
      flushList(); flushPara();
    } else {
      flushList();
      paraBuf.push(line);
    }
  }
  flushList();
  flushPara();
  return out;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 pr-7"
        >
          {options.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
