'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';

interface EmbeddingStatus {
  id: string;
  documentId: string;
  documentTitle: string;
  category: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  vectorsCount: number;
  chunkCount: number;
  processingTime?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface EmbeddingStats {
  totalVectors: number;
  totalDocuments: number;
  processingQueue: number;
  avgProcessingTime: number;
  successRate: number;
  storageUsed: number;
}

export default function EmbeddingsPage() {
  const [embeddings, setEmbeddings] = useState<EmbeddingStatus[]>([]);
  const [stats, setStats] = useState<EmbeddingStats>({
    totalVectors: 0,
    totalDocuments: 0,
    processingQueue: 0,
    avgProcessingTime: 0,
    successRate: 0,
    storageUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    loadEmbeddings();
    loadStats();
  }, []);

  const loadEmbeddings = async () => {
    try {
      // This endpoint would need to be created in the backend
      // const response = await api.get('/admin/embeddings');
      // setEmbeddings(response.data);

      // Placeholder data
      setEmbeddings([]);
    } catch (error) {
      console.error('Error loading embeddings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // const response = await api.get('/admin/embeddings/stats');
      // setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleReindex = async (documentId: string) => {
    try {
      // await api.post(`/admin/embeddings/${documentId}/reindex`);
      alert('Reindexación iniciada exitosamente');
      loadEmbeddings();
    } catch (error) {
      console.error('Error reindexing:', error);
      alert('Error al iniciar reindexación');
    }
  };

  const handleReindexAll = async () => {
    if (!confirm('¿Estás seguro de reindexar todos los documentos? Esto puede tomar tiempo.'))
      return;

    try {
      // await api.post('/admin/embeddings/reindex-all');
      alert('Reindexación masiva iniciada');
      loadEmbeddings();
    } catch (error) {
      console.error('Error reindexing all:', error);
      alert('Error al iniciar reindexación masiva');
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setTesting(true);
    try {
      // const response = await api.post('/admin/embeddings/test-search', {
      //   query: testQuery,
      // });
      // setTestResults(response.data.results);

      // Placeholder results
      setTestResults([]);
    } catch (error) {
      console.error('Error testing search:', error);
      alert('Error al realizar búsqueda de prueba');
    } finally {
      setTesting(false);
    }
  };

  const filteredEmbeddings = embeddings.filter((emb) => {
    if (filterStatus === 'all') return true;
    return emb.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Control de Embeddings</h1>
          <p className="text-gray-600">
            Monitorea y gestiona la vectorización de documentos legales
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            🔍 Probar Búsqueda
          </button>
          <button
            onClick={handleReindexAll}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            🔄 Reindexar Todo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Vectores</p>
          <p className="text-2xl font-bold text-indigo-600">
            {stats.totalVectors.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Documentos</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalDocuments}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">En Cola</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.processingQueue}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Tiempo Promedio</p>
          <p className="text-2xl font-bold text-blue-600">{stats.avgProcessingTime}s</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Tasa Éxito</p>
          <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Almacenamiento</p>
          <p className="text-2xl font-bold text-pink-600">{stats.storageUsed}MB</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilterStatus('processing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'processing'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Procesando
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'completed'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completados
          </button>
          <button
            onClick={() => setFilterStatus('error')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'error'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Errores
          </button>
        </div>
      </div>

      {/* Embeddings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredEmbeddings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-2">No hay embeddings para mostrar</p>
          <p className="text-gray-400 text-sm">
            {filterStatus !== 'all'
              ? 'No hay documentos en este estado'
              : 'Sube documentos legales para comenzar'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEmbeddings.map((emb) => (
            <div
              key={emb.id}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{emb.documentTitle}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="px-3 py-1 bg-gray-100 rounded-full">{emb.category}</span>
                    <span>{emb.chunkCount} chunks</span>
                    <span>{emb.vectorsCount.toLocaleString()} vectores</span>
                    {emb.processingTime && <span>{emb.processingTime}s procesamiento</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      emb.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : emb.status === 'processing'
                        ? 'bg-blue-100 text-blue-700'
                        : emb.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {emb.status === 'pending'
                      ? 'Pendiente'
                      : emb.status === 'processing'
                      ? 'Procesando'
                      : emb.status === 'completed'
                      ? 'Completado'
                      : 'Error'}
                  </span>
                  {emb.status === 'completed' && (
                    <button
                      onClick={() => handleReindex(emb.documentId)}
                      className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Reindexar
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {emb.status === 'processing' && (
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Procesando...</span>
                    <span>{emb.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${emb.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {emb.status === 'error' && emb.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {emb.error}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="mt-4 pt-4 border-t grid md:grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <strong>Creado:</strong> {formatDateTime(emb.createdAt)}
                </div>
                {emb.completedAt && (
                  <div>
                    <strong>Completado:</strong> {formatDateTime(emb.completedAt)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Test Search Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Probar Búsqueda Semántica</h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTestSearch} className="mb-6">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Escribe una consulta legal..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={testing || !testQuery.trim()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Ejemplo: "¿Cuál es el plazo para apelar una sentencia?"
              </p>
            </form>

            {testResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">
                  Resultados ({testResults.length}):
                </h3>
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900">{result.document}</p>
                      <span className="text-sm text-indigo-600 font-semibold">
                        Score: {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
