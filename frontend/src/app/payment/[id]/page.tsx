'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Home, LayoutDashboard, Tag, Scale } from 'lucide-react';
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al dashboard
        </Link>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">No encontramos este pago</h1>
        <p className="text-sm text-gray-600">El enlace puede haber expirado o el pago ya fue procesado.</p>
        <div className="flex gap-2 mt-2">
          <Link href="/pricing" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Ver planes
          </Link>
          <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50">
            Ir al dashboard
          </Link>
        </div>
      </div>
    );
  }

  const refCode = (payment.metadata?.reference_code as string) || payment.id.slice(0, 8).toUpperCase();
  const planLabel = (payment.metadata?.plan_code as string) || (payment.metadata?.label as string) || payment.type;
  const billingCycle = (payment.metadata?.billing_cycle as string) || '—';
  const isManual = payment.provider === 'bank_transfer' || payment.provider === 'cash';
  const isPaypal = payment.provider === 'paypal';
  const isPending = payment.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav — siempre visible para que el usuario tenga salida. */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <span className="hidden sm:inline text-gray-300">/</span>
            <Link href="/" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span className="font-bold">Poweria Legal</span>
            </Link>
            <span className="hidden sm:inline text-gray-400 text-sm">·</span>
            <span className="text-sm text-gray-500">Pago</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Planes</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Resumen */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
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
