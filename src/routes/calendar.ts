import { FastifyInstance } from 'fastify';
import { PrismaClient, EventType, EventStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus).optional(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().default(false),
  timezone: z.string().default('America/Guayaquil'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  recurrenceEnd: z.string().datetime().optional(),
  caseId: z.string().uuid().optional(),
  color: z.string().optional(),
  isPrivate: z.boolean().default(false),
  notes: z.string().optional(),
  participants: z.array(z.object({
    userId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
    role: z.string().default('attendee'),
  })).optional(),
  reminders: z.array(z.object({
    type: z.enum(['EMAIL', 'SMS', 'IN_APP', 'PUSH']),
    minutesBefore: z.number().min(0),
  })).optional(),
});

const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().uuid(),
});

const listEventsQuerySchema = z.object({
  caseId: z.string().uuid().optional(),
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includePrivate: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export async function calendarRoutes(fastify: FastifyInstance) {
  // Create event
  fastify.post('/events', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createEventSchema.parse(request.body);
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

      // Validate dates
      const start = new Date(body.startTime);
      const end = new Date(body.endTime);
      if (end <= start) {
        return reply.code(400).send({ error: 'End time must be after start time' });
      }

      // Create event with participants and reminders
      const event = await prisma.event.create({
        data: {
          title: body.title,
          description: body.description,
          type: body.type,
          status: body.status || EventStatus.SCHEDULED,
          location: body.location,
          meetingLink: body.meetingLink || null,
          startTime: start,
          endTime: end,
          allDay: body.allDay,
          timezone: body.timezone,
          isRecurring: body.isRecurring,
          recurrenceRule: body.recurrenceRule,
          recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null,
          caseId: body.caseId,
          createdBy: userId,
          color: body.color,
          isPrivate: body.isPrivate,
          notes: body.notes,
          participants: body.participants ? {
            create: body.participants.map(p => ({
              userId: p.userId,
              email: p.email,
              name: p.name,
              role: p.role,
            })),
          } : undefined,
          reminders: body.reminders ? {
            create: body.reminders.map(r => ({
              type: r.type,
              minutesBefore: r.minutesBefore,
              recipientUserId: userId,
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
          participants: {
            select: {
              id: true,
              userId: true,
              email: true,
              name: true,
              role: true,
              status: true,
              responseTime: true,
            },
          },
          reminders: true,
        },
      });

      return reply.code(201).send(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get events (with filters)
  fastify.get('/events', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const query = listEventsQuerySchema.parse(request.query);
      const userId = (request.user as any).id;

      const where: any = {
        OR: [
          { createdBy: userId },
          {
            participants: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      };

      if (!query.includePrivate) {
        where.isPrivate = false;
      }

      if (query.caseId) {
        where.caseId = query.caseId;
      }

      if (query.type) {
        where.type = query.type;
      }

      if (query.status) {
        where.status = query.status;
      }

      if (query.startDate || query.endDate) {
        where.startTime = {};
        if (query.startDate) {
          where.startTime.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.startTime.lte = new Date(query.endDate);
        }
      }

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                title: true,
                clientName: true,
              },
            },
            participants: {
              select: {
                id: true,
                userId: true,
                email: true,
                name: true,
                role: true,
                status: true,
                responseTime: true,
              },
            },
            reminders: {
              select: {
                id: true,
                type: true,
                minutesBefore: true,
                status: true,
                sentAt: true,
              },
            },
          },
          orderBy: {
            startTime: 'asc',
          },
          skip: query.offset,
          take: query.limit,
        }),
        prisma.event.count({ where }),
      ]);

      return reply.send({
        events,
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

  // Get single event
  fastify.get('/events/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const event = await prisma.event.findFirst({
        where: {
          id,
          OR: [
            { createdBy: userId },
            {
              participants: {
                some: {
                  userId: userId,
                },
              },
            },
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
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          reminders: true,
        },
      });

      if (!event) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      return reply.send(event);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update event
  fastify.patch('/events/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateEventSchema.parse({ ...request.body, id });
      const userId = (request.user as any).id;

      // Verify ownership
      const existingEvent = await prisma.event.findFirst({
        where: {
          id,
          createdBy: userId,
        },
      });

      if (!existingEvent) {
        return reply.code(404).send({ error: 'Event not found or unauthorized' });
      }

      // Validate dates if provided
      const startTime = body.startTime ? new Date(body.startTime) : existingEvent.startTime;
      const endTime = body.endTime ? new Date(body.endTime) : existingEvent.endTime;
      if (endTime <= startTime) {
        return reply.code(400).send({ error: 'End time must be after start time' });
      }

      const updateData: any = {
        ...body,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : undefined,
      };

      delete updateData.id;
      delete updateData.participants;
      delete updateData.reminders;

      const event = await prisma.event.update({
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
          participants: {
            select: {
              id: true,
              userId: true,
              email: true,
              name: true,
              role: true,
              status: true,
              responseTime: true,
            },
          },
          reminders: true,
        },
      });

      return reply.send(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete event
  fastify.delete('/events/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const event = await prisma.event.findFirst({
        where: {
          id,
          createdBy: userId,
        },
      });

      if (!event) {
        return reply.code(404).send({ error: 'Event not found or unauthorized' });
      }

      await prisma.event.delete({
        where: { id },
      });

      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update event status
  fastify.patch('/events/:id/status', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = z.object({
        status: z.nativeEnum(EventStatus),
      }).parse(request.body);
      const userId = (request.user as any).id;

      const event = await prisma.event.findFirst({
        where: {
          id,
          createdBy: userId,
        },
      });

      if (!event) {
        return reply.code(404).send({ error: 'Event not found or unauthorized' });
      }

      const updated = await prisma.event.update({
        where: { id },
        data: { status },
      });

      return reply.send(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add participant to event
  fastify.post('/events/:id/participants', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = z.object({
        userId: z.string().uuid().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        role: z.string().default('attendee'),
      }).parse(request.body);
      const userId = (request.user as any).id;

      const event = await prisma.event.findFirst({
        where: {
          id,
          createdBy: userId,
        },
      });

      if (!event) {
        return reply.code(404).send({ error: 'Event not found or unauthorized' });
      }

      const participant = await prisma.eventParticipant.create({
        data: {
          eventId: id,
          userId: body.userId,
          email: body.email,
          name: body.name,
          role: body.role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return reply.code(201).send(participant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update participant response
  fastify.patch('/events/:eventId/participants/:participantId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { eventId, participantId } = request.params as { eventId: string; participantId: string };
      const { status } = z.object({
        status: z.enum(['accepted', 'declined', 'tentative']),
      }).parse(request.body);
      const userId = (request.user as any).id;

      const participant = await prisma.eventParticipant.findFirst({
        where: {
          id: participantId,
          eventId,
          userId,
        },
      });

      if (!participant) {
        return reply.code(404).send({ error: 'Participant not found or unauthorized' });
      }

      const updated = await prisma.eventParticipant.update({
        where: { id: participantId },
        data: {
          status,
          responseTime: new Date(),
        },
      });

      return reply.send(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
