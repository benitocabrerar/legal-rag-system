'use client';

import { Event } from '@/types/calendar';
import { EventBadge } from './EventBadge';
import { formatDateTime } from '@/lib/utils';
import { Clock, MapPin, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventListProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  className?: string;
}

export function EventList({ events, onEventClick, className }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200 p-8', className)}>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            No hay eventos
          </p>
          <p className="text-sm text-gray-500">
            Los eventos que crees aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {events.map((event) => (
        <div
          key={event.id}
          onClick={() => onEventClick?.(event)}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {event.title}
              </h3>
              {event.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
            <div className="ml-4 flex flex-col gap-2">
              <EventBadge type={event.type} />
              <EventBadge status={event.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{formatDateTime(event.startTime)}</span>
            </div>

            {event.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {event.meetingLink && (
              <div className="flex items-center gap-2 text-gray-600">
                <Video className="w-4 h-4 text-gray-400" />
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-indigo-600 hover:text-indigo-700 hover:underline truncate"
                >
                  Unirse a la reunión
                </a>
              </div>
            )}
          </div>

          {event.case && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Caso asociado:</span>
                <span className="text-gray-900 font-medium">
                  {event.case.title} - {event.case.clientName}
                </span>
              </div>
            </div>
          )}

          {event.participants && event.participants.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Participantes:</span>
                <div className="flex -space-x-2">
                  {event.participants.slice(0, 3).map((participant, index) => (
                    <div
                      key={participant.id}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                      title={participant.name || participant.email}
                    >
                      {(participant.name || participant.email || '?')[0].toUpperCase()}
                    </div>
                  ))}
                  {event.participants.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                      +{event.participants.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
