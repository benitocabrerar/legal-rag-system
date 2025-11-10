'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeAPI } from '@/lib/api';
import { Invoice, Payment } from '@/types/finance';
import { FinancialSummaryCards } from '@/components/finance/FinancialSummaryCards';
import { InvoiceTable } from '@/components/finance/InvoiceTable';
import { PaymentList } from '@/components/finance/PaymentList';
import { TrendingUp } from 'lucide-react';

export default function FinancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => financeAPI.listInvoices(),
  });

  // Fetch payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => financeAPI.listPayments(),
  });

  const invoices: Invoice[] = invoicesData?.invoices || [];
  const payments: Payment[] = paymentsData?.payments || [];

  // Calculate financial summary
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices
    .filter((inv) => inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalPending = totalInvoiced - totalPaid - totalOverdue;

  // Get recent items
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  const isLoading = invoicesLoading || paymentsLoading;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Panel de control financiero y facturación
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="month">Este mes</option>
            <option value="quarter">Este trimestre</option>
            <option value="year">Este año</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Financial Summary Cards */}
          <div className="mb-8">
            <FinancialSummaryCards
              totalInvoiced={totalInvoiced}
              totalPaid={totalPaid}
              totalPending={totalPending}
              totalOverdue={totalOverdue}
              currency="USD"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoices Table - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Facturas Recientes</h2>
              </div>
              <InvoiceTable invoices={recentInvoices} currency="USD" />
            </div>

            {/* Recent Payments - Takes 1 column */}
            <div>
              <PaymentList payments={recentPayments} currency="USD" />
            </div>
          </div>

          {/* Empty State */}
          {invoices.length === 0 && payments.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay datos financieros
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza registrando facturas y pagos.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
