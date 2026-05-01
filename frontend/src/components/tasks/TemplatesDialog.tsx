'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '@/lib/api';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplatesDialog({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['task-templates'],
    queryFn: () => tasksAPI.listTemplates(),
    enabled: isOpen,
  });

  const useTemplateMutation = useMutation({
    mutationFn: (templateId: string) => tasksAPI.createFromTemplate({ templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-insights'] });
      onClose();
      setPicked(null);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Plantillas legales</h2>
              <p className="text-xs text-slate-500">Crea un flujo completo en un click</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data?.templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setPicked(tpl.id)}
                  className={cn(
                    'group/tpl text-left rounded-xl border-2 p-4 transition-all',
                    picked === tpl.id
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>
                      <p className="text-[12px] text-slate-500 mt-0.5">{tpl.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-mono font-bold">{tpl.tasks.length}</span> tareas
                        <span>•</span>
                        <span>~{tpl.tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0)}h</span>
                      </div>
                    </div>
                  </div>
                  {picked === tpl.id && (
                    <div className="mt-3 pt-3 border-t border-indigo-200 space-y-1">
                      {tpl.tasks.map((t, i) => (
                        <div key={i} className="text-[12px] text-slate-700 flex items-center gap-2">
                          <span className="text-slate-400 font-mono">{i + 1}.</span>
                          <span className="truncate">{t.title}</span>
                          <span className="ml-auto text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={() => picked && useTemplateMutation.mutate(picked)}
            disabled={!picked || useTemplateMutation.isPending}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
              picked
                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            {useTemplateMutation.isPending ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creando…</span>
            ) : (
              'Aplicar plantilla'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
