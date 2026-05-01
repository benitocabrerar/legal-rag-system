'use client';

import { AGING_BUCKETS, fmtMoney } from '@/lib/finance-utils';
import type { FinanceDashboard } from '@/lib/api';

export function AgingChart({ aging }: { aging: FinanceDashboard['aging'] }) {
  const total = AGING_BUCKETS.reduce((s, b) => s + (aging[b.key as keyof typeof aging] ?? 0), 0);
  const max = Math.max(1, ...AGING_BUCKETS.map((b) => aging[b.key as keyof typeof aging] ?? 0));

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Antigüedad de la cobranza</h3>
          <p className="text-[11px] text-slate-500">Distribución del saldo por días vencidos</p>
        </div>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{fmtMoney(total)}</span>
      </div>

      <div className="space-y-3">
        {AGING_BUCKETS.map((b) => {
          const v = aging[b.key as keyof typeof aging] ?? 0;
          const pct = total === 0 ? 0 : (v / total) * 100;
          const widthPct = max === 0 ? 0 : (v / max) * 100;
          return (
            <div key={b.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                  <span className="font-semibold text-slate-700">{b.label} días</span>
                  <span className="text-slate-400 tabular-nums">{pct.toFixed(0)}%</span>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums">{fmtMoney(v, 'USD', true)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPct}%`, background: `linear-gradient(90deg, ${b.color}aa, ${b.color})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
