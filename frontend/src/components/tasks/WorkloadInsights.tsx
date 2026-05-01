'use client';

import { AlertTriangle, Clock, Calendar, Flame, UserX, Activity, CheckCircle2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: {
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    urgent: number;
    unassigned: number;
    inProgress: number;
    completedThisWeek: number;
    total: number;
  };
  isLoading?: boolean;
}

const cards = [
  { key: 'overdue',           label: 'Vencidas',            icon: AlertTriangle, gradient: 'from-rose-500 to-red-600',     accent: 'text-rose-100',    badge: 'bg-rose-50 text-rose-700' },
  { key: 'dueToday',          label: 'Hoy',                 icon: Clock,         gradient: 'from-amber-500 to-orange-600', accent: 'text-amber-100',   badge: 'bg-amber-50 text-amber-700' },
  { key: 'dueThisWeek',       label: 'Esta semana',         icon: Calendar,      gradient: 'from-indigo-500 to-blue-600',  accent: 'text-indigo-100',  badge: 'bg-indigo-50 text-indigo-700' },
  { key: 'urgent',            label: 'Urgentes',            icon: Flame,         gradient: 'from-fuchsia-500 to-rose-600', accent: 'text-fuchsia-100', badge: 'bg-fuchsia-50 text-fuchsia-700' },
  { key: 'unassigned',        label: 'Sin asignar',         icon: UserX,         gradient: 'from-slate-500 to-slate-700',  accent: 'text-slate-100',   badge: 'bg-slate-50 text-slate-700' },
  { key: 'inProgress',        label: 'En progreso',         icon: Activity,      gradient: 'from-sky-500 to-cyan-600',     accent: 'text-sky-100',     badge: 'bg-sky-50 text-sky-700' },
  { key: 'completedThisWeek', label: 'Completadas (7d)',    icon: CheckCircle2,  gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-100', badge: 'bg-emerald-50 text-emerald-700' },
  { key: 'total',             label: 'Total activas',       icon: ListTodo,      gradient: 'from-violet-500 to-purple-600',accent: 'text-violet-100',  badge: 'bg-violet-50 text-violet-700' },
] as const;

export function WorkloadInsights({ data, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-6">
      {cards.map((c) => {
        const v = data?.[c.key as keyof typeof data] ?? (isLoading ? null : 0);
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className={cn(
              'relative rounded-xl p-3 overflow-hidden bg-gradient-to-br shadow-sm group hover:shadow-lg hover:-translate-y-0.5 transition-all',
              c.gradient,
            )}
          >
            <div className="flex items-start justify-between mb-1">
              <Icon className={cn('w-4 h-4', c.accent)} />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums leading-none mt-1">
              {v === null ? <span className="opacity-40">—</span> : v}
            </div>
            <div className={cn('text-[10px] mt-1 font-medium uppercase tracking-wider', c.accent)}>{c.label}</div>
            <div className="absolute -bottom-3 -right-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon className="w-12 h-12 text-white" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
