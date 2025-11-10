import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
  TaskQuerySchema,
  OverdueTasksQuerySchema,
  UrgentTasksQuerySchema,
  TaskListResponse,
  TaskResponse,
} from '../schemas/tasks.schemas';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limit';

export async function tasksRoutes(fastify: FastifyInstance) {
  // List all tasks
  fastify.get(
    '/tasks',
    {
      preHandler: [authenticate],
      schema: {
        description: 'List all tasks with filtering and pagination',
        tags: ['tasks'],
        querystring: TaskQuerySchema,
        response: {
          200: TaskListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: typeof TaskQuerySchema._type }>,
      reply: FastifyReply
    ) => {
      const query = TaskQuerySchema.parse(request.query);
      const userId = request.user.id;

      const where: any = {
        OR: [
          { assignedTo: userId },
          { createdBy: userId },
        ],
      };

      if (query.caseId) where.caseId = query.caseId;
      if (query.assignedTo) where.assignedTo = query.assignedTo;
      if (query.status) where.status = query.status;
      if (query.priority) where.priority = query.priority;
      if (query.tags && query.tags.length > 0) {
        where.tags = { hasSome: query.tags };
      }
      if (query.dueBefore || query.dueAfter) {
        where.dueDate = {};
        if (query.dueBefore) where.dueDate.lte = new Date(query.dueBefore);
        if (query.dueAfter) where.dueDate.gte = new Date(query.dueAfter);
      }

      const [tasks, total] = await Promise.all([
        fastify.prisma.task.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
              },
            },
            user: {
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
          },
          orderBy: { [query.sortBy]: query.sortOrder },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        fastify.prisma.task.count({ where }),
      ]);

      // Enhance tasks with computed fields
      const now = new Date();
      const enhancedTasks = tasks.map((task) => ({
        ...task,
        isOverdue: task.dueDate
          ? task.dueDate < now && task.status !== 'COMPLETED'
          : false,
        daysUntilDue: task.dueDate
          ? Math.ceil((task.dueDate.getTime() - now.getTime()) / 86400000)
          : null,
        completionRate: task.checklist && task.checklist.length > 0
          ? (task.checklist.filter((item: any) => item.completed).length /
              task.checklist.length) *
            100
          : 0,
      }));

      // Calculate summary
      const summary = {
        totalTasks: total,
        byStatus: tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byPriority: tasks.reduce((acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        overdue: enhancedTasks.filter((t) => t.isOverdue).length,
      };

      return {
        tasks: enhancedTasks,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
        summary,
      };
    }
  );

  // Get overdue tasks
  fastify.get(
    '/tasks/overdue',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get all overdue tasks',
        tags: ['tasks'],
        querystring: OverdueTasksQuerySchema,
        response: {
          200: TaskListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: typeof OverdueTasksQuerySchema._type }>,
      reply: FastifyReply
    ) => {
      const query = OverdueTasksQuerySchema.parse(request.query);
      const userId = request.user.id;
      const now = new Date();

      const where: any = {
        OR: [
          { assignedTo: userId },
          { createdBy: userId },
        ],
        dueDate: { lt: now },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      };

      if (query.assignedTo) where.assignedTo = query.assignedTo;
      if (query.priority) where.priority = query.priority;

      const [tasks, total] = await Promise.all([
        fastify.prisma.task.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        fastify.prisma.task.count({ where }),
      ]);

      const enhancedTasks = tasks.map((task) => ({
        ...task,
        isOverdue: true,
        daysUntilDue: Math.ceil(
          (task.dueDate!.getTime() - now.getTime()) / 86400000
        ),
      }));

      return {
        tasks: enhancedTasks,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }
  );

  // Get urgent tasks (due soon)
  fastify.get(
    '/tasks/urgent',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get urgent tasks due within specified hours',
        tags: ['tasks'],
        querystring: UrgentTasksQuerySchema,
        response: {
          200: TaskListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: typeof UrgentTasksQuerySchema._type }>,
      reply: FastifyReply
    ) => {
      const query = UrgentTasksQuerySchema.parse(request.query);
      const userId = request.user.id;
      const now = new Date();
      const urgentThreshold = new Date(
        now.getTime() + query.hoursUntilDue * 3600000
      );

      const where: any = {
        OR: [
          { assignedTo: userId },
          { createdBy: userId },
        ],
        dueDate: {
          gte: now,
          lte: urgentThreshold,
        },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      };

      if (query.assignedTo) where.assignedTo = query.assignedTo;

      const [tasks, total] = await Promise.all([
        fastify.prisma.task.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        fastify.prisma.task.count({ where }),
      ]);

      return {
        tasks,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }
  );

  // Get completed tasks
  fastify.get(
    '/tasks/completed',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get all completed tasks',
        tags: ['tasks'],
        querystring: TaskQuerySchema.pick({ page: true, limit: true, assignedTo: true }),
        response: {
          200: TaskListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: any }>,
      reply: FastifyReply
    ) => {
      const query = TaskQuerySchema.parse(request.query);
      const userId = request.user.id;

      const where: any = {
        OR: [
          { assignedTo: userId },
          { createdBy: userId },
        ],
        status: 'COMPLETED',
      };

      if (query.assignedTo) where.assignedTo = query.assignedTo;

      const [tasks, total] = await Promise.all([
        fastify.prisma.task.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        fastify.prisma.task.count({ where }),
      ]);

      return {
        tasks,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }
  );

  // Get tasks for a specific case
  fastify.get(
    '/cases/:id/tasks',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get all tasks for a specific case',
        tags: ['tasks'],
        params: { id: { type: 'string' } },
        querystring: TaskQuerySchema.pick({ page: true, limit: true, status: true }),
        response: {
          200: TaskListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: any;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const query = TaskQuerySchema.parse(request.query);

      // Check case access
      const caseAccess = await fastify.prisma.case.findFirst({
        where: {
          id,
          OR: [
            { userId: request.user.id },
            { assignedLawyers: { some: { id: request.user.id } } },
          ],
        },
      });

      if (!caseAccess) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const where: any = { caseId: id };
      if (query.status) where.status = query.status;

      const [tasks, total] = await Promise.all([
        fastify.prisma.task.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        fastify.prisma.task.count({ where }),
      ]);

      return {
        tasks,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }
  );

  // Create task
  fastify.post(
    '/tasks',
    {
      preHandler: [authenticate, rateLimiter({ max: 100, timeWindow: '1 minute' })],
      schema: {
        description: 'Create a new task',
        tags: ['tasks'],
        body: CreateTaskSchema,
        response: {
          201: TaskResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: typeof CreateTaskSchema._type }>,
      reply: FastifyReply
    ) => {
      const data = CreateTaskSchema.parse(request.body);
      const userId = request.user.id;

      // Verify case access if caseId provided
      if (data.caseId) {
        const caseAccess = await fastify.prisma.case.findFirst({
          where: {
            id: data.caseId,
            OR: [
              { userId },
              { assignedLawyers: { some: { id: userId } } },
            ],
          },
        });

        if (!caseAccess) {
          return reply.code(403).send({ error: 'No access to this case' });
        }
      }

      const task = await fastify.prisma.task.create({
        data: {
          ...data,
          createdBy: userId,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          checklist: data.checklist || [],
        },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          user: {
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
        },
      });

      return reply.code(201).send(task);
    }
  );

  // Update task
  fastify.put(
    '/tasks/:id',
    {
      preHandler: [authenticate, rateLimiter({ max: 100, timeWindow: '1 minute' })],
      schema: {
        description: 'Update a task',
        tags: ['tasks'],
        params: { id: { type: 'string' } },
        body: UpdateTaskSchema,
        response: {
          200: TaskResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: typeof UpdateTaskSchema._type;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const data = UpdateTaskSchema.parse(request.body);
      const userId = request.user.id;

      // Check access
      const existingTask = await fastify.prisma.task.findUnique({
        where: { id },
      });

      if (
        !existingTask ||
        (existingTask.assignedTo !== userId && existingTask.createdBy !== userId)
      ) {
        return reply.code(404).send({ error: 'Task not found' });
      }

      const updateData: any = { ...data };
      if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
      if (data.completedAt) updateData.completedAt = new Date(data.completedAt);

      const task = await fastify.prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return task;
    }
  );

  // Update task status only
  fastify.patch(
    '/tasks/:id/status',
    {
      preHandler: [authenticate, rateLimiter({ max: 200, timeWindow: '1 minute' })],
      schema: {
        description: 'Update task status',
        tags: ['tasks'],
        params: { id: { type: 'string' } },
        body: UpdateTaskStatusSchema,
        response: {
          200: TaskResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: typeof UpdateTaskStatusSchema._type;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const data = UpdateTaskStatusSchema.parse(request.body);
      const userId = request.user.id;

      const existingTask = await fastify.prisma.task.findUnique({
        where: { id },
      });

      if (!existingTask || existingTask.assignedTo !== userId) {
        return reply.code(404).send({ error: 'Task not found' });
      }

      const updateData: any = { status: data.status };
      if (data.status === 'COMPLETED') {
        updateData.completedAt = data.completedAt
          ? new Date(data.completedAt)
          : new Date();
        if (data.actualHours) {
          updateData.actualHours = data.actualHours;
        }
      }

      const task = await fastify.prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return task;
    }
  );

  // Delete task
  fastify.delete(
    '/tasks/:id',
    {
      preHandler: [authenticate, rateLimiter({ max: 50, timeWindow: '1 minute' })],
      schema: {
        description: 'Delete a task',
        tags: ['tasks'],
        params: { id: { type: 'string' } },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const userId = request.user.id;

      const task = await fastify.prisma.task.findUnique({
        where: { id },
      });

      if (!task || (task.assignedTo !== userId && task.createdBy !== userId)) {
        return reply.code(404).send({ error: 'Task not found' });
      }

      await fastify.prisma.task.delete({ where: { id } });

      return reply.code(204).send();
    }
  );
}
