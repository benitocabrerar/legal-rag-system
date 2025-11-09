# Component Implementation Guide
## Legal AI Dashboard - Quick Reference

This guide provides practical implementation details for developers building the Legal AI Dashboard components.

---

## Quick Start Checklist

### 1. Setup Design System
```bash
# Install dependencies
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react # Icon library
npm install framer-motion # Animations
npm install @tanstack/react-query # Data fetching
npm install zustand # State management
```

### 2. Create Design Token File
Location: `frontend/src/styles/design-tokens.css`

```css
:root {
  /* Legal Type Colors */
  --legal-penal: #b91c1c;
  --legal-civil: #2563eb;
  --legal-const: #9333ea;
  --legal-transito: #ca8a04;
  --legal-admin: #4b5563;
  --legal-laboral: #16a34a;

  /* Brand */
  --color-primary: #4f46e5;
  --gradient-brand: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);

  /* Spacing */
  --space-card-padding: 1.5rem;
  --space-section-gap: 2rem;

  /* Shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-card-hover: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

---

## Component Library

### 1. Enhanced Case Card

**File**: `frontend/src/components/dashboard/EnhancedCaseCard.tsx`

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, FileText, MessageSquare, MoreVertical } from 'lucide-react';

interface EnhancedCaseCardProps {
  case: {
    id: string;
    title: string;
    legalType: 'penal' | 'civil' | 'constitucional' | 'transito' | 'administrativo' | 'laboral';
    priority: 'high' | 'medium' | 'low';
    status: string;
    clientName: string;
    caseNumber?: string;
    nextAction?: {
      description: string;
      dueDate: string;
      daysUntilDue: number;
    };
    progress: number;
    documentCount: number;
    queryCount: number;
    createdAt: string;
  };
}

const legalTypeConfig = {
  penal: { color: '#b91c1c', icon: '⚖️', label: 'PENAL', bgLight: '#fee2e2' },
  civil: { color: '#2563eb', icon: '🏛️', label: 'CIVIL', bgLight: '#dbeafe' },
  constitucional: { color: '#9333ea', icon: '📜', label: 'CONSTITUCIONAL', bgLight: '#f3e8ff' },
  transito: { color: '#ca8a04', icon: '🚗', label: 'TRÁNSITO', bgLight: '#fef3c7' },
  administrativo: { color: '#4b5563', icon: '🏢', label: 'ADMINISTRATIVO', bgLight: '#f3f4f6' },
  laboral: { color: '#16a34a', icon: '💼', label: 'LABORAL', bgLight: '#d1fae5' },
};

const priorityConfig = {
  high: { label: 'ALTA PRIORIDAD', color: '#991b1b', bg: '#fee2e2' },
  medium: { label: 'MEDIA PRIORIDAD', color: '#92400e', bg: '#fef3c7' },
  low: { label: 'BAJA PRIORIDAD', color: '#3730a3', bg: '#e0e7ff' },
};

export default function EnhancedCaseCard({ case: caseData }: EnhancedCaseCardProps) {
  const config = legalTypeConfig[caseData.legalType];
  const priorityStyle = priorityConfig[caseData.priority];

  return (
    <Link
      href={`/dashboard/cases/${caseData.id}`}
      className="block group"
    >
      <article
        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 h-full flex flex-col"
        style={{ borderLeftColor: config.color }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-3xl">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {caseData.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: config.bgLight, color: config.color }}
                >
                  {config.label}
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.color }}
                >
                  {priorityStyle.label}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle menu click
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Client Info */}
        <div className="space-y-1.5 text-sm text-gray-600 mb-4">
          <div>
            <span className="font-medium">Cliente:</span> {caseData.clientName}
          </div>
          {caseData.caseNumber && (
            <div>
              <span className="font-medium">Caso Nº:</span> {caseData.caseNumber}
            </div>
          )}
          <div>
            <span className="font-medium">Estado:</span> {caseData.status}
          </div>
        </div>

        {/* Next Action (if exists) */}
        {caseData.nextAction && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Próxima acción:
                </p>
                <p className="text-sm text-amber-800 mb-1">
                  {caseData.nextAction.description}
                </p>
                <p className="text-xs text-amber-600">
                  Vence: {caseData.nextAction.dueDate} ({caseData.nextAction.daysUntilDue} días)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progreso del caso</span>
            <span className="font-semibold">{caseData.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${caseData.progress}%`,
                backgroundColor: config.color,
              }}
            />
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{caseData.documentCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{caseData.queryCount}</span>
            </div>
          </div>
          <div className="text-gray-400">
            {new Date(caseData.createdAt).toLocaleDateString('es-EC', {
              day: 'numeric',
              month: 'short',
            })}
          </div>
        </div>
      </article>
    </Link>
  );
}
```

---

### 2. AI Insights Panel

**File**: `frontend/src/components/dashboard/AIInsightsPanel.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'deadline' | 'document' | 'legal_update' | 'pattern' | 'workflow' | 'budget';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  priority: 'high' | 'medium' | 'low';
}

