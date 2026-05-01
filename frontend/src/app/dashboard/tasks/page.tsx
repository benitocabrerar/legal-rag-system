'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '@/lib/api';
import { Task, CreateTaskData, TaskStatus } from '@/types/tasks';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { TaskFilters, FiltersState } from '@/components/tasks/TaskFilters';
import { TemplatesDialog } from '@/components/tasks/TemplatesDialog';
import { WorkloadInsights } from '@/components/tasks/WorkloadInsights';
import { Plus, LayoutList, LayoutGrid, Sparkles, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, parseISO } from 'date-fns';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

type ViewMode = 'list' | 'board';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<FiltersState>({
    priority: 'ALL',
    overdueOnly: false,
    unassignedOnly: false,
    search: '',
  });

  // Honor Cmd+K deep links: ?new=1, ?templates=1, ?filter=overdue
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    if (searchParams.get('new') === '1') {
      setSelectedTask(null);
      setIsTaskDialogOpen(true);
    }
    if (searchParams.get('templates') === '1') {
      setIsTemplatesOpen(true);
    }
    if (searchParams.get('filter') === 'overdue') {
      setFilters((f) => ({ ...f, overdueOnly: true }));
    }
  }, [searchParams]);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksAPI.list(),
  });

  useRealtimeTable({
    table: 'tasks',
    invalidateKeys: [['tasks'], ['tasks-insights']],
  });
  const allTasks: Task[] = tasksData?.tasks || [];

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['tasks-insights'],
    queryFn: () => tasksAPI.insights(),
    refetchInterval: 60_000,
  });

  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (filters.priority !== 'ALL' && t.priority !== filters.priority) return false;
      if (filters.overdueOnly) {
        if (!t.dueDate) return false;
        if (!isPast(parseISO(t.dueDate))) return false;
        if (t.status === 'DONE') return false;
      }
      if (filters.unassignedOnly && t.assignedToId) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${t.title} ${t.description ?? ''} ${t.tags?.join(' ') ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allTasks, filters]);

  const createMut = useMutation({
    mutationFn: (data: CreateTaskData) => tasksAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-insights'] });
      setIsTaskDialogOpen(false);
      setSelectedTask(null);
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskData> }) => tasksAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-insights'] });
      setIsTaskDialogOpen(false);
      setSelectedTask(null);
    },
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksAPI.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<{ tasks: Task[] }>(['tasks']);
      queryClient.setQueryData<{ tasks: Task[] }>(['tasks'], (cur) =>
        cur ? { ...cur, tasks: cur.tasks.map((t) => (t.id === id ? { ...t, status } : t)) } : cur,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-insights'] });
    },
  });

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskDialogOpen(true);
  };
  const handleTaskClick = (t: Task) => {
    setSelectedTask(t);
    setIsTaskDialogOpen(true);
  };
  const handleSaveTask = async (data: CreateTaskData) => {
    if (selectedTask) await updateMut.mutateAsync({ id: selectedTask.id, data });
    else await createMut.mutateAsync(data);
  };
  const handleStatusChange = (taskId: string, status: TaskStatus) =>
    statusMut.mutate({ id: taskId, status });
  const handleQuickAdd = (status: TaskStatus, title: string) => {
    createMut.mutate({ title, priority: 'MEDIUM', status });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 bg-gradient-to-br from-slate-50 to-white min-h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tareas</h1>
          <p className="text-sm text-slate-500 hidden sm:block">
            Tablero kanban con drag-and-drop, sugerencias con IA y plantillas legales
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-violet-500" />
            Plantillas
          </button>
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('board')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors',
                viewMode === 'board'
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Tablero
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors',
                viewMode === 'list'
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <LayoutList className="w-4 h-4" /> Lista
            </button>
          </div>
          <button
            onClick={handleCreateTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva tarea
          </button>
        </div>
      </div>

      <WorkloadInsights data={insights} isLoading={insightsLoading} />

      <TaskFilters value={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-200 border-t-indigo-600"></div>
        </div>
      ) : viewMode === 'board' ? (
        <TaskKanban
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
          onQuickAdd={handleQuickAdd}
        />
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
          <LayoutList className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-700">Sin tareas que mostrar</h3>
          <p className="mt-1 text-xs text-slate-500">Ajusta los filtros o crea una nueva.</p>
        </div>
      ) : (
        <TaskList tasks={tasks} onTaskClick={handleTaskClick} />
      )}

      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => { setIsTaskDialogOpen(false); setSelectedTask(null); }}
        onSave={handleSaveTask}
        task={selectedTask}
      />

      <TemplatesDialog
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
      />
    </div>
  );
}
