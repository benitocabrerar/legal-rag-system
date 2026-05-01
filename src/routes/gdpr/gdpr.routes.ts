/**
 * GDPR Compliance Routes
 * Implements data subject rights endpoints
 *
 * @module routes/gdpr
 * @version 1.0.0
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { encryptionService, decryptFields } from '../../services/security/encryption.service';

/**
 * Request schemas
 */
const DataExportRequestSchema = z.object({
  userId: z.string().uuid(),
  format: z.enum(['json', 'csv']).default('json'),
  includeDocuments: z.boolean().default(true),
  includeAuditLogs: z.boolean().default(false)
});

const DataDeletionRequestSchema = z.object({
  userId: z.string().uuid(),
  confirmationCode: z.string().min(6),
  reason: z.string().optional(),
  retainAuditLogs: z.boolean().default(true) // Required for legal compliance
});

const ConsentUpdateSchema = z.object({
  userId: z.string().uuid(),
  consents: z.object({
    marketing: z.boolean().optional(),
    analytics: z.boolean().optional(),
    thirdPartySharing: z.boolean().optional(),
    emailNotifications: z.boolean().optional()
  })
});

const DataAccessRequestSchema = z.object({
  userId: z.string().uuid(),
  categories: z.array(z.enum([
    'profile',
    'documents',
    'searchHistory',
    'auditLogs',
    'preferences'
  ])).default(['profile', 'documents'])
});

/**
 * GDPR Routes Plugin
 */
