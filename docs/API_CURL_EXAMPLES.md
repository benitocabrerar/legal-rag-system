# Legal RAG System - Complete curl Examples

This document provides ready-to-use curl commands for testing all API endpoints.

## Setup

Export your auth token as an environment variable:
```bash
export TOKEN="your-jwt-token-here"
export API_URL="http://localhost:3000/api/v1"
```

Or for production:
```bash
export TOKEN="your-jwt-token-here"
export API_URL="https://api.legalrag.com/api/v1"
```

---

## Authentication

### Login
```bash
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@lawfirm.com",
    "password": "SecurePass123!"
  }'
```

### Extract Token (jq)
```bash
TOKEN=$(curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@lawfirm.com","password":"SecurePass123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

---

## Calendar & Events API

### List All Events
```bash
curl -X GET "$API_URL/events?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter Events by Status
```bash
curl -X GET "$API_URL/events?status=SCHEDULED&priority=HIGH" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter Events by Date Range
```bash
curl -X GET "$API_URL/events?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Calendar View (Monthly)
```bash
curl -X GET "$API_URL/events/calendar/2025-01" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Events for Specific Case
```bash
curl -X GET "$API_URL/cases/case_xyz789/events" \
  -H "Authorization: Bearer $TOKEN"
```

### Create Simple Event
```bash
curl -X POST "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Client Meeting",
    "startDate": "2025-01-25T14:00:00Z",
    "endDate": "2025-01-25T15:00:00Z",
    "priority": "HIGH",
    "reminders": [15, 60]
  }'
```

### Create Event with Case
```bash
curl -X POST "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Court Hearing - Smith Case",
    "description": "Final hearing for contract dispute",
    "startDate": "2025-02-10T09:00:00Z",
    "endDate": "2025-02-10T12:00:00Z",
    "location": "County Courthouse, Room 301",
    "caseId": "case_xyz789",
    "priority": "URGENT",
    "color": "#ef4444",
    "reminders": [1440, 120, 30]
  }'
```

### Create Recurring Event
```bash
curl -X POST "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Team Meeting",
    "startDate": "2025-01-22T10:00:00Z",
    "endDate": "2025-01-22T11:00:00Z",
    "location": "Conference Room A",
    "priority": "MEDIUM",
    "isRecurring": true,
    "recurrence": {
      "frequency": "weekly",
      "interval": 1,
      "endDate": "2025-06-22T00:00:00Z"
    },
    "reminders": [15]
  }'
```

### Update Event
```bash
curl -X PUT "$API_URL/events/evt_abc123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Meeting Title",
    "startDate": "2025-01-25T15:00:00Z",
    "status": "IN_PROGRESS"
  }'
```

### Delete Event
```bash
curl -X DELETE "$API_URL/events/evt_abc123" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Upcoming Events (Next 7 Days)
```bash
curl -X GET "$API_URL/events/upcoming?days=7&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Pending Reminders
```bash
curl -X GET "$API_URL/events/reminders" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Tasks API

### List All Tasks
```bash
curl -X GET "$API_URL/tasks?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter Tasks by Status
```bash
curl -X GET "$API_URL/tasks?status=IN_PROGRESS&priority=HIGH" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter Tasks by Tags
```bash
curl -X GET "$API_URL/tasks?tags=contract,urgent" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Overdue Tasks
```bash
curl -X GET "$API_URL/tasks/overdue" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Urgent Tasks (Due in 48 Hours)
```bash
curl -X GET "$API_URL/tasks/urgent?hoursUntilDue=48" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Completed Tasks
```bash
curl -X GET "$API_URL/tasks/completed?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Tasks for Case
```bash
curl -X GET "$API_URL/cases/case_xyz789/tasks" \
  -H "Authorization: Bearer $TOKEN"
```

### Create Simple Task
```bash
curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review contract amendments",
    "assignedTo": "user_456",
    "priority": "HIGH",
    "dueDate": "2025-01-30T17:00:00Z"
  }'
```

### Create Task with Checklist
```bash
curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prepare discovery documents",
    "description": "Gather all materials for upcoming hearing",
    "caseId": "case_xyz789",
    "assignedTo": "user_456",
    "priority": "HIGH",
    "dueDate": "2025-02-05T17:00:00Z",
    "estimatedHours": 8,
    "checklist": [
      {
        "id": "chk_001",
        "text": "Collect witness statements",
        "completed": false
      },
      {
        "id": "chk_002",
        "text": "Organize evidence files",
        "completed": false
      },
      {
        "id": "chk_003",
        "text": "Draft discovery summary",
        "completed": false
      }
    ],
    "tags": ["discovery", "hearing", "evidence"]
  }'
```

