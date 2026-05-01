'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface CaseLite {
  id: string;
  title: string;
  status?: string;
  legalType?: string;
  legalMatter?: string;
  nextHearingAt?: string | null;
  filedAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
  factsSummary?: string | null;
  proceduralStage?: string | null;
}

interface Insight {
  id: string;
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIInsightsPanelProps {
  cases?: CaseLite[];
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-yellow-50 border-yellow-200',
  low: 'bg-blue-50 border-blue-200',
};

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = Date.now();
  return Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
}

function buildInsights(
  cases: CaseLite[],
  t: (key: string) => string,
  locale: string,
): Insight[] {
  const insights: Insight[] = [];
  const isEn = locale === 'en';

  // 1) Audiencias próximas
  const upcomingHearings = cases
    .map((c) => ({ c, days: daysUntil(c.nextHearingAt) }))
    .filter(({ days }) => days !== null && days >= 0 && days <= 14)
    .sort((a, b) => (a.days! - b.days!));

  if (upcomingHearings.length > 0) {
    const next = upcomingHearings[0];
    const dayLabel = (n: number) => (isEn ? (n !== 1 ? 'days' : 'day') : (n !== 1 ? 'días' : 'día'));
    const desc = upcomingHearings.length === 1
      ? (isEn
        ? `You have 1 upcoming hearing: "${next.c.title}" in ${next.days} ${dayLabel(next.days!)}.`
        : `Tienes 1 audiencia próxima: "${next.c.title}" en ${next.days} ${dayLabel(next.days!)}.`)
      : (isEn
        ? `You have ${upcomingHearings.length} hearings in the next 2 weeks. Closest: "${next.c.title}" in ${next.days} ${dayLabel(next.days!)}.`
        : `Tienes ${upcomingHearings.length} audiencias en las próximas 2 semanas. La más próxima: "${next.c.title}" en ${next.days} ${dayLabel(next.days!)}.`);
    insights.push({
      id: 'hearings',
      emoji: '📅',
      title: t('dashboard.insightUpcomingHearings'),
      description: desc,
      actionLabel: t('dashboard.actionGoToCase'),
      actionUrl: `/dashboard/cases/${next.c.id}`,
      priority: next.days! <= 3 ? 'high' : 'medium',
    });
  }

  // 2) Distribución por materia
  const matterCount: Record<string, number> = {};
  const unclassified = isEn ? 'Unclassified' : 'Sin clasificar';
  for (const c of cases) {
    const m = c.legalMatter || c.legalType || unclassified;
    matterCount[m] = (matterCount[m] || 0) + 1;
  }
  const matters = Object.entries(matterCount).sort((a, b) => b[1] - a[1]);
  if (matters.length > 0 && cases.length >= 2) {
    const top = matters[0];
    const total = cases.length;
    const pct = Math.round((top[1] / total) * 100);
    const desc = matters.length === 1
      ? (isEn
        ? `100% of your ${total} cases are ${top[0]}. Consider diversifying?`
        : `El 100% de tus ${total} casos son de materia ${top[0]}. ¿Considerar diversificación?`)
      : (isEn
        ? `Your main practice area is ${top[0]} (${top[1]} cases · ${pct}%). You have ${matters.length} active areas total.`
        : `Tu materia principal es ${top[0]} (${top[1]} casos · ${pct}%). En total tienes ${matters.length} áreas activas.`);
    insights.push({
      id: 'matters',
      emoji: '📊',
      title: t('dashboard.insightMatters'),
      description: desc,
      actionLabel: t('dashboard.actionViewCases'),
      actionUrl: '/dashboard',
      priority: 'low',
    });
  }

  // 3) Casos sin actividad reciente
  const stale = cases.filter((c) => {
    if (!c.updatedAt || c.status === 'closed') return false;
    return daysUntil(c.updatedAt) !== null && (daysUntil(c.updatedAt)! < -14);
  });
  if (stale.length > 0) {
    const desc = isEn
      ? `${stale.length} case${stale.length !== 1 ? 's' : ''} not updated in over 2 weeks. Review progress or archive if completed.`
      : `${stale.length} caso${stale.length !== 1 ? 's' : ''} sin actualizar en más de 2 semanas. Revisar avances o archivar si están concluidos.`;
    insights.push({
      id: 'stale',
      emoji: '⏰',
      title: t('dashboard.insightStale'),
      description: desc,
      actionLabel: stale.length === 1 ? t('dashboard.actionGoToCase') : t('dashboard.actionViewCases'),
      actionUrl: stale.length === 1 ? `/dashboard/cases/${stale[0].id}` : '/dashboard',
      priority: 'medium',
    });
  }

  // 4) Casos sin etapa procesal
  const noStage = cases.filter((c) => c.status !== 'closed' && !c.proceduralStage);
  if (noStage.length > 0 && cases.length > 0) {
    const desc = isEn
      ? `${noStage.length} case${noStage.length !== 1 ? 's' : ''} without a defined procedural stage. Configuring it improves pipeline tracking.`
      : `${noStage.length} caso${noStage.length !== 1 ? 's' : ''} sin etapa procesal definida. Configurarla mejora el seguimiento del pipeline.`;
    insights.push({
      id: 'no-stage',
      emoji: '📋',
      title: t('dashboard.insightNoStage'),
      description: desc,
      actionLabel: noStage.length === 1 ? t('dashboard.actionConfigure') : t('dashboard.actionViewCases'),
      actionUrl: noStage.length === 1 ? `/dashboard/cases/${noStage[0].id}` : '/dashboard',
      priority: 'low',
    });
  }

  // 5) Bienvenida cuando no hay casos
  if (cases.length === 0) {
    insights.push({
      id: 'welcome',
      emoji: '👋',
      title: t('dashboard.insightWelcome'),
      description: t('dashboard.createCaseHint'),
      actionLabel: t('dashboard.createCase'),
      actionUrl: '/dashboard',
      priority: 'low',
    });
  }

  return insights;
}

