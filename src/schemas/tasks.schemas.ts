import { z } from 'zod';

/**
 * Task Validation Schemas
 * Provides type-safe validation for task management in the Legal RAG System
 */

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be one of: pending, in_progress, completed, cancelled' }),
  }).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Priority must be one of: low, medium, high, urgent' }),
  }).default('medium'),
  dueDate: z.string().datetime({ message: 'Invalid due date format. Use ISO 8601 datetime' }).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID format').optional(),
  caseId: z.string().uuid('Invalid case ID format').optional(),
  tags: z.array(z.string().min(1).max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  estimatedHours: z.number().min(0, 'Estimated hours must be non-negative').max(1000, 'Estimated hours must be less than 1000').optional(),
  actualHours: z.number().min(0, 'Actual hours must be non-negative').optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number(),
  })).optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const TaskQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  tags: z.union([
    z.string(), // Single tag
    z.array(z.string()), // Multiple tags
  ]).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(20),
});

export const TaskParamsSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
});

export const BulkUpdateTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'At least one task ID is required'),
  updates: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigneeId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const TaskCommentSchema = z.object({
  taskId: z.string().uuid(),
  comment: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment must be at most 2000 characters'),
  userId: z.string().uuid(),
});

// Type exports
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskQueryInput = z.infer<typeof TaskQuerySchema>;
export type TaskParamsInput = z.infer<typeof TaskParamsSchema>;
export type BulkUpdateTasksInput = z.infer<typeof BulkUpdateTasksSchema>;
export type TaskCommentInput = z.infer<typeof TaskCommentSchema>;