### Update Task
```bash
curl -X PUT "$API_URL/tasks/task_abc123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "description": "Updated task description"
  }'
```

### Update Task Status (Quick Update)
```bash
curl -X PATCH "$API_URL/tasks/task_abc123/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "actualHours": 7.5
  }'
```

### Delete Task
```bash
curl -X DELETE "$API_URL/tasks/task_abc123" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notifications API

### Send Immediate Notification
```bash
curl -X POST "$API_URL/notifications/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456",
    "type": "TASK_ASSIGNED",
    "title": "New Task Assigned",
    "message": "You have been assigned: Review contract amendments",
    "taskId": "task_abc123",
    "caseId": "case_xyz789",
    "channel": "BOTH"
  }'
```

### Get Notification History
```bash
curl -X GET "$API_URL/notifications?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter Notifications by Type
```bash
curl -X GET "$API_URL/notifications?type=TASK_ASSIGNED&status=SENT" \
  -H "Authorization: Bearer $TOKEN"
```

### Send Email to User
```bash
curl -X POST "$API_URL/notifications/email/user" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456",
    "subject": "Urgent: Case Update Required",
    "body": "Please review and update the Smith case status by EOD.",
    "caseId": "case_xyz789"
  }'
```

### Send Email to Client
```bash
curl -X POST "$API_URL/notifications/email/client" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "name": "John Smith",
    "subject": "Case Update: Smith vs. Johnson",
    "body": "Dear Mr. Smith,\n\nWe wanted to update you on the progress of your case...",
    "caseId": "case_xyz789"
  }'
```

### Get Available Templates
```bash
curl -X GET "$API_URL/notifications/templates" \
  -H "Authorization: Bearer $TOKEN"
```

### Schedule Future Reminder
```bash
curl -X POST "$API_URL/notifications/schedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DEADLINE_APPROACHING",
    "title": "Deadline Reminder",
    "message": "Filing deadline for Smith case is in 24 hours",
    "scheduledFor": "2025-01-24T09:00:00Z",
    "userId": "user_123",
    "caseId": "case_xyz789",
    "channel": "EMAIL"
  }'
```

---

## Finance API

### Get Case Balance
```bash
curl -X GET "$API_URL/finance/cases/case_xyz789" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Client Balance
```bash
curl -X GET "$API_URL/finance/clients/client_123" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Financial Overview
```bash
curl -X GET "$API_URL/finance/overview" \
  -H "Authorization: Bearer $TOKEN"
```

### Create Hourly Agreement
```bash
curl -X POST "$API_URL/finance/agreements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "type": "HOURLY",
    "totalAmount": 25000,
    "hourlyRate": 350,
    "paymentTerms": "Net 30 days from invoice date",
    "signedDate": "2025-01-01T00:00:00Z"
  }'
```

### Create Contingency Agreement
```bash
curl -X POST "$API_URL/finance/agreements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "type": "CONTINGENCY",
    "totalAmount": 100000,
    "contingencyRate": 33.33,
    "paymentTerms": "Payment due upon settlement",
    "signedDate": "2025-01-01T00:00:00Z"
  }'
```

### Create Flat Fee Agreement
```bash
curl -X POST "$API_URL/finance/agreements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "type": "FLAT_FEE",
    "totalAmount": 15000,
    "flatFee": 15000,
    "installments": 3,
    "paymentTerms": "3 equal installments over 90 days",
    "signedDate": "2025-01-01T00:00:00Z"
  }'
```

### Record Payment
```bash
curl -X POST "$API_URL/finance/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agreementId": "agr_abc123",
    "caseId": "case_xyz789",
    "amount": 5000,
    "method": "BANK_TRANSFER",
    "referenceNumber": "TXN-12345",
    "paymentDate": "2025-01-15T00:00:00Z",
    "notes": "First installment payment"
  }'
```

### List Invoices
```bash
curl -X GET "$API_URL/finance/invoices?status=SENT&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Generate Invoice
```bash
curl -X POST "$API_URL/finance/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "clientName": "John Smith",
    "clientEmail": "john@example.com",
    "dueDate": "2025-02-15T00:00:00Z",
    "items": [
      {
        "description": "Legal consultation (10 hours @ $350/hr)",
        "quantity": 10,
        "rate": 350,
        "amount": 3500
      },
      {
        "description": "Document preparation and review",
        "quantity": 1,
        "rate": 1500,
        "amount": 1500
      },
      {
        "description": "Court filing fees",
        "quantity": 1,
        "rate": 450,
        "amount": 450
      }
    ],
    "taxRate": 8.5,
    "paymentTerms": "Net 30 days",
    "notes": "Thank you for your business. Please remit payment within 30 days."
  }'
