'use client';

import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Download, AlertCircle } from 'lucide-react';
import { subscriptionAPI, billingAPI } from '@/lib/api';
import { SUBSCRIPTION_PLANS, formatPrice, calculateSavings } from '@/lib/subscription-plans';

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subscription, invoiceData] = await Promise.all([
        subscriptionAPI.getCurrent(),
        billingAPI.getInvoices(10, 0),
      ]);
      setCurrentPlan(subscription);
      setInvoices(invoiceData.invoices || []);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planCode: string) => {
    if (confirm(`¿Deseas cambiar al plan ${SUBSCRIPTION_PLANS[planCode].name}?`)) {
      try {
        await subscriptionAPI.upgrade(planCode, billingCycle);
        alert('¡Plan actualizado exitosamente!');
        loadData();
      } catch (error) {
        alert('Error al actualizar el plan');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentPlanCode = currentPlan?.planCode || 'free';

  return (
    <div className="space-y-8">
      {/* Current Plan Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan Actual</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-bold text-indigo-600">
              {SUBSCRIPTION_PLANS[currentPlanCode].name}
            </h3>
            <p className="text-gray-600 mt-1">
              {formatPrice(SUBSCRIPTION_PLANS[currentPlanCode].priceMonthly)} / mes
            </p>
          </div>
          {currentPlan?.cancelAtPeriodEnd && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Cancela el {new Date(currentPlan.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {currentPlan?.currentPeriodEnd && !currentPlan?.cancelAtPeriodEnd && (
          <p className="text-sm text-gray-500 mt-4">
            Próxima facturación: {new Date(currentPlan.currentPeriodEnd).toLocaleDateString('es-EC', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            billingCycle === 'monthly'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            billingCycle === 'yearly'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Anual
          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            Ahorra 17%
          </span>
        </button>
      </div>

      {/* Plans Comparison */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
          const isCurrentPlan = plan.code === currentPlanCode;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          const savings = billingCycle === 'yearly' ? calculateSavings(plan) : 0;

          return (
            <div
              key={plan.code}
              className={`rounded-xl border-2 p-6 ${
                plan.popular
                  ? 'border-indigo-600 shadow-lg scale-105'
                  : 'border-gray-200'
              } ${isCurrentPlan ? 'bg-indigo-50' : 'bg-white'}`}
            >
              {plan.popular && (
                <div className="bg-indigo-600 text-white text-xs font-bold uppercase px-3 py-1 rounded-full inline-block mb-4">
                  Más Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-gray-600 mt-2 text-sm">{plan.description}</p>
              <div className="mt-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(price)}
                  </span>
                  <span className="text-gray-600">
                    {billingCycle === 'monthly' ? '/ mes' : '/ año'}
                  </span>
                </div>
                {billingCycle === 'yearly' && savings > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    Ahorras {formatPrice(savings)} al año
                  </p>
                )}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => !isCurrentPlan && handleUpgrade(plan.code)}
                disabled={isCurrentPlan}
                className={`w-full mt-8 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isCurrentPlan ? 'Plan Actual' : 'Actualizar Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Historial de Facturación</h2>
        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay facturas disponibles</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left">
                  <th className="pb-3 font-semibold text-gray-700">Fecha</th>
                  <th className="pb-3 font-semibold text-gray-700">Descripción</th>
                  <th className="pb-3 font-semibold text-gray-700">Estado</th>
                  <th className="pb-3 font-semibold text-gray-700 text-right">Monto</th>
                  <th className="pb-3 font-semibold text-gray-700 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="py-4 text-gray-900">
                      {new Date(invoice.createdAt).toLocaleDateString('es-EC')}
                    </td>
                    <td className="py-4 text-gray-700">{invoice.description}</td>
                    <td className="py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : invoice.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {invoice.status === 'paid' ? 'Pagado' : invoice.status === 'pending' ? 'Pendiente' : 'Fallido'}
                      </span>
                    </td>
                    <td className="py-4 text-right font-semibold text-gray-900">
                      {formatPrice(invoice.amount)}
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2 ml-auto">
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>
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
