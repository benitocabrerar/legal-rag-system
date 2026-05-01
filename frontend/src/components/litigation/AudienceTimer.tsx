'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AudienceTimer() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef<number | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      startedAt.current = Date.now() - elapsedMs;
      tick.current = setInterval(() => {
        if (startedAt.current) setElapsedMs(Date.now() - startedAt.current);
      }, 250);
    } else {
      if (tick.current) clearInterval(tick.current);
    }
    return () => { if (tick.current) clearInterval(tick.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const reset = () => {
    setRunning(false);
    setElapsedMs(0);
    startedAt.current = null;
  };

  const fmt = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-slate-900/60 border border-slate-700 rounded-lg pl-2 pr-1 py-1">
      <Timer className={cn('w-3.5 h-3.5', running ? 'text-rose-400 animate-pulse' : 'text-slate-500')} />
      <span className="font-mono text-sm font-bold text-slate-100 tabular-nums min-w-[44px] text-center">
        {fmt(elapsedMs)}
      </span>
      <button
        onClick={() => setRunning((v) => !v)}
        className={cn(
          'h-6 w-6 rounded flex items-center justify-center transition-colors',
          running ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300',
        )}
        title={running ? 'Pausar' : 'Iniciar'}
      >
        {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
      <button
        onClick={reset}
        disabled={elapsedMs === 0}
        className="h-6 w-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 disabled:opacity-30"
        title="Reiniciar"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  );
}
