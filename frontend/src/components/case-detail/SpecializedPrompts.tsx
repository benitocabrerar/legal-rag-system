'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, Copy, Check, Brain, Info, Loader2 } from 'lucide-react';
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

interface CategoryProgress {
  pct: number;
  label: string;
  promptsCount: number;
}

export function SpecializedPrompts({ legalType, onPromptSelect, caseId, onRefresh }: SpecializedPromptsProps) {
  const [expandedCategory, setExpandedCategory] = useState<PromptCategory | null>('analysis');
  const [seed, setSeed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiSuggested, setAiSuggested] = useState<SuggestedPrompt[]>([]);
  const [aiMeta, setAiMeta] = useState<{ generatedAt?: string; model?: string; documentCount?: number; proceduralStage?: string | null } | null>(null);

  // Progreso global (botón "Generar con IA")
  const [globalProgress, setGlobalProgress] = useState<CategoryProgress | null>(null);

  // IA por categoría
  const [categoryAi, setCategoryAi] = useState<Partial<Record<PromptCategory, SuggestedPrompt[]>>>({});
  const [categoryLoading, setCategoryLoading] = useState<PromptCategory | null>(null);
  const [categoryProgress, setCategoryProgress] = useState<Partial<Record<PromptCategory, CategoryProgress>>>({});
  const [categoryError, setCategoryError] = useState<Partial<Record<PromptCategory, string>>>({});

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

  /**
   * Consume el endpoint SSE /cases/:id/suggested-prompts.
   * Si onlyCategory está presente, agrega ?category= y actualiza el estado
   * por-categoría. Si no, hace generación global y popula aiSuggested.
   */
  const streamSuggestedPrompts = async (onlyCategory?: PromptCategory) => {
    if (!caseId) return;
    const token = await getAuthToken();
    const url = `${API_URL}/api/v1/cases/${caseId}/suggested-prompts${
      onlyCategory ? `?category=${onlyCategory}` : ''
    }`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: '{}',
    });
    if (!r.ok || !r.body) {
      const txt = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let promptsCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const lines = chunk.split('\n');
        const evLine = lines.find((l) => l.startsWith('event:'));
        const dataLine = lines.find((l) => l.startsWith('data:'));
        if (!dataLine) continue;
        const event = evLine ? evLine.slice(6).trim() : 'message';
        let payload: any = null;
        try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { /* ignore */ }
        if (event === 'phase' && payload) {
          const pct = typeof payload.pct === 'number' ? payload.pct : 0;
          const label = typeof payload.label === 'string' ? payload.label : '';
          if (onlyCategory) {
            setCategoryProgress((p) => ({ ...p, [onlyCategory]: { pct, label, promptsCount } }));
          } else {
            setGlobalProgress({ pct, label, promptsCount });
          }
        } else if (event === 'structured' && payload) {
          const list = Array.isArray(payload?.prompts) ? (payload.prompts as SuggestedPrompt[]) : [];
          if (onlyCategory) {
            setCategoryAi((c) => ({ ...c, [onlyCategory]: list }));
            promptsCount = list.length;
            setCategoryProgress((p) => ({ ...p, [onlyCategory]: { pct: 95, label: 'Estructurando…', promptsCount } }));
          } else {
            setAiSuggested(list);
            setAiMeta({
              generatedAt: payload?.generatedAt,
              model: payload?.model,
              documentCount: payload?.context?.documentCount,
              proceduralStage: payload?.context?.proceduralStage,
            });
          }
        } else if (event === 'done') {
          if (onlyCategory) {
            setCategoryProgress((p) => ({ ...p, [onlyCategory]: { pct: 100, label: 'Listo', promptsCount: payload?.count ?? promptsCount } }));
          } else {
            setGlobalProgress({ pct: 100, label: 'Listo', promptsCount });
          }
        } else if (event === 'error') {
          throw new Error(payload?.error || 'AI failed');
        }
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    setGlobalProgress({ pct: 1, label: 'Iniciando…', promptsCount: 0 });
    try {
      if (caseId) {
        await streamSuggestedPrompts();
        if (aiSuggested.length > 0 || categoryAi) setExpandedCategory('analysis');
      }
      if (onRefresh) await onRefresh();
      setSeed((s) => s + 1);
    } catch (e: any) {
      setRefreshError(e?.message || 'No se pudo generar sugerencias IA');
    } finally {
      setRefreshing(false);
      // Limpia progreso después de un momento si fue exitoso
      setTimeout(() => setGlobalProgress(null), 800);
    }
  };

  const handleCategoryRefresh = async (category: PromptCategory) => {
    if (!caseId) return;
    setCategoryLoading(category);
    setCategoryError((e) => ({ ...e, [category]: '' }));
    setCategoryProgress((p) => ({ ...p, [category]: { pct: 1, label: 'Iniciando…', promptsCount: 0 } }));
    // Expandir esa categoría para que el usuario vea la barra
    setExpandedCategory(category);
    try {
      await streamSuggestedPrompts(category);
    } catch (e: any) {
      setCategoryError((errs) => ({ ...errs, [category]: e?.message || 'No se pudo generar' }));
    } finally {
      setCategoryLoading(null);
      // Limpia progreso visual a los 800ms
      setTimeout(() => {
        setCategoryProgress((p) => {
          const next = { ...p };
          delete next[category];
          return next;
        });
      }, 800);
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
        {/* Barra de progreso global (botón "Generar con IA") */}
        {(refreshing || (globalProgress && globalProgress.pct < 100)) && globalProgress && (
          <div className="mt-3 p-3 rounded-lg border-2 border-purple-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs font-bold text-purple-900 truncate">{globalProgress.label}</div>
              <div className="text-base font-black text-purple-700 tabular-nums shrink-0">
                {Math.max(0, Math.min(100, Math.round(globalProgress.pct)))}%
              </div>
            </div>
            <div className="relative w-full h-2 rounded-full bg-purple-100 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${Math.max(2, globalProgress.pct)}%` }}
              />
              <div
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse rounded-full pointer-events-none"
                style={{ left: `${Math.max(0, Math.min(95, globalProgress.pct - 4))}%` }}
              />
            </div>
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
          const staticPrompts = promptsByCategory[category];
          const aiCategoryPrompts = categoryAi[category] || [];
          const isCategoryLoading = categoryLoading === category;
          const catProgress = categoryProgress[category];
          const catErr = categoryError[category];

          return (
            <div key={category}>
              {/* Category Header */}
              <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
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
                    {staticPrompts.length + aiCategoryPrompts.length}
                  </span>
                  {aiCategoryPrompts.length > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-fuchsia-100 text-fuchsia-700"
                      title="Esta categoría tiene prompts generados con IA específicos al caso"
                    >
                      <Brain className="w-2.5 h-2.5" />
                      IA
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {caseId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleCategoryRefresh(category);
                      }}
                      disabled={isCategoryLoading || refreshing}
                      title={`Generar prompts avanzados con IA para ${categoryLabels[category]}`}
                      aria-label={`Generar IA para ${categoryLabels[category]}`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        aiCategoryPrompts.length > 0
                          ? 'text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200'
                          : 'text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 shadow-sm'
                      }`}
                    >
                      {isCategoryLoading
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Brain className="w-3 h-3" />}
                      {isCategoryLoading
                        ? 'IA…'
                        : aiCategoryPrompts.length > 0
                          ? 'Re-generar'
                          : 'IA avanzado'}
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    aria-label={isExpanded ? 'Colapsar categoría' : 'Expandir categoría'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Prompts List */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {/* Barra de progreso por categoría */}
                  {catProgress && catProgress.pct < 100 && (
                    <div className="p-3 rounded-lg border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-purple-50 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-700" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-fuchsia-900 truncate">{catProgress.label}</div>
                          <div className="text-[10px] text-fuchsia-700/80">
                            Claude Opus 4.7 · análisis avanzado para {categoryLabels[category]}
                          </div>
                        </div>
                        <div className="text-base font-black text-fuchsia-700 tabular-nums shrink-0">
                          {Math.max(0, Math.min(100, Math.round(catProgress.pct)))}%
                        </div>
                      </div>
                      <div className="relative w-full h-2 rounded-full bg-white border border-fuchsia-100 overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${Math.max(2, catProgress.pct)}%` }}
                        />
                        <div
                          className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse rounded-full pointer-events-none"
                          style={{ left: `${Math.max(0, Math.min(95, catProgress.pct - 4))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {catErr && (
                    <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 mb-2">
                      {catErr}
                    </div>
                  )}

                  {/* AI prompts (al inicio, marcados) */}
                  {aiCategoryPrompts.map((promptItem) => {
                    const isCopied = copiedId === `cat-ai-${promptItem.id}`;
                    return (
                      <div
                        key={`cat-ai-${promptItem.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onPromptSelect(promptItem.prompt)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPromptSelect(promptItem.prompt);
                          }
                        }}
                        className="w-full text-left p-3 rounded-lg border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50/40 to-purple-50/30 hover:border-fuchsia-400 hover:shadow-md transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl group-hover:scale-110 transition-transform">{promptItem.icon || '✨'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <h4 className="font-semibold text-gray-900 group-hover:text-fuchsia-700">{promptItem.label}</h4>
                              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700">
                                IA · avanzado
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-3">{promptItem.prompt}</p>
                            {promptItem.why && (
                              <div className="mt-1.5 flex items-start gap-1 text-[11px] text-fuchsia-700/80 italic">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{promptItem.why}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void copyPrompt(`cat-ai-${promptItem.id}`, promptItem.prompt);
                              }}
                              title={isCopied ? '¡Copiado!' : 'Copiar prompt'}
                              aria-label="Copiar prompt"
                              className={`p-1.5 rounded-md transition-all border ${
                                isCopied
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-white border-gray-200 text-gray-400 hover:text-fuchsia-700 hover:border-fuchsia-300 hover:bg-fuchsia-50 opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Static prompts */}
                  {staticPrompts.map((promptItem) => {
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
