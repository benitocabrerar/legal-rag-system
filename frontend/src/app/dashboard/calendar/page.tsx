'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '@/lib/api';
import { Event, CreateEventData } from '@/types/calendar';
import { ALL_EVENT_TYPES, CalendarViewMode, EventType, moveEventToDate } from '@/lib/calendar-utils';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { MonthView } from '@/components/calendar/views/MonthView';
import { WeekView } from '@/components/calendar/views/WeekView';
import { DayView } from '@/components/calendar/views/DayView';
import { AgendaView } from '@/components/calendar/views/AgendaView';
import { EventDialog } from '@/components/calendar/EventDialog';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<CalendarViewMode>('month');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [enabledTypes, setEnabledTypes] = useState<Set<EventType>>(new Set(ALL_EVENT_TYPES));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsAPI.list(),
  });

  useRealtimeTable({ table: 'events', invalidateKeys: [['events']] });
  const allEvents: Event[] = data?.events || [];
  const events = useMemo(
    () => allEvents.filter((e) => enabledTypes.has(e.type as EventType)),
    [allEvents, enabledTypes],
  );

  const countsByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of allEvents) m[e.type] = (m[e.type] ?? 0) + 1;
    return m;
  }, [allEvents]);

  const createMut = useMutation({
    mutationFn: (d: CreateEventData) => eventsAPI.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeDialog();
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventData> }) => eventsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeDialog();
    },
  });

  const openCreate = (d?: Date) => { setSelectedEvent(null); setDefaultDate(d); setIsDialogOpen(true); };
  const openEdit = (event: Event) => { setSelectedEvent(event); setDefaultDate(undefined); setIsDialogOpen(true); };
  const closeDialog = () => { setIsDialogOpen(false); setSelectedEvent(null); setDefaultDate(undefined); };

  const handleSave = async (d: CreateEventData) => {
    if (selectedEvent) await updateMut.mutateAsync({ id: selectedEvent.id, data: d });
    else await createMut.mutateAsync(d);
  };

  const handleEventDrop = (eventId: string, newDate: Date) => {
    const event = allEvents.find((e) => e.id === eventId);
    if (!event) return;
    const next = moveEventToDate(event as any, newDate);
    // Optimistic update
    queryClient.setQueryData<{ events: Event[] }>(['events'], (prev) =>
      prev ? { ...prev, events: prev.events.map((e) => (e.id === eventId ? { ...e, ...next } : e)) } : prev,
    );
    updateMut.mutate({ id: eventId, data: next });
  };

  // Honor Cmd+K deep links: ?new=1, ?view=day|week|month|agenda, ?today=1
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const v = searchParams.get('view');
    if (v === 'month' || v === 'week' || v === 'day' || v === 'agenda') setView(v);
    if (searchParams.get('today') === '1') setAnchor(new Date());
    if (searchParams.get('new') === '1') openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keyboard shortcuts: M/S/D/A
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'm') setView('month');
      else if (k === 's' || k === 'w') setView('week');
      else if (k === 'd') setView('day');
      else if (k === 'a') setView('agenda');
      else if (k === 't') setAnchor(new Date());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleType = (t: EventType) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 to-white">
      <CalendarSidebar
        selected={anchor}
        onSelect={(d) => { setAnchor(d); if (view === 'month') setView('day'); }}
        events={allEvents as any}
        enabledTypes={enabledTypes}
        onToggleType={toggleType}
        onCreate={() => openCreate()}
        countsByType={countsByType}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendario</h1>
            <p className="text-sm text-slate-500">Audiencias, plazos y reuniones — atajos: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">M</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">S</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">D</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">A</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">T</kbd>oday</p>
          </div>
        </div>

        <CalendarHeader anchor={anchor} view={view} onChangeView={setView} onAnchorChange={setAnchor} />

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-200 border-t-indigo-600"></div>
          </div>
        ) : (
          <>
            {view === 'month'  && <MonthView  anchor={anchor} events={events as any} onEventClick={openEdit as any} onDateClick={openCreate} onEventDrop={handleEventDrop} />}
            {view === 'week'   && <WeekView   anchor={anchor} events={events as any} onEventClick={openEdit as any} onSlotClick={openCreate} />}
            {view === 'day'    && <DayView    anchor={anchor} events={events as any} onEventClick={openEdit as any} onSlotClick={openCreate} />}
            {view === 'agenda' && <AgendaView anchor={anchor} events={events as any} onEventClick={openEdit as any} />}
          </>
        )}

        <EventDialog
          isOpen={isDialogOpen}
          onClose={closeDialog}
          onSave={handleSave}
          event={selectedEvent}
          defaultDate={defaultDate}
        />
      </main>
    </div>
  );
}
