import { z } from 'zod';

// Enums
export const AgreementTypeSchema = z.enum([
  'HOURLY',
  'CONTINGENCY',
  'FLAT_FEE',
  'RETAINER',
  'HYBRID',
]);

export const AgreementStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const PaymentMethodSchema = z.enum([
  'CASH',
  'CHECK',
  'BANK_TRANSFER',
  'CREDIT_CARD',
  'PAYPAL',
  'OTHER',
]);

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'RECEIVED',
  'CLEARED',
  'BOUNCED',
  'REFUNDED',
]);

export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'VIEWED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);

// Financial Agreement Schemas
export const CreateAgreementSchema = z.object({
  caseId: z.string().cuid(),
  type: AgreementTypeSchema,
  totalAmount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  hourlyRate: z.number().positive().optional(),
  contingencyRate: z.number().min(0).max(100).optional(), // Percentage
  flatFee: z.number().positive().optional(),
  retainerAmount: z.number().positive().optional(),
  paymentTerms: z.string().max(1000).optional(),
  installments: z.number().int().min(1).default(1),
  signedDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.type === 'HOURLY') return !!data.hourlyRate;
    if (data.type === 'CONTINGENCY') return !!data.contingencyRate;
    if (data.type === 'FLAT_FEE') return !!data.flatFee;
    if (data.type === 'RETAINER') return !!data.retainerAmount;
    return true;
  },
  { message: 'Required fields for agreement type are missing' }
);

export const UpdateAgreementSchema = CreateAgreementSchema.partial().extend({
  status: AgreementStatusSchema.optional(),
});

// Payment Schemas
export const CreatePaymentSchema = z.object({
  agreementId: z.string().cuid(),
  caseId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  method: PaymentMethodSchema,
  referenceNumber: z.string().max(100).optional(),
  invoiceNumber: z.string().max(100).optional(),
  paymentDate: z.string().datetime(),
  receivedDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdatePaymentSchema = CreatePaymentSchema.partial().extend({
  status: PaymentStatusSchema.optional(),
});

// Invoice Schemas
export const InvoiceLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  rate: z.number().positive(),
  amount: z.number().positive(),
});

export const CreateInvoiceSchema = z.object({
  caseId: z.string().cuid(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime(),
  items: z.array(InvoiceLineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  paymentTerms: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => {
    const issue = data.issueDate ? new Date(data.issueDate) : new Date();
    return new Date(data.dueDate) >= issue;
  },
  { message: 'Due date must be after issue date', path: ['dueDate'] }
);

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial().extend({
  status: InvoiceStatusSchema.optional(),
  paidAmount: z.number().min(0).optional(),
});

// Query Schemas
export const FinanceQuerySchema = z.object({
  caseId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.union([
    AgreementStatusSchema,
    PaymentStatusSchema,
    InvoiceStatusSchema,
  ]).optional(),
});

export const MonthlyReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  caseId: z.string().cuid().optional(),
});

export const AnnualReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  caseId: z.string().cuid().optional(),
});

export const AnalyticsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter']).default('month'),
  caseId: z.string().cuid().optional(),
});

