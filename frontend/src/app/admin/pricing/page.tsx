'use client';

/**
 * Admin · Gestión de Precios — exclusivo del super-administrador.
 *
 * Edita los precios de cada plan y cada ciclo de facturación. Los cambios
 * se guardan en Supabase (subscription_plans) y se reflejan al instante en
 * la página de precios y en el cobro con tarjeta — sin redeploy.
 *
 * Tres formas de cambiar un precio:
 *   · Directo      — se fija el precio a mano
 *   · Porcentual   — +X% sobre el precio anterior
 *   · Por demanda  — precio sugerido por señales de oferta/demanda
 * Más el ajuste masivo: +X% a todos los planes a la vez.
 *
 * Cada cambio queda en el historial de precios del plan.
 */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/admin-middleware';
import {
  AlertTriangle, BarChart3, Check, ChevronDown, ChevronRight, Clock, DollarSign,
  Layers, Loader2, Lock, Percent, RefreshCw, Sparkles, Star, TrendingUp, Wand2,
  SlidersHorizontal, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface Plan {
  id: string; code: string; name: string; nameEnglish: string;
  description: string | null; priceMonthly: number; priceYearly: number;
  storageGb: number; documentsLimit: number; monthlyQueries: number;
  apiCallsLimit: number; features: string[]; isActive: boolean; isPopular: boolean;
  displayOrder: number; isCustom: boolean;
  activeSubsMonthly: number; activeSubsYearly: number; mrr: number;
  lastPriceChangeAt: string | null;
}
interface HistoryEntry {
  id: string; billingCycle: 'monthly' | 'yearly'; oldPrice: number; newPrice: number;
  changeMethod: string; changePct: number | null; reason: string | null;
  changedByEmail: string | null; createdAt: string;
}
interface DemandSignals {
  planCode: string; activeSubs: number; activeSubsAllPlans: number;
  shareOfActive: number; signups30d: number; demandIndex: number | null;
  verdict: 'high' | 'balanced' | 'low' | 'insufficient'; verdictLabel: string;
  rationale: string; suggestedMonthly: number; suggestedYearly: number; suggestedPct: number;
}

type RoundMode = 'none' | 'integer' | 'psychological';

const money = (n: number) =>
  n < 0 ? 'Personalizado' : `$${n.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const METHOD_LABEL: Record<string, string> = {
  absolute: 'Directo', percentage: 'Porcentual', bulk: 'Masivo',
  demand: 'Por demanda', seed: 'Reestructura',
};

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function AdminPricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const r = await api.get<{ plans: Plan[] }>('/admin/pricing/plans');
      setPlans(r.data.plans ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar los precios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ─── GATE ─────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (!isSuperAdmin(user as any)) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white rounded-xl border border-rose-200 p-8 text-center">
        <Lock className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Acceso restringido</h1>
        <p className="text-sm text-gray-600 mt-2">
          La gestión de precios es exclusiva del super-administrador.
        </p>
      </div>
    );
  }

  const totalMrr = plans.reduce((s, p) => s + p.mrr, 0);
  const activePlans = plans.filter((p) => p.isActive && !p.isCustom).length;
  const totalSubs = plans.reduce((s, p) => s + p.activeSubsMonthly + p.activeSubsYearly, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Precios</h1>
            <p className="text-sm text-gray-500">
              Precios, planes y subscripciones · cambios en vivo, sin redeploy
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
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
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white shadow-lg text-sm font-medium">
          <Check className="h-4 w-4" /> {toast}
        </div>
      )}

      {/* ─── KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Layers className="h-5 w-5" />} label="Planes activos" value={String(activePlans)} color="emerald" />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="MRR estimado" value={money(totalMrr)} color="teal" />
        <Kpi icon={<BarChart3 className="h-5 w-5" />} label="Suscripciones activas" value={String(totalSubs)} color="sky" />
        <Kpi icon={<DollarSign className="h-5 w-5" />} label="Planes en catálogo" value={String(plans.length)} color="indigo" />
      </div>

      {/* ─── AJUSTE MASIVO ───────────────────────────────────────── */}
      <BulkAdjustPanel onApplied={(msg) => { flash(msg); load(); }} />

      {/* ─── MATRIZ DE CAPACIDADES ───────────────────────────────── */}
      <EntitlementsMatrix onChanged={flash} />

      {/* ─── LISTA DE PLANES ─────────────────────────────────────── */}
      <div className="space-y-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            expanded={expanded === plan.id}
            onToggle={() => setExpanded(expanded === plan.id ? null : plan.id)}
            onChanged={(msg) => { flash(msg); load(); }}
          />
        ))}
      </div>

      {/* ─── NOTA ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5 text-sm text-gray-700">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" /> Cómo funciona el enlace en vivo
        </h3>
        Cada precio se guarda en <code className="bg-white px-1 rounded text-xs">subscription_plans</code> (Supabase).
        La página pública de precios y el cobro con tarjeta (PayPal y transferencia) leen esa tabla en cada
        visita — por eso un cambio acá se ve de inmediato en el sitio, sin necesidad de un nuevo despliegue.
        Cada cambio queda registrado en el historial del plan.
      </div>
    </div>
  );
}

// ─── BULK ADJUST ──────────────────────────────────────────────────────────
function BulkAdjustPanel({ onApplied }: { onApplied: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'yearly' | 'both'>('both');
  const [round, setRound] = useState<RoundMode>('none');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const apply = async () => {
    const p = parseFloat(pct);
    if (!Number.isFinite(p) || p === 0) { setErr('Indicá un porcentaje distinto de cero.'); return; }
    if (!confirm(`¿Aplicar ${p > 0 ? '+' : ''}${p}% a TODOS los planes de pago (${cycle === 'both' ? 'mensual y anual' : cycle})?`)) return;
    setBusy(true); setErr('');
    try {
      const r = await api.post<{ adjusted: number }>('/admin/pricing/bulk-adjust', { pct: p, cycle, round, reason });
      onApplied(`Ajuste masivo aplicado a ${r.data.adjusted} planes`);
      setPct(''); setReason(''); setOpen(false);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'No se pudo aplicar');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left"
      >
        <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><Wand2 className="h-5 w-5" /></div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 text-sm">Ajuste masivo de precios</div>
          <div className="text-xs text-gray-500">Aplicá un mismo porcentaje a todos los planes de pago de una vez</div>
        </div>
        {open ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
      </button>
      {open && (
        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Porcentaje (%)">
              <input type="number" value={pct} onChange={(e) => setPct(e.target.value)}
                placeholder="ej. 10" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </Field>
            <Field label="Ciclo">
              <select value={cycle} onChange={(e) => setCycle(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
                <option value="both">Mensual y anual</option>
                <option value="monthly">Solo mensual</option>
                <option value="yearly">Solo anual</option>
              </select>
            </Field>
            <Field label="Redondeo">
              <RoundSelect value={round} onChange={setRound} />
            </Field>
          </div>
          <Field label="Motivo (opcional)">
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="ej. ajuste anual por inflación" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </Field>
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <button onClick={apply} disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Aplicar a todos los planes
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MATRIZ DE CAPACIDADES ────────────────────────────────────────────────
interface EntDef { key: string; kind: 'feature' | 'limit'; category: string; labelEs: string; labelEn: string }
interface EntPlan { id: string; code: string; name: string; isActive: boolean; entitlements: Record<string, number | boolean> }

function EntitlementsMatrix({ onChanged }: { onChanged: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<EntDef[]>([]);
  const [plans, setPlans] = useState<EntPlan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await api.get<{ catalog: EntDef[]; plans: EntPlan[] }>('/admin/pricing/entitlements');
      setCatalog(r.data.catalog ?? []);
      setPlans(r.data.plans ?? []);
      setLoaded(true);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Error al cargar la matriz');
    }
  }, []);

  useEffect(() => { if (open && !loaded) load(); }, [open, loaded, load]);

  const patchCell = async (planId: string, key: string, value: number | boolean) => {
    setBusyCell(planId + key);
    setErr('');
    try {
      const r = await api.patch<{ entitlements: Record<string, number | boolean> }>(
        `/admin/pricing/plans/${planId}/entitlements`, { [key]: value },
      );
      setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, entitlements: r.data.entitlements } : p)));
      onChanged('Capacidad actualizada');
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'No se pudo guardar');
    } finally {
      setBusyCell(null);
    }
  };

  const categories = [...new Set(catalog.map((c) => c.category))];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left">
        <div className="p-2 rounded-lg bg-violet-100 text-violet-700"><SlidersHorizontal className="h-5 w-5" /></div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 text-sm">Matriz de capacidades</div>
          <div className="text-xs text-gray-500">Activá features y editá cuotas por plan — mové capacidades entre planes para cobrar distinto</div>
        </div>
        {open ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 p-4">
          {err && <p className="text-xs text-rose-600 mb-2">{err}</p>}
          {!loaded ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 sticky left-0 bg-white text-[11px] uppercase tracking-wider text-gray-500">Capacidad</th>
                      {plans.map((p) => (
                        <th key={p.id} className="p-2 text-center min-w-[88px] text-xs font-bold text-gray-700">{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <Fragment key={cat}>
                        <tr>
                          <td colSpan={plans.length + 1} className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 px-2 py-1.5">{cat}</td>
                        </tr>
                        {catalog.filter((c) => c.category === cat).map((def) => (
                          <tr key={def.key} className="border-b border-gray-100">
                            <td className="p-2 sticky left-0 bg-white text-gray-700 font-medium text-xs">{def.labelEs}</td>
                            {plans.map((p) => {
                              const val = p.entitlements[def.key];
                              const busy = busyCell === p.id + def.key;
                              return (
                                <td key={p.id} className="p-2 text-center">
                                  {def.kind === 'feature' ? (
                                    <button
                                      disabled={busy}
                                      onClick={() => patchCell(p.id, def.key, !(val === true))}
                                      className="inline-flex disabled:opacity-50"
                                      title={val === true ? 'Incluido' : 'No incluido'}
                                    >
                                      {val === true
                                        ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                                        : <ToggleLeft className="h-5 w-5 text-gray-300" />}
                                    </button>
                                  ) : (
                                    <input
                                      key={`${p.id}-${def.key}-${val}`}
                                      type="number"
                                      defaultValue={Number(val)}
                                      disabled={busy}
                                      onBlur={(e) => {
                                        const n = parseInt(e.target.value, 10);
                                        if (Number.isFinite(n) && n !== Number(val)) patchCell(p.id, def.key, n);
                                      }}
                                      className="w-16 px-1 py-0.5 text-center text-xs border border-gray-300 rounded disabled:opacity-50"
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                En las cuotas, <code className="bg-gray-100 px-1 rounded">-1</code> = ilimitado. Los cambios se
                guardan al instante y rigen para todos los usuarios del plan. El plan Gratis usa
                <code className="bg-gray-100 px-1 rounded">trial_days</code> como límite de la prueba.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────
function PlanCard({ plan, expanded, onToggle, onChanged }: {
  plan: Plan; expanded: boolean; onToggle: () => void; onChanged: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'price' | 'features' | 'history' | 'demand'>('price');

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Resumen */}
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{plan.name}</span>
            {plan.isPopular && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
                <Star className="h-3 w-3" /> POPULAR
              </span>
            )}
            {!plan.isActive && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-500">INACTIVO</span>
            )}
            {plan.isCustom && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-100 text-violet-700">COTIZACIÓN</span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">{plan.code}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-gray-900">{money(plan.priceMonthly)}<span className="text-xs text-gray-400 font-normal">/mes</span></div>
          <div className="text-xs text-gray-500">{money(plan.priceYearly)}/año</div>
        </div>
        <div className="hidden sm:block text-right text-xs text-gray-500">
          <div>{plan.activeSubsMonthly + plan.activeSubsYearly} subs activas</div>
          <div>MRR {money(plan.mrr)}</div>
        </div>
        {expanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
      </button>

      {/* Editor */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="flex border-b border-gray-100 bg-gray-50">
            {([
              ['price', 'Precio'], ['features', 'Features'], ['history', 'Historial'], ['demand', 'Demanda'],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-2.5 text-xs font-semibold transition ${
                  tab === k ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-gray-500 hover:text-gray-800'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === 'price' && <PriceTab plan={plan} onChanged={onChanged} />}
            {tab === 'features' && <FeaturesTab plan={plan} onChanged={onChanged} />}
            {tab === 'history' && <HistoryTab planId={plan.id} />}
            {tab === 'demand' && <DemandTab plan={plan} onChanged={onChanged} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRICE TAB ────────────────────────────────────────────────────────────
function PriceTab({ plan, onChanged }: { plan: Plan; onChanged: (msg: string) => void }) {
  const [method, setMethod] = useState<'absolute' | 'percentage'>('absolute');
  const [cycle, setCycle] = useState<'monthly' | 'yearly' | 'both'>('monthly');
  const [value, setValue] = useState('');
  const [round, setRound] = useState<RoundMode>('none');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (plan.isCustom) {
    return <p className="text-sm text-gray-500">Este plan es de cotización personalizada — su precio no se edita acá.</p>;
  }

  // Vista previa del precio resultante.
  const v = parseFloat(value);
  const preview = (() => {
    if (!Number.isFinite(v)) return null;
    const calc = (base: number) => {
      let n = method === 'percentage' ? base * (1 + v / 100) : v;
      if (round === 'integer') n = Math.round(n);
      else if (round === 'psychological') n = Math.max(1, Math.round(n)) - 0.01;
      return Math.round(n * 100) / 100;
    };
    return {
      monthly: cycle !== 'yearly' ? calc(plan.priceMonthly) : plan.priceMonthly,
      yearly: cycle !== 'monthly' ? calc(plan.priceYearly) : plan.priceYearly,
    };
  })();

  const apply = async () => {
    if (!Number.isFinite(v)) { setErr('Ingresá un valor válido.'); return; }
    if (method === 'absolute' && cycle === 'both') { setErr('El precio directo se fija por ciclo: elegí mensual o anual.'); return; }
    setBusy(true); setErr('');
    try {
      await api.patch(`/admin/pricing/plans/${plan.id}/price`, { method, cycle, value: v, round, reason });
      onChanged(`Precio de ${plan.name} actualizado`);
      setValue(''); setReason('');
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'No se pudo aplicar');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <MethodBtn active={method === 'absolute'} onClick={() => setMethod('absolute')}
          icon={<DollarSign className="h-3.5 w-3.5" />} label="Precio directo" />
        <MethodBtn active={method === 'percentage'} onClick={() => setMethod('percentage')}
          icon={<Percent className="h-3.5 w-3.5" />} label="Ajuste porcentual" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Ciclo">
          <select value={cycle} onChange={(e) => setCycle(e.target.value as any)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
            {method === 'percentage' && <option value="both">Mensual y anual</option>}
          </select>
        </Field>
        <Field label={method === 'absolute' ? 'Nuevo precio (USD)' : 'Porcentaje (%)'}>
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder={method === 'absolute' ? 'ej. 79' : 'ej. 15'}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </Field>
        <Field label="Redondeo">
          <RoundSelect value={round} onChange={setRound} />
        </Field>
      </div>

      <Field label="Motivo (opcional)">
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="ej. captura de valor por nuevos features"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
      </Field>

      {/* Vista previa */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Mensual</div>
          <div className="font-semibold">
            {money(plan.priceMonthly)}
            {preview && cycle !== 'yearly' && preview.monthly !== plan.priceMonthly && (
              <span className="text-emerald-600"> → {money(preview.monthly)}</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Anual</div>
          <div className="font-semibold">
            {money(plan.priceYearly)}
            {preview && cycle !== 'monthly' && preview.yearly !== plan.priceYearly && (
              <span className="text-emerald-600"> → {money(preview.yearly)}</span>
            )}
          </div>
        </div>
      </div>

      {err && <p className="text-xs text-rose-600">{err}</p>}
      <button onClick={apply} disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Aplicar cambio de precio
      </button>
    </div>
  );
}

// ─── FEATURES TAB ─────────────────────────────────────────────────────────
function FeaturesTab({ plan, onChanged }: { plan: Plan; onChanged: (msg: string) => void }) {
  const [features, setFeatures] = useState(plan.features.join('\n'));
  const [description, setDescription] = useState(plan.description ?? '');
  const [isPopular, setIsPopular] = useState(plan.isPopular);
  const [isActive, setIsActive] = useState(plan.isActive);
  const [storageGb, setStorageGb] = useState(String(plan.storageGb));
  const [docs, setDocs] = useState(String(plan.documentsLimit));
  const [queries, setQueries] = useState(String(plan.monthlyQueries));
  const [apiCalls, setApiCalls] = useState(String(plan.apiCallsLimit));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.patch(`/admin/pricing/plans/${plan.id}/meta`, {
        description,
        features: features.split('\n').map((s) => s.trim()).filter(Boolean),
        isPopular, isActive,
        storageGb: parseFloat(storageGb) || 0,
        documentsLimit: parseInt(docs, 10) || 0,
        monthlyQueries: parseInt(queries, 10) || 0,
        apiCallsLimit: parseInt(apiCalls, 10) || 0,
      });
      onChanged(`Features de ${plan.name} guardados`);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'No se pudo guardar');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <Field label="Descripción">
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
      </Field>
      <Field label="Features (uno por línea — se muestran en la página de precios)">
        <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={7}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono resize-y" />
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Almacenamiento (GB)">
          <input type="number" value={storageGb} onChange={(e) => setStorageGb(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </Field>
        <Field label="Documentos">
          <input type="number" value={docs} onChange={(e) => setDocs(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </Field>
        <Field label="Consultas/mes">
          <input type="number" value={queries} onChange={(e) => setQueries(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </Field>
        <Field label="API calls">
          <input type="number" value={apiCalls} onChange={(e) => setApiCalls(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </Field>
      </div>
      <div className="flex gap-5">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} />
          Plan destacado (badge "Popular")
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Activo (visible en la página de precios)
        </label>
      </div>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <button onClick={save} disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Guardar features
      </button>
    </div>
  );
}

// ─── HISTORY TAB ──────────────────────────────────────────────────────────
function HistoryTab({ planId }: { planId: string }) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<{ history: HistoryEntry[] }>(`/admin/pricing/plans/${planId}/history`)
      .then((r) => setHistory(r.data.history ?? []))
      .catch((e) => setErr(e?.response?.data?.error || 'Error al cargar el historial'));
  }, [planId]);

  if (err) return <p className="text-sm text-rose-600">{err}</p>;
  if (!history) return <Loader2 className="h-5 w-5 animate-spin text-gray-400" />;
  if (history.length === 0) return <p className="text-sm text-gray-500">Sin cambios de precio registrados.</p>;

  return (
    <div className="space-y-2">
      {history.map((h) => {
        const up = h.newPrice > h.oldPrice;
        return (
          <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">
                  {money(h.oldPrice)} → {money(h.newPrice)}
                </span>
                <span className={`text-xs font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {up ? '▲' : '▼'} {h.changePct != null ? `${h.changePct > 0 ? '+' : ''}${h.changePct}%` : ''}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-200 text-gray-600">
                  {h.billingCycle === 'monthly' ? 'MENSUAL' : 'ANUAL'}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-600">
                  {METHOD_LABEL[h.changeMethod] || h.changeMethod}
                </span>
              </div>
              {h.reason && <div className="text-xs text-gray-600 mt-0.5">{h.reason}</div>}
              <div className="text-[11px] text-gray-400 mt-0.5">
                {fmtDate(h.createdAt)}{h.changedByEmail ? ` · ${h.changedByEmail}` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DEMAND TAB ───────────────────────────────────────────────────────────
function DemandTab({ plan, onChanged }: { plan: Plan; onChanged: (msg: string) => void }) {
  const [signals, setSignals] = useState<DemandSignals | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ signals: DemandSignals }>(`/admin/pricing/plans/${plan.id}/demand`)
      .then((r) => setSignals(r.data.signals))
      .catch((e) => setErr(e?.response?.data?.error || 'Error al calcular la demanda'));
  }, [plan.id]);

  const applySuggested = async (cycle: 'monthly' | 'yearly') => {
    if (!signals) return;
    const price = cycle === 'monthly' ? signals.suggestedMonthly : signals.suggestedYearly;
    if (!confirm(`¿Aplicar el precio sugerido por demanda (${money(price)} ${cycle === 'monthly' ? 'mensual' : 'anual'})?`)) return;
    setBusy(true);
    try {
      await api.patch(`/admin/pricing/plans/${plan.id}/price`, {
        method: 'demand', cycle, value: price,
        reason: `Precio sugerido por demanda (índice ${signals.demandIndex ?? 'n/d'})`,
      });
      onChanged(`Precio ${cycle === 'monthly' ? 'mensual' : 'anual'} de ${plan.name} actualizado por demanda`);
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'No se pudo aplicar');
    } finally { setBusy(false); }
  };

  if (err) return <p className="text-sm text-rose-600">{err}</p>;
  if (!signals) return <Loader2 className="h-5 w-5 animate-spin text-gray-400" />;

  const verdictColor = {
    high: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    balanced: 'bg-sky-50 border-sky-200 text-sky-800',
    low: 'bg-amber-50 border-amber-200 text-amber-800',
    insufficient: 'bg-gray-50 border-gray-200 text-gray-700',
  }[signals.verdict];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Modo oferta vs demanda: el sistema mira cuántas suscripciones activas concentra el plan y
        cuánto crece el embudo, y sugiere si hay margen para subir el precio.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Mini label="Subs activas" value={String(signals.activeSubs)} />
        <Mini label="% del total" value={`${(signals.shareOfActive * 100).toFixed(0)}%`} />
        <Mini label="Altas (30 d)" value={String(signals.signups30d)} />
        <Mini label="Índice demanda" value={signals.demandIndex != null ? `${signals.demandIndex}/100` : '—'} />
      </div>

      <div className={`p-3 rounded-lg border text-sm ${verdictColor}`}>
        <div className="font-bold mb-1">{signals.verdictLabel}</div>
        {signals.rationale}
      </div>

      {signals.verdict !== 'insufficient' && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex-1 text-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Precio sugerido</div>
            <div className="font-semibold text-gray-900">
              {money(signals.suggestedMonthly)}/mes · {money(signals.suggestedYearly)}/año
              <span className="text-emerald-600 text-xs"> ({signals.suggestedPct > 0 ? '+' : ''}{signals.suggestedPct}%)</span>
            </div>
          </div>
          <button onClick={() => applySuggested('monthly')} disabled={busy}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            Aplicar mensual
          </button>
          <button onClick={() => applySuggested('yearly')} disabled={busy}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 disabled:opacity-50">
            Aplicar anual
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────
function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600', teal: 'bg-teal-50 text-teal-600',
    sky: 'bg-sky-50 text-sky-600', indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${map[color] || map.emerald}`}>{icon}</div>
      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

function MethodBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
        active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}>
      {icon}{label}
    </button>
  );
}

function RoundSelect({ value, onChange }: { value: RoundMode; onChange: (v: RoundMode) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as RoundMode)}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
      <option value="none">Sin redondeo</option>
      <option value="integer">Entero ($70)</option>
      <option value="psychological">Psicológico ($69,99)</option>
    </select>
  );
}
