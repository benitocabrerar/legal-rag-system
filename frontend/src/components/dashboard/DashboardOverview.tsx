'use client';

/**
 * DashboardOverview — panel de control de alto impacto que muestra una
 * vista 360° del bufete: KPIs hero, próximas audiencias con countdown,
 * tareas urgentes, riesgos altos, acciones IA agregadas del cerebro de
 * cada caso, finanzas, documentos por kind y actividad reciente.
 *
 * Una sola request a /api/v1/dashboard/overview trae TODO. Pensado para
 * que el abogado entre al dashboard y en 5 segundos sepa qué tiene que
 * hacer hoy, qué tiene en riesgo y dónde está el dinero.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, AlertOctagon, Calendar, Clock, DollarSign,
  FileText, Gavel, Loader2, RefreshCw, Sparkles, Target,
  TrendingUp, Zap, Brain, ChevronRight, ListChecks, Activity,
} from 'lucide-react';
import { api } from '@/lib/api';

interface KPIs {
  totalCases: number;
  activeCases: number;
  newThisWeek: number;
  casesWithoutStage: number;
  upcomingHearings: number;
  urgentTasks: number;
  overdueTasks: number;
  highRiskCases: number;
}

interface Hearing {
  id: string; caseId: string; caseTitle: string;
  title: string; startTime: string; type: string | null;
}
interface UrgentTask {
  id: string; caseId: string | null; caseTitle: string | null;
  title: string; dueDate: string | null;
  priority: string; isOverdue: boolean;
}
interface HighRiskCase { id: string; title: string; reasoning: string; }
interface AggregatedAction {
  action: string; deadline: string | null; priority: string;
  caseId: string; caseTitle: string;
}
interface RecentDoc {
  id: string; caseId: string; caseTitle: string;
  title: string; kind: string | null; createdAt: string;
}
interface RecentAnalysis {
  id: string; caseId: string; caseTitle: string;
  title: string; generator: string | null; createdAt: string;
}

interface PaymentMilestone {
  id: string;
  caseId: string;
  caseTitle: string;
  label: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  dueDate: string | null;
  status: string;
}
interface ActiveAgreement {
  caseId: string;
  caseTitle: string;
  totalAmount: number;
  paymentType: string;
  signedAt: string | null;
}

interface Overview {
  generatedAt: string;
  kpis: KPIs;
  byLegalMatter: Array<{ legalMatter: string; count: number }>;
  proceduralStages: Array<{ stage: string; count: number }>;
  upcomingHearings: Hearing[];
  urgentTasks: UrgentTask[];
  highRiskCases: HighRiskCase[];
  aggregatedActions: AggregatedAction[];
  aggregatedGaps: string[];
  documentCounts: {
    total: number; uploaded: number; ai_generated: number;
    ai_analysis: number; court_filed: number;
  };
  recentDocuments: RecentDoc[];
  recentAnalyses: RecentAnalysis[];
  finance: {
    totalBilled: number; totalPaid: number; outstanding: number;
    aging: Record<string, number>;
  };
  recentBrainRefreshes: Array<{ caseId: string; caseTitle: string; generatedAt: string }>;
  upcomingPaymentMilestones?: PaymentMilestone[];
  activeAgreements?: ActiveAgreement[];
  changesSince: { newDocs: number; newAnalyses: number; brainsRefreshed: number } | null;
}

const LAST_VISIT_KEY = 'poweria-dashboard-last-visit';

export function DashboardOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const lastVisit = typeof window !== 'undefined' ? localStorage.getItem(LAST_VISIT_KEY) : null;
      const r = await api.get('/dashboard/overview', {
        params: lastVisit ? { since: lastVisit } : {},
      });
      setData(r.data);
      // Actualizar last-visit DESPUÉS de fetch para que cambios se vean primer load
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el panel');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void fetchOverview(true); }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 rounded-xl bg-gradient-to-r from-slate-100 via-indigo-50 to-fuchsia-50 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error || 'No se pudo cargar el panel'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Banner de cambios desde la última visita ── */}
      {data.changesSince && (data.changesSince.newDocs > 0 || data.changesSince.newAnalyses > 0 || data.changesSince.brainsRefreshed > 0) && (
        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm text-indigo-900">
            <span className="font-bold">Desde tu última visita: </span>
            {data.changesSince.newDocs > 0 && <span>📄 <strong>{data.changesSince.newDocs}</strong> docs nuevos · </span>}
            {data.changesSince.newAnalyses > 0 && <span>✨ <strong>{data.changesSince.newAnalyses}</strong> análisis IA · </span>}
            {data.changesSince.brainsRefreshed > 0 && <span>🧠 <strong>{data.changesSince.brainsRefreshed}</strong> cerebros actualizados</span>}
          </div>
        </div>
      )}

      {/* ─── HERO: próxima audiencia con countdown ─── */}
      <NextHearingBanner hearings={data.upcomingHearings} onRefresh={() => fetchOverview()} refreshing={refreshing} />

      {/* ─── KPI Grid principal — 4 cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          icon={<Gavel className="w-5 h-5" />}
          label="Audiencias 30 días"
          value={data.kpis.upcomingHearings}
          gradient="from-violet-500 to-purple-600"
          sublabel={data.upcomingHearings[0] ? `Próxima: ${nearbyDate(data.upcomingHearings[0].startTime)}` : 'Sin audiencias programadas'}
        />
        <KPICard
          icon={<ListChecks className="w-5 h-5" />}
          label="Tareas urgentes"
          value={data.kpis.urgentTasks}
          gradient={data.kpis.overdueTasks > 0 ? 'from-rose-500 to-red-600' : 'from-amber-500 to-orange-600'}
          sublabel={data.kpis.overdueTasks > 0 ? `⚠ ${data.kpis.overdueTasks} vencidas` : 'Esta semana + alta prioridad'}
        />
        <KPICard
          icon={<AlertOctagon className="w-5 h-5" />}
          label="Casos de alto riesgo"
          value={data.kpis.highRiskCases}
          gradient={data.kpis.highRiskCases > 0 ? 'from-rose-500 to-red-600' : 'from-emerald-500 to-teal-600'}
          sublabel={data.kpis.highRiskCases > 0 ? 'Revisar estrategia' : 'Todos bajo control'}
        />
        <KPICard
          icon={<DollarSign className="w-5 h-5" />}
          label="Por cobrar"
          value={`$${formatMoney(data.finance.outstanding)}`}
          isText
          gradient={data.finance.outstanding > 0 ? 'from-amber-500 to-orange-600' : 'from-emerald-500 to-teal-600'}
          sublabel={`Facturado: $${formatMoney(data.finance.totalBilled)}`}
        />
      </div>

      {/* ─── Próximas audiencias + Tareas urgentes ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard
          icon={<Calendar className="w-5 h-5 text-violet-600" />}
          title="Próximas audiencias"
          subtitle={`${data.upcomingHearings.length} en los próximos 30 días`}
          accent="violet"
        >
          {data.upcomingHearings.length === 0 ? (
            <EmptyMini text="Sin audiencias programadas" />
          ) : (
            <ul className="space-y-1.5">
              {data.upcomingHearings.slice(0, 5).map((h) => {
                const date = new Date(h.startTime);
                const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <li key={h.id}>
                    <Link
                      href={`/dashboard/cases/${h.caseId}`}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-violet-50 group transition"
                    >
                      <div className={`w-12 h-12 rounded-lg grid place-items-center text-white shrink-0 font-black text-sm ${
                        days < 1 ? 'bg-gradient-to-br from-rose-500 to-red-600' :
                        days < 4 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                        'bg-gradient-to-br from-violet-500 to-purple-600'
                      }`}>
                        <div className="text-center leading-none">
                          <div className="text-base">{date.getDate()}</div>
                          <div className="text-[9px] uppercase tracking-wider opacity-80">
                            {date.toLocaleDateString('es', { month: 'short' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate group-hover:text-violet-700">{h.title}</div>
                        <div className="text-xs text-gray-600 truncate">{h.caseTitle}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {date.toLocaleString('es-EC', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                          <span className={`ml-1.5 font-bold ${
                            days < 1 ? 'text-rose-700' : days < 4 ? 'text-amber-700' : 'text-violet-700'
                          }`}>
                            {days < 0 ? `hace ${-days}d` : days === 0 ? 'HOY' : days === 1 ? 'MAÑANA' : `en ${days}d`}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-violet-600 mt-3 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={<Zap className="w-5 h-5 text-amber-600" />}
          title="Tareas urgentes"
          subtitle={`${data.kpis.overdueTasks > 0 ? `${data.kpis.overdueTasks} vencidas · ` : ''}${data.kpis.urgentTasks} en total`}
          accent="amber"
          danger={data.kpis.overdueTasks > 0}
        >
          {data.urgentTasks.length === 0 ? (
            <EmptyMini text="Sin tareas urgentes" />
          ) : (
            <ul className="space-y-1.5">
              {data.urgentTasks.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.caseId ? `/dashboard/cases/${t.caseId}` : '/dashboard/tasks'}
                    className={`flex items-start gap-2 p-2 rounded-lg group transition ${
                      t.isOverdue ? 'hover:bg-rose-50' : 'hover:bg-amber-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      t.priority === 'high' ? 'bg-rose-500' :
                      t.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${
                        t.isOverdue ? 'text-rose-700' : 'text-gray-900'
                      }`}>
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                        {t.caseTitle && <span className="truncate max-w-[160px]">{t.caseTitle}</span>}
                        {t.dueDate && (
                          <span className={`font-bold flex items-center gap-1 ${
                            t.isOverdue ? 'text-rose-700' : 'text-amber-700'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {t.isOverdue ? 'VENCIDA · ' : ''}
                            {nearbyDate(t.dueDate)}
                          </span>
                        )}
                        {!t.dueDate && t.priority === 'high' && (
                          <span className="font-bold text-rose-700">PRIORIDAD ALTA</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ─── Acciones IA agregadas del cerebro + Riesgos altos ─── */}
      {(data.aggregatedActions.length > 0 || data.highRiskCases.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.aggregatedActions.length > 0 && (
            <SectionCard
              icon={<Sparkles className="w-5 h-5 text-fuchsia-600" />}
              title="Próximas acciones (cerebro IA)"
              subtitle={`${data.aggregatedActions.length} acciones identificadas por la IA en todos tus casos`}
              accent="fuchsia"
            >
              <ul className="space-y-2">
                {data.aggregatedActions.slice(0, 5).map((a, i) => (
                  <li key={i}>
                    <Link
                      href={`/dashboard/cases/${a.caseId}`}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-fuchsia-50 group transition"
                    >
                      <div className={`w-1 self-stretch rounded-full ${
                        a.priority === 'high' ? 'bg-rose-500' :
                        a.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-fuchsia-700">
                          {a.action}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                          <span className="truncate">{a.caseTitle}</span>
                          {a.deadline && <span className="text-amber-700 font-bold">📅 {a.deadline}</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            a.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                            a.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {a.priority}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {data.highRiskCases.length > 0 && (
            <SectionCard
              icon={<AlertOctagon className="w-5 h-5 text-rose-600" />}
              title="Casos en alto riesgo"
              subtitle={`${data.highRiskCases.length} casos requieren atención inmediata`}
              accent="rose"
              danger
            >
              <ul className="space-y-2">
                {data.highRiskCases.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="block p-2.5 rounded-lg bg-rose-50/60 hover:bg-rose-100 border border-rose-200/60 group transition"
                    >
                      <div className="text-sm font-bold text-rose-900 leading-snug group-hover:text-rose-700">
                        {c.title}
                      </div>
                      {c.reasoning && (
                        <div className="text-[11px] text-rose-800 mt-1 italic line-clamp-2">
                          {c.reasoning}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      {/* ─── Próximos pagos (cuando hay milestones) ─── */}
      {data.upcomingPaymentMilestones && data.upcomingPaymentMilestones.length > 0 && (
        <SectionCard
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          title="Próximos pagos del expediente"
          subtitle={`${data.upcomingPaymentMilestones.length} hitos pendientes en acuerdos de honorarios`}
          accent="emerald"
        >
          <ul className="space-y-2">
            {data.upcomingPaymentMilestones.slice(0, 6).map((m) => {
              const due = m.dueDate ? new Date(m.dueDate) : null;
              const daysToDue = due ? Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
              const isOverdue = daysToDue != null && daysToDue < 0;
              const isSoon = daysToDue != null && daysToDue >= 0 && daysToDue <= 14;
              return (
                <li key={m.id}>
                  <Link
                    href={`/dashboard/cases/${m.caseId}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-emerald-50 group transition"
                  >
                    <div className={`w-12 h-12 rounded-lg grid place-items-center text-white shrink-0 font-black ${
                      isOverdue ? 'bg-gradient-to-br from-rose-500 to-red-600' :
                      isSoon ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                      'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-700">
                        {m.label}
                      </div>
                      <div className="text-xs text-gray-600 truncate">{m.caseTitle}</div>
                      <div className="text-[11px] mt-0.5 flex items-center gap-2">
                        {due && (
                          <span className={`font-bold ${
                            isOverdue ? 'text-rose-700' : isSoon ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            <Calendar className="w-3 h-3 inline mr-0.5" />
                            {due.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                            {daysToDue != null && (
                              daysToDue < 0 ? ` · vencido hace ${-daysToDue}d` :
                              daysToDue === 0 ? ' · HOY' :
                              daysToDue === 1 ? ' · mañana' :
                              ` · en ${daysToDue}d`
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-gray-900 tabular-nums">
                        ${m.remaining.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      {m.paidAmount > 0 && (
                        <div className="text-[10px] text-emerald-700">
                          ${m.paidAmount.toLocaleString('es-EC', { maximumFractionDigits: 0 })} pagado
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {data.activeAgreements && data.activeAgreements.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">
                Acuerdos de honorarios activos
              </div>
              <ul className="space-y-1">
                {data.activeAgreements.slice(0, 3).map((a) => (
                  <li key={a.caseId} className="flex items-center justify-between text-xs">
                    <Link href={`/dashboard/cases/${a.caseId}`} className="text-gray-700 hover:text-emerald-700 truncate flex-1">
                      💼 {a.caseTitle} · <span className="text-gray-500">{a.paymentType}</span>
                    </Link>
                    <span className="font-bold text-emerald-700 tabular-nums shrink-0 ml-2">
                      ${a.totalAmount.toLocaleString('es-EC', { maximumFractionDigits: 0 })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── Documentos por kind + Actividad reciente ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Documentos por kind */}
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-sm">Documentos del bufete</h3>
          </div>
          <div className="text-3xl font-black text-gray-900 tabular-nums mb-1">
            {data.documentCounts.total}
          </div>
          <div className="text-xs text-gray-500 mb-3">expedientes activos</div>
          <div className="space-y-1.5">
            <KindBar label="Subidos por mí" value={data.documentCounts.uploaded} total={data.documentCounts.total} color="bg-indigo-500" />
            <KindBar label="Borradores IA" value={data.documentCounts.ai_generated} total={data.documentCounts.total} color="bg-purple-500" />
            <KindBar label="Análisis IA" value={data.documentCounts.ai_analysis} total={data.documentCounts.total} color="bg-fuchsia-500" />
            <KindBar label="⚖️ Presentados" value={data.documentCounts.court_filed} total={data.documentCounts.total} color="bg-emerald-500" />
          </div>
        </div>

        {/* Aging de cobranza */}
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm">Cobranza por antigüedad</h3>
          </div>
          <div className="text-3xl font-black text-amber-700 tabular-nums mb-1">
            ${formatMoney(data.finance.outstanding)}
          </div>
          <div className="text-xs text-gray-500 mb-3">por cobrar total</div>
          <div className="space-y-1.5">
            {(['0-30', '31-60', '61-90', '90+'] as const).map((bucket) => {
              const v = data.finance.aging[bucket] || 0;
              const max = Math.max(...Object.values(data.finance.aging), 1);
              const pct = Math.round((v / max) * 100);
              return (
                <div key={bucket} className="flex items-center gap-2 text-xs">
                  <div className="w-12 text-gray-500 font-mono shrink-0">{bucket}d</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      bucket === '90+' ? 'bg-rose-500' :
                      bucket === '61-90' ? 'bg-orange-500' :
                      bucket === '31-60' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-20 text-right text-gray-700 font-bold tabular-nums shrink-0">
                    ${formatMoney(v)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-violet-600" />
            <h3 className="font-bold text-gray-900 text-sm">Actividad reciente</h3>
          </div>
          {data.recentDocuments.length === 0 && data.recentAnalyses.length === 0 ? (
            <EmptyMini text="Sin actividad esta semana" />
          ) : (
            <ul className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {[...data.recentAnalyses.map((a) => ({ ...a, kind: 'ai_analysis' as const })),
                ...data.recentDocuments]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)
                .map((item) => {
                  const isAi = item.kind === 'ai_analysis' || item.kind === 'ai_generated';
                  return (
                    <li key={item.id} className="text-xs">
                      <Link
                        href={`/dashboard/cases/${item.caseId}`}
                        className="flex items-start gap-2 hover:bg-gray-50 p-1.5 rounded transition"
                      >
                        <span className="text-sm shrink-0 mt-0.5">{isAi ? '✨' : '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 truncate leading-snug">{item.title}</div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {item.caseTitle} · {nearbyDate(item.createdAt)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      {/* ─── Footer: timestamp + refresh ─── */}
      <div className="text-center text-[10px] text-gray-400 pt-2">
        Panel sincronizado {nearbyDate(data.generatedAt)} ·
        <button
          onClick={() => fetchOverview()}
          disabled={refreshing}
          className="ml-1 text-indigo-600 hover:text-indigo-700 font-semibold disabled:opacity-50"
        >
          {refreshing ? 'Actualizando…' : 'Re-sincronizar ahora'}
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────

function NextHearingBanner({
  hearings, onRefresh, refreshing,
}: { hearings: Hearing[]; onRefresh: () => void; refreshing: boolean }) {
  const next = hearings[0];
  const countdown = useMemo(() => {
    if (!next) return null;
    const d = new Date(next.startTime);
    const ms = d.getTime() - Date.now();
    if (ms < 0) return { days: 0, hours: 0, label: 'En curso o pasada' };
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return {
      days,
      hours,
      label: days > 0
        ? `${days} día${days > 1 ? 's' : ''} ${hours} h`
        : `${hours} hora${hours !== 1 ? 's' : ''}`,
    };
  }, [next]);

  if (!next || !countdown) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-2 border-emerald-200/60 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white shadow-lg shadow-emerald-500/30">
          <Calendar className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider font-bold text-emerald-700">Tu agenda</div>
          <div className="text-lg font-bold text-gray-900">Sin audiencias programadas</div>
          <div className="text-sm text-gray-600">Aprovechá para preparar escritos, generar análisis o cargar nuevos documentos.</div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-emerald-700 hover:text-emerald-900 p-2 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
          title="Re-sincronizar"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  const urgency = countdown.days < 1 ? 'critical' : countdown.days < 4 ? 'warn' : 'normal';

  return (
    <div className={`rounded-xl p-5 flex items-center gap-4 border-2 ${
      urgency === 'critical' ? 'bg-gradient-to-r from-rose-50 via-white to-red-50 border-rose-300/60'
      : urgency === 'warn' ? 'bg-gradient-to-r from-amber-50 via-white to-orange-50 border-amber-300/60'
      : 'bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 border-violet-200/60'
    }`}>
      <div className={`w-14 h-14 rounded-2xl grid place-items-center text-white shadow-lg shrink-0 ${
        urgency === 'critical' ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30'
        : urgency === 'warn' ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
        : 'bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-500/30'
      }`}>
        <Gavel className="w-7 h-7" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs uppercase tracking-wider font-bold ${
          urgency === 'critical' ? 'text-rose-700' : urgency === 'warn' ? 'text-amber-700' : 'text-violet-700'
        }`}>
          {urgency === 'critical' ? '⚠️ AUDIENCIA INMINENTE' : 'Próxima audiencia en'}
        </div>
        <div className="flex items-baseline gap-3 my-1">
          <span className={`text-4xl font-black tabular-nums ${
            urgency === 'critical' ? 'text-rose-700' : urgency === 'warn' ? 'text-amber-700' : 'text-violet-700'
          }`}>
            {countdown.label}
          </span>
          <span className="text-base font-semibold text-gray-900 truncate">{next.title}</span>
        </div>
        <div className="text-sm text-gray-700 truncate">
          <Link href={`/dashboard/cases/${next.caseId}`} className="font-bold hover:underline">
            {next.caseTitle}
          </Link>
          <span className="text-gray-500"> · {new Date(next.startTime).toLocaleString('es-EC', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          })}</span>
        </div>
      </div>
      <Link
        href={`/dashboard/cases/${next.caseId}/litigation`}
        className={`hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all shrink-0 ${
          urgency === 'critical' ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white'
          : urgency === 'warn' ? 'bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white'
          : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white'
        }`}
      >
        <Brain className="w-4 h-4" />
        Preparar sala
      </Link>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-white/60 disabled:opacity-50"
        title="Re-sincronizar"
      >
        {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      </button>
    </div>
  );
}

function KPICard({
  icon, label, value, gradient, sublabel, isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  gradient: string;
  sublabel?: string;
  isText?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${gradient} text-white shadow-md`}>
      <div className="flex items-center justify-between mb-2 opacity-90">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">KPI</span>
      </div>
      <div className={`font-black tabular-nums leading-none ${isText ? 'text-2xl' : 'text-4xl'}`}>
        {value}
      </div>
      <div className="text-xs font-bold opacity-90 mt-1.5">{label}</div>
      {sublabel && <div className="text-[10px] opacity-75 mt-0.5 truncate">{sublabel}</div>}
    </div>
  );
}

function SectionCard({
  icon, title, subtitle, accent, danger, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: 'violet' | 'amber' | 'fuchsia' | 'rose' | 'emerald';
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl bg-white border-2 p-4 ${
      danger ? 'border-rose-200' :
      accent === 'violet' ? 'border-violet-100' :
      accent === 'amber' ? 'border-amber-100' :
      accent === 'fuchsia' ? 'border-fuchsia-100' :
      accent === 'rose' ? 'border-rose-100' :
      'border-emerald-100'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{title}</h3>
          {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function KindBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-28 text-gray-600 shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <div className="w-8 text-right text-gray-700 font-bold tabular-nums shrink-0">{value}</div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="text-xs text-gray-400 italic py-4 text-center">{text}</div>;
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

function nearbyDate(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const abs = Math.abs(ms);
  const past = ms > 0;
  if (abs < 60_000) return past ? 'hace segundos' : 'en segundos';
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return past ? `hace ${m} min` : `en ${m} min`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return past ? `hace ${h}h` : `en ${h}h`;
  }
  const days = Math.round(abs / 86_400_000);
  if (days < 7) return past ? `hace ${days}d` : `en ${days}d`;
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
}
