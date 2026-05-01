/**
 * Backup Notification Service
 *
 * Handles webhook and email notifications for backup events
 * Supports: Webhook delivery, Email notifications, Retry logic
 */

import axios from 'axios';
import { BackupWebhookEvent, NotificationPayload, BackupError } from '../../types/backup.types';
import { logger } from '../../utils/logger';
import sgMail from '@sendgrid/mail';

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retries?: number;
}

interface EmailDeliveryResult {
  success: boolean;
  recipients: string[];
  error?: string;
}

export class BackupNotificationService {
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds
  private sendGridInitialized = false;

  /**
   * Initialize SendGrid API client
   */
  private initSendGrid(): void {
    if (this.sendGridInitialized) return;

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    sgMail.setApiKey(apiKey);
    this.sendGridInitialized = true;
  }

  /**
   * Send notification via webhook and/or email
   */
  async send(
    payload: NotificationPayload,
    webhookUrl?: string,
    emailRecipients?: string[]
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    // Send webhook if URL provided
    if (webhookUrl) {
      promises.push(this.sendWebhook(webhookUrl, payload));
    }

    // Send emails if recipients provided
    if (emailRecipients && emailRecipients.length > 0) {
      promises.push(this.sendEmail(emailRecipients, payload));
    }

    // Execute all notifications in parallel
    if (promises.length > 0) {
      try {
        await Promise.allSettled(promises);
      } catch (error) {
        logger.error('Failed to send some notifications', { error, payload });
        // Don't throw - notifications are best-effort
      }
    }
  }

