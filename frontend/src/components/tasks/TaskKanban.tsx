'use client';

import { useMemo, useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { Calendar, Clock, Flag, Plus, Briefcase, GripVertical, AlertCircle } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task, TaskStatus } from '@/types/tasks';
import { cn } from '@/lib/utils';

const PRIORITY_STYLE: Record<string, { ring: string; chip: string; label: string }> = {
  URGENT: { ring: 'ring-rose-300',    chip: 'bg-rose-100 text-rose-700 border-rose-200',       label: 'Urgente' },
  HIGH:   { ring: 'ring-amber-300',   chip: 'bg-amber-100 text-amber-700 border-amber-200',    label: 'Alta'    },
  MEDIUM: { ring: 'ring-sky-300',     chip: 'bg-sky-100 text-sky-700 border-sky-200',          label: 'Media'   },
  LOW:    { ring: 'ring-slate-200',   chip: 'bg-slate-100 text-slate-600 border-slate-200',    label: 'Baja'    },
};

const COLUMNS: Array<{ id: TaskStatus; title: string; gradient: string; accent: string; icon: string }> = [
  { id: 'TODO',        title: 'Por hacer',    gradient: 'from-slate-500 to-slate-600',  accent: 'border-t-slate-400',  icon: '📋' },
  { id: 'IN_PROGRESS', title: 'En progreso',  gradient: 'from-sky-500 to-blue-600',     accent: 'border-t-sky-500',    icon: '⚡' },
  { id: 'DONE',        title: 'Completadas',  gradient: 'from-emerald-500 to-teal-600', accent: 'border-t-emerald-500',icon: '✅' },
];

interface Props {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onQuickAdd: (status: TaskStatus, title: string) => void;
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
  const ps = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.MEDIUM;
  const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) && task.status !== 'DONE' : false;
  const due = task.dueDate ? parseISO(task.dueDate) : null;

  const checklist = task.checklistItems ?? [];
  const completedCount = checklist.filter((c) => c.completed).length;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'group/card relative rounded-xl bg-white p-3 cursor-pointer transition-all',
        'border border-slate-200 hover:border-indigo-300 hover:shadow-md',
        'ring-1 ring-transparent hover:ring-2', ps.ring,
        isDragging && 'opacity-30 scale-95',
      )}
    >
      <div
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-slate-600 opacity-0 group-hover/card:opacity-100 transition-opacity touch-none cursor-grab active:cursor-grabbing"
        title="Arrastrar"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="flex items-start gap-2 mb-2 pr-6">
        <span className={cn('inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border', ps.chip)}>
          <Flag className="w-2.5 h-2.5 mr-1" />
          {ps.label}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-slate-900 leading-snug mb-1.5 line-clamp-2">{task.title}</h4>
      {task.description && (
        <p className="text-[12px] text-slate-500 line-clamp-2 mb-2">{task.description}</p>
      )}

      {checklist.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
            <span>Checklist</span>
            <span className="font-mono tabular-nums">{completedCount}/{checklist.length}</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${checklist.length === 0 ? 0 : (completedCount / checklist.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          {due && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                overdue ? 'text-rose-600 font-semibold' : isToday(due) ? 'text-amber-600 font-semibold' : '',
              )}
            >
              {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {format(due, "d MMM", { locale: es })}
            </span>
          )}
          {task.case && (
            <span className="inline-flex items-center gap-1 max-w-[120px] truncate">
              <Briefcase className="w-3 h-3" />
              <span className="truncate">{task.case.title}</span>
            </span>
          )}
        </div>
        {task.assignedTo && (
          <div
            className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-[10px] font-bold flex items-center justify-center"
            title={task.assignedTo.name}
          >
            {task.assignedTo.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
        )}
      </div>
    </div>
  );
}

function Column({
  column, tasks, onTaskClick, onQuickAdd,
}: {
  column: typeof COLUMNS[number];
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onQuickAdd: (status: TaskStatus, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { status: column.id } });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const t = draft.trim();
    if (t.length < 2) {
      setAdding(false); setDraft(''); return;
    }
    onQuickAdd(column.id, t);
    setDraft('');
    setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-2xl bg-slate-50/60 border-t-4 transition-colors min-h-[200px]',
        column.accent,
        isOver && 'bg-indigo-50/60 ring-2 ring-indigo-300',
      )}
    >
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{column.icon}</span>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{column.title}</h3>
          <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5 min-w-[24px] text-center">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
          aria-label="Añadir tarea"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[60vh] md:max-h-[calc(100vh-22rem)]">
        {adding && (
          <div className="rounded-xl bg-white p-2 border border-indigo-200 shadow-sm">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                if (e.key === 'Escape') { setAdding(false); setDraft(''); }
              }}
              placeholder="Título de la tarea... (Enter para crear, Esc para cancelar)"
              className="w-full text-sm resize-none focus:outline-none placeholder:text-slate-400 bg-transparent"
              rows={2}
            />
            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
              <button onClick={() => { setAdding(false); setDraft(''); }} className="text-[11px] text-slate-500 px-2 py-1 hover:bg-slate-100 rounded">
                Cancelar
              </button>
              <button onClick={submit} className="text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded">
                Añadir
              </button>
            </div>
          </div>
        )}
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
        ))}
        {tasks.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-center py-8 text-[12px] text-slate-400 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:text-indigo-500 hover:bg-white transition-colors"
          >
            <Plus className="w-4 h-4 mx-auto mb-1" />
            Añadir tarea
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskKanban({ tasks, onTaskClick, onStatusChange, onQuickAdd }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [], CANCELLED: [] };
    for (const t of tasks) {
      if (t.status in map) map[t.status as TaskStatus].push(t);
    }
    // Sort by priority (URGENT > HIGH > MEDIUM > LOW), then dueDate asc.
    const order: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => {
        const p = (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
        if (p !== 0) return p;
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });
    }
    return map;
  }, [tasks]);

  const handleDragStart = (e: DragStartEvent) => {
    const t = e.active.data.current?.task as Task | undefined;
    if (t) setActiveTask(t);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const t = e.active.data.current?.task as Task | undefined;
    const target = e.over?.data.current?.status as TaskStatus | undefined;
    if (t && target && t.status !== target) onStatusChange(t.id, target);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={grouped[col.id] ?? []}
            onTaskClick={onTaskClick}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rounded-xl bg-white p-3 border-2 border-indigo-400 shadow-2xl rotate-2 max-w-[min(260px,calc(100vw-2rem))]">
            <div className="text-sm font-semibold text-slate-900 line-clamp-2">{activeTask.title}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
