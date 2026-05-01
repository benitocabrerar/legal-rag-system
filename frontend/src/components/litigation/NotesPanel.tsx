'use client';

import { useEffect, useRef, useState } from 'react';
import { NotebookPen, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const KEY = (caseId: string) => `litigation-notes:${caseId}`;

export function NotesPanel({ caseId }: { caseId: string }) {
  const [value, setValue] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSavedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(KEY(caseId));
    if (raw) setValue(raw);
  }, [caseId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      window.localStorage.setItem(KEY(caseId), value);
      setSavedAt(new Date());
      setShowSaved(true);
      if (showSavedRef.current) clearTimeout(showSavedRef.current);
      showSavedRef.current = setTimeout(() => setShowSaved(false), 1500);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, caseId]);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 flex flex-col h-full min-h-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <NotebookPen className="w-3.5 h-3.5 text-amber-400" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Notas en vivo</div>
        </div>
        <span className={cn('text-[10px] inline-flex items-center gap-1 transition-opacity',
          showSaved ? 'text-emerald-400 opacity-100' : 'text-slate-500 opacity-60')}>
          {showSaved ? <><Check className="w-3 h-3" /> Guardado</> : savedAt ? <><Save className="w-3 h-3" /> Auto-guardado</> : null}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anota lo que dice el fiscal, el juez o lo que necesites recordar para tu turno…"
        className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed"
      />
    </div>
  );
}
