'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface TableStat {
  schemaname: string;
  tablename: string;
  size: string;
  size_bytes: number;
  inserts: number;
  updates: number;
  deletes: number;
  live_tuples: number;
  last_vacuum: string | null;
  last_analyze: string | null;
}

interface DatabaseStats {
  tableStats: TableStat[];
  rowCounts: {
    users: number;
    cases: number;
    documents: number;
    legalDocuments: number;
    specialties: number;
    auditLogs: number;
    queryLogs: number;
  };
}

export default function DatabasePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'size' | 'inserts' | 'updates' | 'deletes' | 'tuples'>(
    'size'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/database/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES');
  };

  const getSortedTables = () => {
    if (!stats) return [];

    const sorted = [...stats.tableStats].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'size':
          aVal = a.size_bytes;
          bVal = b.size_bytes;
          break;
        case 'inserts':
          aVal = a.inserts;
          bVal = b.inserts;
          break;
        case 'updates':
          aVal = a.updates;
          bVal = b.updates;
          break;
        case 'deletes':
          aVal = a.deletes;
          bVal = b.deletes;
          break;
        case 'tuples':
          aVal = a.live_tuples;
          bVal = b.live_tuples;
          break;
        default:
          aVal = a.size_bytes;
          bVal = b.size_bytes;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getTotalSize = () => {
    if (!stats) return '0 B';
    const totalBytes = stats.tableStats.reduce((sum, table) => sum + table.size_bytes, 0);
    return formatBytes(totalBytes);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalTuples = () => {
    if (!stats) return 0;
    return stats.tableStats.reduce((sum, table) => sum + table.live_tuples, 0);
  };

  const getTotalOperations = () => {
    if (!stats) return 0;
    return stats.tableStats.reduce(
      (sum, table) => sum + table.inserts + table.updates + table.deletes,
      0
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Estadísticas de Base de Datos
          </h1>
          <p className="text-gray-600">Información detallada de PostgreSQL y Prisma</p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          🔄 Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Tamaño Total BD</p>
                <span className="text-2xl">💾</span>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{getTotalSize()}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Registros Totales</p>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {formatNumber(getTotalTuples())}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Operaciones Totales</p>
                <span className="text-2xl">⚡</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatNumber(getTotalOperations())}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Tablas</p>
                <span className="text-2xl">🗂️</span>
              </div>
              <p className="text-3xl font-bold text-pink-600">
                {stats?.tableStats.length || 0}
              </p>
            </div>
          </div>

          {/* Row Counts by Entity */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Conteo de Registros</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Usuarios</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {formatNumber(stats?.rowCounts.users || 0)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Casos</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatNumber(stats?.rowCounts.cases || 0)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Documentos de Casos</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatNumber(stats?.rowCounts.documents || 0)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Documentos Legales</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatNumber(stats?.rowCounts.legalDocuments || 0)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Especialidades</p>
                <p className="text-2xl font-bold text-pink-700">
                  {formatNumber(stats?.rowCounts.specialties || 0)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Logs de Auditoría</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {formatNumber(stats?.rowCounts.auditLogs || 0)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Logs de Consultas</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatNumber(stats?.rowCounts.queryLogs || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Table Statistics */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Estadísticas por Tabla</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tabla
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('size')}
                    >
                      Tamaño {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('tuples')}
                    >
                      Registros {sortBy === 'tuples' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('inserts')}
                    >
                      Inserts {sortBy === 'inserts' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('updates')}
                    >
                      Updates {sortBy === 'updates' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('deletes')}
                    >
                      Deletes {sortBy === 'deletes' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Vacuum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Analyze
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedTables().map((table) => (
                    <tr key={table.tablename} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {table.tablename}
                        </div>
                        <div className="text-xs text-gray-500">{table.schemaname}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {table.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(table.live_tuples)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {formatNumber(table.inserts)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {formatNumber(table.updates)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatNumber(table.deletes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(table.last_vacuum)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(table.last_analyze)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