const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'deadline',
    title: 'Plazos Próximos',
    description: 'Tienes 3 casos civiles con plazos de presentación de documentos en las próximas 2 semanas. Considera preparar las listas de divulgación de documentos.',
    actionLabel: 'Crear Checklist',
    actionUrl: '/dashboard/tasks',
    priority: 'high',
  },
  {
    id: '2',
    type: 'legal_update',
    title: 'Nueva Jurisprudencia',
    description: 'Se publicó nueva jurisprudencia de la Corte Constitucional relevante para 2 de tus casos laborales. Sentencia 1234-2024-EP sobre despido intempestivo.',
    actionLabel: 'Ver Jurisprudencia',
    actionUrl: '/dashboard/legal-library',
    priority: 'medium',
  },
  {
    id: '3',
    type: 'document',
    title: 'Análisis Completado',
    description: 'El análisis vectorial de los documentos del Caso #1820 está listo. Se encontraron 15 referencias legales relevantes para fortalecer tus argumentos.',
    actionLabel: 'Ver Análisis',
    actionUrl: '/dashboard/cases/1820',
    priority: 'medium',
  },
];

export default function AIInsightsPanel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentInsight = mockInsights[currentIndex];

  const nextInsight = () => {
    setCurrentIndex((prev) => (prev + 1) % mockInsights.length);
  };

  const prevInsight = () => {
    setCurrentIndex((prev) => (prev - 1 + mockInsights.length) % mockInsights.length);
  };

  const priorityColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-yellow-50 border-yellow-200',
    low: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Insights de IA</h2>
        </div>
        <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Main Insight Card */}
      <div className={`bg-white rounded-xl p-6 shadow-sm border-2 ${priorityColors[currentInsight.priority]} mb-4`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {currentInsight.title}
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              {currentInsight.description}
            </p>
            <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md">
              {currentInsight.actionLabel} →
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevInsight}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex gap-2">
          {mockInsights.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-indigo-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextInsight}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Quick Insights Pills */}
      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Actualizaciones Rápidas
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            2 casos necesitan actualización de estado
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Análisis listo para Caso #1820
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Nueva jurisprudencia (Laboral)
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Quick Stats Cards

**File**: `frontend/src/components/dashboard/QuickStatsCards.tsx`

