# Email Service Setup Guide

This guide explains how to configure the SendGrid email service for the Poweria Legal system.

## Overview

The application uses SendGrid for sending transactional emails including:
- Event reminders
- Task assignments and due date reminders
- Invoice notifications
- Payment confirmations
- Case status updates
- Welcome emails
- Password reset emails

## Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@poweria-legal.com
FROM_NAME=Poweria Legal
```

### Variable Details

| Variable | Required | Description | Default Value |
|----------|----------|-------------|---------------|
| `SENDGRID_API_KEY` | Yes | Your SendGrid API key | None |
| `FROM_EMAIL` | No | Default sender email address | `noreply@poweria-legal.com` |
| `FROM_NAME` | No | Default sender name | `Poweria Legal` |

## SendGrid Setup

### 1. Create a SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Generate API Key

1. Log in to SendGrid Dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name: `poweria-legal-production` (or similar)
5. Permissions: **Full Access** (or at minimum **Mail Send** permissions)
6. Click **Create & View**
7. **Important**: Copy the API key immediately - it won't be shown again
8. Add the API key to your `.env` file

### 3. Verify Sender Identity

Before you can send emails, you must verify your sender identity:

#### Option A: Single Sender Verification (Quick Start)
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your details:
   - From Name: `Poweria Legal`
   - From Email: `noreply@poweria-legal.com` (or your verified email)
   - Reply To: Your support email
4. Verify the email sent to your address
5. Update `FROM_EMAIL` in `.env` to match

#### Option B: Domain Authentication (Production)
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS configuration steps
4. Verify domain ownership
5. Update `FROM_EMAIL` to use your domain (e.g., `noreply@yourdomain.com`)

## Testing

### Test in Development

The email service automatically detects if SendGrid is not configured and will log emails to console instead:

```typescript
// If SENDGRID_API_KEY is not set:
[EmailService] SendGrid not configured. Email would be sent to: user@example.com
[EmailService] Subject: Event Reminder
```

### Test Email Sending

Create a simple test script:

```typescript
import { emailService } from './src/services/emailService.js';
import EmailTemplates from './src/templates/emailTemplates.js';

async function testEmail() {
  try {
    const html = EmailTemplates.welcomeEmail({
      userName: 'Test User',
      userEmail: 'test@example.com',
      actionUrl: 'https://your-app.com/dashboard',
    });

    await emailService.sendEmail({
      to: 'your-email@example.com',
      subject: 'Test Email',
      html,
    });

    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Failed to send test email:', error);
  }
}

testEmail();
```

## Usage Examples

### Send Event Reminder

```typescript
import { emailService } from './services/emailService.js';
import EmailTemplates from './templates/emailTemplates.js';

const html = EmailTemplates.eventReminder({
  userName: 'Juan Pérez',
  eventTitle: 'Audiencia Judicial',
  eventDate: '15 de Noviembre de 2025',
  eventTime: '10:00 AM',
  eventLocation: 'Corte Provincial de Quito',
  caseTitle: 'Caso #1234',
  actionUrl: 'https://app.poweria-legal.com/events/abc123',
});

await emailService.sendEmail({
  to: 'juan.perez@example.com',
  subject: 'Recordatorio: Audiencia Judicial',
  html,
});
```

### Send Invoice Notification

```typescript
const html = EmailTemplates.invoiceGenerated({
  userName: 'María González',
  invoiceNumber: 'INV-2025-001',
  invoiceAmount: '$450.00',
  invoiceDueDate: '30 de Noviembre de 2025',
  caseTitle: 'Caso #5678',
  actionUrl: 'https://app.poweria-legal.com/invoices/xyz789',
});

await emailService.sendEmail({
  to: 'maria.gonzalez@example.com',
  subject: 'Nueva Factura Generada',
  html,
});
```

### Send Bulk Emails

```typescript
const emails = users.map(user => ({
  to: user.email,
  subject: 'System Maintenance Notice',
  html: EmailTemplates.genericNotification({
    userName: user.name,
    message: 'The system will be under maintenance from 2 AM to 4 AM.',
  }),
}));

const result = await emailService.sendBulkEmails(emails);
console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

## Available Email Templates

The system includes pre-designed HTML email templates:

1. **`eventReminder`** - Event and meeting reminders
2. **`taskAssignment`** - New task assignments
3. **`taskDueReminder`** - Task due date reminders
4. **`invoiceGenerated`** - New invoice notifications
5. **`paymentReceived`** - Payment confirmation
6. **`invoiceOverdue`** - Overdue invoice alerts
7. **`caseStatusUpdate`** - Case status change notifications
8. **`welcomeEmail`** - New user welcome
9. **`passwordReset`** - Password reset requests
10. **`genericNotification`** - General purpose notifications

All templates support Spanish localization and include responsive HTML design.

## Production Deployment

### Render Deployment

When deploying to Render, add environment variables:

1. Go to your service in Render Dashboard
2. Navigate to **Environment** tab
3. Add environment variables:
   ```
   SENDGRID_API_KEY=your_api_key
   FROM_EMAIL=noreply@your-domain.com
   FROM_NAME=Poweria Legal
   ```
4. Click **Save Changes**
5. Render will automatically redeploy with new variables

### Monitoring

SendGrid provides detailed analytics:
- Email delivery rates
- Open rates (if tracking enabled)
- Bounce rates
- Spam reports

Access these at: **SendGrid Dashboard** → **Activity** → **Stats**

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify the API key is correct in `.env`
2. **Check Sender**: Ensure sender email is verified in SendGrid
3. **Check Logs**: Look for error messages in application logs
4. **Check Quota**: Free tier has 100 emails/day limit
5. **Check Spam**: Emails might be in recipient's spam folder

### Invalid Email Error

```
Error: Invalid email address
```

Solution: Email service validates email format before sending. Ensure the recipient email is properly formatted.

### SendGrid API Error

```
Error: Email sending failed: <SendGrid error>
```

Common causes:
- Invalid API key
- Unverified sender
- Rate limit exceeded
- Account suspended

Check SendGrid Dashboard → Activity for detailed error messages.

## Security Best Practices

1. **Never commit** `.env` file or API keys to version control
2. **Rotate API keys** regularly (every 90 days)
3. **Use different keys** for development and production
4. **Limit permissions** - use "Mail Send" only if possible
5. **Monitor usage** to detect unauthorized access

## Support

For SendGrid support:
- Documentation: https://docs.sendgrid.com/
- Support: https://support.sendgrid.com/

For application issues:
- Check application logs
- Review `src/services/emailService.ts`
- Review `src/templates/emailTemplates.ts`

## Future Enhancements

Planned improvements:
- [ ] SMS integration with Twilio
- [ ] Push notifications with Firebase
- [ ] Email tracking and analytics
- [ ] Custom email templates per client
- [ ] Scheduled email sending
- [ ] Email queue for bulk sending
- [ ] Unsubscribe management
