import { TaskStatus, TaskPriority } from '@/types/tasks';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      status: {
        TODO: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        DONE: 'bg-green-50 text-green-700 ring-green-600/20',
        CANCELLED: 'bg-red-50 text-red-700 ring-red-600/20',
      },
    },
    defaultVariants: {
      status: 'TODO',
    },
  }
);

const priorityVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      priority: {
        LOW: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        MEDIUM: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        HIGH: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        URGENT: 'bg-red-50 text-red-700 ring-red-600/20',
      },
    },
    defaultVariants: {
      priority: 'MEDIUM',
    },
  }
);

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  CANCELLED: 'Cancelado',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  return (
    <span className={cn(statusVariants({ status }), className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  return (
    <span className={cn(priorityVariants({ priority }), className)}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
