'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI, parseApiError } from '@/lib/api';
import { Event, CreateEventData } from '@/types/calendar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventList } from '@/components/calendar/EventList';
import { EventDialog } from '@/components/calendar/EventDialog';
import { Plus, Calendar, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'calendar' | 'list';

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Fetch events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsAPI.list(),
  });

  const events: Event[] = eventsData?.events || [];

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventData) => eventsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      setSelectedDate(undefined);
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventData> }) =>
      eventsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      setSelectedDate(undefined);
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => eventsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvent(null);
    },
  });

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(undefined);
    setIsEventDialogOpen(true);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = async (data: CreateEventData) => {
    if (selectedEvent) {
      await updateEventMutation.mutateAsync({
        id: selectedEvent.id,
        data,
      });
    } else {
      await createEventMutation.mutateAsync(data);
    }
  };

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tus reuniones, audiencias y fechas importantes
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'px-4 py-2 text-sm font-medium border rounded-l-lg',
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Calendario
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg',
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              <List className="w-4 h-4 inline mr-2" />
              Lista
            </button>
          </div>

          {/* Create event button */}
          <button
            onClick={handleCreateEvent}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo evento
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Calendar/List view */}
      {!isLoading && (
        <>
          {viewMode === 'calendar' ? (
            <CalendarView
              events={events}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
            />
          ) : (
            <>
              {sortedEvents.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No hay eventos
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza creando un nuevo evento.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={handleCreateEvent}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo evento
                    </button>
                  </div>
                </div>
              ) : (
                <EventList events={sortedEvents} onEventClick={handleEventClick} />
              )}
            </>
          )}
        </>
      )}

      {/* Event Dialog */}
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => {
          setIsEventDialogOpen(false);
          setSelectedEvent(null);
          setSelectedDate(undefined);
        }}
        onSave={handleSaveEvent}
        event={selectedEvent}
        defaultDate={selectedDate}
      />
    </div>
  );
}
