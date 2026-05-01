'use client';

import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LitigationBrief } from '@/lib/api';
import { cn } from '@/lib/utils';

const TYPE_GLYPH: Record<string, { icon: string; color: string }> = {
  HEARING:        { icon: '⚖️', color: 'text-violet-400' },
  COURT_DATE:     { icon: '🏛️', color: 'text-indigo-400' },
  DEPOSITION:     { icon: '🎤', color: 'text-orange-400' },
  MEDIATION:      { icon: '🤝', color: 'text-teal-400' },
  MEETING:        { icon: '👥', color: 'text-sky-400' },
  DEADLINE:       { icon: '⏰', color: 'text-rose-400' },
  CONSULTATION:   { icon: '💬', color: 'text-emerald-400' },
  DOCUMENT_FILING:{ icon: '📄', color: 'text-amber-400' },
  OTHER:          { icon: '📌', color: 'text-slate-400' },
};

export function TimelinePanel({ events }: { events: LitigationBrief['timeline'] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-4 text-center">
        <p className="text-xs text-slate-500">Sin eventos en el caso</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 max-h-[55vh] overflow-y-auto">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Cronología</div>
      <ol className="relative space-y-3 ml-3">
        <div className="absolute left-0 top-1 bottom-1 w-px bg-slate-700/60" />
        {events.map((e) => {
          const date = parseISO(e.startTime);
          const past = isPast(date);
          const glyph = TYPE_GLYPH[e.type] ?? TYPE_GLYPH.OTHER;
          return (
            <li key={e.id} className="relative pl-4">
              <span
                className={cn(
                  'absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900',
                  past ? 'bg-slate-600' : 'bg-violet-500 ring-2 ring-violet-500/30',
                )}
              />
              <div className="flex items-baseline gap-2">
                <span className={cn('text-[10px]', glyph.color)}>{glyph.icon}</span>
                <span className={cn('text-[11px] font-semibold', past ? 'text-slate-400' : 'text-slate-100')}>
                  {format(date, "d MMM yyyy · HH:mm", { locale: es })}
                </span>
              </div>
              <div className={cn('text-[12px] mt-0.5', past ? 'text-slate-500' : 'text-slate-200')}>
                {e.title}
              </div>
              {e.description && (
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{e.description}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
