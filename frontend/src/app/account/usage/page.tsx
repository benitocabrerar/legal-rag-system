'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, FileText, HardDrive, FolderOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import { usageAPI, subscriptionAPI } from '@/lib/api';
import { SUBSCRIPTION_PLANS, formatLimit, isUnlimited } from '@/lib/subscription-plans';

interface UsageCardProps {
  title: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
  unit: string;
  color: string;
}

function UsageCard({ title, icon, current, limit, unit, color }: UsageCardProps) {
  const percentage = isUnlimited(limit) ? 0 : (current / limit) * 100;
  const isNearLimit = percentage >= 75;
  const isAtLimit = percentage >= 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg bg-${color}-100`}>
            {icon}
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {isNearLimit && !isUnlimited(limit) && (
          <AlertTriangle className={`w-5 h-5 ${isAtLimit ? 'text-red-500' : 'text-amber-500'}`} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-gray-900">
            {current.toLocaleString('es-EC')}
          </span>
          <span className="text-sm text-gray-600">
            de {isUnlimited(limit) ? 'Ilimitado' : limit.toLocaleString('es-EC')} {unit}
          </span>
        </div>

        {!isUnlimited(limit) && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isAtLimit
                    ? 'bg-red-500'
                    : isNearLimit
                    ? 'bg-amber-500'
                    : `bg-${color}-500`
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className={`text-sm ${
              isAtLimit
                ? 'text-red-600 font-medium'
                : isNearLimit
                ? 'text-amber-600'
                : 'text-gray-600'
            }`}>
              {isAtLimit
                ? '¡Límite alcanzado! Actualiza tu plan para continuar.'
                : isNearLimit
                ? `${Math.round(percentage)}% utilizado - Considera actualizar tu plan`
                : `${Math.round(percentage)}% utilizado`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UsagePage() {
  const [usage, setUsage] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usageData, subscriptionData] = await Promise.all([
        usageAPI.getCurrent(),
        subscriptionAPI.getCurrent(),
      ]);
      setUsage(usageData.usage);
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const planCode = subscription?.planCode || 'free';
  const plan = SUBSCRIPTION_PLANS[planCode];
  const limits = plan.limits;

  // Mock data if no usage yet
  const currentUsage = usage || {
    aiQueries: 0,
    documents: 0,
    storage: 0,
    cases: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Uso y Límites</h2>
        <p className="text-gray-600">
          Tu plan actual: <span className="font-semibold text-indigo-600">{plan.name}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Período actual: {new Date().toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Usage Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <UsageCard
          title="Consultas de IA"
          icon={<MessageSquare className="w-6 h-6 text-indigo-600" />}
          current={currentUsage.aiQueries}
          limit={limits.aiQueries}
          unit="consultas"
          color="indigo"
        />
        <UsageCard
          title="Documentos"
          icon={<FileText className="w-6 h-6 text-blue-600" />}
          current={currentUsage.documents}
          limit={limits.documents}
          unit="documentos"
          color="blue"
        />
        <UsageCard
          title="Almacenamiento"
          icon={<HardDrive className="w-6 h-6 text-purple-600" />}
          current={currentUsage.storage / 1024} // Convert MB to GB for display
          limit={limits.storage}
          unit="GB"
          color="purple"
        />
        <UsageCard
          title="Casos Activos"
          icon={<FolderOpen className="w-6 h-6 text-green-600" />}
          current={currentUsage.cases}
          limit={limits.cases}
          unit="casos"
          color="green"
        />
      </div>

      {/* Upgrade CTA */}
      {planCode === 'free' && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-start gap-4">
            <TrendingUp className="w-8 h-8 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">¿Necesitas más capacidad?</h3>
              <p className="text-indigo-100 mb-4">
                Actualiza al Plan Profesional y obtén consultas de IA ilimitadas, 500 documentos,
                50 GB de almacenamiento y mucho más.
              </p>
              <a
                href="/account/billing"
                className="inline-block bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
              >
                Ver Planes
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">💡 Consejos para Optimizar tu Uso</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Las consultas de IA se renuevan cada mes</li>
          <li>• Elimina documentos antiguos para liberar espacio de almacenamiento</li>
          <li>• Archiva casos completados para reducir el conteo de casos activos</li>
          <li>• Usa prompts especializados para obtener mejores resultados con menos consultas</li>
        </ul>
      </div>
    </div>
  );
}
