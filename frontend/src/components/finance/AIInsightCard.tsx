'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { financeAPI, type FinanceDashboard } from '@/lib/api';

export function AIInsightCard({ data }: { data: FinanceDashboard }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: insightData, isLoading, isFetching, error } = useQuery({
    queryKey: ['finance-ai-insight', data.generatedAt, refreshKey],
    queryFn: () =>
      financeAPI.aiInsight({
        headline: data.headline,
        monthly: data.monthly,
        aging: data.aging,
        overdueInvoices: data.overdueInvoices,
        topClients: data.topClients,
      }),
    enabled: data.headline.invoicesCount > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="rounded-2xl border border-violet-200 p-4 lg:p-5 shadow-sm relative overflow-hidden bg-gradient-to-br from-violet-50 via-indigo-50 to-white">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-20 blur-2xl" />
      <div className="flex items-start gap-3 relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-violet-900">Lectura del CFO virtual</h3>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={isLoading || isFetching}
              className="p-1 rounded text-violet-500 hover:text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-30"
              title="Regenerar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {data.headline.invoicesCount === 0 ? (
            <p className="text-sm text-violet-700/80 leading-relaxed">
              Aún no hay facturas suficientes para generar una lectura. Crea una para ver insights con IA.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-violet-600 inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando tu situación financiera…
            </p>
          ) : error ? (
            <p className="text-sm text-rose-700">No pude generar el análisis. Intenta de nuevo.</p>
          ) : (
            <p className="text-[13px] text-slate-700 leading-relaxed">{insightData?.insight}</p>
          )}
        </div>
      </div>
    </div>
  );
}
