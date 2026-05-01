'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Argument {
  id: string;
  text: string;
  done: boolean;
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
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Argumentos</div>
          <div className="text-[10px] text-slate-500">
            {completed}/{items.length} expuestos · se guarda automáticamente
          </div>
        </div>
        <div className="text-xs font-bold text-slate-300 tabular-nums">
          {items.length === 0 ? 0 : Math.round((completed / items.length) * 100)}%
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
