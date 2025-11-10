import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateEventSchema,
  UpdateEventSchema,
  EventQuerySchema,
  CalendarViewSchema,
  UpcomingEventsSchema,
  EventListResponse,
  CalendarResponse,
  EventResponse,
} from '../schemas/calendar.schemas';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limit';

export async function calendarRoutes(fastify: FastifyInstance) {
  // List all events (global view)
  fastify.get(
    '/events',
    {
      preHandler: [authenticate],
      schema: {
        description: 'List all events with filtering and pagination',
        tags: ['calendar'],
        querystring: EventQuerySchema,
        response: {
          200: EventListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: typeof EventQuerySchema._type }>,
      reply: FastifyReply
    ) => {
      const query = EventQuerySchema.parse(request.query);
      const userId = request.user.id;

      const where: any = {
        userId, // Users can only see their own events
      };

      if (query.caseId) where.caseId = query.caseId;
      if (query.status) where.status = query.status;
      if (query.priority) where.priority = query.priority;
      if (query.startDate || query.endDate) {
        where.startDate = {};
        if (query.startDate) where.startDate.gte = new Date(query.startDate);
        if (query.endDate) where.startDate.lte = new Date(query.endDate);
      }

      const [events, total] = await Promise.all([
        fastify.prisma.event.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
              },
            },
            reminders: true,
          },
          orderBy: { [query.sortBy]: query.sortOrder },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        fastify.prisma.event.count({ where }),
      ]);

      return {
        events,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }
  );

  // Get calendar view for a specific month
  fastify.get(
    '/events/calendar/:month',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get calendar view with events grouped by month',
        tags: ['calendar'],
        params: CalendarViewSchema,
        response: {
          200: CalendarResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: typeof CalendarViewSchema._type }>,
      reply: FastifyReply
    ) => {
      const { month } = CalendarViewSchema.parse(request.params);
      const userId = request.user.id;

      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);

      const where: any = {
        userId,
        startDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      const events = await fastify.prisma.event.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          reminders: true,
        },
        orderBy: { startDate: 'asc' },
      });

      // Calculate summary statistics
      const summary = {
        totalEvents: events.length,
        byStatus: events.reduce((acc, event) => {
          acc[event.status] = (acc[event.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byPriority: events.reduce((acc, event) => {
          acc[event.priority] = (acc[event.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return {
        month,
        events,
        summary,
      };
    }
  );

  // Get events for a specific case
  fastify.get(
    '/cases/:id/events',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get all events for a specific case',
        tags: ['calendar'],
        params: { id: { type: 'string' } },
        querystring: EventQuerySchema.pick({ page: true, limit: true, sortBy: true, sortOrder: true }),
        response: {
          200: EventListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const query = EventQuerySchema.parse(request.query);

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

      const [events, total] = await Promise.all([
        fastify.prisma.event.findMany({
          where: { caseId: id },
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
              },
            },
            reminders: true,
          },
          orderBy: { [query.sortBy]: query.sortOrder },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        fastify.prisma.event.count({ where: { caseId: id } }),
      ]);

      return {
        events,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }
  );

  // Create new event
  fastify.post(
    '/events',
    {
      preHandler: [authenticate, rateLimiter({ max: 100, timeWindow: '1 minute' })],
      schema: {
        description: 'Create a new event',
        tags: ['calendar'],
        body: CreateEventSchema,
        response: {
          201: EventResponse,
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: typeof CreateEventSchema._type }>,
      reply: FastifyReply
    ) => {
      const data = CreateEventSchema.parse(request.body);
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

      const event = await fastify.prisma.event.create({
        data: {
          ...data,
          userId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          recurrence: data.recurrence || null,
          reminders: {
            create: data.reminders.map((minutesBefore) => ({
              minutesBefore,
            })),
          },
        },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          reminders: true,
        },
      });

      return reply.code(201).send(event);
    }
  );

  // Update event
  fastify.put(
    '/events/:id',
    {
      preHandler: [authenticate, rateLimiter({ max: 100, timeWindow: '1 minute' })],
      schema: {
        description: 'Update an existing event',
        tags: ['calendar'],
        params: { id: { type: 'string' } },
        body: UpdateEventSchema,
        response: {
          200: EventResponse,
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: typeof UpdateEventSchema._type;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const data = UpdateEventSchema.parse(request.body);
      const userId = request.user.id;

      // Check ownership
      const existingEvent = await fastify.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent || existingEvent.userId !== userId) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      const updateData: any = { ...data };
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);

      const event = await fastify.prisma.event.update({
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
          reminders: true,
        },
      });

      return event;
    }
  );

  // Delete event
  fastify.delete(
    '/events/:id',
    {
      preHandler: [authenticate, rateLimiter({ max: 50, timeWindow: '1 minute' })],
      schema: {
        description: 'Delete an event',
        tags: ['calendar'],
        params: { id: { type: 'string' } },
        response: {
          204: { type: 'null' },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const userId = request.user.id;

      const event = await fastify.prisma.event.findUnique({
        where: { id },
      });

      if (!event || event.userId !== userId) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      await fastify.prisma.event.delete({ where: { id } });

      return reply.code(204).send();
    }
  );

  // Get upcoming events
  fastify.get(
    '/events/upcoming',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get upcoming events within specified days',
        tags: ['calendar'],
        querystring: UpcomingEventsSchema,
        response: {
          200: EventListResponse,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: typeof UpcomingEventsSchema._type }>,
      reply: FastifyReply
    ) => {
      const query = UpcomingEventsSchema.parse(request.query);
      const userId = request.user.id;

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + query.days);

      const events = await fastify.prisma.event.findMany({
        where: {
          userId,
          startDate: {
            gte: now,
            lte: futureDate,
          },
          status: {
            notIn: ['COMPLETED', 'CANCELLED'],
          },
        },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          reminders: true,
        },
        orderBy: { startDate: 'asc' },
        take: query.limit,
      });

      return {
        events,
        pagination: {
          page: 1,
          limit: query.limit,
          total: events.length,
          totalPages: 1,
        },
      };
    }
  );

  // Get pending reminders
  fastify.get(
    '/events/reminders',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get all pending event reminders',
        tags: ['calendar'],
        response: {
          200: {
            type: 'object',
            properties: {
              reminders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    event: EventResponse,
                    minutesBefore: { type: 'number' },
                    triggerTime: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const now = new Date();

      const events = await fastify.prisma.event.findMany({
        where: {
          userId,
          startDate: { gte: now },
          status: {
            notIn: ['COMPLETED', 'CANCELLED'],
          },
        },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          reminders: {
            where: { sent: false },
          },
        },
      });

      const reminders = events.flatMap((event) =>
        event.reminders.map((reminder) => ({
          id: reminder.id,
          event,
          minutesBefore: reminder.minutesBefore,
          triggerTime: new Date(
            event.startDate.getTime() - reminder.minutesBefore * 60000
          ).toISOString(),
        }))
      );

      // Sort by trigger time
      reminders.sort(
        (a, b) =>
          new Date(a.triggerTime).getTime() - new Date(b.triggerTime).getTime()
      );

      return { reminders };
    }
  );
}
