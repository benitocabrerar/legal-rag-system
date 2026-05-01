'use client';

import { Calendar } from 'lucide-react';
import { fmtMoney } from '@/lib/finance-utils';
import type { FinanceDashboard } from '@/lib/api';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function ForecastCard({ weeks }: { weeks: FinanceDashboard['forecastWeeks'] }) {
  const total = weeks.reduce((s, w) => s + w.expected, 0);
  const max = Math.max(1, ...weeks.map((w) => w.expected));

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Cobros esperados</h3>
          <p className="text-[11px] text-slate-500">Próximas 4 semanas según fechas de vencimiento</p>
        </div>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{fmtMoney(total)}</span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">previsto</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {weeks.map((w, i) => {
          const ws = new Date(w.weekStart);
          const we = addDays(ws, 6);
          const heightPct = max === 0 ? 0 : (w.expected / max) * 100;
          return (
            <div key={i} className="text-center">
              <div className="h-24 flex items-end justify-center bg-slate-50 rounded-lg overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-indigo-500 to-violet-400 rounded-t transition-all duration-500"
                  style={{ height: `${heightPct}%`, minHeight: w.expected > 0 ? '4px' : 0 }}
                />
              </div>
              <div className="text-[10px] mt-1.5 font-semibold text-slate-700 tabular-nums">{fmtMoney(w.expected, 'USD', true)}</div>
              <div className="text-[10px] text-slate-400">
                {format(ws, 'd MMM', { locale: es })}–{format(we, 'd', { locale: es })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
