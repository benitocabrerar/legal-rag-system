'use client';

import React from 'react';
import { Briefcase, Activity, Clock, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCard {
  id: string;
  label: string;
  value: number;
  trend: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

interface QuickStatsCardsProps {
  totalCases: number;
  activeCases: number;
  pendingActions?: number;
  upcomingDeadlines?: number;
}

export function QuickStatsCards({
  totalCases,
  activeCases,
  pendingActions = 0,
  upcomingDeadlines = 0,
}: QuickStatsCardsProps) {
  const stats: StatCard[] = [
    {
      id: 'total-cases',
      label: 'Total de Casos',
      value: totalCases,
      trend: {
        value: 12,
        direction: 'up',
        label: '+12% vs semana pasada',
      },
      icon: <Briefcase className="w-8 h-8" />,
      color: '#2563eb',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'active-matters',
      label: 'Asuntos Activos',
      value: activeCases,
      trend: {
        value: 5,
        direction: 'up',
        label: `${Math.min(5, activeCases)} requieren atención`,
      },
      icon: <Activity className="w-8 h-8" />,
      color: '#16a34a',
      bgColor: 'bg-green-50',
    },
    {
      id: 'pending-actions',
      label: 'Acciones Pendientes',
      value: pendingActions,
      trend: {
        value: 3,
        direction: 'down',
        label: '-3 desde ayer',
      },
      icon: <Clock className="w-8 h-8" />,
      color: '#ca8a04',
      bgColor: 'bg-amber-50',
    },
    {
      id: 'deadlines-week',
      label: 'Plazos Esta Semana',
      value: upcomingDeadlines,
      trend: {
        value: 0,
        direction: 'up',
        label: upcomingDeadlines > 0 ? 'Próximo: Revisar' : 'Sin plazos próximos',
      },
      icon: <Calendar className="w-8 h-8" />,
      color: '#dc2626',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <button
          key={stat.id}
          onClick={stat.onClick}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.02] text-left"
          style={{ borderLeftColor: stat.color }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`${stat.bgColor} p-3 rounded-lg`} style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${
                stat.trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {stat.trend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-medium">{stat.trend.value}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-xs text-gray-500">{stat.trend.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
