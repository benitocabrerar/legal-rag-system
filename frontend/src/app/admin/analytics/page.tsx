'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AnalyticsData {
  usage: {
    totalQueries: number;
    queriesThisMonth: number;
    averageQueriesPerDay: number;
    mostActiveUsers: Array<{ name: string; queries: number }>;
  };
  documents: {
    totalDocuments: number;
    documentsThisMonth: number;
    mostViewedDocuments: Array<{ title: string; views: number }>;
    documentsByCategory: Array<{ category: string; count: number }>;
  };
  costs: {
    totalCostsThisMonth: number;
    openaiCosts: number;
    averageCostPerQuery: number;
    costTrend: Array<{ date: string; amount: number }>;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    mostCommonQueries: Array<{ query: string; count: number }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    usage: {
      totalQueries: 0,
      queriesThisMonth: 0,
      averageQueriesPerDay: 0,
      mostActiveUsers: [],
    },
    documents: {
      totalDocuments: 0,
      documentsThisMonth: 0,
      mostViewedDocuments: [],
      documentsByCategory: [],
    },
    costs: {
      totalCostsThisMonth: 0,
      openaiCosts: 0,
      averageCostPerQuery: 0,
      costTrend: [],
    },
    performance: {
      averageResponseTime: 0,
      successRate: 0,
      mostCommonQueries: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      // This endpoint would need to be created in the backend
      // const response = await api.get(`/admin/analytics?period=${period}`);
      // setData(response.data);

      // Placeholder data
      setData({
        usage: {
          totalQueries: 0,
          queriesThisMonth: 0,
          averageQueriesPerDay: 0,
          mostActiveUsers: [],
        },
        documents: {
          totalDocuments: 0,
          documentsThisMonth: 0,
          mostViewedDocuments: [],
          documentsByCategory: [],
        },
        costs: {
          totalCostsThisMonth: 0,
          openaiCosts: 0,
          averageCostPerQuery: 0,
          costTrend: [],
        },
        performance: {
          averageResponseTime: 0,
          successRate: 0,
          mostCommonQueries: [],
        },
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
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
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analíticas del Sistema</h1>
          <p className="text-gray-600">Métricas, uso y rendimiento del sistema Legal RAG</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'week'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'month'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'year'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Año
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-5xl">🔍</div>
            <div className="text-right">
              <p className="text-indigo-100 text-sm mb-1">Consultas Totales</p>
              <p className="text-4xl font-bold">{data.usage.totalQueries.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-indigo-100 text-sm">
            {data.usage.queriesThisMonth} este mes • {data.usage.averageQueriesPerDay}/día promedio
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-5xl">📚</div>
            <div className="text-right">
              <p className="text-blue-100 text-sm mb-1">Documentos</p>
              <p className="text-4xl font-bold">{data.documents.totalDocuments}</p>
            </div>
          </div>
          <p className="text-blue-100 text-sm">
            +{data.documents.documentsThisMonth} este mes
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-5xl">💰</div>
            <div className="text-right">
              <p className="text-green-100 text-sm mb-1">Costos del Mes</p>
              <p className="text-4xl font-bold">
                ${data.costs.totalCostsThisMonth.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-green-100 text-sm">
            ${data.costs.averageCostPerQuery.toFixed(4)} por consulta
          </p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-5xl">⚡</div>
            <div className="text-right">
              <p className="text-pink-100 text-sm mb-1">Rendimiento</p>
              <p className="text-4xl font-bold">{data.performance.successRate}%</p>
            </div>
          </div>
          <p className="text-pink-100 text-sm">
            {data.performance.averageResponseTime}s tiempo promedio
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Most Active Users */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usuarios Más Activos</h2>
          {data.usage.mostActiveUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
          ) : (
            <div className="space-y-3">
              {data.usage.mostActiveUsers.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-indigo-600">#{index + 1}</span>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                    {user.queries} consultas
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Viewed Documents */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Documentos Más Consultados</h2>
          {data.documents.mostViewedDocuments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
          ) : (
            <div className="space-y-3">
              {data.documents.mostViewedDocuments.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-purple-600">#{index + 1}</span>
                    <span className="font-medium text-gray-900 truncate">{doc.title}</span>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                    {doc.views} vistas
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents by Category */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Documentos por Categoría</h2>
          {data.documents.documentsByCategory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
          ) : (
            <div className="space-y-3">
              {data.documents.documentsByCategory.map((cat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{cat.category}</span>
                    <span className="text-gray-600">{cat.count} documentos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${
                          (cat.count / data.documents.totalDocuments) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Common Queries */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Consultas Más Frecuentes</h2>
          {data.performance.mostCommonQueries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
          ) : (
            <div className="space-y-3">
              {data.performance.mostCommonQueries.map((q, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl font-bold text-blue-600">#{index + 1}</span>
                    <p className="text-sm text-gray-900">{q.query}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold whitespace-nowrap ml-2">
                    {q.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cost Trend */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tendencia de Costos</h2>
        {data.costs.costTrend.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No hay datos disponibles</p>
        ) : (
          <div className="space-y-2">
            {data.costs.costTrend.map((item, index) => (
              <div key={index} className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 w-24">{item.date}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-6 rounded-full flex items-center justify-end pr-3"
                    style={{
                      width: `${(item.amount / Math.max(...data.costs.costTrend.map((t) => t.amount))) * 100}%`,
                    }}
                  >
                    <span className="text-white text-xs font-semibold">
                      ${item.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="mt-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Información del Sistema</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Versión</p>
            <p className="text-2xl font-bold">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Modelo IA</p>
            <p className="text-2xl font-bold">GPT-4</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Uptime</p>
            <p className="text-2xl font-bold">99.9%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
