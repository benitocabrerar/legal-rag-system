'use client';

import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FiltersState {
  priority: 'ALL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  overdueOnly: boolean;
  unassignedOnly: boolean;
  search: string;
}

const priorityChips: Array<{ id: FiltersState['priority']; label: string; cls: string }> = [
  { id: 'ALL',    label: 'Todas',     cls: 'bg-slate-100 text-slate-700 border-slate-200 data-[active=true]:bg-slate-900 data-[active=true]:text-white' },
  { id: 'URGENT', label: 'Urgentes',  cls: 'bg-rose-50 text-rose-700 border-rose-200 data-[active=true]:bg-rose-600 data-[active=true]:text-white' },
  { id: 'HIGH',   label: 'Altas',     cls: 'bg-amber-50 text-amber-700 border-amber-200 data-[active=true]:bg-amber-600 data-[active=true]:text-white' },
  { id: 'MEDIUM', label: 'Medias',    cls: 'bg-sky-50 text-sky-700 border-sky-200 data-[active=true]:bg-sky-600 data-[active=true]:text-white' },
  { id: 'LOW',    label: 'Bajas',     cls: 'bg-slate-50 text-slate-700 border-slate-200 data-[active=true]:bg-slate-700 data-[active=true]:text-white' },
];

interface Props {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
}

export function TaskFilters({ value, onChange }: Props) {
  const set = (patch: Partial<FiltersState>) => onChange({ ...value, ...patch });
  const isActiveFilter = value.priority !== 'ALL' || value.overdueOnly || value.unassignedOnly || !!value.search;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-500 mr-1">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">Filtros</span>
      </div>

      {priorityChips.map((c) => (
        <button
          key={c.id}
          data-active={value.priority === c.id}
          onClick={() => set({ priority: c.id })}
          className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors', c.cls)}
        >
          {c.label}
        </button>
      ))}

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button
        data-active={value.overdueOnly}
        onClick={() => set({ overdueOnly: !value.overdueOnly })}
        className={cn(
          'text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
          value.overdueOnly
            ? 'bg-rose-600 text-white border-rose-600'
            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        )}
      >
        ⚠ Vencidas
      </button>

      <button
        data-active={value.unassignedOnly}
        onClick={() => set({ unassignedOnly: !value.unassignedOnly })}
        className={cn(
          'text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
          value.unassignedOnly
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
        )}
      >
        Sin asignar
      </button>

      <div className="flex-1" />

      <input
        type="text"
        placeholder="Buscar…"
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition w-44"
      />

      {isActiveFilter && (
        <button
          onClick={() => onChange({ priority: 'ALL', overdueOnly: false, unassignedOnly: false, search: '' })}
          className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Limpiar
        </button>
      )}
    </div>
  );
}
