import { z } from 'zod';

// Enums
export const EventStatusSchema = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

// Recurrence Schema
export const RecurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).max(365),
  endDate: z.string().datetime().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // 0 = Sunday
});

// Event Schemas
export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  allDay: z.boolean().default(false),
  location: z.string().max(500).optional(),
  caseId: z.string().cuid().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3b82f6'),
  priority: PrioritySchema.default('MEDIUM'),
  isRecurring: z.boolean().default(false),
  recurrence: RecurrenceSchema.optional(),
  reminders: z.array(z.number().int().positive()).default([15]), // Minutes before
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
).refine(
  (data) => !data.isRecurring || data.recurrence,
  { message: 'Recurrence details required for recurring events', path: ['recurrence'] }
);

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: EventStatusSchema.optional(),
});

export const EventQuerySchema = z.object({
  caseId: z.string().cuid().optional(),
  status: EventStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['startDate', 'priority', 'title', 'createdAt']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const CalendarViewSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  caseId: z.string().cuid().optional(),
});

export const UpcomingEventsSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Response Schemas
export const EventResponseSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  description: z.string().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  allDay: z.boolean(),
  location: z.string().nullable(),
  caseId: z.string().cuid().nullable(),
  userId: z.string().cuid(),
  color: z.string(),
  status: EventStatusSchema,
  priority: PrioritySchema,
  isRecurring: z.boolean(),
  recurrence: RecurrenceSchema.nullable(),
  reminders: z.array(z.object({
    id: z.string().cuid(),
    minutesBefore: z.number(),
    sent: z.boolean(),
  })),
  case: z.object({
    id: z.string().cuid(),
    caseNumber: z.string(),
    title: z.string(),
  }).nullable().optional(),
  user: z.object({
    id: z.string().cuid(),
    name: z.string(),
    email: z.string().email(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EventListResponseSchema = z.object({
  events: z.array(EventResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const CalendarResponseSchema = z.object({
  month: z.string(),
  events: z.array(EventResponseSchema),
  summary: z.object({
    totalEvents: z.number(),
    byStatus: z.record(EventStatusSchema, z.number()),
    byPriority: z.record(PrioritySchema, z.number()),
  }),
});

// Types
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type EventQuery = z.infer<typeof EventQuerySchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;
export type EventListResponse = z.infer<typeof EventListResponseSchema>;
export type CalendarResponse = z.infer<typeof CalendarResponseSchema>;
