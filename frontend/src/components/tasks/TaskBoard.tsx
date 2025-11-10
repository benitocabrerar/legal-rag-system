'use client';

import { Task, TaskStatus } from '@/types/tasks';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  className?: string;
}

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'TODO', label: 'Por hacer', color: 'bg-gray-100' },
  { status: 'IN_PROGRESS', label: 'En progreso', color: 'bg-blue-100' },
  { status: 'DONE', label: 'Completado', color: 'bg-green-100' },
];

export function TaskBoard({ tasks, onTaskClick, onStatusChange, className }: TaskBoardProps) {
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status && !task.isArchived);
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      {COLUMNS.map((column) => {
        const columnTasks = getTasksByStatus(column.status);

        return (
          <div key={column.status} className="flex flex-col">
            <div className={cn('rounded-t-lg px-4 py-3', column.color)}>
              <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                <span>{column.label}</span>
                <span className="text-sm font-normal text-gray-600">
                  {columnTasks.length}
                </span>
              </h3>
            </div>

            <div className="flex-1 bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[400px]">
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                  No hay tareas
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
