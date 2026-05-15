'use client';

/**
 * Dashboard · Analíticas de ROI
 *
 * Traduce la actividad asistida por IA del abogado en tiempo ahorrado y,
 * con una tarifa que él controla, en dinero. El objetivo: que el retorno
 * de Poweria Legal sea visible y concreto.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertTriangle, Clock, Loader2, RefreshCw, Sparkles, TrendingUp, Wallet,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface RoiActivity {
  key: string; label: string; hint: string;
  count: number; minutesEach: number; minutesSaved: number;
}
interface RoiSummary {
  activities: RoiActivity[];
  totals: { activitiesCount: number; minutesSaved: number; hoursSaved: number };
  monthly: Array<{ month: string; label: string; items: number; minutesSaved: number }>;
}

const RATE_KEY = 'roi_hourly_rate';
const ACTIVITY_ICON: Record<string, string> = {
  queries: '🔎', conversations: '💬', workflows: '⚙️', tramites: '📄', documents: '📑',
};

function formatHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function RoiPage() {
  const [data, setData] = useState<RoiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(35);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(RATE_KEY) : null;
    if (stored) {
      const n = parseFloat(stored);
      if (Number.isFinite(n) && n > 0) setRate(n);
    }
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const r = await api.get<RoiSummary>('/roi/summary');
      setData(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar el ROI');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRate = (v: number) => {
    setRate(v);
    if (typeof window !== 'undefined' && v > 0) {
      window.localStorage.setItem(RATE_KEY, String(v));
    }
  };

  const hoursSaved = data?.totals.hoursSaved ?? 0;
  const costSaved = hoursSaved * rate;
  const maxMonthly = Math.max(1, ...(data?.monthly.map((m) => m.minutesSaved) ?? [1]));
  const maxActivity = Math.max(1, ...(data?.activities.map((a) => a.minutesSaved) ?? [1]));
  const hasActivity = (data?.totals.activitiesCount ?? 0) > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analíticas de ROI</h1>
            <p className="text-sm text-gray-500">
              El retorno de tu trabajo asistido por IA, en tiempo y en dinero
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      {!hasActivity ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
            <Sparkles className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Todavía no hay actividad para medir</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            A medida que uses las consultas IA, workflows y trámites, este panel te va
            a mostrar cuánto tiempo te ahorró Poweria Legal.
          </p>
        </div>
      ) : (
        <>
          {/* ─── HERO KPIs ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl p-6 shadow-md">
              <Clock className="h-6 w-6 opacity-80 mb-3" />
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Tiempo ahorrado</div>
              <div className="text-3xl font-bold mt-1">{hoursSaved.toFixed(1)} h</div>
              <div className="text-xs opacity-80 mt-1">{data?.totals.activitiesCount} actividades IA</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <Wallet className="h-6 w-6 text-emerald-600 mb-3" />
              <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Valor estimado</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">
                ${costSaved.toLocaleString('es-EC', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-gray-500 mt-1">Según tu tarifa horaria</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Tu tarifa por hora
              </label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  min={1}
                  value={rate}
                  onChange={(e) => updateRate(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 text-2xl font-bold text-gray-900 border-b-2 border-gray-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Ajustala a tu realidad — el cálculo se actualiza solo.
              </div>
            </div>
          </div>

          {/* ─── DESGLOSE POR ACTIVIDAD ─────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Desglose por actividad</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Estimación de tiempo ahorrado por cada tipo de tarea asistida por IA.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {data?.activities.map((a) => (
                <div key={a.key} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xl flex-shrink-0">{ACTIVITY_ICON[a.key] || '•'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">{a.label}</span>
                        <span className="text-sm font-bold text-emerald-600 tabular-nums">
                          {formatHours(a.minutesSaved)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {a.count} {a.count === 1 ? 'vez' : 'veces'} · ~{a.minutesEach} min c/u · {a.hint}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 ml-8 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${Math.max(a.minutesSaved > 0 ? 3 : 0, (a.minutesSaved / maxActivity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── TENDENCIA MENSUAL ──────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Tiempo ahorrado por mes</h2>
            <p className="text-xs text-gray-500 mb-4">Últimos 6 meses.</p>
            <div className="flex items-end justify-between gap-2 sm:gap-4 h-44">
              {data?.monthly.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] font-semibold text-gray-600 tabular-nums">
                    {m.minutesSaved > 0 ? `${Math.round(m.minutesSaved / 60 * 10) / 10}h` : ''}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-teal-400 transition-all"
                      style={{ height: `${Math.max(m.minutesSaved > 0 ? 4 : 0, (m.minutesSaved / maxMonthly) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 capitalize">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Las estimaciones de tiempo son referenciales — reflejan cuánto tomaría cada
            tarea sin asistencia de IA. El valor en dinero usa la tarifa que vos definís.
          </p>
        </>
      )}
    </div>
  );
}
