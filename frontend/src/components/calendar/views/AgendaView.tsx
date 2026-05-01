'use client';

import { useMemo } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarOff } from 'lucide-react';
import { EVENT_STYLE, EventLite, formatTime, isToday, parseISO } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface Props {
  anchor: Date;
  events: EventLite[];
  onEventClick: (e: EventLite) => void;
}

export function AgendaView({ anchor, events, onEventClick }: Props) {
  // Build groups: next 30 days starting from anchor.
  const groups = useMemo(() => {
    const days: Array<{ date: Date; events: EventLite[] }> = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(anchor, i);
      const dayEvents = events
        .filter((e) => isSameDay(parseISO(e.startTime), d))
        .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
      if (dayEvents.length > 0) days.push({ date: d, events: dayEvents });
    }
    return days;
  }, [anchor, events]);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm py-20 text-center">
        <CalendarOff className="mx-auto w-10 h-10 text-slate-300" />
        <p className="mt-4 text-sm font-medium text-slate-600">Sin eventos en los próximos 30 días</p>
        <p className="text-xs text-slate-400">Crea uno con el botón de arriba</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ date, events: dayEvents }) => (
        <div key={date.toISOString()}>
          <div className="flex items-baseline gap-3 mb-3">
            <div
              className={cn(
                'flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 shadow-sm',
                isToday(date)
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700',
              )}
            >
              <span className="text-[10px] font-semibold uppercase">
                {format(date, 'EEE', { locale: es })}
              </span>
              <span className="text-lg font-bold leading-none">{date.getDate()}</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700 capitalize">
                {isToday(date) ? 'Hoy' : format(date, "EEEE d 'de' MMMM", { locale: es })}
              </div>
              <div className="text-xs text-slate-400">
                {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
              </div>
            </div>
          </div>
          <div className="space-y-2 pl-15 ml-15">
            {dayEvents.map((event) => {
              const s = EVENT_STYLE[event.type];
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={cn(
                    'w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all',
                    'border-l-[4px] hover:shadow-md hover:scale-[1.005]',
                    s.bg, s.text, s.border,
                  )}
                >
                  <span className="text-2xl leading-none shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{event.title}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {formatTime(parseISO(event.startTime))} — {formatTime(parseISO(event.endTime))}
                      {event.location && <span className="ml-2">📍 {event.location}</span>}
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', s.dot, 'text-white')}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
