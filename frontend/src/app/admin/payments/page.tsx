'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface PaymentProof {
  id: string;
  paymentId: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  bankName: string | null;
  accountNumber: string | null;
  referenceNumber: string | null;
  depositDate: string | null;
  notes: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  payment: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    subscription: {
      id: string;
      plan: {
        name: string;
        nameEnglish: string;
      };
      billingCycle: string;
    };
  };
  reviewer: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export default function AdminPaymentsPage() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  useEffect(() => {
    loadProofs();
  }, [statusFilter]);

  const loadProofs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/payment-proofs', {
        params: {
          status: statusFilter,
          limit: 50,
        },
      });

      setProofs(response.data.proofs || []);
    } catch (error) {
      console.error('Error loading payment proofs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (proofId: string, status: 'approved' | 'rejected') => {
    if (!confirm(`¿Estás seguro de que quieres ${status === 'approved' ? 'aprobar' : 'rechazar'} este pago?`)) {
      return;
    }

    setReviewing(true);
    try {
      await api.post(`/admin/payment-proofs/${proofId}/review`, {
        status,
        reviewNotes,
      });

      alert(`Pago ${status === 'approved' ? 'aprobado' : 'rechazado'} exitosamente`);
      setSelectedProof(null);
      setReviewNotes('');
      loadProofs();
    } catch (error: any) {
      console.error('Error reviewing payment proof:', error);
      alert(error.response?.data?.error || 'Error al revisar el pago');
    } finally {
      setReviewing(false);
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, string> = {
      bank_transfer: '🏦',
      cash_deposit: '💵',
      stripe: '💳',
      paypal: '🅿️',
    };
    return icons[method] || '💰';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Comprobantes de Pago</h1>
          <p className="text-gray-600">Revisa y aprueba los comprobantes de pago de los usuarios</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Proofs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : proofs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No se encontraron comprobantes</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {proofs.map((proof) => (
            <div
              key={proof.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {proof.user.name || proof.user.email}
                      </h3>
                      {getStatusBadge(proof.status)}
                    </div>
                    <p className="text-sm text-gray-600">{proof.user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Creado:</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(proof.createdAt)}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Plan</p>
                    <p className="font-semibold text-gray-900">{proof.payment.subscription.plan.name}</p>
                    <p className="text-xs text-gray-600">
                      {proof.payment.subscription.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Monto</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {formatPrice(proof.payment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Método de Pago</p>
                    <p className="font-medium text-gray-900">
                      {getPaymentMethodIcon(proof.payment.method)}{' '}
                      {proof.payment.method === 'bank_transfer' ? 'Transferencia' : 'Depósito'}
                    </p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {proof.bankName && (
                    <div>
                      <p className="text-xs text-gray-600">Banco</p>
                      <p className="font-medium text-gray-900">{proof.bankName}</p>
                    </div>
                  )}
                  {proof.referenceNumber && (
                    <div>
                      <p className="text-xs text-gray-600">Número de Referencia</p>
                      <p className="font-medium text-gray-900 font-mono">{proof.referenceNumber}</p>
                    </div>
                  )}
                  {proof.accountNumber && (
                    <div>
                      <p className="text-xs text-gray-600">Número de Cuenta</p>
                      <p className="font-medium text-gray-900 font-mono">{proof.accountNumber}</p>
                    </div>
                  )}
                  {proof.depositDate && (
                    <div>
                      <p className="text-xs text-gray-600">Fecha de Depósito</p>
                      <p className="font-medium text-gray-900">{formatDateTime(proof.depositDate)}</p>
                    </div>
                  )}
                </div>

                {proof.notes && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">Notas del Usuario:</p>
                    <p className="text-sm text-blue-900">{proof.notes}</p>
                  </div>
                )}

                {/* Proof File */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Comprobante:</p>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📄</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{proof.fileName}</p>
                      <p className="text-xs text-gray-600">
                        {(proof.fileSize / 1024).toFixed(2)} KB - {proof.mimeType}
                      </p>
                    </div>
                    <a
                      href={proof.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Ver Archivo
                    </a>
                  </div>
                </div>

                {/* Review Section */}
                {proof.status === 'pending' ? (
                  selectedProof?.id === proof.id ? (
                    <div className="border-t border-gray-200 pt-4">
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Notas de revisión (opcional)..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleReview(proof.id, 'approved')}
                          disabled={reviewing}
                          className="flex-1 py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          ✓ Aprobar
                        </button>
                        <button
                          onClick={() => handleReview(proof.id, 'rejected')}
                          disabled={reviewing}
                          className="flex-1 py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          ✗ Rechazar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProof(null);
                            setReviewNotes('');
                          }}
                          className="py-2 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedProof(proof)}
                      className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Revisar Comprobante
                    </button>
                  )
                ) : proof.status === 'approved' ? (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium mb-1">
                        ✓ Aprobado por {proof.reviewer?.name || 'Admin'}
                      </p>
                      {proof.reviewedAt && (
                        <p className="text-xs text-green-700">{formatDateTime(proof.reviewedAt)}</p>
                      )}
                      {proof.reviewNotes && (
                        <p className="text-sm text-green-900 mt-2">{proof.reviewNotes}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800 font-medium mb-1">
                        ✗ Rechazado por {proof.reviewer?.name || 'Admin'}
                      </p>
                      {proof.reviewedAt && (
                        <p className="text-xs text-red-700">{formatDateTime(proof.reviewedAt)}</p>
                      )}
                      {proof.reviewNotes && (
                        <p className="text-sm text-red-900 mt-2">{proof.reviewNotes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
