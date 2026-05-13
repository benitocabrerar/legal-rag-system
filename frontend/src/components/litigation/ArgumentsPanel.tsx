'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Argument {
  id: string;
  text: string;
  done: boolean;
  /** True si el item fue agregado por sugerencia de la IA (cerebro del caso). */
  fromAI?: boolean;
}

const STORAGE_KEY = (caseId: string) => `litigation-args:${caseId}`;

const SEED_BY_CASE: Argument[] = [
  { id: '1', text: 'Identificar a las partes y representación legal', done: false },
  { id: '2', text: 'Resumir los hechos y la pretensión', done: false },
  { id: '3', text: 'Citar fundamento constitucional aplicable', done: false },
  { id: '4', text: 'Exponer pruebas documentales', done: false },
  { id: '5', text: 'Refutar los argumentos contrarios', done: false },
  { id: '6', text: 'Solicitar al tribunal la pretensión final', done: false },
];

export function ArgumentsPanel({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<Argument[]>([]);
  const [draft, setDraft] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Trae las "nextActions" del cerebro del caso y las suma como argumentos
   *  nuevos al checklist, evitando duplicados con los que ya están. */
  const suggestFromBrain = async () => {
    setSuggesting(true);
    try {
      const token = await getAuthToken();
      const r = await fetch(`${API_URL}/api/v1/cases/${caseId}/brain`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return;
      const data = await r.json();
      const brain = data?.full || data?.brain || data;
      const next: Array<{ action: string }> = Array.isArray(brain?.nextActions) ? brain.nextActions : [];
      const keyFacts: string[] = Array.isArray(brain?.keyFacts) ? brain.keyFacts : [];
      const sugerencias = [
        ...next.map((a) => a.action).filter(Boolean),
        ...keyFacts.slice(0, 4),
      ].filter((s) => typeof s === 'string' && s.length > 8 && s.length < 200);
      if (sugerencias.length === 0) return;
      setItems((prev) => {
        const existing = new Set(prev.map((p) => p.text.toLowerCase().trim()));
        const nuevos = sugerencias
          .filter((s) => !existing.has(s.toLowerCase().trim()))
          .slice(0, 8)
          .map((text) => ({ id: crypto.randomUUID(), text, done: false, fromAI: true }));
        return [...prev, ...nuevos];
      });
    } catch { /* silencioso */ }
    finally { setSuggesting(false); }
  };

  // Load from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY(caseId));
    if (raw) {
      try { setItems(JSON.parse(raw)); return; } catch { /* fall-through */ }
    }
    setItems(SEED_BY_CASE);
  }, [caseId]);

  // Persist on change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (items.length > 0) {
      window.localStorage.setItem(STORAGE_KEY(caseId), JSON.stringify(items));
    }
  }, [items, caseId]);

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setItems((p) => [...p, { id: crypto.randomUUID(), text: t, done: false }]);
    setDraft('');
    inputRef.current?.focus();
  };

  const toggle = (id: string) => setItems((p) => p.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  const remove = (id: string) => setItems((p) => p.filter((it) => it.id !== id));

  const completed = items.filter((i) => i.done).length;

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Argumentos</div>
          <div className="text-[10px] text-slate-500">
            {completed}/{items.length} expuestos · se guarda automáticamente
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => void suggestFromBrain()}
            disabled={suggesting}
            title="Sumar argumentos sugeridos por el cerebro del caso (IA)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-violet-200 bg-gradient-to-r from-violet-600/40 to-fuchsia-600/40 hover:from-violet-600/70 hover:to-fuchsia-600/70 border border-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>{suggesting ? 'Pidiendo IA…' : 'Sugerir IA'}</span>
          </button>
          <div className="text-xs font-bold text-slate-300 tabular-nums">
            {items.length === 0 ? 0 : Math.round((completed / items.length) * 100)}%
          </div>
        </div>
      </div>

      <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          style={{ width: `${items.length === 0 ? 0 : (completed / items.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto">
        {items.map((it) => (
          <li
            key={it.id}
            className={cn(
              'group flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors',
              it.done ? 'bg-emerald-500/10' : 'bg-slate-800/40 hover:bg-slate-800/70',
            )}
          >
            <button onClick={() => toggle(it.id)} className="shrink-0 mt-0.5">
              {it.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 hover:text-violet-400 transition-colors" />
              )}
            </button>
            <span
              className={cn(
                'flex-1 text-[12px] leading-snug',
                it.done ? 'text-slate-500 line-through' : 'text-slate-200',
              )}
            >
              {it.text}
            </span>
            <button
              onClick={() => remove(it.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all"
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Añadir argumento…"
          className="flex-1 px-2 py-1.5 text-[12px] bg-slate-800/60 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/50"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center transition-all',
            draft.trim()
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed',
          )}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
