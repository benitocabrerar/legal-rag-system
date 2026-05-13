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
  const orderedKeys: Array<LegalType | 'todos'> = [
    'todos',
    ...(Object.keys(legalTypeConfig).filter((k) => k !== 'todos') as LegalType[]),
  ];

  const legalTypeTabs: LegalTypeTab[] = orderedKeys.map((id) => {
    const cfg = legalTypeConfig[id];
    return {
      id,
      label: cfg.label,
      icon: cfg.icon,
      count: caseCounts[id] || 0,
      color: cfg.color,
    };
  });

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