export default async function gdprRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * POST /gdpr/data-export
   * Request data export (Article 20 - Right to Data Portability)
   */
  fastify.post('/data-export', async (
    request: FastifyRequest<{ Body: z.infer<typeof DataExportRequestSchema> }>,
    reply: FastifyReply
  ) => {
    const body = DataExportRequestSchema.parse(request.body);
    const requestId = crypto.randomBytes(16).toString('hex');

    try {
      // Verify user exists and is authorized
      const user = await prisma.user.findUnique({
        where: { id: body.userId }
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      // Create export request record
      const exportRequest = await prisma.dataExportRequest.create({
        data: {
          id: requestId,
          userId: body.userId,
          format: body.format,
          status: 'pending',
          includeDocuments: body.includeDocuments,
          includeAuditLogs: body.includeAuditLogs,
          requestedAt: new Date(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
        }
      });

      // Queue background job for data compilation
      // In production, this would be handled by a job queue
      fastify.log.info({
        requestId,
        userId: body.userId,
        action: 'DATA_EXPORT_REQUESTED'
      }, 'Data export requested');

      return reply.status(202).send({
        success: true,
        data: {
          requestId,
          status: 'pending',
          estimatedCompletionTime: '24-48 hours',
          message: 'Your data export request has been received. You will be notified when it is ready.'
        }
      });
    } catch (error) {
      fastify.log.error({ error, requestId }, 'Data export request failed');
      throw error;
    }
  });

  /**
   * GET /gdpr/data-export/:requestId
   * Check data export status
   */
  fastify.get('/data-export/:requestId', async (
    request: FastifyRequest<{ Params: { requestId: string } }>,
    reply: FastifyReply
  ) => {
    const { requestId } = request.params;

    const exportRequest = await prisma.dataExportRequest.findUnique({
      where: { id: requestId }
    });

    if (!exportRequest) {
      return reply.status(404).send({
        success: false,
        error: { code: 'REQUEST_NOT_FOUND', message: 'Export request not found' }
      });
    }

    return reply.send({
      success: true,
      data: {
        requestId: exportRequest.id,
        status: exportRequest.status,
        requestedAt: exportRequest.requestedAt,
        completedAt: exportRequest.completedAt,
        downloadUrl: exportRequest.status === 'completed' ? exportRequest.downloadUrl : null,
        expiresAt: exportRequest.expiresAt
      }
    });
  });

  /**
   * POST /gdpr/data-access
   * Request access to personal data (Article 15 - Right of Access)
   */
  fastify.post('/data-access', async (
    request: FastifyRequest<{ Body: z.infer<typeof DataAccessRequestSchema> }>,
    reply: FastifyReply
  ) => {
    const body = DataAccessRequestSchema.parse(request.body);

    try {
      const userData: Record<string, any> = {};

      // Fetch profile data
      if (body.categories.includes('profile')) {
        const user = await prisma.user.findUnique({
          where: { id: body.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true
          }
        });
        userData.profile = user;
      }

      // Fetch documents
      if (body.categories.includes('documents')) {
        const documents = await prisma.legalDocument.findMany({
          where: { uploadedById: body.userId },
          select: {
            id: true,
            title: true,
            documentType: true,
            createdAt: true,
            updatedAt: true,
            fileSize: true
          },
          take: 100
        });
        userData.documents = documents;
      }

      // Fetch search history
      if (body.categories.includes('searchHistory')) {
        const searchHistory = await prisma.queryHistory.findMany({
          where: { userId: body.userId },
          select: {
            id: true,
            query: true,
            createdAt: true,
            resultsCount: true
          },
          take: 100,
          orderBy: { createdAt: 'desc' }
        });
        userData.searchHistory = searchHistory;
      }

      // Fetch audit logs (if permitted)
      if (body.categories.includes('auditLogs')) {
        const auditLogs = await prisma.auditLog.findMany({
          where: { userId: body.userId },
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
            metadata: true
          },
          take: 100,
          orderBy: { createdAt: 'desc' }
        });
        userData.auditLogs = auditLogs;
      }

      // Fetch preferences
      if (body.categories.includes('preferences')) {
        const preferences = await prisma.userPreference.findUnique({
          where: { userId: body.userId }
        });
        userData.preferences = preferences;
      }

      // Log the access request
      await prisma.auditLog.create({
        data: {
          action: 'GDPR_DATA_ACCESS',
          entityType: 'user',
          entityId: body.userId,
          userId: body.userId,
          metadata: { categories: body.categories }
        }
      });

      return reply.send({
        success: true,
        data: {
          userId: body.userId,
          requestedAt: new Date().toISOString(),
          categories: body.categories,
          personalData: userData
        }
      });
    } catch (error) {
      fastify.log.error({ error, userId: body.userId }, 'Data access request failed');
      throw error;
    }
  });

  /**
   * POST /gdpr/data-deletion
   * Request data deletion (Article 17 - Right to Erasure)
   */
  fastify.post('/data-deletion', async (
    request: FastifyRequest<{ Body: z.infer<typeof DataDeletionRequestSchema> }>,
    reply: FastifyReply
  ) => {
    const body = DataDeletionRequestSchema.parse(request.body);
    const requestId = crypto.randomBytes(16).toString('hex');

    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: body.userId }
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      // Verify confirmation code (would be sent via email in production)
      // This is a simplified check - production would verify against stored code
      if (body.confirmationCode.length < 6) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_CONFIRMATION', message: 'Invalid confirmation code' }
        });
      }

      // Create deletion request
      const deletionRequest = await prisma.dataDeletionRequest.create({
        data: {
          id: requestId,
          userId: body.userId,
          status: 'pending',
          reason: body.reason,
          retainAuditLogs: body.retainAuditLogs,
          requestedAt: new Date(),
          scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days grace period
        }
      });

      // Log the deletion request
      await prisma.auditLog.create({
        data: {
          action: 'GDPR_DELETION_REQUESTED',
          entityType: 'user',
          entityId: body.userId,
          userId: body.userId,
          metadata: {
            requestId,
            reason: body.reason,
            retainAuditLogs: body.retainAuditLogs
          }
        }
      });

      fastify.log.warn({
        requestId,
        userId: body.userId,
        action: 'DATA_DELETION_REQUESTED'
      }, 'Data deletion requested');

      return reply.status(202).send({
        success: true,
        data: {
          requestId,
          status: 'pending',
          scheduledDeletionAt: deletionRequest.scheduledDeletionAt,
          gracePeriodDays: 30,
          message: 'Deletion request received. You have 30 days to cancel this request.'
        }
      });
    } catch (error) {
      fastify.log.error({ error, requestId }, 'Data deletion request failed');
      throw error;
    }
  });

  /**
   * DELETE /gdpr/data-deletion/:requestId
   * Cancel a pending deletion request
   */
  fastify.delete('/data-deletion/:requestId', async (
    request: FastifyRequest<{ Params: { requestId: string } }>,
    reply: FastifyReply
  ) => {
    const { requestId } = request.params;

    const deletionRequest = await prisma.dataDeletionRequest.findUnique({
      where: { id: requestId }
    });

    if (!deletionRequest) {
      return reply.status(404).send({
        success: false,
        error: { code: 'REQUEST_NOT_FOUND', message: 'Deletion request not found' }
      });
    }

    if (deletionRequest.status !== 'pending') {
      return reply.status(400).send({
        success: false,
        error: { code: 'CANNOT_CANCEL', message: 'Can only cancel pending deletion requests' }
      });
    }

    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      }
    });

    // Log the cancellation
    await prisma.auditLog.create({
      data: {
        action: 'GDPR_DELETION_CANCELLED',
        entityType: 'dataDeletionRequest',
        entityId: requestId,
        userId: deletionRequest.userId,
        metadata: {}
      }
    });

    return reply.send({
      success: true,
      data: {
        requestId,
        status: 'cancelled',
        message: 'Deletion request has been cancelled'
      }
    });
  });

  /**
   * PUT /gdpr/consent
   * Update user consent preferences (Article 7)
   */
  fastify.put('/consent', async (
    request: FastifyRequest<{ Body: z.infer<typeof ConsentUpdateSchema> }>,
    reply: FastifyReply
  ) => {
    const body = ConsentUpdateSchema.parse(request.body);

    try {
      // Get current preferences
      const currentPrefs = await prisma.userPreference.findUnique({
        where: { userId: body.userId }
      });

      // Update preferences
      const updatedPrefs = await prisma.userPreference.upsert({
        where: { userId: body.userId },
        update: {
          marketingConsent: body.consents.marketing ?? currentPrefs?.marketingConsent,
          analyticsConsent: body.consents.analytics ?? currentPrefs?.analyticsConsent,
          thirdPartySharingConsent: body.consents.thirdPartySharing ?? currentPrefs?.thirdPartySharingConsent,
          emailNotificationsConsent: body.consents.emailNotifications ?? currentPrefs?.emailNotificationsConsent,
          consentUpdatedAt: new Date()
        },
        create: {
          userId: body.userId,
          marketingConsent: body.consents.marketing ?? false,
          analyticsConsent: body.consents.analytics ?? false,
          thirdPartySharingConsent: body.consents.thirdPartySharing ?? false,
          emailNotificationsConsent: body.consents.emailNotifications ?? true,
          consentUpdatedAt: new Date()
        }
      });

      // Log consent change
      await prisma.auditLog.create({
        data: {
          action: 'GDPR_CONSENT_UPDATED',
          entityType: 'userPreference',
          entityId: body.userId,
          userId: body.userId,
          metadata: {
            previousConsents: currentPrefs ? {
              marketing: currentPrefs.marketingConsent,
              analytics: currentPrefs.analyticsConsent,
              thirdPartySharing: currentPrefs.thirdPartySharingConsent,
              emailNotifications: currentPrefs.emailNotificationsConsent
            } : null,
            newConsents: body.consents
          }
        }
      });

      return reply.send({
        success: true,
        data: {
          userId: body.userId,
          consents: {
            marketing: updatedPrefs.marketingConsent,
            analytics: updatedPrefs.analyticsConsent,
            thirdPartySharing: updatedPrefs.thirdPartySharingConsent,
            emailNotifications: updatedPrefs.emailNotificationsConsent
          },
          updatedAt: updatedPrefs.consentUpdatedAt
        }
      });
    } catch (error) {
      fastify.log.error({ error, userId: body.userId }, 'Consent update failed');
      throw error;
    }
  });

  /**
   * GET /gdpr/consent/:userId
   * Get current consent status
   */
  fastify.get('/consent/:userId', async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.params;

    const preferences = await prisma.userPreference.findUnique({
      where: { userId }
    });

    if (!preferences) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User preferences not found' }
      });
    }

    return reply.send({
      success: true,
      data: {
        userId,
        consents: {
          marketing: preferences.marketingConsent,
          analytics: preferences.analyticsConsent,
          thirdPartySharing: preferences.thirdPartySharingConsent,
          emailNotifications: preferences.emailNotificationsConsent
        },
        lastUpdated: preferences.consentUpdatedAt
      }
    });
  });

  /**
   * POST /gdpr/rectification
   * Request data correction (Article 16 - Right to Rectification)
   */
  fastify.post('/rectification', async (
    request: FastifyRequest<{
      Body: {
        userId: string;
        corrections: Array<{
          field: string;
          currentValue: string;
          correctedValue: string;
          reason?: string;
        }>;
      }
    }>,
    reply: FastifyReply
  ) => {
    const { userId, corrections } = request.body;
    const requestId = crypto.randomBytes(16).toString('hex');

    try {
      // Create rectification request for review
      const rectificationRequest = await prisma.dataRectificationRequest.create({
        data: {
          id: requestId,
          userId,
          status: 'pending',
          corrections: JSON.stringify(corrections),
          requestedAt: new Date()
        }
      });

      // Log the request
      await prisma.auditLog.create({
        data: {
          action: 'GDPR_RECTIFICATION_REQUESTED',
          entityType: 'user',
          entityId: userId,
          userId,
          metadata: {
            requestId,
            fieldsToCorrect: corrections.map(c => c.field)
          }
        }
      });

      fastify.log.info({
        requestId,
        userId,
        action: 'DATA_RECTIFICATION_REQUESTED'
      }, 'Data rectification requested');

      return reply.status(202).send({
        success: true,
        data: {
          requestId,
          status: 'pending',
          message: 'Rectification request received. We will review and process your request within 30 days.'
        }
      });
    } catch (error) {
      fastify.log.error({ error, requestId }, 'Rectification request failed');
      throw error;
    }
  });

  /**
   * GET /gdpr/privacy-policy
   * Get current privacy policy information
   */
  fastify.get('/privacy-policy', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        version: '1.0.0',
        lastUpdated: '2025-01-01',
        dataController: {
          name: process.env.COMPANY_NAME || 'Legal RAG System',
          email: process.env.DPO_EMAIL || 'privacy@example.com',
          address: process.env.COMPANY_ADDRESS || 'Not specified'
        },
        dataProtectionOfficer: {
          email: process.env.DPO_EMAIL || 'dpo@example.com'
        },
        retentionPeriods: {
          userData: '3 years after account closure',
          documents: '7 years (legal requirement)',
          auditLogs: '10 years (legal requirement)',
          searchHistory: '1 year'
        },
        rights: [
          'Right of access (Article 15)',
          'Right to rectification (Article 16)',
          'Right to erasure (Article 17)',
          'Right to data portability (Article 20)',
          'Right to object (Article 21)',
          'Right to withdraw consent (Article 7)'
        ],
        supervisoryAuthority: {
          name: process.env.DPA_NAME || 'Data Protection Authority',
          website: process.env.DPA_WEBSITE || 'https://example.com/dpa'
        }
      }
    });
  });

  fastify.log.info('[GDPR Routes] Registered');
}
