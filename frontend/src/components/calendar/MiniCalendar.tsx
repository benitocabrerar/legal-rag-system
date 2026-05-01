'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  EventLite, addMonths, formatMonth, getMonthGrid, isSameDay, isSameMonth, isToday, subMonths, WEEKDAY_NAMES,
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface Props {
  selected: Date;
  onSelect: (date: Date) => void;
  events?: EventLite[];
}

export function MiniCalendar({ selected, onSelect, events = [] }: Props) {
  const [anchor, setAnchor] = useState(selected);
  const grid = useMemo(() => getMonthGrid(anchor), [anchor]);
  const dayHasEvent = (d: Date) =>
    events.some((e) => isSameDay(new Date(e.startTime), d));

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[13px] font-semibold capitalize text-slate-800">{formatMonth(anchor)}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setAnchor((a) => subMonths(a, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500" aria-label="Mes anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setAnchor((a) => addMonths(a, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500" aria-label="Mes siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {WEEKDAY_NAMES.map((d) => (
          <div key={d} className="text-[10px] font-medium text-slate-400 text-center py-1">{d.charAt(0)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {grid.flat().map((d, i) => {
          const inMonth = isSameMonth(d, anchor);
          const sel = isSameDay(d, selected);
          const today = isToday(d);
          const hasE = dayHasEvent(d);
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className={cn(
                'relative h-7 w-full text-[11px] rounded-md transition-colors',
                inMonth ? 'text-slate-700' : 'text-slate-300',
                today && !sel && 'font-bold text-indigo-600',
                sel && 'bg-indigo-600 text-white font-semibold hover:bg-indigo-700',
                !sel && 'hover:bg-slate-100',
              )}
            >
              {d.getDate()}
              {hasE && !sel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
