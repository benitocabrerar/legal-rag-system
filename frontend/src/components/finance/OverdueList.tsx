'use client';

import { AlertTriangle, FileDown, Mail } from 'lucide-react';
import { fmtMoney } from '@/lib/finance-utils';
import { financeAPI, type FinanceDashboard } from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function OverdueList({ items }: { items: FinanceDashboard['overdueInvoices'] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <span className="text-2xl">✅</span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">Sin facturas vencidas</h3>
        <p className="text-xs text-slate-500">Tu cobranza está al día. Excelente.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-bold text-rose-900">Facturas vencidas</h3>
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 rounded-full px-2 py-0.5">
            {items.length}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          Total adeudado:&nbsp;
          <span className="font-semibold text-rose-700">{fmtMoney(items.reduce((s, i) => s + i.balanceDue, 0))}</span>
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((it) => {
          const severity = it.daysOverdue > 90 ? 'high' : it.daysOverdue > 30 ? 'mid' : 'low';
          return (
            <li key={it.id} className="px-4 py-3 hover:bg-slate-50 flex items-center gap-3 group">
              <div
                className={cn(
                  'w-1.5 h-10 rounded-full shrink-0',
                  severity === 'high' && 'bg-rose-600',
                  severity === 'mid'  && 'bg-orange-500',
                  severity === 'low'  && 'bg-amber-400',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{it.clientName}</div>
                <div className="text-[11px] text-slate-500">
                  Vencía el {format(new Date(it.dueDate), "d 'de' MMM, yyyy", { locale: es })} ·{' '}
                  <span className={cn(
                    'font-semibold',
                    severity === 'high' && 'text-rose-700',
                    severity === 'mid'  && 'text-orange-700',
                    severity === 'low'  && 'text-amber-700',
                  )}>
                    {it.daysOverdue}d vencida
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 tabular-nums">{fmtMoney(it.balanceDue)}</div>
                <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={financeAPI.invoicePdfUrl(it.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    title="Descargar PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                    title="Recordatorio (próximamente)"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
