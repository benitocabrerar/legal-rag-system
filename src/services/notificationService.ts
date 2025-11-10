/**
 * Notification Service
 *
 * Handles multi-channel notifications for document events
 * Supports email, in-app, webhook, and SMS notifications
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';
import { DocumentEventBus, DocumentEventType, NotificationEvent } from '../events/documentEventBus';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';
import axios from 'axios';

export interface NotificationChannel {
  type: 'email' | 'in-app' | 'webhook' | 'sms';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel['type'];
  subject?: string;
  body: string;
  variables: string[];
  metadata?: Record<string, any>;
}

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  webhookUrl?: string;
  preferences?: {
    channels: NotificationChannel['type'][];
    categories: string[];
    quiet_hours?: { start: string; end: string };
  };
}

export interface NotificationPayload {
  templateId?: string;
  channel: NotificationChannel['type'];
  recipients: NotificationRecipient[];
  subject: string;
  body: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  retryAttempts?: number;
  scheduleAt?: Date;
}

export class NotificationService {
  private prisma: PrismaClient;
  private logger: Logger;
  private eventBus: DocumentEventBus;
  private redis?: Redis;
  private emailTransporter?: nodemailer.Transporter;
  private templates: Map<string, NotificationTemplate> = new Map();
  private notificationQueue: NotificationPayload[] = [];
  private processingInterval?: NodeJS.Timeout;

  constructor(
    prisma: PrismaClient,
    logger: Logger,
    eventBus: DocumentEventBus,
    redis?: Redis,
    emailConfig?: any
  ) {
    this.prisma = prisma;
    this.logger = logger;
    this.eventBus = eventBus;
    this.redis = redis;

    if (emailConfig) {
      this.setupEmailTransporter(emailConfig);
    }

    this.loadTemplates();
    this.setupEventListeners();
    this.startQueueProcessor();
  }

  /**
   * Send notification to specified recipients
   */
  public async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Validate payload
      if (!payload.recipients || payload.recipients.length === 0) {
        throw new Error('No recipients specified');
      }

      // Apply template if specified
      if (payload.templateId) {
        const template = this.templates.get(payload.templateId);
        if (template) {
          payload.subject = payload.subject || template.subject || '';
          payload.body = this.applyTemplate(template.body, payload.data);
        }
      }

      // Check if should schedule or send immediately
      if (payload.scheduleAt && payload.scheduleAt > new Date()) {
        await this.scheduleNotification(payload);
        return;
      }

      // Queue for processing
      this.notificationQueue.push(payload);

      // Emit event
      this.eventBus.emitEvent(DocumentEventType.NOTIFICATION_QUEUED, {
        channel: payload.channel,
        recipientCount: payload.recipients.length,
        priority: payload.priority,
        category: payload.category
      });

      this.logger.info(`Notification queued: ${payload.channel} to ${payload.recipients.length} recipients`);
    } catch (error) {
      this.logger.error('Error queuing notification', error);
      throw error;
    }
  }

  /**
   * Send document upload notification
   */
  public async notifyDocumentUploaded(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      if (documentType === 'LegalDocument') {
        // Notify all users about new legal document
        await this.notifyAllUsers(
          'New Legal Document Available',
          `A new legal document "${metadata.title}" has been added to the library.`,
          {
            documentId,
            documentType,
            title: metadata.title,
            category: metadata.category,
            action: 'view',
            url: `/legal-documents/${documentId}`
          },
          'document_upload'
        );
      } else {
        // Notify case team members about new case document
        if (metadata.caseId) {
          await this.notifyCaseTeam(
            metadata.caseId,
            'New Document Uploaded',
            `A new document "${metadata.title}" has been uploaded to your case.`,
            {
              documentId,
              documentType,
              title: metadata.title,
              caseId: metadata.caseId,
              action: 'view',
              url: `/cases/${metadata.caseId}/documents/${documentId}`
            },
            'document_upload'
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error sending document upload notification for ${documentId}`, error);
    }
  }

  /**
   * Send analysis completion notification
   */
  public async notifyAnalysisCompleted(
    documentId: string,
    documentType: 'LegalDocument' | 'Document',
    results: Record<string, any>
  ): Promise<void> {
    try {
      const document = await this.getDocumentInfo(documentId, documentType);

      if (documentType === 'LegalDocument') {
        // Notify admin users
        await this.notifyAdmins(
          'Document Analysis Completed',
          `Analysis completed for "${document.title}". ${results.articlesExtracted} articles extracted.`,
          {
            documentId,
            documentType,
            title: document.title,
            results,
            action: 'view_analysis',
            url: `/admin/legal-documents/${documentId}/analysis`
          },
          'analysis_completed'
        );
      } else {
        // Notify document owner
        if (document.userId) {
          await this.notifyUser(
            document.userId,
            'Document Analysis Completed',
            `Your document "${document.title}" has been analyzed and is ready for use.`,
            {
              documentId,
              documentType,
              title: document.title,
              results,
              action: 'view_analysis',
              url: `/documents/${documentId}`
            },
            'analysis_completed'
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error sending analysis completion notification for ${documentId}`, error);
    }
  }

  /**
   * Notify all active users
   */
  private async notifyAllUsers(
    subject: string,
    message: string,
    data: Record<string, any>,
    category: string
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        emailNotifications: true,
        settings: {
          select: {
            documentAlerts: true
          }
        }
      }
    });

    const recipients: NotificationRecipient[] = users
      .filter(user => user.emailNotifications && user.settings?.documentAlerts !== false)
      .map(user => ({
        userId: user.id,
        email: user.email,
        preferences: {
          channels: ['in-app', 'email'],
          categories: [category]
        }
      }));

    await this.sendNotification({
      channel: 'in-app',
      recipients,
      subject,
      body: message,
      data,
      priority: 'normal',
      category
    });

    // Also send emails
    await this.sendNotification({
      channel: 'email',
      recipients,
      subject,
      body: message,
      data,
      priority: 'normal',
      category
    });
  }

  /**
   * Notify admin users
   */
  private async notifyAdmins(
    subject: string,
    message: string,
    data: Record<string, any>,
    category: string
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: {
        role: 'admin',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        emailNotifications: true
      }
    });

    const recipients: NotificationRecipient[] = admins.map(admin => ({
      userId: admin.id,
      email: admin.email,
      preferences: {
        channels: ['in-app', 'email'],
        categories: [category]
      }
    }));

    await this.sendNotification({
      channel: 'in-app',
      recipients,
      subject,
      body: message,
      data,
      priority: 'high',
      category
    });
  }

  /**
   * Notify specific user
   */
  private async notifyUser(
    userId: string,
    subject: string,
    message: string,
    data: Record<string, any>,
    category: string
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailNotifications: true,
        phoneNumber: true,
        settings: true
      }
    });

    if (!user) return;

    const recipient: NotificationRecipient = {
      userId: user.id,
      email: user.email,
      phone: user.phoneNumber || undefined,
      preferences: {
        channels: ['in-app'],
        categories: [category]
      }
    };

    if (user.emailNotifications) {
      recipient.preferences!.channels.push('email');
    }

    await this.sendNotification({
      channel: 'in-app',
      recipients: [recipient],
      subject,
      body: message,
      data,
      priority: 'normal',
      category
    });
  }

  /**
   * Notify case team members
   */
  private async notifyCaseTeam(
    caseId: string,
    subject: string,
    message: string,
    data: Record<string, any>,
    category: string
  ): Promise<void> {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailNotifications: true
          }
        }
      }
    });

    if (!caseData) return;

    const recipients: NotificationRecipient[] = [{
      userId: caseData.user.id,
      email: caseData.user.email,
      preferences: {
        channels: caseData.user.emailNotifications ? ['in-app', 'email'] : ['in-app'],
        categories: [category]
      }
    }];

    await this.sendNotification({
      channel: 'in-app',
      recipients,
      subject,
      body: message,
      data,
      priority: 'normal',
      category
    });
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (!notification) continue;

      try {
        await this.processNotification(notification);
      } catch (error) {
        this.logger.error('Error processing notification', error);

        // Retry logic
        if (notification.retryAttempts === undefined) {
          notification.retryAttempts = 0;
        }

        if (notification.retryAttempts < 3) {
          notification.retryAttempts++;
          this.notificationQueue.push(notification);
        } else {
          // Max retries reached, emit failure event
          this.eventBus.emitEvent(DocumentEventType.NOTIFICATION_FAILED, {
            notification,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  }

  /**
   * Process individual notification
   */
  private async processNotification(notification: NotificationPayload): Promise<void> {
    const results = [];

    for (const recipient of notification.recipients) {
      try {
        switch (notification.channel) {
          case 'email':
            if (recipient.email) {
              await this.sendEmail(recipient.email, notification.subject, notification.body, notification.data);
              results.push({ recipient: recipient.email, status: 'sent' });
            }
            break;

          case 'in-app':
            if (recipient.userId) {
              await this.createInAppNotification(recipient.userId, notification);
              results.push({ recipient: recipient.userId, status: 'created' });
            }
            break;

          case 'webhook':
            if (recipient.webhookUrl) {
              await this.sendWebhook(recipient.webhookUrl, notification);
              results.push({ recipient: recipient.webhookUrl, status: 'sent' });
            }
            break;

          case 'sms':
            if (recipient.phone) {
              await this.sendSMS(recipient.phone, notification.body);
              results.push({ recipient: recipient.phone, status: 'sent' });
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Error sending ${notification.channel} notification to recipient`, error);
        results.push({
          recipient: recipient.userId || recipient.email || recipient.phone || recipient.webhookUrl,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log to database
    await this.logNotification(notification, results);

    // Emit success event
    this.eventBus.emitEvent(DocumentEventType.NOTIFICATION_SENT, {
      channel: notification.channel,
      recipientCount: notification.recipients.length,
      results,
      timestamp: new Date()
    });
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const html = this.formatEmailBody(body, data);

    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@legalrag.com',
      to,
      subject,
      text: body,
      html
    });
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(
    userId: string,
    notification: NotificationPayload
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: notification.category,
        title: notification.subject,
        message: notification.body,
        priority: notification.priority,
        actionUrl: notification.data.url,
        metadata: notification.data
      }
    });

    // If using WebSockets, emit real-time notification
    if (this.redis) {
      await this.redis.publish(`notifications:${userId}`, JSON.stringify({
        type: 'new_notification',
        data: {
          title: notification.subject,
          message: notification.body,
          priority: notification.priority,
          actionUrl: notification.data.url
        }
      }));
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    url: string,
    notification: NotificationPayload
  ): Promise<void> {
    await axios.post(url, {
      subject: notification.subject,
      body: notification.body,
      data: notification.data,
      priority: notification.priority,
      category: notification.category,
      timestamp: new Date().toISOString()
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LegalRAG/1.0'
      }
    });
  }

  /**
   * Send SMS notification (placeholder)
   */
  private async sendSMS(phone: string, message: string): Promise<void> {
    // TODO: Implement SMS provider integration (Twilio, AWS SNS, etc.)
    this.logger.info(`SMS to ${phone}: ${message}`);
  }

  /**
   * Schedule notification for later
   */
  private async scheduleNotification(notification: NotificationPayload): Promise<void> {
    if (!this.redis) {
      // If no Redis, add to queue with delay
      setTimeout(() => {
        this.notificationQueue.push(notification);
      }, notification.scheduleAt!.getTime() - Date.now());
      return;
    }

    // Store in Redis with expiry
    const key = `scheduled:${Date.now()}:${Math.random()}`;
    await this.redis.setex(
      key,
      Math.ceil((notification.scheduleAt!.getTime() - Date.now()) / 1000),
      JSON.stringify(notification)
    );
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    notification: NotificationPayload,
    results: any[]
  ): Promise<void> {
    try {
      // Create notification log entries
      for (const result of results) {
        await this.prisma.notificationLog.create({
          data: {
            templateId: notification.templateId,
            userId: notification.recipients.find(r => r.userId === result.recipient)?.userId,
            channel: notification.channel === 'in-app' ? 'IN_APP' :
                    notification.channel === 'email' ? 'EMAIL' :
                    notification.channel === 'sms' ? 'SMS' : 'PUSH',
            recipient: String(result.recipient),
            subject: notification.subject,
            body: notification.body,
            status: result.status,
            sentAt: result.status === 'sent' ? new Date() : null,
            errorMessage: result.error,
            metadata: {
              category: notification.category,
              priority: notification.priority,
              data: notification.data
            }
          }
        });
      }
    } catch (error) {
      this.logger.error('Error logging notification', error);
    }
  }

  /**
   * Get document information
   */
  private async getDocumentInfo(
    documentId: string,
    documentType: 'LegalDocument' | 'Document'
  ): Promise<any> {
    if (documentType === 'LegalDocument') {
      return await this.prisma.legalDocument.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          normTitle: true,
          uploadedBy: true
        }
      }).then(doc => ({ ...doc, title: doc?.normTitle, userId: doc?.uploadedBy }));
    } else {
      return await this.prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          title: true,
          userId: true
        }
      });
    }
  }

  /**
   * Format email body with HTML
   */
  private formatEmailBody(body: string, data: Record<string, any>): string {
    const actionButton = data.url ? `
      <div style="margin-top: 20px;">
        <a href="${data.url}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        ">View Details</a>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Legal RAG Platform</h2>
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin-top: 20px;">
              <p>${body}</p>
              ${actionButton}
            </div>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center;">
              This is an automated notification from the Legal RAG Platform.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Apply template variables
   */
  private applyTemplate(template: string, data: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Load notification templates
   */
  private async loadTemplates(): Promise<void> {
    try {
      const templates = await this.prisma.notificationTemplate.findMany({
        where: { isActive: true }
      });

      for (const template of templates) {
        this.templates.set(template.code, {
          id: template.id,
          name: template.name,
          channel: template.channel.toLowerCase() as any,
          subject: template.subject || undefined,
          body: template.bodyTemplate,
          variables: (template.variables as any)?.variables || [],
          metadata: template.variables as any
        });
      }

      this.logger.info(`Loaded ${this.templates.size} notification templates`);
    } catch (error) {
      this.logger.error('Error loading notification templates', error);
    }
  }

  /**
   * Setup email transporter
   */
  private setupEmailTransporter(config: any): void {
    this.emailTransporter = nodemailer.createTransporter(config);

    // Verify connection
    this.emailTransporter.verify((error) => {
      if (error) {
        this.logger.error('Email transporter verification failed', error);
      } else {
        this.logger.info('Email transporter ready');
      }
    });
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        this.logger.error('Queue processing error', error);
      });
    }, 5000);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for document upload events
    this.eventBus.subscribe(
      DocumentEventType.DOCUMENT_UPLOADED,
      async (event) => {
        await this.notifyDocumentUploaded(
          event.payload.documentId,
          'Document',
          event.payload
        );
      },
      'NotificationService'
    );

    this.eventBus.subscribe(
      DocumentEventType.LEGAL_DOCUMENT_UPLOADED,
      async (event) => {
        await this.notifyDocumentUploaded(
          event.payload.documentId,
          'LegalDocument',
          event.payload
        );
      },
      'NotificationService'
    );

    // Listen for analysis completion
    this.eventBus.subscribe(
      DocumentEventType.ANALYSIS_COMPLETED,
      async (event) => {
        await this.notifyAnalysisCompleted(
          event.payload.documentId,
          event.payload.documentType,
          event.payload.results
        );
      },
      'NotificationService'
    );
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    if (this.emailTransporter) {
      this.emailTransporter.close();
    }
  }
}