'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { fmtMoney, METHOD_LABEL } from '@/lib/finance-utils';
import type { FinanceDashboard } from '@/lib/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#64748b'];

export function MethodMixCard({ mix }: { mix: FinanceDashboard['methodMix'] }) {
  const total = mix.reduce((s, m) => s + m.amount, 0);
  const data = mix.map((m) => ({ name: METHOD_LABEL[m.method] ?? m.method, value: m.amount }));

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">Métodos de pago</h3>
        <p className="text-[11px] text-slate-500">Distribución del total cobrado</p>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">Sin pagos registrados</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-32 h-32 relative shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => fmtMoney(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Total</div>
              <div className="text-xs font-bold text-slate-900 tabular-nums">{fmtMoney(total, 'USD', true)}</div>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 text-xs">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-700 truncate">{d.name}</span>
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                  {fmtMoney(d.value, 'USD', true)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
