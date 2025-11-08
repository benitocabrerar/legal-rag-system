'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  nameEnglish: string;
  description: string | null;
  priceMonthlyUSD: number;
  priceYearlyUSD: number;
  storageGB: number;
  documentsLimit: number;
  monthlyQueries: number;
  apiCallsLimit: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/api/plans');
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login with return URL
        router.push(`/login?redirect=/pricing&plan=${planId}`);
        return;
      }

      // Create subscription
      const response = await api.post('/api/subscription', {
        planId,
        billingCycle,
        paymentMethod: 'bank_transfer', // Default to manual payment for now
      });

      // Redirect to payment page
      router.push(`/payment/${response.data.payment.id}`);
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      alert(error.response?.data?.error || 'Error creating subscription');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPrice = (plan: SubscriptionPlan) => {
    return billingCycle === 'monthly' ? plan.priceMonthlyUSD : plan.priceYearlyUSD;
  };

  const getMonthlySavings = (plan: SubscriptionPlan) => {
    const monthlyTotal = plan.priceMonthlyUSD * 12;
    const yearlySavings = monthlyTotal - plan.priceYearlyUSD;
    return yearlySavings;
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
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Planes de Suscripción
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Elige el plan perfecto para tus necesidades legales.
            Todos los planes incluyen acceso a nuestra biblioteca legal y soporte profesional.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="relative inline-flex items-center bg-white rounded-lg shadow-sm p-1 border border-gray-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Anual
            </button>
          </div>
          {billingCycle === 'yearly' && (
            <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Ahorra hasta 2 meses
            </span>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {plans.map((plan) => {
            const price = getPrice(plan);
            const isPopular = plan.code === 'professional';
            const isFree = plan.code === 'free';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  isPopular ? 'ring-2 ring-indigo-600 transform scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-0 right-0 bg-indigo-600 text-white text-center py-1 text-sm font-semibold">
                    Más Popular
                  </div>
                )}

                <div className={`p-6 ${isPopular ? 'pt-10' : ''}`}>
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-6 min-h-[3rem]">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(price)}
                      </span>
                      {!isFree && (
                        <span className="text-gray-600 ml-2">
                          /{billingCycle === 'monthly' ? 'mes' : 'año'}
                        </span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && !isFree && getMonthlySavings(plan) > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        Ahorras {formatPrice(getMonthlySavings(plan))} al año
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        <strong>{plan.storageGB} GB</strong> almacenamiento
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        Hasta <strong>{plan.documentsLimit}</strong> documentos
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        <strong>{plan.monthlyQueries.toLocaleString()}</strong> consultas/mes
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        <strong>{plan.apiCallsLimit.toLocaleString()}</strong> llamadas API
                      </span>
                    </li>
                    {plan.features && plan.features.length > 0 && plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={selectedPlan === plan.id}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                      isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : isFree
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50'
                    } ${selectedPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {selectedPlan === plan.id ? 'Procesando...' : isFree ? 'Comenzar Gratis' : 'Suscribirse'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Métodos de Pago Aceptados
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">💳</div>
              <h3 className="font-semibold text-gray-900 mb-1">Tarjeta de Crédito</h3>
              <p className="text-sm text-gray-600">Pago instantáneo con Stripe</p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🅿️</div>
              <h3 className="font-semibold text-gray-900 mb-1">PayPal</h3>
              <p className="text-sm text-gray-600">Pago seguro con PayPal</p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🏦</div>
              <h3 className="font-semibold text-gray-900 mb-1">Transferencia Bancaria</h3>
              <p className="text-sm text-gray-600">Verificación en 24-48 horas</p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">💵</div>
              <h3 className="font-semibold text-gray-900 mb-1">Depósito en Efectivo</h3>
              <p className="text-sm text-gray-600">Sube tu comprobante</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
