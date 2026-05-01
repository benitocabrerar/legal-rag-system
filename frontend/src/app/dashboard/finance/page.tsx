'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { financeAPI } from '@/lib/api';
import { FileSpreadsheet, Sparkles, FileDown, AlertTriangle, BarChart3, Zap } from 'lucide-react';
import { HeroKPIs } from '@/components/finance/HeroKPIs';
import { RevenueChart } from '@/components/finance/RevenueChart';
import { AgingChart } from '@/components/finance/AgingChart';
import { TopClientsCard } from '@/components/finance/TopClientsCard';
import { ForecastCard } from '@/components/finance/ForecastCard';
import { MethodMixCard } from '@/components/finance/MethodMixCard';
import { OverdueList } from '@/components/finance/OverdueList';
import { AIInsightCard } from '@/components/finance/AIInsightCard';
import { InvoiceFromTasksDialog } from '@/components/finance/InvoiceFromTasksDialog';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { fmtMoney } from '@/lib/finance-utils';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'collection' | 'reports';

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [isInvoiceFromTasksOpen, setIsInvoiceFromTasksOpen] = useState(false);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const t = searchParams.get('tab');
    if (t === 'collection' || t === 'reports' || t === 'overview') setTab(t);
    if (searchParams.get('action') === 'invoice-tasks') setIsInvoiceFromTasksOpen(true);
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => financeAPI.dashboard(),
    refetchInterval: 60_000,
  });

  // Realtime — invalidate the dashboard when invoices/payments change.
  useRealtimeTable({ table: 'finance_invoices', invalidateKeys: [['finance-dashboard']] });
  useRealtimeTable({ table: 'finance_payments', invalidateKeys: [['finance-dashboard']] });

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'overview',   label: 'Resumen',   icon: BarChart3 },
    { id: 'collection', label: 'Cobranza',  icon: AlertTriangle },
    { id: 'reports',    label: 'Reportes',  icon: FileSpreadsheet },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 bg-gradient-to-br from-slate-50 to-white min-h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finanzas</h1>
          <p className="text-sm text-slate-500">
            Tu CFO virtual — facturación, cobranza y proyecciones en un solo lugar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={financeAPI.exportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Exportar CSV
          </a>
          <button
            onClick={() => setIsInvoiceFromTasksOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Zap className="w-4 h-4" />
            Facturar desde tareas
          </button>
        </div>
      </div>

      <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm mb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                active
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center">
          <p className="text-sm text-rose-800">No pudimos cargar el panel financiero.</p>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-200 border-t-indigo-600"></div>
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-5">
              <HeroKPIs data={data} isLoading={isLoading} />
              <AIInsightCard data={data} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                  <RevenueChart data={data.monthly} />
                  <ForecastCard weeks={data.forecastWeeks} />
                </div>
                <div className="space-y-5">
                  <AgingChart aging={data.aging} />
                  <TopClientsCard clients={data.topClients} />
                </div>
              </div>
              <MethodMixCard mix={data.methodMix} />
            </div>
          )}

          {tab === 'collection' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <OverdueList items={data.overdueInvoices} />
                </div>
                <div>
                  <AgingChart aging={data.aging} />
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 p-5">
                <h3 className="text-sm font-bold text-amber-900 inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Sugerencia
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  Tus facturas con más de 60 días vencidas suman&nbsp;
                  <span className="font-bold">
                    {fmtMoney((data.aging['61_90'] ?? 0) + (data.aging['90_plus'] ?? 0))}
                  </span>.
                  Considera enviar un recordatorio formal o ajustar las condiciones de pago para los próximos contratos.
                </p>
              </div>
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <MethodMixCard mix={data.methodMix} />
                <TopClientsCard clients={data.topClients} />
              </div>
              <RevenueChart data={data.monthly} />
              <div className="rounded-2xl bg-white border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">Exportar movimientos</h3>
                  <p className="text-xs text-slate-500">Descarga un CSV con todas tus facturas para análisis externo o contabilidad.</p>
                </div>
                <a
                  href={financeAPI.exportCsvUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  Descargar
                </a>
              </div>
            </div>
          )}
        </>
      )}

      <InvoiceFromTasksDialog
        isOpen={isInvoiceFromTasksOpen}
        onClose={() => setIsInvoiceFromTasksOpen(false)}
      />
    </div>
  );
}
