'use client';

import { ChevronLeft, ChevronRight, CalendarRange, CalendarDays, Calendar, ListTree } from 'lucide-react';
import { CalendarViewMode, addMonths, addWeeks, subMonths, subWeeks, addDays, formatLong, formatMonth, formatDay } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface Props {
  anchor: Date;
  view: CalendarViewMode;
  onChangeView: (v: CalendarViewMode) => void;
  onAnchorChange: (d: Date) => void;
}

const views: Array<{ id: CalendarViewMode; label: string; icon: typeof Calendar; shortcut: string }> = [
  { id: 'month',  label: 'Mes',     icon: Calendar,      shortcut: 'M' },
  { id: 'week',   label: 'Semana',  icon: CalendarRange, shortcut: 'S' },
  { id: 'day',    label: 'Día',     icon: CalendarDays,  shortcut: 'D' },
  { id: 'agenda', label: 'Agenda',  icon: ListTree,      shortcut: 'A' },
];

export function CalendarHeader({ anchor, view, onChangeView, onAnchorChange }: Props) {
  const goToday = () => onAnchorChange(new Date());
  const goPrev = () => {
    if (view === 'month') onAnchorChange(subMonths(anchor, 1));
    else if (view === 'week' || view === 'agenda') onAnchorChange(subWeeks(anchor, 1));
    else onAnchorChange(addDays(anchor, -1));
  };
  const goNext = () => {
    if (view === 'month') onAnchorChange(addMonths(anchor, 1));
    else if (view === 'week' || view === 'agenda') onAnchorChange(addWeeks(anchor, 1));
    else onAnchorChange(addDays(anchor, 1));
  };

  const title =
    view === 'month'  ? formatMonth(anchor) :
    view === 'week'   ? `Semana del ${formatDay(anchor)}` :
    view === 'day'    ? formatLong(anchor) :
                        `Próximos eventos`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2">
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          Hoy
        </button>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
          <button onClick={goPrev} className="p-1.5 hover:bg-slate-50 transition-colors text-slate-600" aria-label="Anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <button onClick={goNext} className="p-1.5 hover:bg-slate-50 transition-colors text-slate-600" aria-label="Siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <h2 className="ml-1 text-lg font-bold text-slate-900 capitalize">{title}</h2>
      </div>

      <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
        {views.map((v) => {
          const Icon = v.icon;
          const active = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onChangeView(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                active
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