```tsx
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

const stats: StatCard[] = [
  {
    id: 'total-cases',
    label: 'Total de Casos',
    value: 24,
    trend: {
      value: 12,
      direction: 'up',
      label: '+12% vs semana pasada',
    },
    icon: <Briefcase className="w-8 h-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'active-matters',
    label: 'Asuntos Activos',
    value: 18,
    trend: {
      value: 5,
      direction: 'up',
      label: '5 requieren atención',
    },
    icon: <Activity className="w-8 h-8" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'pending-actions',
    label: 'Acciones Pendientes',
    value: 7,
    trend: {
      value: 3,
      direction: 'down',
      label: '-3 desde ayer',
    },
    icon: <Clock className="w-8 h-8" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'deadlines-week',
    label: 'Plazos Esta Semana',
    value: 3,
    trend: {
      value: 0,
      direction: 'up',
      label: 'Próximo: 15 Ene',
    },
    icon: <Calendar className="w-8 h-8" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
];

export default function QuickStatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <button
          key={stat.id}
          onClick={stat.onClick}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.02] text-left"
          style={{ borderLeftColor: stat.color.replace('text-', '#') }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
              {stat.icon}
            </div>
            <div className={`flex items-center gap-1 text-sm ${
              stat.trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {stat.trend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-medium">{stat.trend.value}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">
              {stat.value}
            </p>
            <p className="text-sm font-medium text-gray-600">
              {stat.label}
            </p>
            <p className="text-xs text-gray-500">
              {stat.trend.label}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
```

---

### 4. Legal Type Filter Tabs

**File**: `frontend/src/components/dashboard/LegalTypeFilterTabs.tsx`

```tsx
'use client';

import React from 'react';

interface LegalTypeTab {
  id: string;
  label: string;
  icon: string;
  count: number;
  color: string;
}

const legalTypeTabs: LegalTypeTab[] = [
  { id: 'all', label: 'Todos', icon: '📁', count: 24, color: '#6b7280' },
  { id: 'penal', label: 'Penal', icon: '⚖️', count: 8, color: '#b91c1c' },
  { id: 'civil', label: 'Civil', icon: '🏛️', count: 12, color: '#2563eb' },
  { id: 'constitucional', label: 'Constitucional', icon: '📜', count: 2, color: '#9333ea' },
  { id: 'transito', label: 'Tránsito', icon: '🚗', count: 1, color: '#ca8a04' },
  { id: 'administrativo', label: 'Administrativo', icon: '🏢', count: 0, color: '#4b5563' },
  { id: 'laboral', label: 'Laboral', icon: '💼', count: 1, color: '#16a34a' },
];

interface LegalTypeFilterTabsProps {
  selected: string;
  onChange: (type: string) => void;
}

export default function LegalTypeFilterTabs({ selected, onChange }: LegalTypeFilterTabsProps) {
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
                ${isActive
                  ? 'bg-gradient-to-r shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
                }
              `}
              style={isActive ? {
                backgroundImage: `linear-gradient(135deg, ${tab.color}15 0%, ${tab.color}25 100%)`,
                color: tab.color,
              } : {}}
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

              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: tab.color }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Setup design system (tokens, utilities)
- [ ] Create base UI components (Button, Card, Badge, Input)
- [ ] Implement color system for legal types
- [ ] Setup state management (Zustand stores)

### Week 2: Dashboard Page
- [ ] QuickStatsCards component
- [ ] AIInsightsPanel component
- [ ] LegalTypeFilterTabs component
- [ ] EnhancedCaseCard component
- [ ] Case grid with filtering

### Week 3-4: Individual Case Page
- [ ] Case header with pipeline visualization
- [ ] AI Assistant panel with prompt templates
- [ ] Enhanced chat interface with citations
- [ ] Document list sidebar

### Week 5-6: Advanced Features
- [ ] Document generation interface
- [ ] Legal analysis tools
- [ ] Citation finder
- [ ] Process checklist

### Week 7-8: Polish
- [ ] Mobile responsive design
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] User testing

---

## Testing Checklist

### Visual Testing
- [ ] All legal type colors display correctly
- [ ] Cards have proper shadows and hover effects
- [ ] Typography hierarchy is clear
- [ ] Icons render properly
- [ ] Gradients display smoothly

### Interaction Testing
- [ ] Filter tabs work correctly
- [ ] Case cards are clickable
- [ ] Modals open and close properly
- [ ] Form inputs validate
- [ ] AI chat sends messages

### Responsive Testing
- [ ] Mobile (< 640px): Single column layout
- [ ] Tablet (640px - 1024px): Two column layout
- [ ] Desktop (> 1024px): Full three column layout
- [ ] Touch targets minimum 44px on mobile

### Accessibility Testing
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Screen reader labels present
- [ ] Color contrast meets WCAG AA
- [ ] ARIA attributes correct

---

## Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Bundle Size**: < 250KB (gzipped)

---

## Resources

- **Design Tokens**: `/styles/design-tokens.css`
- **Component Library**: `/components/ui/`
- **Legal Type Utilities**: `/lib/legal-types.ts`
- **Icons**: Lucide React (https://lucide.dev)
- **Animations**: Framer Motion (https://framer.com/motion)