  /**
   * Send webhook notification with retry logic
   */
  async sendWebhook(
    url: string,
    payload: NotificationPayload
  ): Promise<WebhookDeliveryResult> {
    let lastError: Error | null = null;
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LegalRAG-BackupService/1.0',
            'X-Event-Type': payload.event
          },
          timeout: 30000, // 30 second timeout
          validateStatus: (status) => status >= 200 && status < 300
        });

        logger.info('Webhook delivered successfully', {
          url,
          event: payload.event,
          statusCode: response.status,
          retries
        });

        return {
          success: true,
          statusCode: response.status,
          retries
        };
      } catch (error) {
        lastError = error as Error;
        retries++;

        logger.warn('Webhook delivery failed, retrying', {
          url,
          event: payload.event,
          attempt: retries,
          maxRetries: this.maxRetries,
          error: (error as any).message
        });

        if (retries < this.maxRetries) {
          // Exponential backoff
          await this.sleep(this.retryDelay * Math.pow(2, retries - 1));
        }
      }
    }

    // All retries exhausted
    logger.error('Webhook delivery failed after all retries', {
      url,
      event: payload.event,
      retries,
      error: lastError
    });

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retries
    };
  }

  /**
   * Send email notification via SendGrid
   */
  async sendEmail(
    recipients: string[],
    payload: NotificationPayload
  ): Promise<EmailDeliveryResult> {
    try {
      // Initialize SendGrid
      this.initSendGrid();

      // Email template based on event type
      const emailContent = this.buildEmailContent(payload);

      logger.info('Email notification prepared', {
        recipients,
        event: payload.event,
        subject: emailContent.subject
      });

      // Send email via SendGrid
      const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'backups@legal-rag.com';

      await sgMail.send({
        to: recipients,
        from: fromEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.body,
      });

      logger.info('Email sent successfully via SendGrid', {
        to: recipients,
        subject: emailContent.subject,
        event: payload.event
      });

      return {
        success: true,
        recipients
      };
    } catch (error) {
      logger.error('Failed to send email notification', {
        recipients,
        event: payload.event,
        error
      });

      return {
        success: false,
        recipients,
        error: (error as Error).message
      };
    }
  }

  /**
   * Build email content based on event type
   */
  private buildEmailContent(payload: NotificationPayload): {
    subject: string;
    body: string;
    html: string;
  } {
    const { event, data, timestamp } = payload;
    const formattedTime = timestamp.toLocaleString();

    let subject = '';
    let body = '';
    let html = '';

    switch (event) {
      case BackupWebhookEvent.BACKUP_STARTED:
        subject = `Backup Started - ${data.backupId}`;
        body = `
Backup Process Started

Backup ID: ${data.backupId}
Status: ${data.status}
Time: ${formattedTime}

${data.message || 'Backup job has been queued for processing.'}
`;
        html = this.wrapInEmailTemplate(subject, body);
        break;

      case BackupWebhookEvent.BACKUP_COMPLETED:
        subject = `Backup Completed Successfully - ${data.backupId}`;
        body = `
Backup Completed Successfully

Backup ID: ${data.backupId}
Status: ${data.status}
Time: ${formattedTime}

${data.message || 'Backup completed without errors.'}

${data.metadata ? `
Details:
- Size: ${this.formatBytes(data.metadata.size || 0)}
- Compressed Size: ${this.formatBytes(data.metadata.compressedSize || 0)}
- Compression Ratio: ${data.metadata.compressionRatio || 'N/A'}
- Tables Backed Up: ${data.metadata.tableCount || 0}
- Total Records: ${data.metadata.recordCount || 0}
` : ''}
`;
        html = this.wrapInEmailTemplate(subject, body);
        break;

      case BackupWebhookEvent.BACKUP_FAILED:
        subject = `⚠️ Backup Failed - ${data.backupId}`;
        body = `
Backup Failed

Backup ID: ${data.backupId}
Status: ${data.status}
Time: ${formattedTime}

Error: ${data.message || 'Unknown error occurred during backup.'}

Please check the backup logs for more details.
`;
        html = this.wrapInEmailTemplate(subject, body, true);
        break;

      case BackupWebhookEvent.RESTORE_STARTED:
        subject = `Restore Started - ${data.restoreId || data.backupId}`;
        body = `
Restore Process Started

Restore ID: ${data.restoreId || data.backupId}
Backup ID: ${data.backupId}
Status: ${data.status}
Time: ${formattedTime}

${data.message || 'Restore job has been queued for processing.'}
`;
        html = this.wrapInEmailTemplate(subject, body);
        break;

      case BackupWebhookEvent.RESTORE_COMPLETED:
        subject = `Restore Completed Successfully - ${data.restoreId || data.backupId}`;
        body = `
Restore Completed Successfully

Restore ID: ${data.restoreId || data.backupId}
Status: ${data.status}
Time: ${formattedTime}

${data.message || 'Restore completed without errors.'}

${data.metadata ? `
Details:
- Tables Restored: ${data.metadata.tablesRestored || 0}
- Records Restored: ${data.metadata.recordsRestored || 0}
- Duration: ${this.formatDuration(data.metadata.duration || 0)}
` : ''}
`;
        html = this.wrapInEmailTemplate(subject, body);
        break;

      case BackupWebhookEvent.RESTORE_FAILED:
        subject = `⚠️ Restore Failed - ${data.restoreId || data.backupId}`;
        body = `
Restore Failed

Restore ID: ${data.restoreId || data.backupId}
Status: ${data.status}
Time: ${formattedTime}

Error: ${data.message || 'Unknown error occurred during restore.'}

Please check the restore logs for more details.
`;
        html = this.wrapInEmailTemplate(subject, body, true);
        break;

      default:
        subject = `Backup System Notification`;
        body = `
Event: ${event}
Time: ${formattedTime}

${data.message || 'No additional information available.'}
`;
        html = this.wrapInEmailTemplate(subject, body);
    }

    return { subject, body, html };
  }

  /**
   * Wrap email body in HTML template
   */
  private wrapInEmailTemplate(subject: string, body: string, isError = false): string {
    const backgroundColor = isError ? '#fff3cd' : '#d1ecf1';
    const borderColor = isError ? '#ffc107' : '#17a2b8';
    const textColor = isError ? '#856404' : '#0c5460';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: ${backgroundColor}; border-left: 4px solid ${borderColor}; padding: 15px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 10px 0; color: ${textColor};">${subject}</h2>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
    <pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px; margin: 0;">${body}</pre>
  </div>

  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
    <p>This is an automated notification from the Legal RAG Backup System.</p>
    <p>Please do not reply to this email.</p>
  </div>
</body>
</html>
`;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number | string): string {
    const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;

    if (numBytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));

    return Math.round(numBytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test webhook endpoint connectivity
   */
  async testWebhook(url: string): Promise<boolean> {
    try {
      const testPayload: NotificationPayload = {
        event: BackupWebhookEvent.BACKUP_STARTED,
        timestamp: new Date(),
        data: {
          backupId: 'test-webhook-connection',
          status: 'PENDING',
          message: 'This is a test webhook notification'
        }
      };

      const result = await this.sendWebhook(url, testPayload);
      return result.success;
    } catch (error) {
      logger.error('Webhook test failed', { url, error });
      return false;
    }
  }

  /**
   * Validate email addresses
   */
  validateEmailAddresses(emails: string[]): { valid: string[]; invalid: string[] } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of emails) {
      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    }

    return { valid, invalid };
  }
}
