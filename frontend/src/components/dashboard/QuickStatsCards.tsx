'use client';

import React from 'react';
import { Briefcase, Activity, Clock, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface QuickStatsCardsProps {
  totalCases: number;
  activeCases: number;
  pendingActions?: number;
  upcomingDeadlines?: number;
  newThisWeek?: number;          // +X casos creados esta semana
  needsAttention?: number;       // casos activos sin actividad reciente
  nextDeadlineLabel?: string | null;
}

export function QuickStatsCards({
  totalCases,
  activeCases,
  pendingActions = 0,
  upcomingDeadlines = 0,
  newThisWeek = 0,
  needsAttention = 0,
  nextDeadlineLabel = null,
}: QuickStatsCardsProps) {
  const { t } = useTranslation();
  const stats = [
    {
      id: 'total-cases',
      label: t('dashboard.totalCases'),
      value: totalCases,
      sub: newThisWeek > 0
        ? t('dashboard.newThisWeekCount').replace('{count}', String(newThisWeek))
        : t('dashboard.noNewThisWeek'),
      trend: newThisWeek > 0 ? { dir: 'up' as const, value: newThisWeek } : null,
      icon: <Briefcase className="w-8 h-8" />,
      color: '#2563eb',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'active-matters',
      label: t('dashboard.activeMatters'),
      value: activeCases,
      sub: needsAttention > 0
        ? t('dashboard.needAttentionCount').replace('{count}', String(needsAttention))
        : t('dashboard.allUpToDate'),
      trend: null,
      icon: <Activity className="w-8 h-8" />,
      color: '#16a34a',
      bgColor: 'bg-green-50',
    },
    {
      id: 'pending-actions',
      label: t('dashboard.pendingActions'),
      value: pendingActions,
      sub: pendingActions > 0 ? t('dashboard.tasksInProgress') : t('dashboard.noPending'),
      trend: null,
      icon: <Clock className="w-8 h-8" />,
      color: '#ca8a04',
      bgColor: 'bg-amber-50',
    },
    {
      id: 'deadlines-week',
      label: t('dashboard.deadlinesWeek'),
      value: upcomingDeadlines,
      sub: nextDeadlineLabel
        ? t('dashboard.nextDeadlineLabel').replace('{label}', nextDeadlineLabel)
        : upcomingDeadlines === 0
          ? t('dashboard.noUpcomingDeadlines')
          : t('dashboard.checkAgenda'),
      trend: null,
      icon: <Calendar className="w-8 h-8" />,
      color: '#dc2626',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 text-left"
          style={{ borderLeftColor: stat.color }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`${stat.bgColor} p-3 rounded-lg`} style={{ color: stat.color }}>
              {stat.icon}
            </div>
            {stat.trend && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  stat.trend.dir === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.trend.dir === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">+{stat.trend.value}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-xs text-gray-500">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
