import { z } from 'zod';

/**
 * Calendar Event Validation Schemas
 * Provides type-safe validation for calendar events in the Legal RAG System
 */

const BaseEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().optional(),
  startDate: z.string().datetime({ message: 'Invalid start date format. Use ISO 8601 datetime' }),
  endDate: z.string().datetime({ message: 'Invalid end date format. Use ISO 8601 datetime' }),
  type: z.enum(['hearing', 'meeting', 'deadline', 'reminder'], {
    errorMap: () => ({ message: 'Type must be one of: hearing, meeting, deadline, reminder' }),
  }),
  caseId: z.string().uuid('Invalid case ID format').optional(),
  participants: z.array(z.string().email('Invalid participant email')).optional(),
  location: z.string().optional(),
  isAllDay: z.boolean().default(false),
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1, 'Interval must be at least 1').default(1),
    endDate: z.string().datetime().optional(),
    count: z.number().min(1, 'Count must be at least 1').optional(),
  }).optional(),
});

export const CreateEventSchema = BaseEventSchema.refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

export const UpdateEventSchema = BaseEventSchema.partial();

export const EventQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(['hearing', 'meeting', 'deadline', 'reminder']).optional(),
  caseId: z.string().uuid().optional(),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(20),
});

export const EventParamsSchema = z.object({
  id: z.string().uuid('Invalid event ID format'),
});

export const BulkDeleteEventsSchema = z.object({
  eventIds: z.array(z.string().uuid()).min(1, 'At least one event ID is required'),
});

// Type exports
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type EventQueryInput = z.infer<typeof EventQuerySchema>;
export type EventParamsInput = z.infer<typeof EventParamsSchema>;
export type BulkDeleteEventsInput = z.infer<typeof BulkDeleteEventsSchema>;
