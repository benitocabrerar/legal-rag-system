'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search, Plus, Calendar, CheckSquare, Briefcase, Sparkles, AlertTriangle, Clock, Settings, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItemDef {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  group: 'Crear' | 'Navegar' | 'Filtros rápidos' | 'Sistema';
  run: (router: ReturnType<typeof useRouter>) => void;
}

const COMMANDS: CommandItemDef[] = [
  // Crear
  { id: 'new-task',     group: 'Crear',    label: 'Nueva tarea',          hint: '⌘ N',  icon: Plus,        keywords: ['create','add','tarea','task'],     run: (r) => r.push('/dashboard/tasks?new=1') },
  { id: 'new-event',    group: 'Crear',    label: 'Nuevo evento',         hint: '⌘ E',  icon: Calendar,    keywords: ['create','add','evento','event'],   run: (r) => r.push('/dashboard/calendar?new=1') },
  { id: 'invoice-tasks',group: 'Crear',    label: 'Facturar desde tareas',             icon: DollarSign,  keywords: ['invoice','factura','billing'],     run: (r) => r.push('/dashboard/finance?action=invoice-tasks') },
  { id: 'templates',    group: 'Crear',    label: 'Aplicar plantilla legal',           icon: Sparkles,    keywords: ['template','plantilla','demanda'],  run: (r) => r.push('/dashboard/tasks?templates=1') },

  // Navegar
  { id: 'go-cases',     group: 'Navegar',  label: 'Casos',                              icon: Briefcase,   run: (r) => r.push('/dashboard') },
  { id: 'go-tasks',     group: 'Navegar',  label: 'Tareas',                hint: 'T',   icon: CheckSquare, run: (r) => r.push('/dashboard/tasks') },
  { id: 'go-calendar',  group: 'Navegar',  label: 'Calendario',            hint: 'C',   icon: Calendar,    run: (r) => r.push('/dashboard/calendar') },
  { id: 'go-finance',   group: 'Navegar',  label: 'Finanzas',                          icon: DollarSign,  run: (r) => r.push('/dashboard/finance') },
  { id: 'go-settings',  group: 'Navegar',  label: 'Ajustes',                           icon: Settings,    run: (r) => r.push('/dashboard/settings') },

  // Filtros rápidos
  { id: 'collection',   group: 'Filtros rápidos', label: 'Cobranza vencida',               icon: AlertTriangle, keywords: ['collection','cobranza','overdue'], run: (r) => r.push('/dashboard/finance?tab=collection') },
  { id: 'overdue',      group: 'Filtros rápidos', label: 'Tareas vencidas',                icon: AlertTriangle, keywords: ['overdue','vencidas'], run: (r) => r.push('/dashboard/tasks?filter=overdue') },
  { id: 'today',        group: 'Filtros rápidos', label: 'Eventos de hoy',                 icon: Clock,         keywords: ['today','hoy'],         run: (r) => r.push('/dashboard/calendar?view=day&today=1') },
  { id: 'this-week',    group: 'Filtros rápidos', label: 'Esta semana en calendario',      icon: Calendar,      keywords: ['week','semana'],       run: (r) => r.push('/dashboard/calendar?view=week') },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh] px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden"
      >
        <Command label="Acciones rápidas" className="flex flex-col">
          <div className="flex items-center gap-2 px-4 border-b border-slate-200">
            <Search className="w-4 h-4 text-slate-400" />
            <Command.Input
              autoFocus
              placeholder="Escribe un comando o busca…"
              className="flex-1 py-3.5 text-sm bg-transparent placeholder:text-slate-400 outline-none"
            />
            <kbd className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-12 text-center text-sm text-slate-400">
              Sin resultados.
            </Command.Empty>
            {(['Crear', 'Navegar', 'Filtros rápidos'] as const).map((group) => (
              <Command.Group key={group} heading={group} className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
                {COMMANDS.filter((c) => c.group === group).map((c) => {
                  const Icon = c.icon;
                  return (
                    <Command.Item
                      key={c.id}
                      value={`${c.label} ${c.keywords?.join(' ') ?? ''}`}
                      onSelect={() => {
                        c.run(router);
                        onOpenChange(false);
                      }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm',
                        'data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-900',
                      )}
                    >
                      <Icon className="w-4 h-4 text-slate-500 data-[selected=true]:text-indigo-600" />
                      <span className="flex-1">{c.label}</span>
                      {c.hint && (
                        <kbd className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {c.hint}
                        </kbd>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-slate-50/50 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-500" /> Tip: <kbd className="font-mono font-semibold bg-white border border-slate-200 px-1 rounded">⌘K</kbd> para abrir
            </span>
            <span>↵ ejecutar · ↑↓ navegar</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

/**
 * Provider that mounts the palette and registers the Cmd/Ctrl+K shortcut.
 * Drop one of these in the dashboard layout.
 */
export function CommandPaletteProvider() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
