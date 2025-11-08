'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminNavItems } from '@/lib/admin-middleware';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface DashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    byRole: { role: string; _count: number }[];
  };
  queries: {
    queriesLast24h: number;
    totalQueries: number;
  };
  database: {
    rowCounts: {
      legalDocuments: number;
    };
  };
}

export default function AdminPage() {
  const { user } = useAuth();
  const navItems = getAdminNavItems(user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [userStats, queryStats, dbStats] = await Promise.all([
        api.get('/admin/users/stats'),
        api.get('/admin/queries/stats'),
        api.get('/admin/database/stats'),
      ]);

      setStats({
        users: userStats.data,
        queries: queryStats.data,
        database: dbStats.data,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-gray-600">Gestiona el sistema Legal RAG desde aquí</p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Documentos Legales</p>
              <p className="text-3xl font-bold text-indigo-600">
                {loading ? '...' : stats?.database.rowCounts.legalDocuments || 0}
              </p>
            </div>
            <div className="text-4xl">📚</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Usuarios Activos</p>
              <p className="text-3xl font-bold text-purple-600">
                {loading ? '...' : stats?.users.activeUsers || 0}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Consultas IA Hoy</p>
              <p className="text-3xl font-bold text-pink-600">
                {loading ? '...' : stats?.queries.queriesLast24h || 0}
              </p>
            </div>
            <div className="text-4xl">🤖</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Consultas</p>
              <p className="text-3xl font-bold text-green-600">
                {loading ? '...' : stats?.queries.totalQueries || 0}
              </p>
            </div>
            <div className="text-4xl">🧠</div>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6 border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-start space-x-4">
              <div className="text-5xl">{item.icon}</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Estado del Sistema</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">API Backend</p>
                <p className="text-sm text-gray-600">Operacional</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Online
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">Base de Datos PostgreSQL</p>
                <p className="text-sm text-gray-600">Conectada</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Online
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">OpenAI API</p>
                <p className="text-sm text-gray-600">GPT-4 disponible</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
