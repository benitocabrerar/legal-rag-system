import { FastifyInstance } from 'fastify';
import { PrismaClient, NotificationChannel } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createTemplateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  channel: z.nativeEnum(NotificationChannel),
  subject: z.string().optional(),
  bodyTemplate: z.string().min(1),
  variables: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

const sendNotificationSchema = z.object({
  templateCode: z.string().optional(),
  channel: z.nativeEnum(NotificationChannel),
  userId: z.string().uuid().optional(),
  recipient: z.string().min(1), // email, phone, or user ID
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const listNotificationsQuerySchema = z.object({
  channel: z.nativeEnum(NotificationChannel).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'bounced']).optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export async function notificationsEnhancedRoutes(fastify: FastifyInstance) {
  // Create notification template (admin only)
  fastify.post('/notifications/templates', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = createTemplateSchema.parse(request.body);
      const user = request.user as any;

      // Check admin role
      if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const template = await prisma.notificationTemplate.create({
        data: body,
      });

      return reply.code(201).send(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get notification templates
  fastify.get('/notifications/templates', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user as any;

      // Check admin role
      if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const templates = await prisma.notificationTemplate.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return reply.send(templates);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update notification template
  fastify.patch('/notifications/templates/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = createTemplateSchema.partial().parse(request.body);
      const user = request.user as any;

      // Check admin role
      if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const template = await prisma.notificationTemplate.update({
        where: { id },
        data: body,
      });

      return reply.send(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Send notification
  fastify.post('/notifications/send', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = sendNotificationSchema.parse(request.body);
      const userId = (request.user as any).id;

      let finalBody = body.body;
      let finalSubject = body.subject;
      let templateId: string | undefined;

      // If template code is provided, fetch template and merge variables
      if (body.templateCode) {
        const template = await prisma.notificationTemplate.findUnique({
          where: {
            code: body.templateCode,
            isActive: true,
          },
        });

        if (!template) {
          return reply.code(404).send({ error: 'Template not found or inactive' });
        }

        templateId = template.id;

        // Replace variables in template
        finalBody = template.bodyTemplate;
        finalSubject = template.subject || body.subject;

        if (body.variables) {
          Object.entries(body.variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            finalBody = finalBody.replace(new RegExp(placeholder, 'g'), String(value));
            if (finalSubject) {
              finalSubject = finalSubject.replace(new RegExp(placeholder, 'g'), String(value));
            }
          });
        }
      }

      // Create notification log
      const log = await prisma.notificationLog.create({
        data: {
          templateId,
          userId: body.userId || userId,
          channel: body.channel,
          recipient: body.recipient,
          subject: finalSubject,
          body: finalBody,
          status: 'pending',
          metadata: body.metadata,
        },
      });

      // Here you would integrate with actual notification services
      // For now, we'll simulate sending
      try {
        await sendNotificationViaChannel(body.channel, {
          recipient: body.recipient,
          subject: finalSubject,
          body: finalBody,
        });

        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });

        return reply.code(201).send({
          ...log,
          status: 'sent',
          sentAt: new Date(),
        });
      } catch (sendError) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            errorMessage: sendError instanceof Error ? sendError.message : 'Unknown error',
          },
        });

        throw sendError;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get notification logs
  fastify.get('/notifications/logs', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const query = listNotificationsQuerySchema.parse(request.query);
      const user = request.user as any;

      const where: any = {};

      // Non-admin users can only see their own notifications
      if (user.role !== 'admin') {
        where.userId = user.id;
      } else if (query.userId) {
        where.userId = query.userId;
      }

      if (query.channel) {
        where.channel = query.channel;
      }

      if (query.status) {
        where.status = query.status;
      }

      if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) {
          where.createdAt.gte = new Date(query.dateFrom);
        }
        if (query.dateTo) {
          where.createdAt.lte = new Date(query.dateTo);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where,
          include: {
            template: {
              select: {
                id: true,
                name: true,
                code: true,
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
          orderBy: {
            createdAt: 'desc',
          },
          skip: query.offset,
          take: query.limit,
        }),
        prisma.notificationLog.count({ where }),
      ]);

      return reply.send({
        logs,
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

  // Get notification statistics
  fastify.get('/notifications/stats', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user as any;

      const where: any = user.role === 'admin' ? {} : { userId: user.id };

      const [
        total,
        sent,
        failed,
        pending,
        byChannel,
      ] = await Promise.all([
        prisma.notificationLog.count({ where }),
        prisma.notificationLog.count({ where: { ...where, status: 'sent' } }),
        prisma.notificationLog.count({ where: { ...where, status: 'failed' } }),
        prisma.notificationLog.count({ where: { ...where, status: 'pending' } }),
        prisma.notificationLog.groupBy({
          by: ['channel'],
          where,
          _count: true,
        }),
      ]);

      return reply.send({
        total,
        sent,
        failed,
        pending,
        successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
        byChannel: byChannel.reduce((acc, curr) => {
          acc[curr.channel] = curr._count;
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Mark notification as read
  fastify.patch('/notifications/logs/:id/read', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const log = await prisma.notificationLog.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!log) {
        return reply.code(404).send({ error: 'Notification not found' });
      }

      const updated = await prisma.notificationLog.update({
        where: { id },
        data: {
          readAt: new Date(),
        },
      });

      return reply.send(updated);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

// Helper function to send notifications via different channels
async function sendNotificationViaChannel(
  channel: NotificationChannel,
  data: { recipient: string; subject?: string; body: string }
): Promise<void> {
  // This is a placeholder - integrate with actual services
  switch (channel) {
    case NotificationChannel.EMAIL:
      // Integrate with SendGrid/Nodemailer
      console.log('Sending email to:', data.recipient);
      console.log('Subject:', data.subject);
      console.log('Body:', data.body);
      // TODO: Implement actual email sending
      break;

    case NotificationChannel.SMS:
      // Integrate with Twilio
      console.log('Sending SMS to:', data.recipient);
      console.log('Message:', data.body);
      // TODO: Implement actual SMS sending
      break;

    case NotificationChannel.IN_APP:
      // Create in-app notification (using existing Notification model)
      console.log('Creating in-app notification for:', data.recipient);
      // This is handled by the existing notification system
      break;

    case NotificationChannel.PUSH:
      // Integrate with Firebase/OneSignal
      console.log('Sending push notification to:', data.recipient);
      console.log('Message:', data.body);
      // TODO: Implement actual push notification
      break;

    default:
      throw new Error(`Unsupported notification channel: ${channel}`);
  }

  // Simulate async sending delay
  await new Promise(resolve => setTimeout(resolve, 100));
}
