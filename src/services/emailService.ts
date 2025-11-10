import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@poweria-legal.com';
const FROM_NAME = process.env.FROM_NAME || 'Poweria Legal';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: {
    email: string;
    name: string;
  };
  replyTo?: string;
  attachments?: Array<{
    content: string; // base64 encoded
    filename: string;
    type: string;
    disposition?: 'attachment' | 'inline';
  }>;
}

export class EmailService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!SENDGRID_API_KEY;
    if (!this.isConfigured) {
      console.warn('SendGrid API key not configured. Email functionality will be disabled.');
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(params: SendEmailParams): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[EmailService] SendGrid not configured. Email would be sent to:', params.to);
      console.log('[EmailService] Subject:', params.subject);
      return false;
    }

    try {
      const msg = {
        to: params.to,
        from: params.from || {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: params.subject,
        html: params.html,
        text: params.text || this.stripHtml(params.html),
        replyTo: params.replyTo,
        attachments: params.attachments,
      };

      await sgMail.send(msg);
      console.log('[EmailService] Email sent successfully to:', params.to);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      if (error instanceof Error) {
        throw new Error(`Email sending failed: ${error.message}`);
      }
      throw new Error('Email sending failed: Unknown error');
    }
  }

  /**
   * Send multiple emails (batch)
   */
  async sendBulkEmails(emails: SendEmailParams[]): Promise<{ sent: number; failed: number }> {
    if (!this.isConfigured) {
      console.log('[EmailService] SendGrid not configured. Would send', emails.length, 'emails');
      return { sent: 0, failed: emails.length };
    }

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        await this.sendEmail(email);
        sent++;
      } catch (error) {
        console.error('[EmailService] Failed to send bulk email to:', email.to, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send email using a pre-defined template
   */
  async sendTemplateEmail(
    templateId: string,
    to: string,
    dynamicTemplateData: Record<string, any>
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[EmailService] SendGrid not configured. Template email would be sent to:', to);
      return false;
    }

    try {
      const msg = {
        to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        templateId,
        dynamicTemplateData,
      };

      await sgMail.send(msg);
      console.log('[EmailService] Template email sent successfully to:', to);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send template email:', error);
      if (error instanceof Error) {
        throw new Error(`Template email sending failed: ${error.message}`);
      }
      throw new Error('Template email sending failed: Unknown error');
    }
  }

  /**
   * Verify email address validity (basic check)
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Strip HTML tags from text (for plain text fallback)
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

// Export singleton instance
export const emailService = new EmailService();