// Response Schemas
export const AgreementResponseSchema = z.object({
  id: z.string().cuid(),
  caseId: z.string().cuid(),
  type: AgreementTypeSchema,
  totalAmount: z.string(), // Decimal as string
  currency: z.string(),
  hourlyRate: z.string().nullable(),
  contingencyRate: z.string().nullable(),
  flatFee: z.string().nullable(),
  retainerAmount: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  installments: z.number(),
  status: AgreementStatusSchema,
  signedDate: z.string().datetime().nullable(),
  paidAmount: z.string(),
  balanceAmount: z.string(),
  case: z.object({
    id: z.string().cuid(),
    caseNumber: z.string(),
    title: z.string(),
    client: z.object({
      id: z.string().cuid(),
      name: z.string(),
      email: z.string().email().nullable(),
    }),
  }).optional(),
  payments: z.array(z.object({
    id: z.string().cuid(),
    amount: z.string(),
    method: PaymentMethodSchema,
    status: PaymentStatusSchema,
    paymentDate: z.string().datetime(),
  })).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PaymentResponseSchema = z.object({
  id: z.string().cuid(),
  agreementId: z.string().cuid(),
  caseId: z.string().cuid(),
  amount: z.string(),
  currency: z.string(),
  method: PaymentMethodSchema,
  referenceNumber: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  paymentDate: z.string().datetime(),
  receivedDate: z.string().datetime().nullable(),
  status: PaymentStatusSchema,
  notes: z.string().nullable(),
  agreement: z.object({
    id: z.string().cuid(),
    type: AgreementTypeSchema,
    totalAmount: z.string(),
  }).optional(),
  case: z.object({
    id: z.string().cuid(),
    caseNumber: z.string(),
    title: z.string(),
  }).optional(),
  createdBy: z.object({
    id: z.string().cuid(),
    name: z.string(),
    email: z.string().email(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const InvoiceResponseSchema = z.object({
  id: z.string().cuid(),
  invoiceNumber: z.string(),
  caseId: z.string().cuid(),
  clientName: z.string(),
  clientEmail: z.string().nullable(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  items: z.array(InvoiceLineItemSchema),
  subtotal: z.string(),
  taxRate: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  paidAmount: z.string(),
  balance: z.string(),
  status: InvoiceStatusSchema,
  paymentTerms: z.string().nullable(),
  notes: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  case: z.object({
    id: z.string().cuid(),
    caseNumber: z.string(),
    title: z.string(),
  }).optional(),
  createdBy: z.object({
    id: z.string().cuid(),
    name: z.string(),
    email: z.string().email(),
  }).optional(),
  isOverdue: z.boolean().optional(),
  daysOverdue: z.number().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CaseBalanceResponseSchema = z.object({
  caseId: z.string().cuid(),
  caseNumber: z.string(),
  title: z.string(),
  agreements: z.array(AgreementResponseSchema),
  payments: z.array(PaymentResponseSchema),
  invoices: z.array(InvoiceResponseSchema),
  summary: z.object({
    totalAgreed: z.string(),
    totalPaid: z.string(),
    totalOutstanding: z.string(),
    totalInvoiced: z.string(),
    unpaidInvoices: z.string(),
  }),
});

export const ClientBalanceResponseSchema = z.object({
  clientId: z.string().cuid(),
  clientName: z.string(),
  cases: z.array(CaseBalanceResponseSchema),
  summary: z.object({
    totalCases: z.number(),
    totalAgreed: z.string(),
    totalPaid: z.string(),
    totalOutstanding: z.string(),
    totalInvoiced: z.string(),
    unpaidInvoices: z.string(),
  }),
});

export const OverviewResponseSchema = z.object({
  summary: z.object({
    totalRevenue: z.string(),
    totalReceived: z.string(),
    totalOutstanding: z.string(),
    totalInvoiced: z.string(),
    unpaidInvoices: z.string(),
    activeCases: z.number(),
  }),
  byAgreementType: z.record(AgreementTypeSchema, z.object({
    count: z.number(),
    totalAmount: z.string(),
    paidAmount: z.string(),
    balance: z.string(),
  })),
  byPaymentMethod: z.record(PaymentMethodSchema, z.object({
    count: z.number(),
    totalAmount: z.string(),
  })),
  recentPayments: z.array(PaymentResponseSchema).max(10),
  overdueInvoices: z.array(InvoiceResponseSchema).max(10),
});

export const MonthlyReportResponseSchema = z.object({
  month: z.string(),
  revenue: z.object({
    total: z.string(),
    byType: z.record(AgreementTypeSchema, z.string()),
  }),
  payments: z.object({
    total: z.string(),
    count: z.number(),
    byMethod: z.record(PaymentMethodSchema, z.string()),
  }),
  invoices: z.object({
    generated: z.number(),
    totalAmount: z.string(),
    paid: z.number(),
    paidAmount: z.string(),
    overdue: z.number(),
    overdueAmount: z.string(),
  }),
  newCases: z.number(),
  activeCases: z.number(),
});

export const AnnualReportResponseSchema = z.object({
  year: z.number(),
  revenue: z.object({
    total: z.string(),
    byMonth: z.array(z.object({
      month: z.string(),
      amount: z.string(),
    })),
    byType: z.record(AgreementTypeSchema, z.string()),
  }),
  payments: z.object({
    total: z.string(),
    count: z.number(),
    byMonth: z.array(z.object({
      month: z.string(),
      amount: z.string(),
      count: z.number(),
    })),
  }),
  invoices: z.object({
    total: z.number(),
    totalAmount: z.string(),
    paid: z.number(),
    paidAmount: z.string(),
    overdue: z.number(),
    overdueAmount: z.string(),
  }),
  cases: z.object({
    total: z.number(),
    active: z.number(),
    closed: z.number(),
  }),
});

export const AnalyticsResponseSchema = z.object({
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    groupBy: z.string(),
  }),
  revenue: z.object({
    total: z.string(),
    trend: z.array(z.object({
      period: z.string(),
      amount: z.string(),
    })),
    growth: z.number(), // Percentage
  }),
  payments: z.object({
    total: z.string(),
    count: z.number(),
    averageAmount: z.string(),
    trend: z.array(z.object({
      period: z.string(),
      amount: z.string(),
      count: z.number(),
    })),
  }),
  invoices: z.object({
    total: z.number(),
    paid: z.number(),
    overdue: z.number(),
    averageDaysToPay: z.number(),
    collectionRate: z.number(), // Percentage
  }),
  topCases: z.array(z.object({
    caseId: z.string(),
    caseNumber: z.string(),
    title: z.string(),
    revenue: z.string(),
    payments: z.string(),
  })).max(10),
  projections: z.object({
    nextMonth: z.string(),
    nextQuarter: z.string(),
  }).optional(),
});

// Types
export type CreateAgreementInput = z.infer<typeof CreateAgreementSchema>;
export type UpdateAgreementInput = z.infer<typeof UpdateAgreementSchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type AgreementResponse = z.infer<typeof AgreementResponseSchema>;
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;
export type CaseBalanceResponse = z.infer<typeof CaseBalanceResponseSchema>;
export type OverviewResponse = z.infer<typeof OverviewResponseSchema>;
export type MonthlyReportResponse = z.infer<typeof MonthlyReportResponseSchema>;
export type AnnualReportResponse = z.infer<typeof AnnualReportResponseSchema>;
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
