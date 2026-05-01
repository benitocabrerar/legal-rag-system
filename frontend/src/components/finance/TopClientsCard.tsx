'use client';

import { Briefcase } from 'lucide-react';
import { fmtMoney } from '@/lib/finance-utils';
import type { FinanceDashboard } from '@/lib/api';

export function TopClientsCard({ clients }: { clients: FinanceDashboard['topClients'] }) {
  const max = Math.max(1, ...clients.map((c) => c.billed));

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Top clientes</h3>
          <p className="text-[11px] text-slate-500">Por volumen facturado en los últimos 12 meses</p>
        </div>
        <Briefcase className="w-4 h-4 text-slate-400" />
      </div>
      {clients.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">Sin datos suficientes</p>
      ) : (
        <ul className="space-y-2.5">
          {clients.map((c, i) => {
            const pct = (c.billed / max) * 100;
            return (
              <li key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">{fmtMoney(c.billed, 'USD', true)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {c.outstanding > 0 && (
                  <p className="text-[10px] text-rose-600 mt-0.5">Pendiente: {fmtMoney(c.outstanding, 'USD', true)}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
