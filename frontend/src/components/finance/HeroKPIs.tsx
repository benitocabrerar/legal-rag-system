'use client';

import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { fmtMoney, fmtPercent } from '@/lib/finance-utils';
import type { FinanceDashboard } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  data: FinanceDashboard;
  isLoading?: boolean;
}

export function HeroKPIs({ data, isLoading }: Props) {
  const monthly = data.monthly;
  const series = monthly.map((m) => ({ revenue: m.revenue }));
  const billedSeries = monthly.map((m) => ({ billed: m.billed }));
  const h = data.headline;

  const cards = [
    {
      key: 'revenue',
      label: 'Ingresos del mes',
      value: fmtMoney(h.revenueThisMonth, data.currency),
      trend: h.momChange,
      hint: `vs. mes anterior (${fmtMoney(h.revenuePrevMonth, data.currency, true)})`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-200',
      stroke: '#10b981',
      data: series,
      dataKey: 'revenue',
    },
    {
      key: 'billed',
      label: 'Total facturado',
      value: fmtMoney(h.totalBilled, data.currency),
      trend: null,
      hint: `${h.invoicesCount} facturas emitidas`,
      icon: CheckCircle2,
      gradient: 'from-indigo-500 to-violet-600',
      ring: 'ring-indigo-200',
      stroke: '#6366f1',
      data: billedSeries,
      dataKey: 'billed',
    },
    {
      key: 'outstanding',
      label: 'Por cobrar',
      value: fmtMoney(h.totalOutstanding, data.currency),
      trend: null,
      hint: `${h.overdueCount} vencidas`,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-200',
      stroke: '#f59e0b',
      data: monthly.map((m) => ({ v: m.billed - m.revenue })),
      dataKey: 'v',
    },
    {
      key: 'collection',
      label: 'Ratio de cobranza',
      value: `${h.collectionRatio.toFixed(1)}%`,
      trend: null,
      hint: h.avgDaysToPay != null ? `Pago promedio en ${h.avgDaysToPay}d` : 'Sin datos suficientes',
      icon: AlertTriangle,
      gradient: 'from-fuchsia-500 to-pink-600',
      ring: 'ring-fuchsia-200',
      stroke: '#d946ef',
      data: monthly.map((m) => ({ v: m.billed === 0 ? 0 : (m.revenue / m.billed) * 100 })),
      dataKey: 'v',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-4 transition-all',
              'hover:shadow-lg hover:-translate-y-0.5 hover:ring-4', c.ring,
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br', c.gradient)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {c.trend !== null && c.trend !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full',
                    c.trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                  )}
                >
                  {c.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {fmtPercent(c.trend, 1)}
                </span>
              )}
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{c.label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
              {isLoading ? <span className="opacity-30">—</span> : c.value}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">{c.hint}</div>

            <div className="absolute bottom-0 left-0 right-0 h-12 opacity-60 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.stroke} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={c.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey={c.dataKey}
                    stroke={c.stroke}
                    strokeWidth={1.5}
                    fill={`url(#grad-${c.key})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
