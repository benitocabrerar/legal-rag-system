/**
 * Finance helpers — currency formatting, status palette, aging buckets.
 */
export const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DRAFT:     { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-200',   label: 'Borrador' },
  SENT:      { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-200',     label: 'Enviada' },
  VIEWED:    { bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-200',  label: 'Vista' },
  PAID:      { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Pagada' },
  PARTIAL:   { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200',   label: 'Parcial' },
  OVERDUE:   { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-200',    label: 'Vencida' },
  CANCELLED: { bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-200',   label: 'Cancelada' },
  REFUNDED:  { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-200',  label: 'Reembolsada' },
  PENDING:   { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200',   label: 'Pendiente' },
};

export const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CREDIT_CARD: 'Tarjeta crédito',
  DEBIT_CARD: 'Tarjeta débito',
  CHECK: 'Cheque',
  PAYPAL: 'PayPal',
  STRIPE: 'Stripe',
  OTHER: 'Otro',
};

export const AGING_BUCKETS = [
  { key: 'current', label: 'Al día',   color: '#10b981' },
  { key: '1_30',    label: '1-30',     color: '#fbbf24' },
  { key: '31_60',   label: '31-60',    color: '#f97316' },
  { key: '61_90',   label: '61-90',    color: '#ef4444' },
  { key: '90_plus', label: '90+',      color: '#9f1239' },
] as const;

export function fmtMoney(n: number, currency = 'USD', compact = false): string {
  if (compact && Math.abs(n) >= 1000) {
    const units = ['', 'K', 'M', 'B'];
    let value = n, idx = 0;
    while (Math.abs(value) >= 1000 && idx < units.length - 1) { value /= 1000; idx++; }
    return `$${value.toFixed(value < 10 ? 1 : 0)}${units[idx]}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

export function fmtPercent(n: number, decimals = 1): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}
