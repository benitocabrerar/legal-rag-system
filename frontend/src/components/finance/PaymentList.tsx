'use client';

import { Payment } from '@/types/finance';
import { PaymentMethodBadge } from './FinanceBadges';
import { formatDate } from '@/lib/utils';
import { DollarSign } from 'lucide-react';

interface PaymentListProps {
  payments: Payment[];
  currency?: string;
}

export function PaymentList({ payments, currency = 'USD' }: PaymentListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pagos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Los pagos registrados aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Pagos Recientes</h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {payments.map((payment) => (
          <li key={payment.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(payment.amount)}
                  </p>
                  <PaymentMethodBadge method={payment.method} />
                </div>
                <div className="text-sm text-gray-600">
                  {payment.case?.title || 'N/A'}
                  {payment.case?.clientName && (
                    <span className="text-gray-500"> - {payment.case.clientName}</span>
                  )}
                </div>
                {payment.invoice && (
                  <div className="text-xs text-gray-500 mt-1">
                    Factura: {payment.invoice.invoiceNumber}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{formatDate(payment.paymentDate)}</p>
                {payment.transactionId && (
                  <p className="text-xs text-gray-400 mt-1">ID: {payment.transactionId}</p>
                )}
              </div>
            </div>
            {payment.notes && (
              <div className="mt-2 text-sm text-gray-600 border-t border-gray-100 pt-2">
                {payment.notes}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