export function AIInsightsPanel({ cases = [] }: AIInsightsPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t, locale } = useTranslation();
  const insights = useMemo(() => buildInsights(cases, t, locale), [cases, t, locale]);

  if (insights.length === 0) return null;

  const safeIndex = Math.min(currentIndex, insights.length - 1);
  const currentInsight = insights[safeIndex];

  const nextInsight = () => setCurrentIndex((prev) => (prev + 1) % insights.length);
  const prevInsight = () => setCurrentIndex((prev) => (prev - 1 + insights.length) % insights.length);

  // Quick pills derivadas de los datos
  const totalActive = cases.filter((c) => c.status !== 'closed').length;
  const upcomingCount = cases.filter((c) => {
    const d = daysUntil(c.nextHearingAt);
    return d !== null && d >= 0 && d <= 14;
  }).length;
  const newCount = cases.filter((c) => {
    const d = daysUntil(c.createdAt);
    return d !== null && d >= -7 && d <= 0;
  }).length;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
          <h2 className="text-xl font-bold text-gray-900">{t('dashboard.aiInsightsTitle')}</h2>
          <span className="text-xs text-gray-500 ml-1">
            {t('dashboard.aiInsightsBasedOn')
              .replace('{count}', String(cases.length))
              .replace('{plural}', cases.length !== 1 ? (locale === 'en' ? 's' : 's') : '')}
          </span>
        </div>
      </div>

      <div className={`bg-white rounded-xl p-6 shadow-sm border-2 ${PRIORITY_STYLES[currentInsight.priority]} mb-4`}>
        <div className="flex items-start gap-3 mb-2">
          <div className="text-2xl">{currentInsight.emoji}</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{currentInsight.title}</h3>
            <p className="text-gray-700 leading-relaxed mb-4">{currentInsight.description}</p>
            {currentInsight.actionLabel && currentInsight.actionUrl && (
              <Link
                href={currentInsight.actionUrl}
                className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md text-sm"
              >
                {currentInsight.actionLabel} →
              </Link>
            )}
          </div>
        </div>
      </div>

      {insights.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevInsight}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex gap-2">
            {insights.map((_, index) => (
              <button
                type="button"
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === safeIndex ? 'bg-indigo-600 w-8' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Insight ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={nextInsight}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {(totalActive > 0 || upcomingCount > 0 || newCount > 0) && (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('dashboard.quickSummary')}</p>
          <div className="flex flex-wrap gap-2">
            {totalActive > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                {t('dashboard.casesActive')
                  .replace('{count}', String(totalActive))
                  .replace(/\{plural\}/g, totalActive !== 1 ? 's' : '')}
              </div>
            )}
            {upcomingCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {t('dashboard.hearingsIn2Weeks')
                  .replace('{count}', String(upcomingCount))
                  .replace(/\{plural\}/g, upcomingCount !== 1 ? 's' : '')}
              </div>
            )}
            {newCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                {t('dashboard.casesThisWeek')
                  .replace('{count}', String(newCount))
                  .replace(/\{plural\}/g, newCount !== 1 ? 's' : '')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
