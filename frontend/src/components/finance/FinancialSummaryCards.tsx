'use client';

import { DollarSign, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface FinancialSummaryCardsProps {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  currency?: string;
}

export function FinancialSummaryCards({
  totalInvoiced,
  totalPaid,
  totalPending,
  totalOverdue,
  currency = 'USD',
}: FinancialSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const cards = [
    {
      title: 'Total Facturado',
      value: formatCurrency(totalInvoiced),
      icon: DollarSign,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Cobrado',
      value: formatCurrency(totalPaid),
      icon: TrendingUp,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: 'Pendiente de Cobro',
      value: formatCurrency(totalPending),
      icon: Clock,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
    },
    {
      title: 'Facturas Vencidas',
      value: formatCurrency(totalOverdue),
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