```

### Get Monthly Report
```bash
curl -X GET "$API_URL/finance/reports/monthly?month=2025-01" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Annual Report
```bash
curl -X GET "$API_URL/finance/reports/annual?year=2024" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Financial Analytics
```bash
curl -X GET "$API_URL/finance/analytics?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&groupBy=month" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Case-Specific Analytics
```bash
curl -X GET "$API_URL/finance/analytics?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&caseId=case_xyz789" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complex Workflow Examples

### Complete Case Setup
```bash
# 1. Create financial agreement
AGREEMENT_ID=$(curl -X POST "$API_URL/finance/agreements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "type": "HOURLY",
    "totalAmount": 25000,
    "hourlyRate": 350,
    "signedDate": "2025-01-01T00:00:00Z"
  }' | jq -r '.id')

echo "Agreement created: $AGREEMENT_ID"

# 2. Create initial task
TASK_ID=$(curl -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Initial case review",
    "caseId": "case_xyz789",
    "assignedTo": "user_456",
    "priority": "HIGH",
    "dueDate": "2025-01-25T17:00:00Z"
  }' | jq -r '.id')

echo "Task created: $TASK_ID"

# 3. Schedule first meeting
EVENT_ID=$(curl -X POST "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Initial client consultation",
    "caseId": "case_xyz789",
    "startDate": "2025-01-20T10:00:00Z",
    "endDate": "2025-01-20T11:30:00Z",
    "priority": "HIGH",
    "reminders": [1440, 60]
  }' | jq -r '.id')

echo "Event created: $EVENT_ID"

# 4. Send notification to assigned lawyer
curl -X POST "$API_URL/notifications/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"user_456\",
    \"type\": \"CASE_UPDATE\",
    \"title\": \"New Case Assigned\",
    \"message\": \"You have been assigned to case xyz789\",
    \"caseId\": \"case_xyz789\",
    \"channel\": \"BOTH\"
  }"

echo "Setup complete!"
```

### Monthly Billing Workflow
```bash
# 1. Get case financial summary
curl -X GET "$API_URL/finance/cases/case_xyz789" \
  -H "Authorization: Bearer $TOKEN" \
  > case_finances.json

# 2. Generate invoice
INVOICE_ID=$(curl -X POST "$API_URL/finance/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "clientName": "John Smith",
    "clientEmail": "john@example.com",
    "dueDate": "2025-02-15T00:00:00Z",
    "items": [
      {
        "description": "Legal services - January 2025",
        "quantity": 20,
        "rate": 350,
        "amount": 7000
      }
    ],
    "taxRate": 8.5
  }' | jq -r '.id')

echo "Invoice created: $INVOICE_ID"

# 3. Send invoice to client
curl -X POST "$API_URL/notifications/email/client" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"john@example.com\",
    \"name\": \"John Smith\",
    \"subject\": \"Invoice for Legal Services - January 2025\",
    \"body\": \"Please find attached your invoice for this month.\",
    \"caseId\": \"case_xyz789\"
  }"

echo "Invoice sent to client!"
```

---

## Testing & Debugging

### Pretty Print JSON Response
```bash
curl -X GET "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

### Save Response to File
```bash
curl -X GET "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  -o events_response.json
```

### Show Only HTTP Status
```bash
curl -X POST "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' \
  -o /dev/null \
  -w "%{http_code}\n"
```

### Verbose Output (Show Headers)
```bash
curl -v -X GET "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN"
```

### Timing Information
```bash
curl -X GET "$API_URL/events" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nTime: %{time_total}s\n"
```

---

## Batch Operations

### Create Multiple Events
```bash
for i in {1..5}; do
  curl -X POST "$API_URL/events" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Meeting $i\",
      \"startDate\": \"2025-01-$((20 + i))T10:00:00Z\",
      \"endDate\": \"2025-01-$((20 + i))T11:00:00Z\",
      \"priority\": \"MEDIUM\",
      \"reminders\": [15]
    }"
  echo ""
done
```

### Bulk Task Creation from CSV
```bash
# tasks.csv format: title,assignedTo,priority,dueDate
while IFS=, read -r title assignee priority due; do
  curl -X POST "$API_URL/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"$title\",
      \"assignedTo\": \"$assignee\",
      \"priority\": \"$priority\",
      \"dueDate\": \"$due\"
    }"
  echo ""
done < tasks.csv
```

---

**Tip:** Save these examples as shell scripts for quick testing!

```bash
# Save as test-api.sh
chmod +x test-api.sh
./test-api.sh
```
