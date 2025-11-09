'use client';

import React from 'react';
import { legalTypeConfig, LegalType } from '@/lib/design-tokens';

interface LegalTypeTab {
  id: LegalType | 'todos';
  label: string;
  icon: string;
  count: number;
  color: string;
}

interface LegalTypeFilterTabsProps {
  selected: LegalType | 'todos';
  onChange: (type: LegalType | 'todos') => void;
  caseCounts: Partial<Record<LegalType | 'todos', number>>;
}

export function LegalTypeFilterTabs({ selected, onChange, caseCounts }: LegalTypeFilterTabsProps) {
  const legalTypeTabs: LegalTypeTab[] = [
    {
      id: 'todos',
      label: 'Todos',
      icon: '📁',
      count: caseCounts.todos || 0,
      color: '#6b7280',
    },
    {
      id: 'penal',
      label: 'Penal',
      icon: '⚖️',
      count: caseCounts.penal || 0,
      color: legalTypeConfig.penal.color,
    },
    {
      id: 'civil',
      label: 'Civil',
      icon: '🏛️',
      count: caseCounts.civil || 0,
      color: legalTypeConfig.civil.color,
    },
    {
      id: 'constitucional',
      label: 'Constitucional',
      icon: '📜',
      count: caseCounts.constitucional || 0,
      color: legalTypeConfig.constitucional.color,
    },
    {
      id: 'transito',
      label: 'Tránsito',
      icon: '🚗',
      count: caseCounts.transito || 0,
      color: legalTypeConfig.transito.color,
    },
    {
      id: 'administrativo',
      label: 'Administrativo',
      icon: '🏢',
      count: caseCounts.administrativo || 0,
      color: legalTypeConfig.administrativo.color,
    },
    {
      id: 'laboral',
      label: 'Laboral',
      icon: '💼',
      count: caseCounts.laboral || 0,
      color: legalTypeConfig.laboral.color,
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-2 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {legalTypeTabs.map((tab) => {
          const isActive = selected === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                flex items-center gap-2 whitespace-nowrap
                ${isActive ? 'shadow-md' : 'text-gray-600 hover:bg-gray-50'}
              `}
              style={
                isActive
                  ? {
                      backgroundImage: `linear-gradient(135deg, ${tab.color}15 0%, ${tab.color}25 100%)`,
                      color: tab.color,
                    }
                  : {}
              }
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`
                  inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold
                  ${isActive ? 'text-white' : 'bg-gray-200 text-gray-700'}
                `}
                style={isActive ? { backgroundColor: tab.color } : {}}
              >
                {tab.count}
              </span>

              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: tab.color }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
