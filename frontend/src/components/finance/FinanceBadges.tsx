import { InvoiceStatus, PaymentMethod } from '@/types/finance';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const invoiceStatusVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      status: {
        DRAFT: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        SENT: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        PAID: 'bg-green-50 text-green-700 ring-green-600/20',
        OVERDUE: 'bg-red-50 text-red-700 ring-red-600/20',
        CANCELLED: 'bg-gray-50 text-gray-700 ring-gray-600/20',
      },
    },
    defaultVariants: {
      status: 'DRAFT',
    },
  }
);

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CREDIT_CARD: 'Tarjeta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  return (
    <span className={cn(invoiceStatusVariants({ status }), className)}>
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}

interface PaymentMethodBadgeProps {
  method: PaymentMethod;
  className?: string;
}

export function PaymentMethodBadge({ method, className }: PaymentMethodBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
        className
      )}
    >
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}
