'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { legalPromptsByType, LegalType, PromptCategory } from '@/lib/legal-prompts';
import { legalTypeConfig } from '@/lib/design-tokens';

interface SpecializedPromptsProps {
  legalType: LegalType;
  onPromptSelect: (prompt: string) => void;
}

const categoryLabels: Record<PromptCategory, string> = {
  analysis: 'Análisis Legal',
  drafting: 'Redacción',
  research: 'Investigación',
  strategy: 'Estrategia',
  compliance: 'Cumplimiento',
  search: 'Búsqueda',
  document: 'Documentos',
  citation: 'Citas Legales',
};

export function SpecializedPrompts({ legalType, onPromptSelect }: SpecializedPromptsProps) {
  const [expandedCategory, setExpandedCategory] = useState<PromptCategory | null>('analysis');
  const config = legalTypeConfig[legalType];
  const prompts = legalPromptsByType[legalType] || [];

  // Group prompts by category
  const promptsByCategory = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<PromptCategory, typeof prompts>);

  const categories = Object.keys(promptsByCategory) as PromptCategory[];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-200"
        style={{
          background: `linear-gradient(135deg, ${config.color}08 0%, ${config.color}15 100%)`,
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: config.color }} />
          <h3 className="font-bold text-gray-900">Prompts Especializados - {config.label}</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">Acciones rápidas con IA para este tipo de caso</p>
      </div>

      {/* Categories */}
      <div className="divide-y divide-gray-200">
        {categories.map((category) => {
          const isExpanded = expandedCategory === category;
          const categoryPrompts = promptsByCategory[category];

          return (
            <div key={category}>
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {category === 'analysis'
                      ? '📊'
                      : category === 'drafting'
                      ? '📝'
                      : category === 'research'
                      ? '🔍'
                      : category === 'strategy'
                      ? '♟️'
                      : '✅'}
                  </span>
                  <span className="font-semibold text-gray-900">{categoryLabels[category]}</span>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {categoryPrompts.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Prompts List */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {categoryPrompts.map((promptItem) => (
                    <button
                      key={promptItem.id}
                      onClick={() => onPromptSelect(promptItem.prompt)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{promptItem.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 group-hover:text-indigo-700 mb-1">
                            {promptItem.label}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{promptItem.prompt}</p>
                        </div>
                        <Sparkles className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Tip */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          💡 <span className="font-medium">Consejo:</span> Puedes personalizar estos prompts editando el texto antes de
          enviarlos al asistente.
        </p>
      </div>
    </div>
  );
}
