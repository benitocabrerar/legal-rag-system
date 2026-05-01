'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  EVENT_STYLE, EventLite, formatTime, getMonthGrid, isSameDay, isSameMonth, isToday, parseISO, WEEKDAY_NAMES_LONG,
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface Props {
  anchor: Date;
  events: EventLite[];
  onEventClick: (e: EventLite) => void;
  onDateClick: (d: Date) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
}

function DraggableEvent({ event, onClick }: { event: EventLite; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });
  const style = EVENT_STYLE[event.type] ?? EVENT_STYLE.OTHER;
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'group/ev w-full text-left px-2 py-1 text-[11px] rounded-md truncate transition-all touch-none',
        'border-l-[3px] font-medium',
        style.bg, style.text, style.border,
        'hover:shadow-sm hover:scale-[1.01]',
        isDragging && 'opacity-30',
      )}
      title={`${event.title} — ${formatTime(parseISO(event.startTime))}`}
    >
      <span className="opacity-70 mr-1">{formatTime(parseISO(event.startTime))}</span>
      <span className="truncate">{event.title}</span>
    </button>
  );
}

function DroppableCell({
  date, anchor, events, onEventClick, onDateClick,
}: {
  date: Date; anchor: Date; events: EventLite[];
  onEventClick: (e: EventLite) => void; onDateClick: (d: Date) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date.toISOString(), data: { date } });
  const inMonth = isSameMonth(date, anchor);
  const today = isToday(date);
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.startTime), date));

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDateClick(date)}
      className={cn(
        'group/cell relative flex flex-col min-h-[80px] sm:min-h-[120px] border-r border-b border-slate-200 p-1 sm:p-1.5 cursor-pointer transition-colors',
        inMonth ? 'bg-white' : 'bg-slate-50/40',
        isOver && 'bg-indigo-50 ring-2 ring-inset ring-indigo-500',
        !isOver && 'hover:bg-slate-50',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors',
            today && 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm',
            !today && (inMonth ? 'text-slate-700' : 'text-slate-400'),
          )}
        >
          {date.getDate()}
        </span>
        {dayEvents.length > 0 && (
          <span className="text-[10px] font-semibold text-slate-400 group-hover/cell:text-slate-600">
            {dayEvents.length}
          </span>
        )}
      </div>
      <div className="space-y-0.5 overflow-hidden">
        {dayEvents.slice(0, 3).map((e) => (
          <DraggableEvent key={e.id} event={e} onClick={() => onEventClick(e)} />
        ))}
        {dayEvents.length > 3 && (
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              onDateClick(date);
            }}
            className="w-full text-left text-[10px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-0.5"
          >
            +{dayEvents.length - 3} más
          </button>
        )}
      </div>
    </div>
  );
}

export function MonthView({ anchor, events, onEventClick, onDateClick, onEventDrop }: Props) {
  const grid = useMemo(() => getMonthGrid(anchor), [anchor]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeEvent, setActiveEvent] = useState<EventLite | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const ev = e.active.data.current?.event as EventLite | undefined;
    if (ev) setActiveEvent(ev);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveEvent(null);
    const ev = e.active.data.current?.event as EventLite | undefined;
    const target = e.over?.data.current?.date as Date | undefined;
    if (ev && target && !isSameDay(parseISO(ev.startTime), target)) {
      onEventDrop(ev.id, target);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-200">
          {WEEKDAY_NAMES_LONG.map((d) => (
            <div key={d} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
              <span className="hidden md:inline">{d}</span>
              <span className="md:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.flat().map((date) => (
            <DroppableCell
              key={date.toISOString()}
              date={date}
              anchor={anchor}
              events={events}
              onEventClick={onEventClick}
              onDateClick={onDateClick}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeEvent && (
          <div
            className={cn(
              'pointer-events-none rounded-md px-2 py-1 text-[11px] font-medium shadow-lg',
              EVENT_STYLE[activeEvent.type].bg,
              EVENT_STYLE[activeEvent.type].text,
              'border-l-[3px]',
              EVENT_STYLE[activeEvent.type].border,
            )}
          >
            {format(parseISO(activeEvent.startTime), 'HH:mm', { locale: es })} {activeEvent.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
