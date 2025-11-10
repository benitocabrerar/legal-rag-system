import { EventType, EventStatus } from '@/types/calendar';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const eventTypeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      type: {
        MEETING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        HEARING: 'bg-purple-50 text-purple-700 ring-purple-600/20',
        DEADLINE: 'bg-red-50 text-red-700 ring-red-600/20',
        CONSULTATION: 'bg-green-50 text-green-700 ring-green-600/20',
        COURT_DATE: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
        DOCUMENT_FILING: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        MEDIATION: 'bg-teal-50 text-teal-700 ring-teal-600/20',
        DEPOSITION: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        OTHER: 'bg-gray-50 text-gray-700 ring-gray-600/20',
      },
    },
    defaultVariants: {
      type: 'OTHER',
    },
  }
);

const eventStatusVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      status: {
        SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        CONFIRMED: 'bg-green-50 text-green-700 ring-green-600/20',
        CANCELLED: 'bg-red-50 text-red-700 ring-red-600/20',
        COMPLETED: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        RESCHEDULED: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        NO_SHOW: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      },
    },
    defaultVariants: {
      status: 'SCHEDULED',
    },
  }
);

interface EventBadgeProps {
  type?: EventType;
  status?: EventStatus;
  className?: string;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  MEETING: 'Reunión',
  HEARING: 'Audiencia',
  DEADLINE: 'Fecha límite',
  CONSULTATION: 'Consulta',
  COURT_DATE: 'Fecha de corte',
  DOCUMENT_FILING: 'Presentación de documentos',
  MEDIATION: 'Mediación',
  DEPOSITION: 'Deposición',
  OTHER: 'Otro',
};

const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  SCHEDULED: 'Programado',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
  RESCHEDULED: 'Reprogramado',
  NO_SHOW: 'No asistió',
};

export function EventBadge({ type, status, className }: EventBadgeProps) {
  if (type) {
    return (
      <span className={cn(eventTypeVariants({ type }), className)}>
        {EVENT_TYPE_LABELS[type]}
      </span>
    );
  }

  if (status) {
    return (
      <span className={cn(eventStatusVariants({ status }), className)}>
        {EVENT_STATUS_LABELS[status]}
      </span>
    );
  }

  return null;
}
