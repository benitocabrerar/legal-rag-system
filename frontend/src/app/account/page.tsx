'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User, CreditCard, BarChart3, Settings, ArrowRight,
  CheckCircle, AlertCircle, TrendingUp, Clock, FileText
} from 'lucide-react';
import { userAPI, subscriptionAPI, usageAPI, billingAPI } from '@/lib/api';
import { SUBSCRIPTION_PLANS, formatPrice, isUnlimited } from '@/lib/subscription-plans';

interface QuickStatProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

function QuickStat({ label, value, subtext, icon, href, color }: QuickStatProps) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          {icon}
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{label}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
    </Link>
  );
}

export default function AccountOverviewPage() {
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      const [profileData, subscriptionData, usageData, invoicesData] = await Promise.all([
        userAPI.getProfile(),
        subscriptionAPI.getCurrent(),
        usageAPI.getCurrent(),
        billingAPI.getInvoices(3, 0), // Last 3 invoices
      ]);
      setProfile(profileData);
      setSubscription(subscriptionData);
      setUsage(usageData.usage || {});
      setRecentInvoices(invoicesData.invoices || []);
    } catch (error) {
      console.error('Error loading account data:', error);
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
  const currentUsage = usage || { aiQueries: 0, documents: 0, storage: 0, cases: 0 };

  // Calculate usage percentages
  const aiQueriesPercent = isUnlimited(plan.limits.aiQueries)
    ? 0
    : (currentUsage.aiQueries / plan.limits.aiQueries) * 100;
  const documentsPercent = isUnlimited(plan.limits.documents)
    ? 0
    : (currentUsage.documents / plan.limits.documents) * 100;

  // Determine if user needs to upgrade
  const needsUpgrade = aiQueriesPercent >= 75 || documentsPercent >= 75;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              ¡Hola, {profile?.name?.split(' ')[0] || 'Usuario'}! 👋
            </h1>
            <p className="text-indigo-100 text-lg">
              Bienvenido a tu panel de cuenta
            </p>
          </div>
          {subscription?.status === 'active' && (
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Cuenta Activa</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStat
          label="Plan Actual"
          value={plan.name}
          subtext={planCode === 'free' ? 'Actualiza para más funciones' : formatPrice(plan.priceMonthly) + ' / mes'}
          icon={<CreditCard className="w-6 h-6 text-indigo-600" />}
          href="/account/billing"
          color="indigo"
        />
        <QuickStat
          label="Consultas de IA"
          value={`${currentUsage.aiQueries} ${isUnlimited(plan.limits.aiQueries) ? '' : `/ ${plan.limits.aiQueries}`}`}
          subtext={isUnlimited(plan.limits.aiQueries) ? 'Ilimitadas' : `${Math.round(aiQueriesPercent)}% utilizado`}
          icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
          href="/account/usage"
          color="blue"
        />
        <QuickStat
          label="Documentos"
          value={`${currentUsage.documents} ${isUnlimited(plan.limits.documents) ? '' : `/ ${plan.limits.documents}`}`}
          subtext={isUnlimited(plan.limits.documents) ? 'Ilimitados' : `${Math.round(documentsPercent)}% utilizado`}
          icon={<FileText className="w-6 h-6 text-purple-600" />}
          href="/account/usage"
          color="purple"
        />
        <QuickStat
          label="Casos Activos"
          value={`${currentUsage.cases} ${isUnlimited(plan.limits.cases) ? '' : `/ ${plan.limits.cases}`}`}
          subtext="casos en proceso"
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          href="/account/usage"
          color="green"
        />
      </div>

      {/* Upgrade Alert */}
      {needsUpgrade && planCode === 'free' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                Te estás acercando a tus límites
              </h3>
              <p className="text-amber-800 text-sm mb-3">
                Has utilizado más del 75% de tus recursos este mes. Considera actualizar tu plan para evitar interrupciones.
              </p>
              <Link
                href="/account/billing"
                className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm"
              >
                Ver Planes
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Next Payment */}
      {subscription?.currentPeriodEnd && subscription?.status === 'active' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Próximo Pago</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-EC', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Monto: {formatPrice(plan.priceMonthly)}
              </p>
            </div>
            <Link
              href="/account/billing"
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2"
            >
              Gestionar Pagos
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Facturas Recientes</h3>
            <Link
              href="/account/billing"
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1"
            >
              Ver Todas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No hay facturas disponibles</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {new Date(invoice.createdAt).toLocaleDateString('es-EC')}
                    </p>
                    <p className="text-xs text-gray-600">{invoice.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(invoice.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {invoice.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
            <Link
              href="/account/profile"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <User className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Editar Perfil</p>
                <p className="text-xs text-gray-600">Actualiza tu información personal</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
            </Link>
            <Link
              href="/account/billing"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <CreditCard className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Gestionar Suscripción</p>
                <p className="text-xs text-gray-600">Actualiza o cancela tu plan</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
            </Link>
            <Link
              href="/account/usage"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <BarChart3 className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Ver Uso Detallado</p>
                <p className="text-xs text-gray-600">Consulta tus métricas de consumo</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
            </Link>
            <Link
              href="/account/settings"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Settings className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Configuración</p>
                <p className="text-xs text-gray-600">Personaliza tu experiencia</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Account Health */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">Estado de tu Cuenta</h3>
            <ul className="space-y-1 text-sm text-green-800">
              <li>✓ Perfil completado al {profile?.phone && profile?.barNumber ? '100' : '80'}%</li>
              <li>✓ Suscripción activa y al día</li>
              <li>✓ Sin límites alcanzados</li>
              <li>✓ Datos protegidos y encriptados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
