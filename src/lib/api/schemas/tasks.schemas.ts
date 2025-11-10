import { z } from 'zod';
import { PrioritySchema } from './calendar.schemas';

// Enums
export const TaskStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'CANCELLED',
]);

// Checklist Item Schema
export const ChecklistItemSchema = z.object({
  id: z.string().cuid(),
  text: z.string().min(1).max(500),
  completed: z.boolean().default(false),
});

// Task Schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  caseId: z.string().cuid().optional(),
  assignedTo: z.string().cuid(),
  priority: PrioritySchema.default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().max(1000).optional(),
  checklist: z.array(ChecklistItemSchema).default([]),
  tags: z.array(z.string().min(1).max(50)).default([]),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: TaskStatusSchema.optional(),
  completedAt: z.string().datetime().optional(),
  actualHours: z.number().positive().max(1000).optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusSchema,
  completedAt: z.string().datetime().optional(),
  actualHours: z.number().positive().optional(),
});

export const TaskQuerySchema = z.object({
  caseId: z.string().cuid().optional(),
  assignedTo: z.string().cuid().optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['dueDate', 'priority', 'title', 'createdAt', 'status']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const OverdueTasksQuerySchema = z.object({
  assignedTo: z.string().cuid().optional(),
  priority: PrioritySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UrgentTasksQuerySchema = z.object({
  assignedTo: z.string().cuid().optional(),
  hoursUntilDue: z.coerce.number().int().min(1).max(168).default(48), // Default: 48 hours
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Response Schemas
export const TaskResponseSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  description: z.string().nullable(),
  caseId: z.string().cuid().nullable(),
  assignedTo: z.string().cuid(),
  createdBy: z.string().cuid(),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  dueDate: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  estimatedHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  checklist: z.array(ChecklistItemSchema),
  attachments: z.array(z.string()),
  tags: z.array(z.string()),
  case: z.object({
    id: z.string().cuid(),
    caseNumber: z.string(),
    title: z.string(),
  }).nullable().optional(),
  assignee: z.object({
    id: z.string().cuid(),
    name: z.string(),
    email: z.string().email(),
  }).optional(),
  creator: z.object({
    id: z.string().cuid(),
    name: z.string(),
    email: z.string().email(),
  }).optional(),
  isOverdue: z.boolean().optional(),
  daysUntilDue: z.number().nullable().optional(),
  completionRate: z.number().min(0).max(100).optional(), // Checklist completion %
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TaskListResponseSchema = z.object({
  tasks: z.array(TaskResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  summary: z.object({
    totalTasks: z.number(),
    byStatus: z.record(TaskStatusSchema, z.number()).optional(),
    byPriority: z.record(PrioritySchema, z.number()).optional(),
    overdue: z.number().optional(),
  }).optional(),
});

// Types
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
