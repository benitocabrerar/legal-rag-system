/**
 * GDPR Compliance Routes
 * Implements EU General Data Protection Regulation (GDPR) requirements
 *
 * Routes implemented:
 * - DELETE /gdpr/me - Right to be forgotten (Art. 17)
 * - GET /gdpr/export - Data portability (Art. 20)
 * - GET /gdpr/consent - Get consent status
 * - PUT /gdpr/consent - Update consent preferences
 * - POST /gdpr/breach-notification - Admin endpoint for breach notifications
 *
 * @module routes/gdpr
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import * as crypto from 'crypto';

/**
 * Consent preferences structure
 */
interface ConsentPreferences {
  /** Consent to process data for core service functionality */
  coreServices: boolean;
  /** Consent to receive marketing communications */
  marketing: boolean;
  /** Consent for analytics and service improvement */
  analytics: boolean;
  /** Consent to share data with third parties */
  thirdPartySharing: boolean;
  /** Consent for profiling and personalization */
  profiling: boolean;
}

/**
 * Consent update request body
 */
interface ConsentUpdateBody {
  preferences: Partial<ConsentPreferences>;
}

/**
 * Breach notification request body
 */
interface BreachNotificationBody {
  /** Description of the breach */
  description: string;
  /** Date and time of the breach */
  breachDate: string;
  /** Categories of data affected */
  dataCategories: string[];
  /** Approximate number of affected users */
  affectedUsersCount: number;
  /** Measures taken to address the breach */
  measuresTaken: string;
  /** Whether to notify affected users */
  notifyUsers: boolean;
  /** IDs of specific users to notify (optional) */
  userIds?: string[];
}

/**
 * Data export structure
 */
interface DataExport {
  exportId: string;
  exportDate: string;
  dataSubject: {
    id: string;
    email: string;
    name: string | null;
  };
  personalData: Record<string, unknown>;
  processingActivities: Array<{
    activity: string;
    purpose: string;
    legalBasis: string;
  }>;
  dataRetentionPeriod: string;
  dataRecipients: string[];
  rights: string[];
}

/**
 * Default consent preferences for new users
 */
const DEFAULT_CONSENT: ConsentPreferences = {
  coreServices: true, // Required for service operation
  marketing: false,
  analytics: false,
  thirdPartySharing: false,
  profiling: false
};

/**
 * Generates a unique export ID
 */
