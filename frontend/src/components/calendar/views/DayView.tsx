'use client';

import { differenceInMinutes } from 'date-fns';
import {
  EVENT_STYLE, EventLite, formatLong, formatTime, isSameDay, isToday, parseISO,
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface Props {
  anchor: Date;
  events: EventLite[];
  onEventClick: (e: EventLite) => void;
  onSlotClick: (d: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64;

export function DayView({ anchor, events, onEventClick, onSlotClick }: Props) {
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.startTime), anchor));
  const now = new Date();
  const showNow = isToday(anchor);
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
          {isToday(anchor) ? 'Hoy' : 'Día seleccionado'}
        </div>
        <div className="text-xl font-bold text-slate-900 capitalize">{formatLong(anchor)}</div>
        <div className="text-sm text-slate-500 mt-0.5">{dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}</div>
      </div>

      <div className="relative grid grid-cols-[80px_1fr] max-h-[75vh] overflow-y-auto">
        <div className="bg-slate-50/40">
          {HOURS.map((h) => (
            <div key={h} className="text-[11px] text-slate-400 pr-3 text-right" style={{ height: HOUR_HEIGHT }}>
              <span className="-translate-y-2 inline-block">{h.toString().padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        <div className="relative border-l border-slate-200">
          {HOURS.map((h) => (
            <div
              key={h}
              onClick={() => {
                const d = new Date(anchor); d.setHours(h, 0, 0, 0);
                onSlotClick(d);
              }}
              className="border-b border-slate-100 hover:bg-indigo-50/40 cursor-pointer"
              style={{ height: HOUR_HEIGHT }}
            />
          ))}
          {dayEvents.map((event) => {
            const start = parseISO(event.startTime);
            const end = parseISO(event.endTime);
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
                  'absolute left-2 right-4 rounded-xl px-4 py-2.5 text-left z-10',
                  'border-l-[4px] shadow-sm hover:shadow-lg hover:scale-[1.005] transition-all',
                  s.bg, s.text, s.border,
                )}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm leading-tight">{event.title}</div>
                  <span className="text-base leading-none">{s.icon}</span>
                </div>
                <div className="text-[12px] mt-0.5 opacity-80 font-medium">
                  {formatTime(start)} — {formatTime(end)}
                </div>
                {event.location && (
                  <div className="text-[11px] mt-0.5 opacity-70 truncate">📍 {event.location}</div>
                )}
              </button>
            );
          })}
          {showNow && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${nowTop}px` }}>
              <div className="relative h-0.5 bg-rose-500">
                <div className="absolute -left-1.5 -top-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white shadow" />
                <div className="absolute right-2 -top-5 text-[10px] font-semibold text-rose-600 bg-white px-1.5 rounded">
                  {formatTime(now)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
