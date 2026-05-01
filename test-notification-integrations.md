# Notification Integrations Testing Guide

## Quick Testing Commands

### Prerequisites
1. Configure environment variables in `.env`:
```bash
# Copy from template
cp .env.notification.template .env

# Edit .env and add your credentials
```

2. Start the server:
```bash
npm run dev
```

3. Get an authentication token:
```bash
# Login to get JWT token
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your_admin@example.com",
    "password": "your_password"
  }'

# Save the token from response
export JWT_TOKEN="your_token_here"
```

---

## Test 1: SMS Integration (Twilio)

### Basic SMS Test
```bash
curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "SMS",
    "recipient": "+1234567890",
    "body": "Test SMS from Legal RAG System - All systems operational!"
  }'
```

### Expected Response (Success)
```json
{
  "id": "notification-id",
  "status": "sent",
  "channel": "SMS",
  "recipient": "+1234567890",
  "sentAt": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response (Error - Missing Credentials)
```json
{
  "error": "Twilio credentials not configured"
}
```

### Verify in Twilio Console
1. Go to https://console.twilio.com/
2. Navigate to Messaging > Logs
3. Verify message was sent

---

## Test 2: Push Notification (Firebase)

### Basic Push Test
```bash
curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "PUSH",
    "recipient": "DEVICE_TOKEN_HERE",
    "subject": "Test Push Notification",
    "body": "This is a test push notification from Legal RAG System"
  }'