function generateExportId(): string {
  return `EXPORT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Generates a unique deletion confirmation ID
 */
function generateDeletionId(): string {
  return `DEL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * GDPR Compliance Routes Plugin
 */
export async function gdprRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /gdpr/consent
   * Retrieves current consent preferences for the authenticated user
   *
   * @security Bearer token required
   * @returns Current consent preferences
   */
  fastify.get('/consent', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get current consent preferences',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                preferences: {
                  type: 'object',
                  properties: {
                    coreServices: { type: 'boolean' },
                    marketing: { type: 'boolean' },
                    analytics: { type: 'boolean' },
                    thirdPartySharing: { type: 'boolean' },
                    profiling: { type: 'boolean' }
                  }
                },
                lastUpdated: { type: 'string' },
                version: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user.id;

      // Get user settings which contains consent preferences
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        select: {
          id: true,
          updatedAt: true,
          // Consent fields stored in settings
          emailNotifications: true,
          marketingEmails: true
        }
      });

      // Build consent preferences from settings
      const preferences: ConsentPreferences = {
        coreServices: true, // Always true as it's required for service
        marketing: userSettings?.marketingEmails ?? DEFAULT_CONSENT.marketing,
        analytics: userSettings?.emailNotifications ?? DEFAULT_CONSENT.analytics,
        thirdPartySharing: DEFAULT_CONSENT.thirdPartySharing,
        profiling: DEFAULT_CONSENT.profiling
      };

      return reply.send({
        success: true,
        data: {
          preferences,
          lastUpdated: userSettings?.updatedAt?.toISOString() || new Date().toISOString(),
          version: '1.0'
        }
      });
    } catch (error) {
      request.log.error(error, 'Error retrieving consent preferences');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to retrieve consent preferences',
          code: 'CONSENT_RETRIEVAL_ERROR'
        }
      });
    }
  });

  /**
   * PUT /gdpr/consent
   * Updates consent preferences for the authenticated user
   *
   * @security Bearer token required
   * @body ConsentUpdateBody - New consent preferences
   * @returns Updated consent status
   */
  fastify.put<{ Body: ConsentUpdateBody }>('/consent', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Update consent preferences',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['preferences'],
        properties: {
          preferences: {
            type: 'object',
            properties: {
              marketing: { type: 'boolean' },
              analytics: { type: 'boolean' },
              thirdPartySharing: { type: 'boolean' },
              profiling: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                preferences: { type: 'object' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: ConsentUpdateBody }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const { preferences } = request.body;

      // Core services consent cannot be revoked (required for service operation)
      if (preferences.coreServices === false) {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Core services consent is required for service operation. To revoke, please use the right to erasure endpoint.',
            code: 'CORE_CONSENT_REQUIRED'
          }
        });
      }

      // Update user settings with new consent preferences
      const updatedSettings = await prisma.userSettings.upsert({
        where: { userId },
        update: {
          marketingEmails: preferences.marketing,
          emailNotifications: preferences.analytics,
          updatedAt: new Date()
        },
        create: {
          userId,
          marketingEmails: preferences.marketing ?? DEFAULT_CONSENT.marketing,
          emailNotifications: preferences.analytics ?? DEFAULT_CONSENT.analytics
        }
      });

      // Log consent change for audit
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'CONSENT_UPDATE',
          resource: 'gdpr_consent',
          resourceId: userId,
          details: JSON.stringify({
            previousConsent: 'consent_updated',
            newConsent: preferences,
            timestamp: new Date().toISOString(),
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
          })
        }
      });

      const updatedPreferences: ConsentPreferences = {
        coreServices: true,
        marketing: updatedSettings.marketingEmails ?? false,
        analytics: updatedSettings.emailNotifications ?? false,
        thirdPartySharing: preferences.thirdPartySharing ?? DEFAULT_CONSENT.thirdPartySharing,
        profiling: preferences.profiling ?? DEFAULT_CONSENT.profiling
      };

      return reply.send({
        success: true,
        data: {
          message: 'Consent preferences updated successfully',
          preferences: updatedPreferences,
          updatedAt: updatedSettings.updatedAt.toISOString()
        }
      });
    } catch (error) {
      request.log.error(error, 'Error updating consent preferences');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to update consent preferences',
          code: 'CONSENT_UPDATE_ERROR'
        }
      });
    }
  });

  /**
   * GET /gdpr/export
   * Exports all personal data for the authenticated user (Article 20 - Data Portability)
   *
   * @security Bearer token required
   * @returns Complete data export in machine-readable format
   */
  fastify.get('/export', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Export all personal data (GDPR Art. 20 - Data Portability)',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                exportId: { type: 'string' },
                exportDate: { type: 'string' },
                format: { type: 'string' },
                downloadUrl: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const exportId = generateExportId();

      // Fetch all user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          settings: true,
          cases: {
            include: {
              documents: true
            }
          },
          documents: true,
          legalDocuments: true,
          notifications: true,
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 100
          },
          queryLogs: {
            orderBy: { timestamp: 'desc' },
            take: 100
          },
          payments: true,
          subscriptions: true
        }
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Build comprehensive data export
      const dataExport: DataExport = {
        exportId,
        exportDate: new Date().toISOString(),
        dataSubject: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        personalData: {
          profile: {
            email: user.email,
            name: user.name,
            phoneNumber: user.phoneNumber,
            address: user.address,
            city: user.city,
            country: user.country,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          },
          professionalDetails: {
            barNumber: user.barNumber,
            lawFirm: user.lawFirm,
            specialization: user.specialization,
            licenseState: user.licenseState,
            bio: user.bio
          },
          preferences: {
            language: user.language,
            timezone: user.timezone,
            theme: user.theme,
            emailNotifications: user.emailNotifications,
            marketingEmails: user.marketingEmails
          },
          subscription: {
            planTier: user.planTier,
            subscriptions: user.subscriptions.map(s => ({
              id: s.id,
              planId: s.planId,
              status: s.status,
              startDate: s.startDate,
              endDate: s.endDate
            }))
          },
          cases: user.cases.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            clientName: c.clientName,
            caseNumber: c.caseNumber,
            status: c.status,
            createdAt: c.createdAt,
            documentsCount: c.documents.length
          })),
          documents: user.documents.map(d => ({
            id: d.id,
            title: d.title,
            createdAt: d.createdAt
          })),
          legalDocuments: user.legalDocuments.map(ld => ({
            id: ld.id,
            title: ld.title,
            createdAt: ld.createdAt
          })),
          queryHistory: user.queryLogs.map(q => ({
            id: q.id,
            query: q.query,
            timestamp: q.timestamp
          })),
          notifications: user.notifications.map(n => ({
            id: n.id,
            title: n.title,
            type: n.type,
            createdAt: n.createdAt
          })),
          payments: user.payments.map(p => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
            createdAt: p.createdAt
          }))
        },
        processingActivities: [
          {
            activity: 'Account Management',
            purpose: 'Provide and manage user account',
            legalBasis: 'Contract performance (Art. 6(1)(b))'
          },
          {
            activity: 'Legal Document Processing',
            purpose: 'Process and analyze legal documents',
            legalBasis: 'Contract performance (Art. 6(1)(b))'
          },
          {
            activity: 'Query Processing',
            purpose: 'Respond to legal queries using AI',
            legalBasis: 'Contract performance (Art. 6(1)(b))'
          },
          {
            activity: 'Communications',
            purpose: 'Send service-related notifications',
            legalBasis: 'Legitimate interest (Art. 6(1)(f))'
          },
          {
            activity: 'Marketing',
            purpose: 'Send marketing communications',
            legalBasis: 'Consent (Art. 6(1)(a))'
          }
        ],
        dataRetentionPeriod: '3 years after account deletion for legal compliance',
        dataRecipients: [
          'Cloud Infrastructure Provider (AWS/GCP)',
          'Payment Processor (Stripe)',
          'Email Service Provider (SendGrid)'
        ],
        rights: [
          'Right to access (Art. 15)',
          'Right to rectification (Art. 16)',
          'Right to erasure (Art. 17)',
          'Right to restriction (Art. 18)',
          'Right to data portability (Art. 20)',
          'Right to object (Art. 21)',
          'Right to withdraw consent (Art. 7)'
        ]
      };

      // Log data export for audit
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'DATA_EXPORT',
          resource: 'gdpr_export',
          resourceId: exportId,
          details: JSON.stringify({
            exportId,
            timestamp: new Date().toISOString(),
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
          })
        }
      });

      // Set content type for JSON download
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="gdpr-export-${exportId}.json"`);

      return reply.send({
        success: true,
        data: dataExport
      });
    } catch (error) {
      request.log.error(error, 'Error exporting user data');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to export user data',
          code: 'DATA_EXPORT_ERROR'
        }
      });
    }
  });

  /**
   * DELETE /gdpr/me
   * Deletes all personal data for the authenticated user (Article 17 - Right to Erasure)
   *
   * @security Bearer token required
   * @query confirm - Must be 'DELETE_MY_DATA' to confirm deletion
   * @returns Deletion confirmation
   */
  fastify.delete<{ Querystring: { confirm?: string } }>('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Delete all personal data (GDPR Art. 17 - Right to Erasure)',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          confirm: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                deletionId: { type: 'string' },
                deletedAt: { type: 'string' },
                retentionNotice: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { confirm?: string } }>, reply: FastifyReply) => {
    try {
      const userId = request.user.id;
      const { confirm } = request.query;

      // Require explicit confirmation
      if (confirm !== 'DELETE_MY_DATA') {
        return reply.status(400).send({
          success: false,
          error: {
            message: 'Deletion requires explicit confirmation. Add ?confirm=DELETE_MY_DATA to the request.',
            code: 'CONFIRMATION_REQUIRED'
          }
        });
      }

      const deletionId = generateDeletionId();

      // Start transaction for data deletion
      await prisma.$transaction(async (tx) => {
        // Delete user's query logs
        await tx.queryLog.deleteMany({ where: { userId } });

        // Delete user's notifications
        await tx.notification.deleteMany({ where: { userId } });

        // Delete user's documents and chunks
        const documents = await tx.document.findMany({ where: { userId } });
        for (const doc of documents) {
          await tx.documentChunk.deleteMany({ where: { documentId: doc.id } });
        }
        await tx.document.deleteMany({ where: { userId } });

        // Delete user's legal documents and embeddings
        const legalDocs = await tx.legalDocument.findMany({ where: { userId } });
        for (const doc of legalDocs) {
          await tx.legalDocumentEmbedding.deleteMany({ where: { documentId: doc.id } });
        }
        await tx.legalDocument.deleteMany({ where: { userId } });

        // Delete user's cases
        await tx.case.deleteMany({ where: { userId } });

        // Delete user's settings
        await tx.userSettings.deleteMany({ where: { userId } });

        // Delete user's API keys
        await tx.apiKey.deleteMany({ where: { userId } });

        // Delete user's payments and subscriptions
        await tx.payment.deleteMany({ where: { userId } });
        await tx.subscription.deleteMany({ where: { userId } });

        // Delete user's storage usage records
        await tx.storageUsage.deleteMany({ where: { userId } });

        // Delete user's usage history
        await tx.usageHistory.deleteMany({ where: { userId } });

        // Anonymize audit logs (keep for compliance but remove PII)
        await tx.auditLog.updateMany({
          where: { userId },
          data: {
            userId: 'DELETED_USER',
            details: JSON.stringify({ anonymized: true, deletionId, deletedAt: new Date().toISOString() })
          }
        });

        // Create final audit entry before user deletion
        await tx.auditLog.create({
          data: {
            userId: 'SYSTEM',
            action: 'USER_ERASURE',
            resource: 'gdpr_erasure',
            resourceId: deletionId,
            details: JSON.stringify({
              deletionId,
              originalUserId: userId,
              timestamp: new Date().toISOString(),
              ipAddress: request.ip,
              reason: 'GDPR Article 17 - Right to Erasure'
            })
          }
        });

        // Finally, delete the user
        await tx.user.delete({ where: { id: userId } });
      });

      return reply.send({
        success: true,
        data: {
          message: 'Your personal data has been deleted successfully.',
          deletionId,
          deletedAt: new Date().toISOString(),
          retentionNotice: 'Some anonymized data may be retained for legal compliance purposes for up to 3 years.'
        }
      });
    } catch (error) {
      request.log.error(error, 'Error deleting user data');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to delete user data. Please contact support.',
          code: 'DATA_DELETION_ERROR'
        }
      });
    }
  });

  /**
   * POST /gdpr/breach-notification
   * Admin endpoint to notify users of a data breach (Article 34)
   *
   * @security Bearer token required (Admin only)
   * @body BreachNotificationBody - Breach details
   * @returns Notification status
   */
  fastify.post<{ Body: BreachNotificationBody }>('/breach-notification', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Notify users of a data breach (Admin only, GDPR Art. 34)',
      tags: ['GDPR', 'Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['description', 'breachDate', 'dataCategories', 'affectedUsersCount', 'measuresTaken', 'notifyUsers'],
        properties: {
          description: { type: 'string' },
          breachDate: { type: 'string' },
          dataCategories: { type: 'array', items: { type: 'string' } },
          affectedUsersCount: { type: 'number' },
          measuresTaken: { type: 'string' },
          notifyUsers: { type: 'boolean' },
          userIds: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                breachId: { type: 'string' },
                notificationsSent: { type: 'number' },
                notifiedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: BreachNotificationBody }>, reply: FastifyReply) => {
    try {
      // Check if user is admin
      if (request.user.role !== 'admin' && request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: {
            message: 'Admin access required for breach notifications',
            code: 'ADMIN_REQUIRED'
          }
        });
      }

      const {
        description,
        breachDate,
        dataCategories,
        affectedUsersCount,
        measuresTaken,
        notifyUsers,
        userIds
      } = request.body;

      const breachId = `BREACH-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Log breach notification
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'BREACH_NOTIFICATION',
          resource: 'gdpr_breach',
          resourceId: breachId,
          details: JSON.stringify({
            breachId,
            description,
            breachDate,
            dataCategories,
            affectedUsersCount,
            measuresTaken,
            notifyUsers,
            createdBy: request.user.id,
            timestamp: new Date().toISOString()
          })
        }
      });

      let notificationsSent = 0;

      if (notifyUsers) {
        // Get users to notify
        let usersToNotify;
        if (userIds && userIds.length > 0) {
          usersToNotify = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true }
          });
        } else {
          // Notify all active users
          usersToNotify = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, email: true }
          });
        }

        // Create notifications for each user
        for (const user of usersToNotify) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Important Security Notice - Data Breach',
              message: `We are writing to inform you of a data breach that occurred on ${breachDate}. ${description}. Affected data categories: ${dataCategories.join(', ')}. Measures taken: ${measuresTaken}. Reference: ${breachId}`,
              type: 'security',
              priority: 'high',
              data: JSON.stringify({
                breachId,
                breachDate,
                dataCategories,
                measuresTaken
              })
            }
          });
          notificationsSent++;
        }
      }

      return reply.send({
        success: true,
        data: {
          breachId,
          notificationsSent,
          notifiedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      request.log.error(error, 'Error processing breach notification');
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to process breach notification',
          code: 'BREACH_NOTIFICATION_ERROR'
        }
      });
    }
  });

  /**
   * GET /gdpr/processing-info
   * Returns information about data processing activities
   * Public endpoint for transparency
   */
  fastify.get('/processing-info', {
    schema: {
      description: 'Get information about data processing activities (public)',
      tags: ['GDPR'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                controller: { type: 'object' },
                dpo: { type: 'object' },
                processingActivities: { type: 'array' },
                dataSubjectRights: { type: 'array' },
                retentionPolicy: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        controller: {
          name: process.env.COMPANY_NAME || 'Legal RAG System',
          address: process.env.COMPANY_ADDRESS || 'Contact us for address',
          email: process.env.PRIVACY_EMAIL || 'privacy@example.com'
        },
        dpo: {
          name: 'Data Protection Officer',
          email: process.env.DPO_EMAIL || 'dpo@example.com'
        },
        processingActivities: [
          {
            activity: 'User Account Management',
            purpose: 'Create and manage user accounts',
            dataCategories: ['Identity data', 'Contact data', 'Account data'],
            legalBasis: 'Contract performance (Art. 6(1)(b))',
            retention: 'Duration of account + 3 years'
          },
          {
            activity: 'Legal Document Processing',
            purpose: 'Store and analyze legal documents',
            dataCategories: ['Professional data', 'Case data', 'Document content'],
            legalBasis: 'Contract performance (Art. 6(1)(b))',
            retention: 'Duration of account + 3 years'
          },
          {
            activity: 'AI Query Processing',
            purpose: 'Process legal queries using AI',
            dataCategories: ['Query content', 'Usage data'],
            legalBasis: 'Contract performance (Art. 6(1)(b))',
            retention: '1 year'
          },
          {
            activity: 'Analytics',
            purpose: 'Improve service quality',
            dataCategories: ['Usage data', 'Technical data'],
            legalBasis: 'Legitimate interest (Art. 6(1)(f))',
            retention: '2 years'
          },
          {
            activity: 'Marketing',
            purpose: 'Send promotional communications',
            dataCategories: ['Contact data', 'Preferences'],
            legalBasis: 'Consent (Art. 6(1)(a))',
            retention: 'Until consent withdrawal'
          }
        ],
        dataSubjectRights: [
          {
            right: 'Access (Art. 15)',
            description: 'Request a copy of your personal data',
            endpoint: 'GET /api/v1/gdpr/export'
          },
          {
            right: 'Rectification (Art. 16)',
            description: 'Request correction of inaccurate data',
            endpoint: 'PUT /api/v1/user/profile'
          },
          {
            right: 'Erasure (Art. 17)',
            description: 'Request deletion of your data',
            endpoint: 'DELETE /api/v1/gdpr/me'
          },
          {
            right: 'Restrict Processing (Art. 18)',
            description: 'Request limitation of processing',
            endpoint: 'Contact DPO'
          },
          {
            right: 'Data Portability (Art. 20)',
            description: 'Receive data in machine-readable format',
            endpoint: 'GET /api/v1/gdpr/export'
          },
          {
            right: 'Object (Art. 21)',
            description: 'Object to certain processing',
            endpoint: 'PUT /api/v1/gdpr/consent'
          },
          {
            right: 'Withdraw Consent (Art. 7)',
            description: 'Withdraw previously given consent',
            endpoint: 'PUT /api/v1/gdpr/consent'
          }
        ],
        retentionPolicy: {
          accountData: 'Duration of account + 3 years',
          transactionData: '7 years (legal requirement)',
          queryLogs: '1 year',
          auditLogs: '3 years',
          backups: '90 days'
        }
      }
    });
  });
}

export default gdprRoutes;
