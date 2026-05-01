'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, financeAPI } from '@/lib/api';
import { Sparkles, X, Loader2, Receipt, FileText } from 'lucide-react';
import { fmtMoney } from '@/lib/finance-utils';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Task {
  id: string;
  title: string;
  caseId?: string;
  case?: { id: string; title: string; clientName?: string };
  actualHours?: number;
  estimatedHours?: number;
  status: string;
}

export function InvoiceFromTasksDialog({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [hourlyRate, setHourlyRate] = useState(75);
  const [taxRate, setTaxRate] = useState(12);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const { data: tasksData } = useQuery({
    queryKey: ['tasks-billable'],
    queryFn: () => tasksAPI.list({ status: 'DONE' }),
    enabled: isOpen,
  });
  const tasks: Task[] = tasksData?.tasks ?? [];

  // Group by case.
  const cases = useMemo(() => {
    const m = new Map<string, { id: string; title: string; clientName?: string; tasks: Task[] }>();
    for (const t of tasks) {
      if (!t.caseId) continue;
      const k = t.caseId;
      const existing = m.get(k) ?? { id: k, title: t.case?.title ?? 'Sin nombre', clientName: t.case?.clientName, tasks: [] };
      existing.tasks.push(t);
      m.set(k, existing);
    }
    return Array.from(m.values());
  }, [tasks]);

  useEffect(() => {
    if (isOpen && cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0].id);
    }
  }, [isOpen, cases, selectedCaseId]);

  const currentCase = cases.find((c) => c.id === selectedCaseId);
  const currentTasks = currentCase?.tasks ?? [];

  const totals = useMemo(() => {
    const selected = currentTasks.filter((t) => selectedTaskIds.has(t.id));
    const hours = selected.reduce((s, t) => s + (t.actualHours ?? t.estimatedHours ?? 1), 0);
    const subtotal = hours * hourlyRate;
    const tax = subtotal * (taxRate / 100);
    return { hours, subtotal, tax, total: subtotal + tax, count: selected.length };
  }, [currentTasks, selectedTaskIds, hourlyRate, taxRate]);

  const createMut = useMutation({
    mutationFn: () =>
      financeAPI.invoiceFromTasks({
        caseId: selectedCaseId!,
        taskIds: Array.from(selectedTaskIds),
        hourlyRate,
        taxRate,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Open the freshly generated PDF.
      if (res?.invoice?.id) {
        window.open(financeAPI.invoicePdfUrl(res.invoice.id), '_blank');
      }
      onClose();
      setSelectedTaskIds(new Set());
      setSelectedCaseId(null);
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? 'No pudimos generar la factura'),
  });

  const toggle = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTaskIds.size === currentTasks.length) setSelectedTaskIds(new Set());
    else setSelectedTaskIds(new Set(currentTasks.map((t) => t.id)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Facturar desde tareas</h2>
              <p className="text-xs text-slate-500">Selecciona tareas completadas para generar la factura</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">{error}</div>}

          {cases.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Aún no hay tareas completadas con caso asociado</p>
              <p className="text-xs text-slate-500">Crea y completa tareas dentro de un caso para facturar.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Caso
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCaseId(c.id); setSelectedTaskIds(new Set()); }}
                      className={cn(
                        'text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                        selectedCaseId === c.id
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300',
                      )}
                    >
                      {c.title} <span className="opacity-60">· {c.tasks.length}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Tarifa por hora (USD)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">IVA (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Tareas completadas ({currentTasks.length})
                  </label>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {selectedTaskIds.size === currentTasks.length ? 'Deseleccionar todo' : 'Seleccionar todas'}
                  </button>
                </div>
                <ul className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {currentTasks.map((t) => {
                    const hours = t.actualHours ?? t.estimatedHours ?? 1;
                    const checked = selectedTaskIds.has(t.id);
                    return (
                      <li
                        key={t.id}
                        onClick={() => toggle(t.id)}
                        className={cn('flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50', checked && 'bg-indigo-50/50')}
                      >
                        <input type="checkbox" readOnly checked={checked} className="rounded border-slate-300 text-indigo-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{t.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {hours.toFixed(1)}h × {fmtMoney(hourlyRate)}/h
                          </div>
                        </div>
                        <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                          {fmtMoney(hours * hourlyRate, 'USD', true)}
                        </div>
                      </li>
                    );
                  })}
                  {currentTasks.length === 0 && (
                    <li className="px-3 py-6 text-xs text-slate-400 text-center">Sin tareas completadas en este caso</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {cases.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">Subtotal</div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">{fmtMoney(totals.subtotal)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500">IVA</div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">{fmtMoney(totals.tax)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-emerald-700">Total</div>
                <div className="text-base font-bold text-emerald-700 tabular-nums">{fmtMoney(totals.total)}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={() => createMut.mutate()}
                disabled={selectedTaskIds.size === 0 || !selectedCaseId || createMut.isPending}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                  selectedTaskIds.size > 0
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                )}
              >
                {createMut.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</>
                ) : (
                  <><FileText className="w-4 h-4" /> Generar factura ({totals.count})</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
