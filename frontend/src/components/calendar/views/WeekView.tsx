'use client';

import { useMemo } from 'react';
import { differenceInMinutes } from 'date-fns';
import {
  EVENT_STYLE, EventLite, formatTime, getWeekDays, isSameDay, isToday, parseISO,
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface Props {
  anchor: Date;
  events: EventLite[];
  onEventClick: (e: EventLite) => void;
  onSlotClick: (d: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 48; // px

export function WeekView({ anchor, events, onEventClick, onSlotClick }: Props) {
  const days = useMemo(() => getWeekDays(anchor), [anchor]);
  const now = new Date();

  const renderEvent = (event: EventLite, day: Date) => {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);
    if (!isSameDay(start, day)) return null;
    const minutesFromMidnight = start.getHours() * 60 + start.getMinutes();
    const duration = Math.max(30, differenceInMinutes(end, start));
    const top = (minutesFromMidnight / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;
    const s = EVENT_STYLE[event.type];
    return (
      <button
        key={event.id}
        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
        className={cn(
          'absolute left-1 right-1 rounded-lg px-2 py-1 text-[11px] text-left transition-all',
          'border-l-[3px] hover:shadow-md hover:scale-[1.02] z-10',
          s.bg, s.text, s.border,
        )}
        style={{ top: `${top}px`, height: `${height}px` }}
        title={`${event.title} — ${formatTime(start)} a ${formatTime(end)}`}
      >
        <div className="font-semibold truncate">{event.title}</div>
        <div className="opacity-70 truncate">{formatTime(start)} — {formatTime(end)}</div>
      </button>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/80">
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="px-2 py-2 text-center border-l border-slate-200">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {d.toLocaleDateString('es-ES', { weekday: 'short' })}
            </div>
            <div
              className={cn(
                'mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold',
                isToday(d)
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm'
                  : 'text-slate-700',
              )}
            >
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-[60px_repeat(7,1fr)] max-h-[70vh] overflow-y-auto">
        <div className="bg-white">
          {HOURS.map((h) => (
            <div key={h} className="text-[10px] text-slate-400 pr-2 text-right" style={{ height: HOUR_HEIGHT }}>
              <span className="-translate-y-1.5 inline-block">{h.toString().padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        {days.map((day) => {
          const showNow = isToday(day);
          const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;
          return (
            <div key={day.toISOString()} className="relative border-l border-slate-200 bg-white">
              {HOURS.map((h) => (
                <div
                  key={h}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onSlotClick(d);
                  }}
                  className="border-b border-slate-100 hover:bg-indigo-50/40 cursor-pointer"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}
              {events.map((e) => renderEvent(e, day))}
              {showNow && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: `${nowTop}px` }}
                >
                  <div className="relative h-px bg-rose-500">
                    <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
