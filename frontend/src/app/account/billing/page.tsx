'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

interface HubPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_cycle: 'monthly' | 'yearly' | 'one_time';
  price_cents: number;
  currency: string;
  features: Record<string, number | boolean | string>;
  is_popular: boolean;
  display_order: number;
}

interface PaymentRow {
  id: string;
  status: string;
  amount_cents: number;
  amount_usd_cents: number | null;
  currency: string;
  type: string;
  metadata: Record<string, any>;
  created_at: string;
  paid_at: string | null;
}

export default function BillingPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<HubPlan[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan actual = del JWT del user (custom claim plan_tier o legacy_plan_tier)
  const currentPlanTier = (user as any)?.plan_tier
    || (user as any)?.legacy_plan_tier
    || 'free';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, paymentsRes] = await Promise.all([
        api.get(`/payhub/plans?cycle=${billingCycle}`),
        api.get('/payhub/my-payments').catch(() => ({ data: { payments: [] } })),
      ]);
      setPlans(plansRes.data?.plans || []);
      setPayments(paymentsRes.data?.payments || []);
    } catch (err) {
      console.error('Error loading billing:', err);
    } finally {
      setLoading(false);
    }
  }, [billingCycle]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleUpgrade = async (plan: HubPlan) => {
    if (!confirm(`¿Cambiar al plan ${plan.name}?`)) return;
    try {
      const res = await api.post('/payhub/payments', {
        planCode: plan.code,
        provider: 'bank_transfer',
        type: 'subscription',
        metadata: { from: 'account_billing_upgrade' },
      });
      const paymentId = res.data?.payment?.payment_id;
      if (!paymentId) throw new Error('No payment_id devuelto');
      window.location.href = `/payment/${paymentId}`;
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Error iniciando el cambio de plan');
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Plan actual = busca en la lista del Hub el que coincida con currentPlanTier
  const currentPlan = plans.find((p) => p.code === currentPlanTier)
    || plans.find((p) => p.code === 'free')
    || null;

  return (
    <div className="space-y-8">
      {/* Plan actual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan Actual</h2>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-3xl font-bold text-indigo-600 capitalize">
              {currentPlan?.name || currentPlanTier}
            </h3>
            <p className="text-gray-600 mt-1">
              {currentPlan ? `${formatPrice(currentPlan.price_cents, currentPlan.currency)} / mes` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              ⚡ Powered by COGNITEX Payments Hub
            </p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            user_role · <span className="font-mono">{(user as any)?.role || '—'}</span><br/>
            plan_tier · <span className="font-mono">{currentPlanTier}</span>
          </div>
        </div>
      </div>

      {/* Toggle ciclo */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Anual
          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">2 meses gratis</span>
        </button>
      </div>

      {/* Planes del Hub */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            Sin planes disponibles para el ciclo seleccionado.
          </div>
        )}
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanTier
            || (plan.code === `${currentPlanTier}_yearly`);
          const isFree = plan.price_cents === 0;
          const features = plan.features as Record<string, number | boolean | string>;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-6 ${
                plan.is_popular
                  ? 'border-indigo-600 shadow-lg lg:scale-105'
                  : 'border-gray-200'
              } ${isCurrent ? 'bg-indigo-50' : 'bg-white'}`}
            >
              {plan.is_popular && (
                <div className="bg-indigo-600 text-white text-xs font-bold uppercase px-3 py-1 rounded-full inline-block mb-3">
                  Más Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tu plan
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-gray-600 mt-2 text-sm min-h-[2.5rem]">{plan.description || ''}</p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price_cents, plan.currency)}
                  </span>
                  {!isFree && (
                    <span className="text-gray-500 text-sm">
                      {billingCycle === 'monthly' ? t('common.perMonth') : t('common.perYear')}
                    </span>
                  )}
                </div>
              </div>

              <ul className="mt-5 space-y-2 text-sm">
                {Object.entries(features).map(([k, v]) => {
                  if (typeof v === 'boolean' && !v) return null;
                  const labelKey = `features.${k}`;
                  const label = t(labelKey);
                  const labelText = label === labelKey ? k.replace(/_/g, ' ') : label;
                  let display: React.ReactNode;
                  if (typeof v === 'boolean') {
                    display = <span>✓ {labelText}</span>;
                  } else if (v === -1) {
                    display = <span><strong>{t('features.unlimited')}</strong> {labelText}</span>;
                  } else {
                    const num = typeof v === 'number' && v >= 1000 ? v.toLocaleString('es-EC') : String(v);
                    display = <span><strong>{num}</strong> {labelText}</span>;
                  }
                  return (
                    <li key={k} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{display}</span>
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => !isCurrent && handleUpgrade(plan)}
                disabled={isCurrent || isFree}
                className={`w-full mt-6 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isFree
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.is_popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isCurrent ? 'Plan Actual' : isFree ? 'Tier gratuito' : 'Actualizar →'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Historial de pagos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Historial de pagos</h2>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no realizaste pagos en este Hub.</p>
            <p className="text-xs mt-1">Los pagos vía PayPal o transferencia aparecerán acá.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="pb-3 font-semibold">Fecha</th>
                  <th className="pb-3 font-semibold">Concepto</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-700">
                      {new Date(p.created_at).toLocaleDateString('es-EC')}
                    </td>
                    <td className="py-3 text-gray-700">
                      {p.metadata?.plan_code || p.metadata?.label || p.type}
                      {p.metadata?.reference_code && (
                        <span className="ml-2 text-xs text-gray-400 font-mono">{p.metadata.reference_code}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {formatPrice(p.amount_cents, p.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
