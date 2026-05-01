'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Volume2, VolumeX, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuthToken } from '@/lib/get-auth-token';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  caseId: string;
  /** Optional quick-prompts shown above the input. */
  suggestions?: string[];
}

/**
 * Streaming chat using native fetch + SSE parsing. We POST the body so
 * EventSource isn't enough — the runtime is the same browser-streaming
 * pattern used elsewhere in the app, just inline here.
 */
export function LitigationChat({ caseId, suggestions }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [partial, setPartial] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, partial]);

  const speak = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'es-EC';
      utt.rate = 1.0;
      window.speechSynthesis.speak(utt);
    } catch { /* ignore */ }
  };

  const sendMessage = async (override?: string) => {
    const message = (override ?? input).trim();
    if (!message || isStreaming) return;

    const newHistory = [...history, { role: 'user' as const, content: message }];
    setHistory(newHistory);
    setInput('');
    setError('');
    setIsStreaming(true);
    setPartial('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/cases/${caseId}/litigation-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames separated by \n\n.
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = frame.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
            else if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              try {
                const json = JSON.parse(data);
                if (currentEvent === 'chunk' && json.content) {
                  acc += json.content;
                  setPartial(acc);
                } else if (currentEvent === 'error') {
                  setError(json.message || 'Error de IA');
                } else if (currentEvent === 'done') {
                  // handled when the stream ends
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }

      if (acc) {
        setHistory((h) => [...h, { role: 'assistant', content: acc }]);
        speak(acc);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message ?? 'Error en la conexión');
    } finally {
      setIsStreaming(false);
      setPartial('');
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const clear = () => {
    setHistory([]);
    setPartial('');
    setError('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100">Asistente IA</div>
            <div className="text-[10px] text-slate-400">Caso pre-cargado en contexto</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            title={ttsEnabled ? 'Desactivar voz' : 'Activar voz'}
            className={cn(
              'p-1.5 rounded transition-colors',
              ttsEnabled ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50',
            )}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={clear}
            disabled={history.length === 0}
            title="Limpiar conversación"
            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950/40">
        {history.length === 0 && !partial && (
          <div className="py-8 text-center">
            <Sparkles className="w-8 h-8 mx-auto text-violet-500/60" />
            <p className="mt-2 text-xs text-slate-400">
              Pregunta lo que necesites. Yo conozco el caso.
            </p>
          </div>
        )}
        {history.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {partial && <ChatBubble role="assistant" content={partial} streaming />}
        {error && (
          <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {suggestions && suggestions.length > 0 && history.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-[10px] px-2 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-2 border-t border-slate-700/50 bg-slate-900/60">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); sendMessage();
              }
            }}
            placeholder="Pregunta o pide un argumento…"
            rows={2}
            className="flex-1 resize-none px-3 py-2 text-sm bg-slate-800/60 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50"
          />
          {isStreaming ? (
            <button
              onClick={stop}
              className="h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-rose-500/30"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Detener
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className={cn(
                'h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all',
                input.trim()
                  ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed',
              )}
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, content, streaming = false }: { role: 'user' | 'assistant'; content: string; streaming?: boolean }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white'
            : 'bg-slate-800/70 text-slate-100 border border-slate-700/50',
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        {streaming && <span className="inline-block w-1.5 h-3 bg-violet-400 ml-1 animate-pulse" />}
      </div>
    </div>
  );
}
