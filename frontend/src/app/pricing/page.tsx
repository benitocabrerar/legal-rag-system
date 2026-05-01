'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import PayPalCheckoutButton from '@/components/PayPalCheckoutButton';

interface HubPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_cycle: 'monthly' | 'yearly' | 'one_time';
  price_cents: number;
  currency: string;
  trial_days: number;
  features: Record<string, unknown>;
  is_popular: boolean;
  display_order: number;
}

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [plans, setPlans] = useState<HubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(() => {
    // Honor ?cycle=yearly|monthly from the landing.
    const c = searchParams?.get('cycle');
    return c === 'yearly' ? 'yearly' : 'monthly';
  });
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [methodModal, setMethodModal] = useState<HubPlan | null>(null);
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, [billingCycle]);

  // Deep-link from landing: /pricing?plan=<code>&cycle=<monthly|yearly>
  // After plans load, auto-open the payment-method modal for that plan
  // (or redirect to register/dashboard if it's free).
  useEffect(() => {
    const code = searchParams?.get('plan');
    if (!code || autoOpenedFor === code || plans.length === 0) return;
    const target = plans.find((p) => p.code === code);
    if (!target) return;
    setAutoOpenedFor(code);
    handleSelectPlan(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, searchParams, autoOpenedFor]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/payhub/plans?cycle=${billingCycle}`);
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: HubPlan) => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Preserve plan + cycle through the auth roundtrip so the modal
      // re-opens automatically once the user is signed in.
      const back = `/pricing?plan=${encodeURIComponent(plan.code)}&cycle=${billingCycle}`;
      router.push(`/login?redirect=${encodeURIComponent(back)}`);
      return;
    }
    if (plan.price_cents === 0) {
      router.push('/dashboard');
      return;
    }
    // Mostrar modal de elección de método de pago
    setMethodModal(plan);
  };

  const handleBankTransfer = async (plan: HubPlan) => {
    setSelectedPlanCode(plan.code);
    try {
      const response = await api.post('/payhub/payments', {
        planCode: plan.code,
        provider: 'bank_transfer',
        type: 'subscription',
        metadata: { from: 'pricing_page' },
      });
      const paymentId = response.data?.payment?.payment_id;
      if (!paymentId) throw new Error('No payment_id devuelto');
      router.push(`/payment/${paymentId}`);
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(error.response?.data?.error || error.message || 'Error iniciando pago');
      setSelectedPlanCode(null);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            {t('pricing.backToDashboard')}
          </button>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">{t('pricing.title')}</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t('pricing.subtitle')}</p>
          <p className="text-xs text-gray-400 mt-2">⚡ Powered by COGNITEX Payments Hub</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="relative inline-flex items-center bg-white rounded-lg shadow-sm p-1 border border-gray-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing.yearly')}
            </button>
          </div>
          {billingCycle === 'yearly' && (
            <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {t('pricing.savingsLabel')}
            </span>
          )}
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {plans.length === 0 && (
            <div className="col-span-full text-center text-gray-500">
              No hay planes disponibles para el ciclo seleccionado.
            </div>
          )}
          {plans.map((plan) => {
            const isPopular = plan.is_popular;
            const isFree = plan.price_cents === 0;
            const features = plan.features as Record<string, number | boolean | string>;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  isPopular ? 'ring-2 ring-indigo-600 transform scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-0 right-0 bg-indigo-600 text-white text-center py-1 text-sm font-semibold">
                    {t('pricing.popular')}
                  </div>
                )}

                <div className={`p-6 ${isPopular ? 'pt-10' : ''}`}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6 min-h-[3rem]">{plan.description || ''}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price_cents, plan.currency)}
                      </span>
                      {!isFree && (
                        <span className="text-gray-600 ml-2">
                          {plan.billing_cycle === 'monthly' ? t('common.perMonth') : t('common.perYear')}
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 text-sm">
                    {Object.entries(features).map(([k, v]) => {
                      // Booleans con valor false → no se muestran
                      if (typeof v === 'boolean' && !v) return null;
                      const featureLabel = t(`features.${k}`);
                      const labelText = featureLabel === `features.${k}` ? k.replace(/_/g, ' ') : featureLabel;

                      // Valores: -1 → ∞, true → solo label sin número, número → "N label"
                      let displayValue: React.ReactNode;
                      if (typeof v === 'boolean') {
                        // Solo true llega acá; mostrar label sin número
                        displayValue = <span className="text-gray-700">✓ {labelText}</span>;
                      } else if (v === -1) {
                        displayValue = (
                          <span className="text-gray-700">
                            <strong>{t('features.unlimited')}</strong>{' '}
                            <span className="text-gray-500">{labelText}</span>
                          </span>
                        );
                      } else {
                        const numFmt = typeof v === 'number' && v >= 1000 ? v.toLocaleString('es-EC') : String(v);
                        displayValue = (
                          <span className="text-gray-700">
                            <strong>{numFmt}</strong>{' '}
                            <span className="text-gray-500">{labelText}</span>
                          </span>
                        );
                      }

                      return (
                        <li key={k} className="flex items-start">
                          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          </svg>
                          {displayValue}
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={selectedPlanCode === plan.code}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                      isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : isFree
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50'
                    } ${selectedPlanCode === plan.code ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {selectedPlanCode === plan.code
                      ? t('pricing.processing')
                      : isFree
                      ? t('pricing.startFree')
                      : t('pricing.subscribeNow')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Métodos de pago */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            {t('pricing.paymentMethodsTitle')}
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            🇪🇨 Banco del Pichincha · COGNITEX S.A.S.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 border border-gray-100 rounded-lg hover:border-indigo-200 transition-colors">
              <div className="text-4xl mb-2">🅿️</div>
              <h3 className="font-semibold text-gray-900 mb-1">PayPal</h3>
              <p className="text-sm text-gray-600">Pago instantáneo · activación automática</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Disponible LIVE</p>
            </div>
            <div className="text-center p-4 border border-gray-100 rounded-lg hover:border-indigo-200 transition-colors">
              <div className="text-4xl mb-2">🏦</div>
              <h3 className="font-semibold text-gray-900 mb-1">{t('pricing.paymentBank')}</h3>
              <p className="text-sm text-gray-600">{t('pricing.paymentBankDesc')}</p>
            </div>
            <div className="text-center p-4 border border-gray-100 rounded-lg hover:border-indigo-200 transition-colors">
              <div className="text-4xl mb-2">💵</div>
              <h3 className="font-semibold text-gray-900 mb-1">{t('pricing.paymentCash')}</h3>
              <p className="text-sm text-gray-600">{t('pricing.paymentCashDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de elección de método de pago */}
      {methodModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setMethodModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {methodModal.name}
            </h3>
            <p className="text-gray-600 text-sm mb-1">
              {formatPrice(methodModal.price_cents, methodModal.currency)}
              <span className="text-gray-500 ml-1">
                {methodModal.billing_cycle === 'monthly' ? t('common.perMonth') : t('common.perYear')}
              </span>
            </p>
            <p className="text-xs text-gray-500 mb-6">Elegí cómo querés pagar:</p>

            <div className="space-y-3">
              {/* PayPal LIVE */}
              <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">🅿️ PayPal</span>
                  <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                    Activación automática
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3">Tarjeta o cuenta PayPal · cobro instantáneo</p>
                <PayPalCheckoutButton
                  planCode={methodModal.code}
                  onSuccess={({ paymentId }) => {
                    setMethodModal(null);
                    router.push(`/payment/${paymentId}?paypal=success`);
                  }}
                  onError={(err) => console.error('paypal error', err)}
                />
              </div>

              <div className="text-center text-xs text-gray-400 my-2">— o —</div>

              <button
                onClick={() => {
                  setMethodModal(null);
                  void handleBankTransfer(methodModal);
                }}
                className="w-full border-2 border-gray-200 rounded-lg p-4 text-left hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900">🏦 Transferencia bancaria</span>
                  <span className="text-xs text-gray-500">24h verificación</span>
                </div>
                <p className="text-xs text-gray-600">Banco del Pichincha · COGNITEX S.A.S.</p>
              </button>

              <button
                onClick={() => setMethodModal(null)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
