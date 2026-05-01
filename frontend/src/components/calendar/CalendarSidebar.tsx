'use client';

import { Plus } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { ALL_EVENT_TYPES, EVENT_STYLE, EventLite, EventType } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface Props {
  selected: Date;
  onSelect: (date: Date) => void;
  events: EventLite[];
  enabledTypes: Set<EventType>;
  onToggleType: (t: EventType) => void;
  onCreate: () => void;
  countsByType: Record<string, number>;
}

export function CalendarSidebar({
  selected, onSelect, events, enabledTypes, onToggleType, onCreate, countsByType,
}: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-slate-200 bg-white/60 backdrop-blur p-4 gap-6">
      <button
        onClick={onCreate}
        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <Plus className="w-4 h-4" />
        Crear evento
      </button>

      <MiniCalendar selected={selected} onSelect={onSelect} events={events} />

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3 px-1">
          Tipos de evento
        </h3>
        <div className="space-y-1">
          {ALL_EVENT_TYPES.map((t) => {
            const s = EVENT_STYLE[t];
            const enabled = enabledTypes.has(t);
            const count = countsByType[t] ?? 0;
            return (
              <button
                key={t}
                onClick={() => onToggleType(t)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] transition-all',
                  enabled ? 'hover:bg-slate-100' : 'opacity-40 hover:opacity-60 hover:bg-slate-50',
                )}
              >
                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', s.dot)} />
                <span className="text-base leading-none">{s.icon}</span>
                <span className="flex-1 text-left text-slate-700 font-medium">{s.label}</span>
                {count > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
