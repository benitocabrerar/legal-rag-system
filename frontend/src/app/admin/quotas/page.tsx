'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Quota {
  id: string;
  userId: string;
  storageGB: number;
  storageUsedGB: number;
  documentsLimit: number;
  documentsUsed: number;
  monthlyQueries: number;
  queriesUsedMonth: number;
  apiCallsLimit: number;
  apiCallsUsed: number;
  storageUsagePercent?: number;
  documentsUsagePercent?: number;
  queriesUsagePercent?: number;
  apiCallsUsagePercent?: number;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    planTier: string;
  };
}

interface QuotaStats {
  totalQuotas: number;
  storage: {
    totalAllocated: number;
    totalUsed: number;
    averageUsed: number;
    usagePercent: number;
  };
  documents: {
    totalLimit: number;
    totalUsed: number;
    averageUsed: number;
  };
  queries: {
    monthlyLimit: number;
    monthlyUsed: number;
    averageUsed: number;
  };
  overLimitUsers: number;
}

export default function QuotasPage() {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [stats, setStats] = useState<QuotaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [overLimitOnly, setOverLimitOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, [overLimitOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotasRes, statsRes] = await Promise.all([
        api.get('/admin/quotas', {
          params: {
            page: 1,
            limit: 50,
            overLimit: overLimitOnly,
          },
        }),
        api.get('/admin/quotas/stats'),
      ]);

      setQuotas(quotasRes.data.quotas || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading quotas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetMonthly = async () => {
    if (!confirm('¿Estás seguro de que quieres resetear los contadores mensuales para todos los usuarios?')) {
      return;
    }

    try {
      await api.post('/admin/quotas/reset-monthly');
      alert('Contadores mensuales reseteados exitosamente');
      loadData();
    } catch (error) {
      console.error('Error resetting monthly quotas:', error);
      alert('Error al resetear contadores mensuales');
    }
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Quotas</h1>
          <p className="text-gray-600">Administra límites de almacenamiento, documentos y consultas</p>
        </div>
        <button
          onClick={handleResetMonthly}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          Resetear Contadores Mensuales
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Almacenamiento Total</p>
              <span className="text-2xl">💾</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(stats.storage.totalUsed ?? 0).toFixed(2)} GB
            </p>
            <p className="text-xs text-gray-500 mt-1">
              de {(stats.storage.totalAllocated ?? 0).toFixed(2)} GB ({(stats.storage.usagePercent ?? 0).toFixed(1)}%)
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Documentos Totales</p>
              <span className="text-2xl">📄</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.documents.totalUsed}</p>
            <p className="text-xs text-gray-500 mt-1">de {stats.documents.totalLimit} límite</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Consultas Mensuales</p>
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.queries.monthlyUsed}</p>
            <p className="text-xs text-gray-500 mt-1">de {stats.queries.monthlyLimit} límite</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Usuarios Sobre Límite</p>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.overLimitUsers}</p>
            <p className="text-xs text-gray-500 mt-1">requieren atención</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overLimitOnly}
              onChange={(e) => setOverLimitOnly(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Mostrar solo usuarios sobre límite</span>
          </label>
        </div>
      </div>

      {/* Quotas Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : quotas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No se encontraron quotas</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Almacenamiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consultas/Mes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Calls
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotas.map((quota) => (
                  <tr key={quota.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{quota.user?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{quota.user?.email || 'N/A'}</div>
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                          {quota.user?.planTier || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${getUsageColor(quota.storageUsagePercent || 0)}`}>
                            {(quota.storageUsedGB ?? 0).toFixed(2)} / {quota.storageGB} GB
                          </span>
                          <span className="text-gray-500">{(quota.storageUsagePercent ?? 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(quota.storageUsagePercent || 0)}`}
                            style={{ width: `${Math.min(quota.storageUsagePercent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${getUsageColor(quota.documentsUsagePercent || 0)}`}>
                            {quota.documentsUsed} / {quota.documentsLimit}
                          </span>
                          <span className="text-gray-500">{(quota.documentsUsagePercent ?? 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(quota.documentsUsagePercent || 0)}`}
                            style={{ width: `${Math.min(quota.documentsUsagePercent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${getUsageColor(quota.queriesUsagePercent || 0)}`}>
                            {quota.queriesUsedMonth} / {quota.monthlyQueries}
                          </span>
                          <span className="text-gray-500">{(quota.queriesUsagePercent ?? 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(quota.queriesUsagePercent || 0)}`}
                            style={{ width: `${Math.min(quota.queriesUsagePercent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${getUsageColor(quota.apiCallsUsagePercent || 0)}`}>
                            {quota.apiCallsUsed} / {quota.apiCallsLimit}
                          </span>
                          <span className="text-gray-500">{(quota.apiCallsUsagePercent ?? 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(quota.apiCallsUsagePercent || 0)}`}
                            style={{ width: `${Math.min(quota.apiCallsUsagePercent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