```

### Expected Response (Success)
```json
{
  "id": "notification-id",
  "status": "sent",
  "channel": "PUSH",
  "recipient": "DEVICE_TOKEN_HERE",
  "sentAt": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response (Error - Invalid Token)
```json
{
  "error": "Failed to send push notification"
}
```

### Verify in Firebase Console
1. Go to https://console.firebase.google.com/
2. Navigate to Cloud Messaging
3. Check message delivery status

---

## Test 3: Backup Email (SendGrid)

### Method 1: Direct Service Call (TypeScript)

Create a test file `test-backup-email.ts`:

```typescript
import { BackupNotificationService } from './src/services/backup/backup-notification.service';
import { BackupWebhookEvent } from './src/types/backup.types';

async function testBackupEmail() {
  const service = new BackupNotificationService();

  const result = await service.sendEmail(
    ['test@example.com'],
    {
      event: BackupWebhookEvent.BACKUP_COMPLETED,
      timestamp: new Date(),
      data: {
        backupId: 'test-backup-123',
        status: 'COMPLETED',
        message: 'Test backup completed successfully',
        metadata: {
          size: 1024000,
          compressedSize: 512000,
          compressionRatio: '50%',
          tableCount: 15,
          recordCount: 10000,
          duration: 45000
        }
      }
    }
  );

  console.log('Email result:', result);
}

testBackupEmail().catch(console.error);
```

Run the test:
```bash
npx tsx test-backup-email.ts
```

### Method 2: Trigger Real Backup

Create a backup to trigger automatic email notification:

```bash
curl -X POST http://localhost:5000/admin/backups \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-backup-with-email",
    "description": "Testing email notifications",
    "notificationEmails": ["admin@example.com", "backup-team@example.com"]
  }'
```

### Expected Email Content

**Subject:** `Backup Completed Successfully - test-backup-123`

**Body includes:**
- Backup ID
- Status (COMPLETED)
- Timestamp
- File size and compression details
- Number of tables and records backed up
- Professional HTML formatting

### Verify in SendGrid Console
1. Go to https://app.sendgrid.com/
2. Navigate to Activity
3. Search for recipient email
4. Check delivery status

---

## Test 4: Error Handling

### Test Missing Twilio Credentials
```bash
# Temporarily remove Twilio credentials from .env
# Then try sending SMS

curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "SMS",
    "recipient": "+1234567890",
    "body": "This should fail"
  }'
```

**Expected:** Error message about missing Twilio credentials

### Test Invalid Phone Number
```bash
curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "SMS",
    "recipient": "invalid-phone",
    "body": "This should fail"
  }'
```

**Expected:** Error from Twilio about invalid phone number format

### Test Invalid Device Token
```bash
curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "PUSH",
    "recipient": "invalid-token",
    "subject": "Test",
    "body": "This should fail"
  }'
```

**Expected:** Error from Firebase about invalid registration token

---

## Test 5: Notification Logs

### View Notification History
```bash
curl -X GET "http://localhost:5000/notifications/logs?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Expected Response
```json
{
  "logs": [
    {
      "id": "log-id",
      "channel": "SMS",
      "recipient": "+1234567890",
      "status": "sent",
      "sentAt": "2025-01-15T10:30:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### View Notification Statistics
```bash
curl -X GET http://localhost:5000/notifications/stats \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Expected Response
```json
{
  "total": 150,
  "sent": 145,
  "failed": 5,
  "pending": 0,
  "successRate": 97,
  "byChannel": {
    "EMAIL": 100,
    "SMS": 30,
    "PUSH": 15,
    "IN_APP": 5
  }
}
```

---

## Test 6: Template-Based Notifications

### Create a Template (Admin Only)
```bash
curl -X POST http://localhost:5000/notifications/templates \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Ready",
    "code": "DOCUMENT_READY",
    "channel": "SMS",
    "bodyTemplate": "Hi {{userName}}, your document {{documentName}} is ready for review.",
    "isActive": true
  }'
```

### Use Template to Send Notification
```bash
curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "DOCUMENT_READY",
    "channel": "SMS",
    "recipient": "+1234567890",
    "variables": {
      "userName": "John",
      "documentName": "Contract_2025.pdf"
    }
  }'
```

**Expected SMS:** "Hi John, your document Contract_2025.pdf is ready for review."

---

## Troubleshooting

### SMS Not Sending

**Check:**
1. Twilio credentials are correct in `.env`
2. Twilio account has sufficient balance
3. Phone number is in E.164 format (+1234567890)
4. Phone number is verified (if using trial account)

**Debug:**
```bash
# Check Twilio logs
# Go to https://console.twilio.com/us1/monitor/logs/sms

# Check application logs
tail -f logs/application.log | grep -i twilio
```

### Push Not Delivering

**Check:**
1. Firebase credentials are correct
2. Device token is valid and current
3. App has notification permissions
4. Private key format is correct (with \n escaped)

**Debug:**
```bash
# Check Firebase logs
# Go to https://console.firebase.google.com/ > Cloud Messaging

# Check application logs
tail -f logs/application.log | grep -i firebase
```

### Email Not Arriving

**Check:**
1. SendGrid API key is correct
2. Sender email is verified in SendGrid
3. Check spam folder
4. Recipient email is valid

**Debug:**
```bash
# Check SendGrid activity
# Go to https://app.sendgrid.com/activity

# Check application logs
tail -f logs/application.log | grep -i sendgrid
```

---

## Performance Testing

### Load Test SMS
```bash
# Send 10 SMS messages
for i in {1..10}; do
  curl -X POST http://localhost:5000/notifications/send \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"channel\": \"SMS\",
      \"recipient\": \"+1234567890\",
      \"body\": \"Load test message $i\"
    }" &
done
```

### Monitor Response Times
```bash
# Add timing to curl
time curl -X POST http://localhost:5000/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "SMS",
    "recipient": "+1234567890",
    "body": "Timing test"
  }'
```

---

## Integration Checklist

- [ ] SMS Integration
  - [ ] Credentials configured
  - [ ] Test message sent successfully
  - [ ] Error handling tested
  - [ ] Logs verified in Twilio console

- [ ] Push Integration
  - [ ] Firebase credentials configured
  - [ ] Test notification sent successfully
  - [ ] Error handling tested
  - [ ] Logs verified in Firebase console

- [ ] Email Integration
  - [ ] SendGrid API key configured
  - [ ] Sender email verified
  - [ ] Test email sent successfully
  - [ ] HTML template renders correctly
  - [ ] Logs verified in SendGrid dashboard

- [ ] General
  - [ ] Notification logs stored in database
  - [ ] Statistics endpoint working
  - [ ] Template system tested
  - [ ] Error handling verified
  - [ ] Performance acceptable

---

## Next Steps After Testing

1. **Production Configuration**
   - Move credentials to secure secret management
   - Configure production webhook URLs
   - Set up monitoring and alerts

2. **Scaling Considerations**
   - Implement queue for high-volume notifications
   - Add retry logic for failed notifications
   - Set up rate limiting per channel

3. **Monitoring**
   - Set up Prometheus metrics for notification delivery
   - Configure alerts for failure rates
   - Track costs per channel

4. **Documentation**
   - Update API documentation with notification endpoints
   - Document notification templates
   - Create runbook for troubleshooting
