'use client';

import { useState, useEffect } from 'react';
import { casesAPI } from '@/lib/api';
import { LegalType } from '@/lib/design-tokens';
import { QuickStatsCards } from '@/components/dashboard/QuickStatsCards';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { LegalTypeFilterTabs } from '@/components/dashboard/LegalTypeFilterTabs';
import { EnhancedCaseCard } from '@/components/dashboard/EnhancedCaseCard';
import { Plus } from 'lucide-react';

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
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLegalType, setSelectedLegalType] = useState<LegalType | 'todos'>('todos');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCase, setNewCase] = useState({
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
      await casesAPI.create(newCase);
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
    } catch (error) {
      console.error('Error creating case:', error);
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

  // Calculate stats
  const activeCases = cases.filter((c) => c.status === 'Activo' || !c.status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Panel de Control</h1>
          <p className="text-gray-600">Gestiona tus casos con inteligencia artificial</p>
        </div>
        <button
          onClick={() => setShowNewCaseModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuevo Caso
        </button>
      </div>

      {/* Quick Stats Cards */}
      <QuickStatsCards totalCases={cases.length} activeCases={activeCases} pendingActions={7} upcomingDeadlines={3} />

      {/* AI Insights Panel */}
      <AIInsightsPanel />

      {/* Legal Type Filter Tabs */}
      <LegalTypeFilterTabs selected={selectedLegalType} onChange={setSelectedLegalType} caseCounts={caseCounts} />

      {/* Case Cards Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-gray-500 text-lg mb-4">
            {selectedLegalType === 'todos' ? 'No tienes casos aún' : `No tienes casos de tipo ${selectedLegalType}`}
          </p>
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Crear tu primer caso
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
            <h2 className="text-2xl font-bold mb-6">Nuevo Caso</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
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
                  Crear Caso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
