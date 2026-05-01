# Notification Service Integrations - Implementation Guide

## Overview

This guide documents the implementation of SMS, Push, and Email notification integrations for the Legal RAG System.

## Implemented Services

### 1. SMS Integration (Twilio) - BE-006
**Status:** ✅ Complete
**File:** `src/routes/notifications-enhanced.ts`
**Lines:** 441-452

#### Implementation Details
- Integrated Twilio SDK for SMS delivery
- Error handling with detailed logging
- Supports international phone numbers

#### Configuration Required
```bash
# .env file
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
```

#### Usage Example
```typescript
POST /notifications/send
{
  "channel": "SMS",
  "recipient": "+1234567890",
  "body": "Your legal document has been processed.",
  "metadata": {}
}
```

#### Error Handling
- Validates Twilio credentials on initialization
- Throws descriptive errors if credentials missing
- Logs failures for debugging

---

### 2. Push Notification Integration (Firebase) - BE-007
**Status:** ✅ Complete
**File:** `src/routes/notifications-enhanced.ts`
**Lines:** 460-480

#### Implementation Details
- Integrated Firebase Cloud Messaging (FCM)
- Singleton pattern for Firebase Admin initialization
- Support for custom data payload

#### Configuration Required
```bash
# .env file
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

**Important:** The private key must include `\n` for line breaks, which will be replaced with actual newlines in the code.

#### Getting Firebase Credentials
1. Go to Firebase Console → Project Settings
2. Service Accounts tab
3. Generate new private key
4. Extract `project_id`, `client_email`, and `private_key` from downloaded JSON

#### Usage Example
```typescript
POST /notifications/send
{
  "channel": "PUSH",
  "recipient": "device_token_here",
  "subject": "New Document",
  "body": "A new legal document requires your attention.",
  "metadata": {}
}
```

#### Message Structure
```typescript
{
  token: "device_token",
  notification: {
    title: "Subject or default title",
    body: "Message body"
  },
  data: {
    type: "notification",
    timestamp: "ISO_8601_timestamp"
  }
}
```

---

### 3. Email Integration for Backups (SendGrid) - BE-008
**Status:** ✅ Complete
**File:** `src/services/backup/backup-notification.service.ts`
**Lines:** 145-199

#### Implementation Details
- Integrated SendGrid Mail Send API
- Singleton initialization pattern
- Rich HTML email templates for backup events
- Supports multiple recipients

#### Configuration Required
```bash
# .env file
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTIFICATION_FROM_EMAIL=backups@legal-rag.com  # Optional, defaults to backups@legal-rag.com
```

#### Getting SendGrid API Key
1. Sign up at https://sendgrid.com
2. Go to Settings → API Keys
3. Create API Key with "Mail Send" permissions
4. Copy and store securely

#### Supported Backup Events
- `BACKUP_STARTED` - Backup process initiated
- `BACKUP_COMPLETED` - Backup successful with metadata
- `BACKUP_FAILED` - Backup failed with error details
- `RESTORE_STARTED` - Restore process initiated
- `RESTORE_COMPLETED` - Restore successful with statistics
- `RESTORE_FAILED` - Restore failed with error details

#### Email Template Features
- Professional HTML formatting
- Color-coded status (success/error)
- Detailed backup metadata
- Human-readable file sizes and durations
- Responsive design

#### Usage Example
```typescript
const notificationService = new BackupNotificationService();

await notificationService.sendEmail(
  ['admin@legal-rag.com', 'backup-team@legal-rag.com'],
  {
    event: 'BACKUP_COMPLETED',
    timestamp: new Date(),
    data: {
      backupId: 'backup-123',
      status: 'COMPLETED',
      message: 'Backup completed successfully',
      metadata: {
        size: 1024000,
        compressedSize: 512000,
        compressionRatio: '50%',
        tableCount: 15,
        recordCount: 10000
      }
    }
  }
);
```

---

## Installation

All required dependencies have been installed:

```bash
npm install twilio firebase-admin @sendgrid/mail
```

### Installed Versions
- `twilio`: Latest
- `firebase-admin`: Latest
- `@sendgrid/mail`: ^8.1.6 (already installed)

---

## Security Best Practices

### 1. Environment Variables
- Never commit credentials to version control
- Use `.env.local` for local development
- Use secure secret management in production (AWS Secrets Manager, HashiCorp Vault, etc.)

### 2. API Key Rotation
- Rotate Twilio auth tokens periodically
- Rotate SendGrid API keys every 90 days
- Update Firebase service account keys annually

### 3. Rate Limiting
- Twilio has default rate limits per account
- SendGrid free tier: 100 emails/day
- Firebase FCM: 1M messages/month free tier

### 4. Error Handling
- All integrations include try-catch blocks
- Failed notifications are logged but don't crash the system
- Notification failures update the NotificationLog status to 'failed'

---

## Testing

### Test SMS Integration
```bash
curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "SMS",
    "recipient": "+1234567890",
    "body": "Test SMS from Legal RAG System"
  }'
