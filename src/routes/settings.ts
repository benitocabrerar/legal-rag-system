import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UpdateSettingsBody {
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  theme?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
  weeklyDigest?: boolean;
  caseUpdates?: boolean;
  documentAlerts?: boolean;
  billingAlerts?: boolean;
  profileVisibility?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  allowDataExport?: boolean;
  slackWebhook?: string;
  teamsWebhook?: string;
  zapierApiKey?: string;
}

interface DeleteAccountBody {
  confirmEmail: string;
}

export async function settingsRoutes(app: FastifyInstance) {
  // GET /api/v1/user/settings - Get user settings
  app.get('/', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      });

      // Create default settings if they don't exist
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: { userId }
        });
      }

      return { settings };
    } catch (error) {
      console.error('Get settings error:', error);
      reply.code(500);
      return { error: 'Failed to fetch settings' };
    }
  });

  // PATCH /api/v1/user/settings - Update user settings
  app.patch<{ Body: UpdateSettingsBody }>('/', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const updateData = request.body as UpdateSettingsBody;

      // Validate allowed fields
      const allowedFields: (keyof UpdateSettingsBody)[] = [
        'language',
        'timezone',
        'dateFormat',
        'timeFormat',
        'theme',
        'emailNotifications',
        'pushNotifications',
        'smsNotifications',
        'marketingEmails',
        'weeklyDigest',
        'caseUpdates',
        'documentAlerts',
        'billingAlerts',
        'profileVisibility',
        'showEmail',
        'showPhone',
        'allowDataExport',
        'slackWebhook',
        'teamsWebhook',
        'zapierApiKey'
      ];

      const filteredData: any = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      const settings = await prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...filteredData
        },
        update: filteredData
      });

      return {
        settings,
        message: 'Settings updated successfully'
      };
    } catch (error) {
      console.error('Update settings error:', error);
      reply.code(500);
      return { error: 'Failed to update settings' };
    }
  });

  // POST /api/v1/user/settings/export-data - Request data export
  app.post('/export-data', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      // Get all user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          cases: {
            include: {
              documents: true
            }
          },
          quota: true,
          subscriptions: {
            include: {
              plan: true
            }
          },
          payments: true,
          notifications: true,
          settings: true
        }
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      // Remove sensitive data
      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          planTier: user.planTier
        },
        cases: user.cases,
        quota: user.quota,
        subscriptions: user.subscriptions,
        payments: user.payments.map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.createdAt
        })),
        settings: user.settings
      };

      return {
        data: exportData,
        exportedAt: new Date(),
        message: 'Data exported successfully'
      };
    } catch (error) {
      console.error('Export data error:', error);
      reply.code(500);
      return { error: 'Failed to export data' };
    }
  });

  // DELETE /api/v1/user/settings/account - Delete account (soft delete)
  app.delete<{ Body: DeleteAccountBody }>('/account', {
    onRequest: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { confirmEmail } = request.body as DeleteAccountBody;

      // Verify email confirmation
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      if (user.email !== confirmEmail) {
        reply.code(400);
        return { error: 'Email confirmation does not match' };
      }

      // Soft delete: deactivate account
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${user.id}@deleted.com` // Prevent email reuse
        }
      });

      // Cancel active subscriptions
      await prisma.subscription.updateMany({
        where: {
          userId,
          status: 'active'
        },
        data: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });

      return {
        message: 'Account deleted successfully'
      };
    } catch (error) {
      console.error('Delete account error:', error);
      reply.code(500);
      return { error: 'Failed to delete account' };
    }
  });
}
