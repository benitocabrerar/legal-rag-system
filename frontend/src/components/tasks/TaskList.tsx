'use client';

import { Task } from '@/types/tasks';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { ListTodo } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  className?: string;
}

export function TaskList({ tasks, onTaskClick, className }: TaskListProps) {
  const activeTasks = tasks.filter((task) => !task.isArchived);

  if (activeTasks.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200 p-8', className)}>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <ListTodo className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">No hay tareas</p>
          <p className="text-sm text-gray-500">
            Las tareas que crees aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {activeTasks.map((task) => (
        <TaskCard key={task.id} task={task} onClick={onTaskClick} />
      ))}
    </div>
  );
}