```

### Test Push Notification
```bash
curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "PUSH",
    "recipient": "DEVICE_TOKEN",
    "subject": "Test Push",
    "body": "Test push notification from Legal RAG System"
  }'
```

### Test Backup Email
```typescript
// In your test script or route
import { BackupNotificationService } from './services/backup/backup-notification.service';

const service = new BackupNotificationService();
await service.sendEmail(
  ['test@example.com'],
  {
    event: 'BACKUP_COMPLETED',
    timestamp: new Date(),
    data: {
      backupId: 'test-backup',
      status: 'COMPLETED',
      message: 'Test backup notification'
    }
  }
);
```

---

## Monitoring and Logging

### Notification Logs
All notifications are tracked in the `NotificationLog` table with:
- Status: `pending`, `sent`, `failed`
- Error messages for failed notifications
- Timestamps for audit trail

### Query Notification Statistics
```bash
GET /notifications/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

Response:
```json
{
  "total": 1500,
  "sent": 1450,
  "failed": 50,
  "pending": 0,
  "successRate": 97,
  "byChannel": {
    "EMAIL": 1000,
    "SMS": 300,
    "PUSH": 150,
    "IN_APP": 50
  }
}
```

---

## Troubleshooting

### Twilio SMS Issues
**Problem:** SMS not delivered
**Solutions:**
1. Verify phone number format (E.164: +1234567890)
2. Check Twilio account balance
3. Verify number is not blocked
4. Check Twilio console for delivery status

### Firebase Push Issues
**Problem:** Push notification not received
**Solutions:**
1. Verify device token is valid and current
2. Check Firebase project configuration
3. Ensure app has notification permissions
4. Verify private key format (newlines correctly escaped)

### SendGrid Email Issues
**Problem:** Emails not delivered
**Solutions:**
1. Check spam folder
2. Verify sender email is verified in SendGrid
3. Check SendGrid activity dashboard
4. Verify API key has Mail Send permissions
5. Check daily sending limit

---

## Architecture Decisions

### Why These Services?

1. **Twilio (SMS)**
   - Industry standard for SMS
   - Reliable delivery
   - Global coverage
   - Good documentation

2. **Firebase (Push)**
   - Unified solution for iOS and Android
   - Free tier generous for most use cases
   - Easy client SDK integration
   - Real-time message delivery

3. **SendGrid (Email)**
   - Already integrated in the system
   - Reliable delivery infrastructure
   - Good template support
   - Comprehensive analytics

### Singleton Pattern
- Firebase Admin SDK initialized once per application lifecycle
- SendGrid API key set once to avoid repeated configuration
- Twilio client created per request (stateless)

### Error Handling Strategy
- Notifications are "best effort" - failures don't block main operations
- All errors logged for debugging
- Failed notifications marked in database for retry/investigation
- User-friendly error messages without exposing credentials

---

## Production Deployment Checklist

- [ ] Set all environment variables in production environment
- [ ] Verify SendGrid sender email
- [ ] Test all three notification channels
- [ ] Set up monitoring alerts for notification failures
- [ ] Configure rate limiting per channel
- [ ] Document escalation procedures for critical failures
- [ ] Set up log aggregation for notification errors
- [ ] Configure backup notification recipients
- [ ] Test email deliverability to common providers (Gmail, Outlook, etc.)
- [ ] Verify phone number compliance with local regulations

---

## Future Enhancements

### Potential Improvements
1. **Retry Logic**
   - Implement exponential backoff for failed notifications
   - Queue system for retry attempts
   - Dead letter queue for permanently failed notifications

2. **Template Management**
   - Web UI for managing notification templates
   - A/B testing for notification content
   - Multi-language support

3. **Analytics Dashboard**
   - Real-time notification delivery metrics
   - Channel performance comparison
   - Cost tracking per channel

4. **Advanced Features**
   - SMS delivery receipts
   - Push notification analytics
   - Email open/click tracking
   - User notification preferences

---

## Support and Resources

### Documentation Links
- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [SendGrid API Documentation](https://docs.sendgrid.com/)

### Internal Resources
- Notification route: `src/routes/notifications-enhanced.ts`
- Backup notification service: `src/services/backup/backup-notification.service.ts`
- Notification types: `@prisma/client` - `NotificationChannel` enum

---

## Summary

All three notification integrations (BE-006, BE-007, BE-008) have been successfully implemented with:

✅ Proper error handling
✅ Comprehensive logging
✅ Environment-based configuration
✅ Production-ready code
✅ Security best practices
✅ Detailed documentation

The system is ready for testing and production deployment once environment variables are configured.
