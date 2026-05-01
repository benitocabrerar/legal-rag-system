'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import PayPalCheckoutButton from '@/components/PayPalCheckoutButton';
import BankTransferCheckout from '@/components/BankTransferCheckout';

interface PayhubPayment {
  id: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'reversed' | 'disputed';
  provider: string;
  type: string;
  amount_cents: number;
  currency: string;
  amount_usd_cents: number | null;
  proof_url: string | null;
  paid_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BankAccount {
  bank_slug: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  account_last4: string;
  account_type: string | null;
  currency: string;
  country_code: string;
  tax_id_holder: string | null;
  app_deep_link: string | null;
  web_url: string | null;
  instructions_es: string | null;
  instructions_en: string | null;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  const paymentId = params.id as string;
  const paypalReturnFlag = searchParams.get('paypal');

  const [payment, setPayment] = useState<PayhubPayment | null>(null);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentAndBanks();
  }, [paymentId]);

  async function loadPaymentAndBanks() {
    try {
      const [pRes, bRes] = await Promise.all([
        api.get(`/payhub/payments/${paymentId}`),
        api.get(`/payhub/bank-accounts`),
      ]);
      setPayment(pRes.data?.payment || null);
      setBanks(bRes.data?.bankAccounts || []);
    } catch (error) {
      console.error('Error loading payment:', error);
      alert('Error cargando el pago');
      router.push('/pricing');
    } finally {
      setLoading(false);
    }
  }


  function formatPrice(cents: number, currency = 'USD') {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!payment) return null;

  const refCode = (payment.metadata?.reference_code as string) || payment.id.slice(0, 8).toUpperCase();
  const planLabel = (payment.metadata?.plan_code as string) || (payment.metadata?.label as string) || payment.type;
  const billingCycle = (payment.metadata?.billing_cycle as string) || '—';
  const isManual = payment.provider === 'bank_transfer' || payment.provider === 'cash';
  const isPaypal = payment.provider === 'paypal';
  const isPending = payment.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Resumen */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Completar Pago
          </h1>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan / Producto</p>
              <p className="text-lg font-semibold text-gray-900">{planLabel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ciclo</p>
              <p className="text-lg font-semibold text-gray-900">
                {billingCycle === 'monthly' ? 'Mensual' : billingCycle === 'yearly' ? 'Anual' : billingCycle}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Método de Pago</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {payment.provider.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatPrice(payment.amount_cents, payment.currency)}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 mb-1">Código de referencia</p>
              <p className="text-lg font-mono font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {refCode}
              </p>
            </div>
          </div>

          {payment.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">
                ⏳ Pago pendiente — Realiza la transferencia y sube el comprobante
              </p>
            </div>
          )}
          {payment.status === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-medium">
                🔄 En verificación — Te avisaremos cuando se apruebe
              </p>
            </div>
          )}
          {payment.status === 'paid' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">✅ Pago aprobado · activado el {payment.paid_at}</p>
            </div>
          )}
          {payment.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">❌ Pago rechazado</p>
            </div>
          )}
        </div>

        {/* Transferencia bancaria — UX optimizada */}
        {isManual && isPending && banks.length > 0 && (
          <BankTransferCheckout
            paymentId={payment.id}
            amountCents={payment.amount_cents}
            currency={payment.currency}
            referenceCode={refCode}
            banks={banks}
          />
        )}

        {/* PayPal flow */}
        {isPaypal && isPending && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🅿️ Pago con PayPal
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Aprobá el pago en la ventana de PayPal — la activación es instantánea.
            </p>
            <PayPalCheckoutButton
              paymentId={payment.id}
              amountCents={payment.amount_cents}
              currency={payment.currency}
              onSuccess={() => router.push(`/payment/${payment.id}?paypal=success`)}
            />
          </div>
        )}

        {/* Banner cuando volvemos del flujo PayPal */}
        {paypalReturnFlag === 'success' && payment.status !== 'paid' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-blue-800 text-sm">
              🔄 PayPal completó la aprobación. Estamos confirmando el pago…
              recargá en unos segundos para ver el estado actualizado.
            </p>
          </div>
        )}
        {paypalReturnFlag === 'cancel' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <p className="text-amber-800 text-sm">
              ⚠️ Cancelaste el pago en PayPal. Podés volver a intentar arriba o usar transferencia bancaria.
            </p>
          </div>
        )}

        {/* Comprobante ya subido */}
        {payment.proof_url && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mt-8">
            <p className="text-emerald-900 font-semibold mb-2">✅ Comprobante enviado</p>
            <a
              href={payment.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline text-sm break-all"
            >
              {payment.proof_url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
