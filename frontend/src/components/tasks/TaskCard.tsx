'use client';

import { Task } from '@/types/tasks';
import { TaskStatusBadge, TaskPriorityBadge } from './TaskBadges';
import { formatDate } from '@/lib/utils';
import { Calendar, CheckSquare, Clock, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  className?: string;
}

export function TaskCard({ task, onClick, className }: TaskCardProps) {
  const completedItems = task.checklistItems?.filter((item) => item.completed).length || 0;
  const totalItems = task.checklistItems?.length || 0;
  const hasChecklist = totalItems > 0;

  const isOverdue =
    task.dueDate && task.status !== 'DONE' && task.status !== 'CANCELLED'
      ? new Date(task.dueDate) < new Date()
      : false;

  return (
    <div
      onClick={() => onClick?.(task)}
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer',
        isOverdue && 'border-red-300 bg-red-50/30',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="ml-3 flex flex-col gap-1.5">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {task.dueDate && (
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className={cn('w-3.5 h-3.5', isOverdue && 'text-red-600')} />
            <span className={cn(isOverdue && 'text-red-600 font-medium')}>
              Vence: {formatDate(task.dueDate)}
            </span>
            {isOverdue && (
              <span className="text-red-600 font-medium">(Vencido)</span>
            )}
          </div>
        )}

        {hasChecklist && (
          <div className="flex items-center gap-2 text-gray-600">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>
              {completedItems}/{totalItems} tareas completadas
            </span>
            {completedItems === totalItems && totalItems > 0 && (
              <span className="text-green-600">✓</span>
            )}
          </div>
        )}

        {task.case && (
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate">
              {task.case.title} - {task.case.clientName}
            </span>
          </div>
        )}

        {task.assignedTo && (
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-3.5 h-3.5" />
            <span>{task.assignedTo.name}</span>
          </div>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
