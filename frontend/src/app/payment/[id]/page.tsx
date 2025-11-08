'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  description: string;
  subscription: {
    id: string;
    plan: {
      name: string;
      nameEnglish: string;
    };
    billingCycle: string;
  };
  createdAt: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Payment proof form
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    try {
      const response = await api.get(`/api/payments?limit=100`);
      const payments = response.data.payments || [];
      const foundPayment = payments.find((p: Payment) => p.id === paymentId);

      if (foundPayment) {
        setPayment(foundPayment);
      } else {
        alert('Payment not found');
        router.push('/pricing');
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      alert('Error loading payment details');
      router.push('/pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofFile) {
      alert('Por favor selecciona un archivo de comprobante');
      return;
    }

    setUploading(true);

    try {
      // Upload file to server (you'll need to implement file upload endpoint)
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('paymentId', paymentId);

      // For now, we'll use a placeholder URL
      // In production, this should upload to S3 or similar storage
      const fileUrl = `https://placeholder.com/proof/${proofFile.name}`;

      // Submit payment proof
      await api.post('/api/payment-proof', {
        paymentId,
        fileUrl,
        fileName: proofFile.name,
        fileSize: proofFile.size,
        mimeType: proofFile.type,
        bankName,
        accountNumber,
        referenceNumber,
        depositDate: depositDate ? new Date(depositDate).toISOString() : undefined,
        notes,
      });

      alert('Comprobante enviado exitosamente. Será revisado en las próximas 24-48 horas.');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error submitting proof:', error);
      alert(error.response?.data?.error || 'Error al enviar comprobante');
    } finally {
      setUploading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      stripe: 'Tarjeta de Crédito (Stripe)',
      paypal: 'PayPal',
      bank_transfer: 'Transferencia Bancaria',
      cash_deposit: 'Depósito en Efectivo',
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!payment) {
    return null;
  }

  const isManualPayment = payment.method === 'bank_transfer' || payment.method === 'cash_deposit';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Payment Summary */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Completar Pago
          </h1>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan Seleccionado</p>
              <p className="text-lg font-semibold text-gray-900">
                {payment.subscription.plan.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ciclo de Facturación</p>
              <p className="text-lg font-semibold text-gray-900">
                {payment.subscription.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Método de Pago</p>
              <p className="text-lg font-semibold text-gray-900">
                {getPaymentMethodName(payment.method)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total a Pagar</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatPrice(payment.amount)}
              </p>
            </div>
          </div>

          {payment.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">
                ⏳ Pago pendiente - Por favor completa el proceso de pago
              </p>
            </div>
          )}

          {payment.status === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-medium">
                🔄 Pago en proceso de verificación - Te notificaremos cuando sea aprobado
              </p>
            </div>
          )}

          {payment.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                ✅ Pago completado exitosamente
              </p>
            </div>
          )}
        </div>

        {/* Payment Instructions */}
        {isManualPayment && payment.status === 'pending' && (
          <>
            {/* Bank Transfer Instructions */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Instrucciones de Pago
              </h2>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-indigo-900 mb-4 text-lg">
                  Datos Bancarios para Transferencia
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-indigo-700 font-medium">Banco:</span>
                    <span className="text-indigo-900">Banco Pichincha</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-indigo-700 font-medium">Tipo de Cuenta:</span>
                    <span className="text-indigo-900">Corriente</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-indigo-700 font-medium">Número de Cuenta:</span>
                    <span className="text-indigo-900 font-mono">2100123456</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-indigo-700 font-medium">Beneficiario:</span>
                    <span className="text-indigo-900">Legal RAG System S.A.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-indigo-700 font-medium">RUC:</span>
                    <span className="text-indigo-900 font-mono">1234567890001</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-indigo-700 font-medium">Monto:</span>
                    <span className="text-indigo-900 text-xl font-bold">{formatPrice(payment.amount)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-indigo-700 font-medium">Referencia:</span>
                    <span className="text-indigo-900 font-mono">{payment.id.substring(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Importante:</strong> Después de realizar la transferencia o depósito,
                  sube el comprobante usando el formulario a continuación. Tu suscripción será
                  activada una vez que nuestro equipo verifique el pago (24-48 horas).
                </p>
              </div>
            </div>

            {/* Upload Proof Form */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Subir Comprobante de Pago
              </h2>

              <form onSubmit={handleSubmitProof} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comprobante (Imagen o PDF) *
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {proofFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Archivo seleccionado: {proofFile.name} ({(proofFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ej: Banco Pichincha"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Cuenta (opcional)
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Últimos 4 dígitos"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Referencia
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Número de comprobante o referencia"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Depósito
                    </label>
                    <input
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Adicionales (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Cualquier información adicional sobre el pago..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !proofFile}
                  className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Enviando...' : 'Enviar Comprobante'}
                </button>
              </form>
            </div>
          </>
        )}

        {/* Automated Payment (Stripe/PayPal) */}
        {!isManualPayment && payment.status === 'pending' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Pago con {getPaymentMethodName(payment.method)}
            </h2>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-4">
                La integración de {payment.method === 'stripe' ? 'Stripe' : 'PayPal'} estará
                disponible próximamente.
              </p>
              <p className="text-sm text-gray-500">
                Por ahora, por favor selecciona "Transferencia Bancaria" o "Depósito en Efectivo"
                en la página de planes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
