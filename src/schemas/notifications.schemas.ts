import { z } from 'zod';

/**
 * Notification Validation Schemas
 * Provides type-safe validation for notifications in the Legal RAG System
 */

export const CreateNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
  type: z.enum(['email', 'sms', 'push', 'in_app'], {
    errorMap: () => ({ message: 'Type must be one of: email, sms, push, in_app' }),
  }),
  recipient: z.string().min(1, 'Recipient is required'),
  recipientEmail: z.string().email('Invalid email address').optional(),
  recipientPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Priority must be one of: low, normal, high, urgent' }),
  }).default('normal'),
  scheduledAt: z.string().datetime({ message: 'Invalid scheduled date format. Use ISO 8601 datetime' }).optional(),
  category: z.enum([
    'case_update',
    'deadline_reminder',
    'event_reminder',
    'document_shared',
    'task_assigned',
    'payment_due',
    'system_alert',
    'general',
  ]).default('general'),
  relatedEntityType: z.enum(['case', 'task', 'event', 'document', 'finance']).optional(),
  relatedEntityId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  expiresAt: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.type === 'email' && !data.recipientEmail) {
      return false;
    }
    if (data.type === 'sms' && !data.recipientPhone) {
      return false;
    }
    return true;
  },
  {
    message: 'Email notifications require recipientEmail, SMS notifications require recipientPhone',
    path: ['type'],
  }
);

export const UpdateNotificationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'cancelled']).optional(),
  readAt: z.string().datetime().optional(),
});

export const NotificationQuerySchema = z.object({
  type: z.enum(['email', 'sms', 'push', 'in_app']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'cancelled']).optional(),
  category: z.enum([
    'case_update',
    'deadline_reminder',
    'event_reminder',
    'document_shared',
    'task_assigned',
    'payment_due',
    'system_alert',
    'general',
  ]).optional(),
  recipient: z.string().optional(),
  relatedEntityType: z.enum(['case', 'task', 'event', 'document', 'finance']).optional(),
  relatedEntityId: z.string().uuid().optional(),
  isRead: z.coerce.boolean().optional(),
  scheduledFrom: z.string().datetime().optional(),
  scheduledTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(20),
});

export const NotificationParamsSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
});

export const BulkSendNotificationsSchema = z.object({
  recipients: z.array(z.object({
    recipient: z.string(),
    recipientEmail: z.string().email().optional(),
    recipientPhone: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })).min(1, 'At least one recipient is required'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.enum(['email', 'sms', 'push', 'in_app']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  category: z.enum([
    'case_update',
    'deadline_reminder',
    'event_reminder',
    'document_shared',
    'task_assigned',
    'payment_due',
    'system_alert',
    'general',
  ]).default('general'),
  scheduledAt: z.string().datetime().optional(),
});

export const MarkAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1, 'At least one notification ID is required'),
});

export const NotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(false),
  pushEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
  categories: z.object({
    case_update: z.boolean().default(true),
    deadline_reminder: z.boolean().default(true),
    event_reminder: z.boolean().default(true),
    document_shared: z.boolean().default(true),
    task_assigned: z.boolean().default(true),
    payment_due: z.boolean().default(true),
    system_alert: z.boolean().default(true),
    general: z.boolean().default(true),
  }).optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM').optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM').optional(),
});

// Type exports
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>;
export type NotificationParamsInput = z.infer<typeof NotificationParamsSchema>;
export type BulkSendNotificationsInput = z.infer<typeof BulkSendNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
