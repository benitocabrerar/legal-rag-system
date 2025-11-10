export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHECK' | 'OTHER';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  caseId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  description?: string;
  taxAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  case?: {
    id: string;
    title: string;
    clientName: string;
  };
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoiceId?: string;
  caseId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  transactionId?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
  };
  case?: {
    id: string;
    title: string;
    clientName: string;
  };
}

export interface PaymentAgreement {
  id: string;
  caseId: string;
  totalAmount: number;
  currency: string;
  installments: number;
  frequency: string;
  startDate: string;
  nextPaymentDate?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  case?: {
    id: string;
    title: string;
    clientName: string;
  };
}

export interface CaseFinance {
  id: string;
  caseId: string;
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  lastPaymentDate?: string;
  updatedAt: string;
  case?: {
    id: string;
    title: string;
    clientName: string;
  };
}

export interface CreateInvoiceData {
  caseId: string;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  description?: string;
  taxAmount?: number;
  notes?: string;
}

export interface CreatePaymentData {
  caseId: string;
  invoiceId?: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  paymentDate: string;
  transactionId?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface CreatePaymentAgreementData {
  caseId: string;
  totalAmount: number;
  currency?: string;
  installments: number;
  frequency: string;
  startDate: string;
  description?: string;
}

export interface FinancialSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  averagePaymentTime: number;
  recentInvoices: Invoice[];
  recentPayments: Payment[];
  overdueInvoices: Invoice[];
}
