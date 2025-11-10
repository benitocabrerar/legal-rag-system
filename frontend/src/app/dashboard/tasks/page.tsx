'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '@/lib/api';
import { Task, CreateTaskData, TaskStatus } from '@/types/tasks';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksAPI.list(),
  });

  const tasks: Task[] = tasksData?.tasks || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => tasksAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskDialogOpen(false);
      setSelectedTask(null);
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskData> }) =>
      tasksAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskDialogOpen(false);
      setSelectedTask(null);
    },
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
    },
  });

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskDialogOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleSaveTask = async (data: CreateTaskData) => {
    if (selectedTask) {
      await updateTaskMutation.mutateAsync({
        id: selectedTask.id,
        data,
      });
    } else {
      await createTaskMutation.mutateAsync(data);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tus tareas y listas de verificación
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setViewMode('board')}
              className={cn(
                'px-4 py-2 text-sm font-medium border rounded-l-lg',
                viewMode === 'board'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              <LayoutGrid className="w-4 h-4 inline mr-2" />
              Tablero
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
              <LayoutList className="w-4 h-4 inline mr-2" />
              Lista
            </button>
          </div>

          {/* Create task button */}
          <button
            onClick={handleCreateTask}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Board/List view */}
      {!isLoading && (
        <>
          {viewMode === 'board' ? (
            <TaskBoard
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <>
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <LayoutList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay tareas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza creando una nueva tarea.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={handleCreateTask}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva tarea
                    </button>
                  </div>
                </div>
              ) : (
                <TaskList tasks={tasks} onTaskClick={handleTaskClick} />
              )}
            </>
          )}
        </>
      )}

      {/* Task Dialog */}
      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        task={selectedTask}
      />
    </div>
  );
}
