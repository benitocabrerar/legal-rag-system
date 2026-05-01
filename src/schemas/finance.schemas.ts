import { z } from 'zod';

/**
 * Finance Validation Schemas
 * Provides type-safe validation for financial transactions in the Legal RAG System
 */

export const CreateFinanceRecordSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .finite('Amount must be a finite number')
    .refine((val) => Number(val.toFixed(2)) === val || val.toFixed(2).split('.')[1]?.length <= 2, {
      message: 'Amount must have at most 2 decimal places',
    }),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY', 'MXN', 'BRL'], {
    errorMap: () => ({ message: 'Invalid currency code' }),
  }).default('USD'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Type must be either income or expense' }),
  }),
  category: z.enum([
    'legal_fees',
    'court_fees',
    'consultation',
    'research',
    'filing',
    'retainer',
    'settlement',
    'reimbursement',
    'administrative',
    'other',
  ], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  date: z.string().datetime({ message: 'Invalid date format. Use ISO 8601 datetime' }),
  caseId: z.string().uuid('Invalid case ID format').optional(),
  clientId: z.string().uuid('Invalid client ID format').optional(),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be at most 500 characters'),
  reference: z.string().max(100, 'Reference must be at most 100 characters').optional(),
  invoiceNumber: z.string().max(50, 'Invoice number must be at most 50 characters').optional(),
  paymentMethod: z.enum(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'other']).optional(),
  paymentStatus: z.enum(['pending', 'completed', 'cancelled', 'refunded']).default('completed'),
  taxAmount: z.number().min(0, 'Tax amount must be non-negative').optional(),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100').optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number(),
  })).optional(),
});

export const UpdateFinanceRecordSchema = CreateFinanceRecordSchema.partial();

export const FinanceQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.enum([
    'legal_fees',
    'court_fees',
    'consultation',
    'research',
    'filing',
    'retainer',
    'settlement',
    'reimbursement',
    'administrative',
    'other',
  ]).optional(),
  caseId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  paymentStatus: z.enum(['pending', 'completed', 'cancelled', 'refunded']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt', 'updatedAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(20),
});

export const FinanceParamsSchema = z.object({
  id: z.string().uuid('Invalid finance record ID format'),
});

export const FinanceReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  caseId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year', 'category', 'case']).default('month'),
  includeCharts: z.boolean().default(false),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

export const BulkDeleteFinanceRecordsSchema = z.object({
  recordIds: z.array(z.string().uuid()).min(1, 'At least one record ID is required'),
});

// Type exports
export type CreateFinanceRecordInput = z.infer<typeof CreateFinanceRecordSchema>;
export type UpdateFinanceRecordInput = z.infer<typeof UpdateFinanceRecordSchema>;
export type FinanceQueryInput = z.infer<typeof FinanceQuerySchema>;
export type FinanceParamsInput = z.infer<typeof FinanceParamsSchema>;
export type FinanceReportInput = z.infer<typeof FinanceReportSchema>;
export type BulkDeleteFinanceRecordsInput = z.infer<typeof BulkDeleteFinanceRecordsSchema>;
