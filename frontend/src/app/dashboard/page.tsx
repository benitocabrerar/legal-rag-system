'use client';

import { useState, useEffect } from 'react';
import { casesAPI } from '@/lib/api';
import { LegalType } from '@/lib/design-tokens';
import { QuickStatsCards } from '@/components/dashboard/QuickStatsCards';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { LegalTypeFilterTabs } from '@/components/dashboard/LegalTypeFilterTabs';
import { EnhancedCaseCard } from '@/components/dashboard/EnhancedCaseCard';
import { Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface AiSummary {
  headline?: string;
  teaser?: string;
  summary?: string;
  keyFacts?: string[];
  legalAreas?: string[];
  risks?: string[];
  nextSteps?: string[];
  estimatedComplexity?: 'baja' | 'media' | 'alta';
  urgency?: 'baja' | 'media' | 'alta' | 'crítica';
  generatedAt?: string;
  model?: string;
  provider?: string;
}

interface Case {
  id: string;
  title: string;
  clientName: string;
  caseNumber: string;
  status: string;
  description?: string;
  createdAt: string;
  legalType?: LegalType;
  priority?: 'high' | 'medium' | 'low';
  aiSummary?: AiSummary | null;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLegalType, setSelectedLegalType] = useState<LegalType | 'todos'>('todos');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  const [aiPrefillError, setAiPrefillError] = useState('');
  const [newCase, setNewCase] = useState<any>({
    title: '',
    clientName: '',
    caseNumber: '',
    description: '',
    legalType: 'civil' as LegalType,
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await casesAPI.list();
      // Add mock legal types and priorities for demonstration
      const enhancedCases = data.map((c: Case, index: number) => ({
        ...c,
        legalType: (['civil', 'penal', 'laboral', 'constitucional', 'transito', 'administrativo'] as LegalType[])[
          index % 6
        ],
        priority: (['high', 'medium', 'low'] as const)[index % 3],
      }));
      setCases(enhancedCases);
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Solo enviar campos no vacíos. legalType es UI-only (no existe en backend);
      // legalMatter es el equivalente que sí persiste.
      const payload: any = {};
      const allow = [
        'title','clientName','caseNumber','description','status',
        'countryCode',
        'legalMatter','actionType','jurisdiction','judicialProcessNumber',
        'courtName','courtUnit','judgeName','prosecutorName','opposingParty',
        'relatedLaws','amountClaimed','currency','filedAt','nextHearingAt',
        'proceduralStage','keyDates','factsSummary',
      ];
      for (const k of allow) {
        const v = newCase[k];
        if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
          payload[k] = v;
        }
      }
      if (!payload.status) payload.status = 'active';
      // Si llegó legalType pero no legalMatter, derivar
      if (!payload.legalMatter && newCase.legalType) {
        const map: Record<string, string> = {
          penal: 'Penal', civil: 'Civil', laboral: 'Laboral',
          constitucional: 'Constitucional', transito: 'Tránsito', administrativo: 'Administrativo',
        };
        payload.legalMatter = map[newCase.legalType] || newCase.legalType;
      }
      await casesAPI.create(payload);
      setShowNewCaseModal(false);
      setNewCase({
        title: '',
        clientName: '',
        caseNumber: '',
        description: '',
        legalType: 'civil',
        priority: 'medium',
      });
      loadCases();
    } catch (error: any) {
      console.error('Error creating case:', error);
      alert(error?.response?.data?.error || 'Error al crear caso');
    }
  };

  // Filter cases by legal type
  const filteredCases =
    selectedLegalType === 'todos' ? cases : cases.filter((c) => c.legalType === selectedLegalType);

  // Calculate case counts by legal type
  const caseCounts: Partial<Record<LegalType | 'todos', number>> = {
    todos: cases.length,
  };
  (['penal', 'civil', 'constitucional', 'transito', 'administrativo', 'laboral'] as LegalType[]).forEach((type) => {
    caseCounts[type] = cases.filter((c) => c.legalType === type).length;
  });

  // ============== Stats reales basadas en los casos ==============
  const activeCases = cases.filter((c: any) => {
    const s = (c.status || '').toLowerCase();
    return s === 'active' || s === 'activo' || s === 'pending' || !s;
  }).length;

  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

  const newThisWeek = cases.filter((c: any) => {
    if (!c.createdAt) return false;
    const t = new Date(c.createdAt).getTime();
    return now - t <= oneWeekMs;
  }).length;

  const needsAttention = cases.filter((c: any) => {
    const s = (c.status || '').toLowerCase();
    if (s === 'closed' || s === 'archived') return false;
    if (!c.updatedAt) return false;
    const t = new Date(c.updatedAt).getTime();
    return now - t > twoWeeksMs;
  }).length;

  const upcomingDeadlines = cases.filter((c: any) => {
    if (!c.nextHearingAt) return false;
    const t = new Date(c.nextHearingAt).getTime();
    const diff = t - now;
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Próximo plazo concreto (label corto)
  const sortedHearings = cases
    .filter((c: any) => c.nextHearingAt)
    .map((c: any) => ({ c, t: new Date(c.nextHearingAt).getTime() }))
    .filter((x: any) => x.t >= now)
    .sort((a: any, b: any) => a.t - b.t);
  const nextDeadlineLabel = sortedHearings.length > 0
    ? sortedHearings[0].c.title?.slice(0, 30) || null
    : null;

  // Acciones pendientes derivadas: hearings + sin etapa procesal
  const pendingActions = upcomingDeadlines
    + cases.filter((c: any) => (c.status || '').toLowerCase() !== 'closed' && !c.proceduralStage).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header — wraps on phones, button stays usable. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{t('dashboard.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('dashboard.uploadAndProcess')}</p>
        </div>
        <button
          onClick={() => setShowNewCaseModal(true)}
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          {t('dashboard.newCase')}
        </button>
      </div>

      {/* Quick Stats Cards */}
      <QuickStatsCards
        totalCases={cases.length}
        activeCases={activeCases}
        pendingActions={pendingActions}
        upcomingDeadlines={upcomingDeadlines}
        newThisWeek={newThisWeek}
        needsAttention={needsAttention}
        nextDeadlineLabel={nextDeadlineLabel}
      />

      {/* AI Insights Panel */}
      <AIInsightsPanel cases={cases as any} />

      {/* Legal Type Filter Tabs */}
      <LegalTypeFilterTabs selected={selectedLegalType} onChange={setSelectedLegalType} caseCounts={caseCounts} />

      {/* Case Cards Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-gray-500 text-lg mb-4">
            {selectedLegalType === 'todos'
              ? t('dashboard.noCases')
              : t('dashboard.noCasesOfType').replace('{type}', selectedLegalType)}
          </p>
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            {t('dashboard.createFirstCase')}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCases.map((caseData) => (
            <EnhancedCaseCard key={caseData.id} caseData={caseData} />
          ))}
        </div>
      )}

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-3">{t('dashboard.newCase')}</h2>

            {/* Auto-llenar con IA desde un archivo */}
            <div className="mb-6 p-4 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">✨ Pre-llenar con IA desde un documento</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Sube una denuncia, demanda, oficio o cualquier documento. La IA detecta los datos automáticamente.</p>
                </div>
              </div>
              <label className="block">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={aiPrefilling}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAiPrefilling(true);
                    setAiPrefillError('');
                    try {
                      const { getAuthToken } = await import('@/lib/get-auth-token');
                      const tok = await getAuthToken();
                      const fd = new FormData();
                      fd.append('file', file);
                      const r = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/cases/preview-from-file`,
                        { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: fd }
                      );
                      if (!r.ok) {
                        const err = await r.json().catch(() => ({}));
                        throw new Error(err.error || 'Error en extracción IA');
                      }
                      const data = await r.json();
                      const ex = data.extracted || {};
                      const lm = String(ex.legal_matter || '').toLowerCase();
                      const inferLegalType = lm.includes('penal') ? 'penal'
                        : lm.includes('civil') ? 'civil'
                        : lm.includes('laboral') ? 'laboral'
                        : lm.includes('constituc') ? 'constitucional'
                        : lm.includes('tránsi') || lm.includes('transi') ? 'transito'
                        : lm.includes('admin') ? 'administrativo'
                        : null;
                      setNewCase((prev: any) => ({
                        ...prev,
                        title: ex.title || prev.title,
                        clientName: ex.clientName || prev.clientName,
                        description: ex.description || ex.facts_summary || prev.description,
                        legalType: inferLegalType || prev.legalType,
                        priority: ex.priority || prev.priority,
                        legalMatter: ex.legal_matter,
                        actionType: ex.action_type,
                        jurisdiction: ex.jurisdiction,
                        judicialProcessNumber: ex.judicial_process_number,
                        courtName: ex.court_name,
                        judgeName: ex.judge_name,
                        prosecutorName: ex.prosecutor_name,
                        opposingParty: ex.opposing_party,
                        relatedLaws: ex.related_laws,
                        amountClaimed: ex.amount_claimed,
                        filedAt: ex.filed_at,
                        proceduralStage: ex.procedural_stage,
                        factsSummary: ex.facts_summary,
                      }));
                    } catch (err: any) {
                      setAiPrefillError(err.message || 'Error');
                    } finally {
                      setAiPrefilling(false);
                      e.target.value = '';
                    }
                  }}
                />
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded cursor-pointer transition-colors ${
                    aiPrefilling ? 'bg-emerald-200 text-emerald-700 cursor-wait' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {aiPrefilling ? '⏳ Analizando con IA...' : '📎 Subir archivo y auto-llenar'}
                </span>
              </label>
              {aiPrefillError && <p className="text-xs text-red-700 mt-2">{aiPrefillError}</p>}
            </div>

            <form onSubmit={handleCreateCase} className="space-y-6">
              {/* Legal Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Caso *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['penal', 'civil', 'constitucional', 'transito', 'administrativo', 'laboral'] as LegalType[]).map(
                    (type) => {
                      const icons = {
                        penal: '⚖️',
                        civil: '🏛️',
                        constitucional: '📜',
                        transito: '🚗',
                        administrativo: '🏢',
                        laboral: '💼',
                      };
                      const labels = {
                        penal: 'Penal',
                        civil: 'Civil',
                        constitucional: 'Constitucional',
                        transito: 'Tránsito',
                        administrativo: 'Administrativo',
                        laboral: 'Laboral',
                      };

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewCase({ ...newCase, legalType: type })}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            newCase.legalType === type
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-3xl mb-2">{icons[type]}</div>
                          <div className="text-sm font-medium">{labels[type]}</div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Prioridad *</label>
                <div className="flex gap-3">
                  {(['high', 'medium', 'low'] as const).map((priority) => {
                    const labels = {
                      high: '🔴 Alta',
                      medium: '🟡 Media',
                      low: '🔵 Baja',
                    };

                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setNewCase({ ...newCase, priority })}
                        className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                          newCase.priority === priority
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium">{labels[priority]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título del Caso *</label>
                <input
                  type="text"
                  required
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Demanda laboral por despido intempestivo"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('cases.client')} *</label>
                <input
                  type="text"
                  required
                  value={newCase.clientName}
                  onChange={(e) => setNewCase({ ...newCase, clientName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Nombre del cliente"
                />
              </div>

              {/* Case Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Caso</label>
                <input
                  type="text"
                  value={newCase.caseNumber}
                  onChange={(e) => setNewCase({ ...newCase, caseNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="2025-001"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Descripción breve del caso"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  {t('dashboard.createCase')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
