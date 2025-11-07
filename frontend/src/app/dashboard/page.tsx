'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { casesAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Case {
  id: string;
  title: string;
  clientName: string;
  caseNumber: string;
  status: string;
  description?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    clientName: '',
    caseNumber: '',
    description: '',
  });

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await casesAPI.list();
      setCases(data);
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
      setNewCase({ title: '', clientName: '', caseNumber: '', description: '' });
      loadCases();
    } catch (error) {
      console.error('Error creating case:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mis Casos</h1>
        <button
          onClick={() => setShowNewCaseModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          + Nuevo Caso
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-4">No tienes casos aún</p>
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Crear tu primer caso
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((case_) => (
            <Link
              key={case_.id}
              href={`/dashboard/cases/${case_.id}`}
              className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6 border border-gray-200 hover:border-indigo-300"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{case_.title}</h3>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                  {case_.status || 'Activo'}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Cliente:</span> {case_.clientName}
                </p>
                {case_.caseNumber && (
                  <p>
                    <span className="font-medium">Nº Caso:</span> {case_.caseNumber}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-4">
                  Creado: {formatDate(case_.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Nuevo Caso</h2>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del Caso *
                </label>
                <input
                  type="text"
                  required
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Demanda laboral"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={newCase.clientName}
                  onChange={(e) => setNewCase({ ...newCase, clientName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Caso
                </label>
                <input
                  type="text"
                  value={newCase.caseNumber}
                  onChange={(e) => setNewCase({ ...newCase, caseNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="2025-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Descripción breve del caso"
                />
              </div>
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
