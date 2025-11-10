import { z } from 'zod';

// Enums
export const NotificationTypeSchema = z.enum([
  'TASK_ASSIGNED',
  'TASK_DUE',
  'TASK_OVERDUE',
  'EVENT_REMINDER',
  'CASE_UPDATE',
  'PAYMENT_RECEIVED',
  'INVOICE_GENERATED',
  'DOCUMENT_UPLOADED',
  'DEADLINE_APPROACHING',
  'CUSTOM',
]);

export const NotificationChannelSchema = z.enum(['EMAIL', 'IN_APP', 'BOTH']);

export const NotificationStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'FAILED',
  'SCHEDULED',
]);

// Notification Schemas
export const SendNotificationSchema = z.object({
  userId: z.string().cuid().optional(),
  email: z.string().email().optional(),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  templateId: z.string().cuid().optional(),
  caseId: z.string().cuid().optional(),
  taskId: z.string().cuid().optional(),
  eventId: z.string().cuid().optional(),
  channel: NotificationChannelSchema.default('BOTH'),
  scheduledFor: z.string().datetime().optional(),
  templateVariables: z.record(z.string(), z.any()).optional(), // For template substitution
}).refine(
  (data) => data.userId || data.email,
  { message: 'Either userId or email must be provided', path: ['userId'] }
);

export const SendEmailToUserSchema = z.object({
  userId: z.string().cuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  html: z.string().optional(),
  caseId: z.string().cuid().optional(),
  templateId: z.string().cuid().optional(),
  templateVariables: z.record(z.string(), z.any()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    path: z.string(),
  })).optional(),
});

export const SendEmailToClientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  html: z.string().optional(),
  caseId: z.string().cuid().optional(),
  templateId: z.string().cuid().optional(),
  templateVariables: z.record(z.string(), z.any()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    path: z.string(),
  })).optional(),
});

export const ScheduleReminderSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  scheduledFor: z.string().datetime(),
  userId: z.string().cuid().optional(),
  email: z.string().email().optional(),
  caseId: z.string().cuid().optional(),
  taskId: z.string().cuid().optional(),
  eventId: z.string().cuid().optional(),
  channel: NotificationChannelSchema.default('BOTH'),
  templateId: z.string().cuid().optional(),
  templateVariables: z.record(z.string(), z.any()).optional(),
}).refine(
  (data) => data.userId || data.email,
  { message: 'Either userId or email must be provided', path: ['userId'] }
).refine(
  (data) => new Date(data.scheduledFor) > new Date(),
  { message: 'Scheduled time must be in the future', path: ['scheduledFor'] }
);

export const NotificationQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  type: NotificationTypeSchema.optional(),
  status: NotificationStatusSchema.optional(),
  channel: NotificationChannelSchema.optional(),
  caseId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'sentAt', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Template Schemas
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/), // Slug format
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  type: NotificationTypeSchema,
  isActive: z.boolean().default(true),
  variables: z.array(z.string()).optional(), // List of available variables
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

// Response Schemas
export const NotificationResponseSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid().nullable(),
  email: z.string().email().nullable(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  templateId: z.string().cuid().nullable(),
  caseId: z.string().cuid().nullable(),
  taskId: z.string().cuid().nullable(),
  eventId: z.string().cuid().nullable(),
  channel: NotificationChannelSchema,
  status: NotificationStatusSchema,
  sentAt: z.string().datetime().nullable(),
  readAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable(),
  scheduledFor: z.string().datetime().nullable(),
  user: z.object({
    id: z.string().cuid(),
    name: z.string(),
    email: z.string().email(),
  }).nullable().optional(),
  case: z.object({
    id: z.string().cuid(),
    caseNumber: z.string(),
    title: z.string(),
  }).nullable().optional(),
  createdAt: z.string().datetime(),
});

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  summary: z.object({
    total: z.number(),
    byStatus: z.record(NotificationStatusSchema, z.number()).optional(),
    byType: z.record(NotificationTypeSchema, z.number()).optional(),
  }).optional(),
});

export const TemplateResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  type: NotificationTypeSchema,
  isActive: z.boolean(),
  variables: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TemplateListResponseSchema = z.object({
  templates: z.array(TemplateResponseSchema),
  total: z.number(),
});

export const SendNotificationResponseSchema = z.object({
  id: z.string().cuid(),
  status: NotificationStatusSchema,
  message: z.string(),
  scheduledFor: z.string().datetime().optional(),
});

// Types
export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;
export type SendEmailToUserInput = z.infer<typeof SendEmailToUserSchema>;
export type SendEmailToClientInput = z.infer<typeof SendEmailToClientSchema>;
export type ScheduleReminderInput = z.infer<typeof ScheduleReminderSchema>;
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
