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
    description:
      'Tienes 3 casos civiles con plazos de presentación de documentos en las próximas 2 semanas. Considera preparar las listas de divulgación de documentos.',
    actionLabel: 'Crear Checklist',
    actionUrl: '/dashboard/tasks',
    priority: 'high',
  },
  {
    id: '2',
    type: 'legal_update',
    title: 'Nueva Jurisprudencia',
    description:
      'Se publicó nueva jurisprudencia de la Corte Constitucional relevante para 2 de tus casos laborales. Sentencia 1234-2024-EP sobre despido intempestivo.',
    actionLabel: 'Ver Jurisprudencia',
    actionUrl: '/dashboard/legal-library',
    priority: 'medium',
  },
  {
    id: '3',
    type: 'document',
    title: 'Análisis Completado',
    description:
      'El análisis vectorial de los documentos del Caso #1820 está listo. Se encontraron 15 referencias legales relevantes para fortalecer tus argumentos.',
    actionLabel: 'Ver Análisis',
    actionUrl: '/dashboard/cases/1820',
    priority: 'medium',
  },
];

export function AIInsightsPanel() {
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
          <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">{currentInsight.title}</h3>
            <p className="text-gray-700 leading-relaxed mb-4">{currentInsight.description}</p>
            <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md">
              {currentInsight.actionLabel} →
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevInsight} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex gap-2">
          {mockInsights.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-indigo-600 w-8' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button onClick={nextInsight} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Quick Insights Pills */}
      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Actualizaciones Rápidas</p>
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
