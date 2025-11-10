import { FastifyInstance } from 'fastify';
import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  caseId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  parentTaskId: z.string().uuid().optional(),
  dependsOn: z.array(z.string().uuid()).default([]),
  checklistItems: z.array(z.object({
    title: z.string().min(1),
    displayOrder: z.number().default(0),
  })).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid(),
  progress: z.number().min(0).max(100).optional(),
  actualHours: z.number().min(0).optional(),
});

const listTasksQuerySchema = z.object({
  caseId: z.string().uuid().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedTo: z.string().uuid().optional(),
  overdue: z.boolean().optional(),
  completed: z.boolean().optional(),
  tags: z.string().optional(), // comma-separated
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export async function taskRoutes(fastify: FastifyInstance) {
  // Create task
  fastify.post('/tasks', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createTaskSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify case ownership if caseId is provided
      if (body.caseId) {
        const caseExists = await prisma.case.findFirst({
          where: {
            id: body.caseId,
            userId,
          },
        });

        if (!caseExists) {
          return reply.code(404).send({ error: 'Case not found' });
        }
      }

      // Create task with checklist items
      const task = await prisma.task.create({
        data: {
          title: body.title,
          description: body.description,
          status: body.status,
          priority: body.priority,
          caseId: body.caseId,
          assignedTo: body.assignedTo || userId,
          createdBy: userId,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          startDate: body.startDate ? new Date(body.startDate) : null,
          estimatedHours: body.estimatedHours,
          tags: body.tags,
          isRecurring: body.isRecurring,
          recurrenceRule: body.recurrenceRule,
          parentTaskId: body.parentTaskId,
          dependsOn: body.dependsOn,
          checklistItems: body.checklistItems ? {
            create: body.checklistItems.map(item => ({
              title: item.title,
              displayOrder: item.displayOrder,
            })),
          } : undefined,
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          checklistItems: true,
        },
      });

      // Create history entry
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          userId,
          action: 'created',
          changes: {
            status: body.status,
            priority: body.priority,
          },
        },
      });

      return reply.code(201).send(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get tasks (with filters)
  fastify.get('/tasks', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const query = listTasksQuerySchema.parse(request.query);
      const userId = (request.user as any).id;

      const where: any = {
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
        ],
      };

      if (query.caseId) {
        where.caseId = query.caseId;
      }

      if (query.status) {
        where.status = query.status;
      }

      if (query.priority) {
        where.priority = query.priority;
      }

      if (query.assignedTo) {
        where.assignedTo = query.assignedTo;
      }

      if (query.completed !== undefined) {
        if (query.completed) {
          where.status = TaskStatus.COMPLETED;
        } else {
          where.status = {
            not: TaskStatus.COMPLETED,
          };
        }
      }

      if (query.overdue) {
        where.dueDate = {
          lt: new Date(),
        };
        where.status = {
          not: TaskStatus.COMPLETED,
        };
      }

      if (query.tags) {
        const tags = query.tags.split(',').map(t => t.trim());
        where.tags = {
          hasSome: tags,
        };
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                title: true,
                clientName: true,
              },
            },
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            checklistItems: {
              select: {
                id: true,
                title: true,
                isCompleted: true,
                displayOrder: true,
              },
            },
          },
          orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' },
          ],
          skip: query.offset,
          take: query.limit,
        }),
        prisma.task.count({ where }),
      ]);

      return reply.send({
        tasks,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get task statistics
  fastify.get('/tasks/stats', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      const where = {
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
        ],
      };

      const [
        total,
        todo,
        inProgress,
        completed,
        overdue,
        urgent,
      ] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.count({ where: { ...where, status: TaskStatus.TODO } }),
        prisma.task.count({ where: { ...where, status: TaskStatus.IN_PROGRESS } }),
        prisma.task.count({ where: { ...where, status: TaskStatus.COMPLETED } }),
        prisma.task.count({
          where: {
            ...where,
            dueDate: { lt: new Date() },
            status: { not: TaskStatus.COMPLETED },
          },
        }),
        prisma.task.count({
          where: {
            ...where,
            priority: TaskPriority.URGENT,
            status: { not: TaskStatus.COMPLETED },
          },
        }),
      ]);

      return reply.send({
        total,
        byStatus: {
          todo,
          inProgress,
          completed,
        },
        overdue,
        urgent,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get single task
  fastify.get('/tasks/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const task = await prisma.task.findFirst({
        where: {
          id,
          OR: [
            { createdBy: userId },
            { assignedTo: userId },
          ],
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
              status: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          checklistItems: {
            orderBy: {
              displayOrder: 'asc',
            },
            include: {
              completedByUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          history: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 20,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
      }

      return reply.send(task);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update task
  fastify.patch('/tasks/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateTaskSchema.parse({ ...request.body, id });
      const userId = (request.user as any).id;

      // Verify access
      const existingTask = await prisma.task.findFirst({
        where: {
          id,
          OR: [
            { createdBy: userId },
            { assignedTo: userId },
          ],
        },
      });

      if (!existingTask) {
        return reply.code(404).send({ error: 'Task not found or unauthorized' });
      }

      const updateData: any = { ...body };
      delete updateData.id;
      delete updateData.checklistItems;

      if (body.dueDate) {
        updateData.dueDate = new Date(body.dueDate);
      }
      if (body.startDate) {
        updateData.startDate = new Date(body.startDate);
      }

      // Auto-complete if progress is 100%
      if (body.progress === 100 && existingTask.status !== TaskStatus.COMPLETED) {
        updateData.status = TaskStatus.COMPLETED;
        updateData.completedAt = new Date();
      }

      const task = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          case: {
            select: {
              id: true,
              title: true,
              clientName: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          checklistItems: true,
        },
      });

      // Create history entry
      await prisma.taskHistory.create({
        data: {
          taskId: id,
          userId,
          action: 'updated',
          changes: body,
        },
      });

      return reply.send(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete task
  fastify.delete('/tasks/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const task = await prisma.task.findFirst({
        where: {
          id,
          createdBy: userId,
        },
      });

      if (!task) {
        return reply.code(404).send({ error: 'Task not found or unauthorized' });
      }

      await prisma.task.delete({
        where: { id },
      });

      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Toggle checklist item
  fastify.patch('/tasks/:taskId/checklist/:itemId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { taskId, itemId } = request.params as { taskId: string; itemId: string };
      const { isCompleted } = z.object({
        isCompleted: z.boolean(),
      }).parse(request.body);
      const userId = (request.user as any).id;

      // Verify task access
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          OR: [
            { createdBy: userId },
            { assignedTo: userId },
          ],
        },
      });

      if (!task) {
        return reply.code(404).send({ error: 'Task not found or unauthorized' });
      }

      const item = await prisma.taskChecklistItem.update({
        where: { id: itemId },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedBy: isCompleted ? userId : null,
        },
      });

      // Update task progress based on checklist completion
      const allItems = await prisma.taskChecklistItem.findMany({
        where: { taskId },
      });

      const completedCount = allItems.filter(i => i.isCompleted).length;
      const progress = Math.round((completedCount / allItems.length) * 100);

      await prisma.task.update({
        where: { id: taskId },
        data: { progress },
      });

      return reply.send(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add comment to task
  fastify.post('/tasks/:id/comments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { comment } = z.object({
        comment: z.string().min(1),
      }).parse(request.body);
      const userId = (request.user as any).id;

      // Verify task access
      const task = await prisma.task.findFirst({
        where: {
          id,
          OR: [
            { createdBy: userId },
            { assignedTo: userId },
          ],
        },
      });

      if (!task) {
        return reply.code(404).send({ error: 'Task not found or unauthorized' });
      }

      const history = await prisma.taskHistory.create({
        data: {
          taskId: id,
          userId,
          action: 'commented',
          comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return reply.code(201).send(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
