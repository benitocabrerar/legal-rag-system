'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { fmtMoney } from '@/lib/finance-utils';
import type { FinanceDashboard } from '@/lib/api';

export function RevenueChart({ data }: { data: FinanceDashboard['monthly'] }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Ingresos vs. facturación</h3>
          <p className="text-[11px] text-slate-500">Últimos 12 meses</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cobrado
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Facturado
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="billGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtMoney(Number(v), 'USD', true)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: 'white', border: '1px solid #e2e8f0',
                borderRadius: 10, fontSize: 12, padding: '8px 10px',
              }}
              labelStyle={{ color: '#0f172a', fontWeight: 600, marginBottom: 4 }}
              formatter={(v: any, name: string) => [fmtMoney(Number(v)), name === 'revenue' ? 'Cobrado' : 'Facturado']}
            />
            <Area type="monotone" dataKey="billed"  stroke="#6366f1" strokeWidth={2} fill="url(#billGrad)" />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
