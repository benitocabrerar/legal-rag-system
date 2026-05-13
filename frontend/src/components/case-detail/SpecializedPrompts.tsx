'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, Copy, Check, Brain, Info } from 'lucide-react';
import { legalPromptsByType, LegalType, PromptCategory } from '@/lib/legal-prompts';
import { legalTypeConfig } from '@/lib/design-tokens';
import { getAuthToken } from '@/lib/get-auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SuggestedPrompt {
  id: string;
  category: PromptCategory;
  icon: string;
  label: string;
  prompt: string;
  why?: string;
}

interface SpecializedPromptsProps {
  legalType: LegalType;
  onPromptSelect: (prompt: string) => void;
  caseId?: string;
  onRefresh?: () => void | Promise<void>;
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

export function SpecializedPrompts({ legalType, onPromptSelect, caseId, onRefresh }: SpecializedPromptsProps) {
  const [expandedCategory, setExpandedCategory] = useState<PromptCategory | null>('analysis');
  const [seed, setSeed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiSuggested, setAiSuggested] = useState<SuggestedPrompt[]>([]);
  const [aiMeta, setAiMeta] = useState<{ generatedAt?: string; model?: string; documentCount?: number; proceduralStage?: string | null } | null>(null);

  const copyPrompt = async (id: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch { /* ignore */ }
  };
  const config = legalTypeConfig[legalType];
  const prompts = legalPromptsByType[legalType] || [];

  // Group prompts by category, with optional re-shuffle on refresh
  const promptsByCategory = useMemo(() => {
    const grouped = prompts.reduce((acc, prompt) => {
      if (!acc[prompt.category]) acc[prompt.category] = [];
      acc[prompt.category].push(prompt);
      return acc;
    }, {} as Record<PromptCategory, typeof prompts>);

    if (seed > 0) {
      // Deterministic shuffle per seed: rotate each category list
      for (const cat of Object.keys(grouped) as PromptCategory[]) {
        const arr = grouped[cat];
        const rot = seed % Math.max(1, arr.length);
        grouped[cat] = [...arr.slice(rot), ...arr.slice(0, rot)];
      }
    }
    return grouped;
  }, [prompts, seed]);

  const categories = Object.keys(promptsByCategory) as PromptCategory[];

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      if (caseId) {
        const token = await getAuthToken();
        const r = await fetch(`${API_URL}/api/v1/cases/${caseId}/suggested-prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: '{}',
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
        }
        const data = await r.json();
        const list = Array.isArray(data?.prompts) ? (data.prompts as SuggestedPrompt[]) : [];
        setAiSuggested(list);
        setAiMeta({
          generatedAt: data?.generatedAt,
          model: data?.model,
          documentCount: data?.context?.documentCount,
          proceduralStage: data?.context?.proceduralStage,
        });
        if (list.length > 0) {
          setExpandedCategory('analysis');
        }
      }
      if (onRefresh) await onRefresh();
      setSeed((s) => s + 1);
    } catch (e: any) {
      setRefreshError(e?.message || 'No se pudo generar sugerencias IA');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-200"
        style={{
          background: `linear-gradient(135deg, ${config.color}08 0%, ${config.color}15 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: config.color }} />
            <h3 className="font-bold text-gray-900">Prompts Especializados - {config.label}</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title={caseId
              ? 'Generar prompts personalizados con IA según el caso, etapa procesal y documentos'
              : 'Reorganizar sugerencias'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              caseId
                ? 'text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 shadow-sm border border-purple-700'
                : 'text-indigo-700 bg-white/60 hover:bg-white border border-indigo-200'
            }`}
          >
            {caseId
              ? (refreshing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />)
              : <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            {refreshing
              ? (caseId ? 'IA analizando…' : 'Cargando…')
              : (caseId ? 'Generar con IA' : 'Refrescar')}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {caseId
            ? 'IA genera prompts personalizados al caso, etapa y documentos del expediente'
            : 'Acciones rápidas con IA para este tipo de caso'}
        </p>
        {refreshError && (
          <div className="mt-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-50 border border-red-200 text-red-800">
            {refreshError}
          </div>
        )}
      </div>

      {/* IA Suggested Section — destacada cuando hay sugerencias personalizadas */}
      {aiSuggested.length > 0 && (
        <div className="border-b-2 border-purple-100 bg-gradient-to-br from-fuchsia-50/40 via-purple-50/30 to-indigo-50/40">
          <div className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-600 to-purple-700 grid place-items-center text-white shadow shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-purple-900 uppercase tracking-wider">Sugerencias IA · personalizadas</div>
                <div className="text-[11px] text-purple-700/80 truncate">
                  {aiMeta?.proceduralStage ? `Etapa: ${aiMeta.proceduralStage} · ` : ''}
                  {aiMeta?.documentCount != null ? `${aiMeta.documentCount} docs · ` : ''}
                  {aiSuggested.length} prompts
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {aiSuggested.map((p) => {
              const isCopied = copiedId === `ai-${p.id}`;
              return (
                <div
                  key={`ai-${p.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onPromptSelect(p.prompt)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPromptSelect(p.prompt);
                    }
                  }}
                  className="w-full text-left p-3 rounded-lg border-2 border-purple-200/70 bg-white hover:border-purple-400 hover:shadow-md transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{p.icon || '✨'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h4 className="font-semibold text-gray-900 group-hover:text-purple-700">{p.label}</h4>
                        <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">{p.prompt}</p>
                      {p.why && (
                        <div className="mt-1.5 flex items-start gap-1 text-[11px] text-purple-700/80 italic">
                          <Info className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{p.why}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyPrompt(`ai-${p.id}`, p.prompt);
                        }}
                        title={isCopied ? '¡Copiado!' : 'Copiar prompt'}
                        aria-label="Copiar prompt"
                        className={`p-1.5 rounded-md transition-all border ${
                          isCopied
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-gray-200 text-gray-400 hover:text-purple-700 hover:border-purple-300 hover:bg-purple-50 opacity-0 group-hover:opacity-100 focus:opacity-100'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                  {categoryPrompts.map((promptItem) => {
                    const isCopied = copiedId === promptItem.id;
                    return (
                    <div
                      key={promptItem.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onPromptSelect(promptItem.prompt)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPromptSelect(promptItem.prompt);
                        }
                      }}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{promptItem.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 group-hover:text-indigo-700 mb-1">
                            {promptItem.label}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{promptItem.prompt}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void copyPrompt(promptItem.id, promptItem.prompt);
                            }}
                            title={isCopied ? '¡Copiado!' : 'Copiar prompt al portapapeles'}
                            aria-label="Copiar prompt"
                            className={`p-1.5 rounded-md transition-all border ${
                              isCopied
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-white border-gray-200 text-gray-400 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 focus:opacity-100'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <Sparkles className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
