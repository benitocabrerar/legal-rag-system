# Legal RAG System - REST API Specification v1.0

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Calendar & Events API](#calendar--events-api)
- [Tasks API](#tasks-api)
- [Notifications API](#notifications-api)
- [Finance API](#finance-api)
- [Appendix](#appendix)

---

## Overview

### Base URL
```
Production: https://api.legalrag.com/api/v1
Development: http://localhost:3000/api/v1
```

### Content Type
All requests and responses use `application/json` unless specified otherwise.

### Versioning
API version is included in the URL path: `/api/v1/*`

### Response Format
```json
{
  "data": {},
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## Authentication

### Bearer Token Authentication
All API endpoints (except login/register) require a valid JWT token in the Authorization header.

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authentication Endpoints

#### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "john@lawfirm.com",
  "password": "SecurePass123!"
}
```

**Response: 200 OK**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user_123",
    "email": "john@lawfirm.com",
    "name": "John Doe",
    "role": "LAWYER"
  }
}
```

**curl Example:**
```bash
curl -X POST https://api.legalrag.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@lawfirm.com",
    "password": "SecurePass123!"
  }'
```

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Read (GET) | 300 requests | 1 minute |
| Write (POST/PUT/PATCH) | 100 requests | 1 minute |
| Delete | 50 requests | 1 minute |
| Auth | 10 requests | 1 minute |

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642089600
```

### Rate Limit Exceeded Response: 429
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content to return |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate, etc.) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Codes

```typescript
enum ErrorCode {
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Authorization
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Business Logic
  INVALID_OPERATION = 'INVALID_OPERATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // System
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

---

## Calendar & Events API

### Overview
Manage calendar events, appointments, deadlines, and reminders for cases.

### Endpoints Summary

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| GET | /events | List all events | Required | 300/min |
| GET | /events/calendar/:month | Calendar view | Required | 300/min |
| GET | /cases/:id/events | Case events | Required | 300/min |
| POST | /events | Create event | Required | 100/min |
| PUT | /events/:id | Update event | Required | 100/min |
| DELETE | /events/:id | Delete event | Required | 50/min |
| GET | /events/upcoming | Upcoming events | Required | 300/min |
| GET | /events/reminders | Pending reminders | Required | 300/min |

---

### GET /events
List all events with filtering and pagination.

**Query Parameters:**
```typescript
{
  caseId?: string;          // Filter by case
  status?: EventStatus;     // SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
  priority?: Priority;      // LOW | MEDIUM | HIGH | URGENT
  startDate?: string;       // ISO 8601 datetime
  endDate?: string;         // ISO 8601 datetime
  page?: number;            // Default: 1
  limit?: number;           // Default: 20, Max: 100
  sortBy?: string;          // startDate | priority | title | createdAt
  sortOrder?: 'asc' | 'desc'; // Default: asc
}
```

**Response: 200 OK**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "title": "Client Meeting - Smith vs. Johnson",
      "description": "Initial consultation regarding contract dispute",
      "startDate": "2025-01-20T10:00:00Z",
      "endDate": "2025-01-20T11:30:00Z",
      "allDay": false,
      "location": "Conference Room A",
      "caseId": "case_xyz789",
      "userId": "user_123",
      "color": "#3b82f6",
      "status": "SCHEDULED",
      "priority": "HIGH",
      "isRecurring": false,
      "recurrence": null,
      "reminders": [
        {
          "id": "rem_001",
          "minutesBefore": 30,
          "sent": false
        }
      ],
      "case": {
        "id": "case_xyz789",
        "caseNumber": "2025-001",
        "title": "Smith vs. Johnson - Contract Dispute"
      },
      "createdAt": "2025-01-15T09:00:00Z",
      "updatedAt": "2025-01-15T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**curl Example:**
```bash
curl -X GET "https://api.legalrag.com/api/v1/events?page=1&limit=20&status=SCHEDULED" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /events/calendar/:month
Get calendar view for a specific month.

**Path Parameters:**
- `month`: YYYY-MM format (e.g., "2025-01")

**Response: 200 OK**
```json
{
  "month": "2025-01",
  "events": [...],  // Array of event objects
  "summary": {
    "totalEvents": 12,
    "byStatus": {
      "SCHEDULED": 8,
      "IN_PROGRESS": 2,
      "COMPLETED": 2
    },
    "byPriority": {
      "HIGH": 3,
      "MEDIUM": 6,
      "LOW": 3
    }
  }
}
```

**curl Example:**
```bash
curl -X GET "https://api.legalrag.com/api/v1/events/calendar/2025-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /events
Create a new calendar event.

**Request Body:**
```json
{
  "title": "Court Hearing - Deposition",
  "description": "Witness deposition for Smith case",
  "startDate": "2025-01-25T14:00:00Z",
  "endDate": "2025-01-25T16:00:00Z",
  "allDay": false,
  "location": "County Courthouse, Room 301",
  "caseId": "case_xyz789",
  "color": "#ef4444",
  "priority": "URGENT",
  "isRecurring": false,
  "reminders": [15, 60, 1440]
}
```

**Response: 201 Created**
```json
{
  "id": "evt_new123",
  "title": "Court Hearing - Deposition",
  "startDate": "2025-01-25T14:00:00Z",
  "endDate": "2025-01-25T16:00:00Z",
  "status": "SCHEDULED",
  "reminders": [
    {
      "id": "rem_001",
      "minutesBefore": 15,
      "sent": false
    },
    {
      "id": "rem_002",
      "minutesBefore": 60,
      "sent": false
    },
    {
      "id": "rem_003",
      "minutesBefore": 1440,
      "sent": false
    }
  ],
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/events" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Court Hearing - Deposition",
    "startDate": "2025-01-25T14:00:00Z",
    "endDate": "2025-01-25T16:00:00Z",
    "caseId": "case_xyz789",
    "priority": "URGENT",
    "reminders": [15, 60, 1440]
  }'
```

---

### PUT /events/:id
Update an existing event.

**Path Parameters:**
- `id`: Event ID

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Meeting Title",
  "startDate": "2025-01-25T15:00:00Z",
  "status": "IN_PROGRESS"
}
```

**Response: 200 OK**
```json
{
  "id": "evt_abc123",
  "title": "Updated Meeting Title",
  "startDate": "2025-01-25T15:00:00Z",
  "status": "IN_PROGRESS",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

---

### GET /events/upcoming
Get upcoming events within specified days.

**Query Parameters:**
```typescript
{
  days?: number;   // Default: 7, Max: 90
  limit?: number;  // Default: 20, Max: 100
}
```

**Response: 200 OK**
```json
{
  "events": [...],  // Array of upcoming events
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**curl Example:**
```bash
curl -X GET "https://api.legalrag.com/api/v1/events/upcoming?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Tasks API

### Overview
Manage tasks, assignments, and to-do items for cases and team members.

### Endpoints Summary

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| GET | /tasks | List all tasks | Required | 300/min |
| GET | /tasks/overdue | Overdue tasks | Required | 300/min |
| GET | /tasks/urgent | Urgent tasks | Required | 300/min |
| GET | /tasks/completed | Completed tasks | Required | 300/min |
| GET | /cases/:id/tasks | Case tasks | Required | 300/min |
| POST | /tasks | Create task | Required | 100/min |
| PUT | /tasks/:id | Update task | Required | 100/min |
| PATCH | /tasks/:id/status | Update status | Required | 200/min |
| DELETE | /tasks/:id | Delete task | Required | 50/min |

---

### GET /tasks
List all tasks with filtering.

**Query Parameters:**
```typescript
{
  caseId?: string;
  assignedTo?: string;
  status?: TaskStatus;  // PENDING | IN_PROGRESS | REVIEW | COMPLETED | CANCELLED
  priority?: Priority;  // LOW | MEDIUM | HIGH | URGENT
  tags?: string[];
  dueBefore?: string;   // ISO 8601 datetime
  dueAfter?: string;
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  sortBy?: string;      // dueDate | priority | title | createdAt | status
  sortOrder?: 'asc' | 'desc';
}
```

**Response: 200 OK**
```json
{
  "tasks": [
    {
      "id": "task_abc123",
      "title": "Review contract amendments",
      "description": "Review and approve contract changes for Smith case",
      "caseId": "case_xyz789",
      "assignedTo": "user_456",
      "createdBy": "user_123",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "dueDate": "2025-01-20T17:00:00Z",
      "completedAt": null,
      "estimatedHours": 3,
      "actualHours": null,
      "checklist": [
        {
          "id": "chk_001",
          "text": "Review Section 1",
          "completed": true
        },
        {
          "id": "chk_002",
          "text": "Review Section 2",
          "completed": false
        }
      ],
      "attachments": [],
      "tags": ["contract", "review", "urgent"],
      "case": {
        "id": "case_xyz789",
        "caseNumber": "2025-001",
        "title": "Smith vs. Johnson"
      },
      "assignee": {
        "id": "user_456",
        "name": "Jane Smith",
        "email": "jane@lawfirm.com"
      },
      "isOverdue": false,
      "daysUntilDue": 5,
      "completionRate": 50,
      "createdAt": "2025-01-15T09:00:00Z",
      "updatedAt": "2025-01-15T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 28,
    "totalPages": 2
  },
  "summary": {
    "totalTasks": 28,
    "byStatus": {
      "PENDING": 5,
      "IN_PROGRESS": 12,
      "REVIEW": 3,
      "COMPLETED": 8
    },
    "byPriority": {
      "HIGH": 7,
      "MEDIUM": 15,
      "LOW": 6
    },
    "overdue": 3
  }
}
```

**curl Example:**
```bash
curl -X GET "https://api.legalrag.com/api/v1/tasks?status=IN_PROGRESS&priority=HIGH" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /tasks/overdue
Get all overdue tasks.

**Query Parameters:**
```typescript
{
  assignedTo?: string;
  priority?: Priority;
  page?: number;
  limit?: number;
}
```

**Response: 200 OK**
```json
{
  "tasks": [
    {
      "id": "task_overdue1",
      "title": "File motion to dismiss",
      "dueDate": "2025-01-10T17:00:00Z",
      "status": "PENDING",
      "priority": "URGENT",
      "isOverdue": true,
      "daysUntilDue": -5
    }
  ],
  "pagination": {...}
}
```

---

### POST /tasks
Create a new task.

**Request Body:**
```json
{
  "title": "Prepare discovery documents",
  "description": "Gather and organize all discovery materials for upcoming hearing",
  "caseId": "case_xyz789",
  "assignedTo": "user_456",
  "priority": "HIGH",
  "dueDate": "2025-01-30T17:00:00Z",
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
}
```

**Response: 201 Created**
```json
{
  "id": "task_new123",
  "title": "Prepare discovery documents",
  "status": "PENDING",
  "createdBy": "user_123",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prepare discovery documents",
    "caseId": "case_xyz789",
    "assignedTo": "user_456",
    "priority": "HIGH",
    "dueDate": "2025-01-30T17:00:00Z",
    "tags": ["discovery", "hearing"]
  }'
```

---

### PATCH /tasks/:id/status
Update task status (quick status change).

**Path Parameters:**
- `id`: Task ID

**Request Body:**
```json
{
  "status": "COMPLETED",
  "completedAt": "2025-01-15T16:00:00Z",
  "actualHours": 7.5
}
```

**Response: 200 OK**
```json
{
  "id": "task_abc123",
  "status": "COMPLETED",
  "completedAt": "2025-01-15T16:00:00Z",
  "actualHours": 7.5,
  "updatedAt": "2025-01-15T16:00:00Z"
}
```

**curl Example:**
```bash
curl -X PATCH "https://api.legalrag.com/api/v1/tasks/task_abc123/status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "actualHours": 7.5
  }'
```

---

## Notifications API

### Overview
Manage email notifications, in-app alerts, and scheduled reminders.

### Endpoints Summary

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| POST | /notifications/send | Send notification | Required | 100/min |
| GET | /notifications | Notification history | Required | 300/min |
| POST | /notifications/email/user | Email to user | Required | 50/min |
| POST | /notifications/email/client | Email to client | Required | 50/min |
| GET | /notifications/templates | List templates | Required | 300/min |
| POST | /notifications/schedule | Schedule reminder | Required | 100/min |

---

### POST /notifications/send
Send immediate notification.

**Request Body:**
```json
{
  "userId": "user_456",
  "type": "TASK_ASSIGNED",
  "title": "New Task Assigned",
  "message": "You have been assigned a new task: Review contract amendments",
  "caseId": "case_xyz789",
  "taskId": "task_abc123",
  "channel": "BOTH"
}
```

**Response: 201 Created**
```json
{
  "id": "notif_abc123",
  "status": "SENT",
  "message": "Notification sent successfully",
  "scheduledFor": null
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/notifications/send" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456",
    "type": "TASK_ASSIGNED",
    "title": "New Task Assigned",
    "message": "You have been assigned: Review contract amendments",
    "channel": "BOTH"
  }'
```

---

### POST /notifications/email/user
Send custom email to internal user.

**Request Body:**
```json
{
  "userId": "user_456",
  "subject": "Urgent: Case Update Required",
  "body": "Please review and update the Smith case status by EOD.",
  "html": "<p>Please review and update the <strong>Smith case</strong> status by EOD.</p>",
  "caseId": "case_xyz789",
  "attachments": [
    {
      "filename": "case_summary.pdf",
      "path": "/uploads/docs/case_summary.pdf"
    }
  ]
}
```

**Response: 200 OK**
```json
{
  "id": "notif_email_001",
  "status": "SENT",
  "message": "Email sent successfully",
  "sentAt": "2025-01-15T10:30:00Z"
}
```

---

### POST /notifications/email/client
Send email to external client.

**Request Body:**
```json
{
  "email": "client@example.com",
  "name": "John Smith",
  "subject": "Case Update: Smith vs. Johnson",
  "body": "Dear Mr. Smith,\n\nWe wanted to update you on the progress of your case...",
  "html": "<p>Dear Mr. Smith,</p><p>We wanted to update you on the progress of your case...</p>",
  "caseId": "case_xyz789",
  "templateId": "tpl_case_update"
}
```

**Response: 200 OK**
```json
{
  "id": "notif_client_001",
  "status": "SENT",
  "message": "Client email sent successfully",
  "sentAt": "2025-01-15T10:35:00Z"
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/notifications/email/client" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "subject": "Case Update",
    "body": "Your case has been updated...",
    "caseId": "case_xyz789"
  }'
```

---

### GET /notifications/templates
List available email templates.

**Response: 200 OK**
```json
{
  "templates": [
    {
      "id": "tpl_001",
      "name": "task_assigned",
      "subject": "New Task Assigned: {{taskTitle}}",
      "body": "You have been assigned a new task:\n\nTask: {{taskTitle}}\nDue Date: {{dueDate}}\nPriority: {{priority}}",
      "type": "TASK_ASSIGNED",
      "isActive": true,
      "variables": ["taskTitle", "dueDate", "priority"],
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "tpl_002",
      "name": "case_update",
      "subject": "Case Update: {{caseNumber}}",
      "body": "Your case {{caseNumber}} has been updated...",
      "type": "CASE_UPDATE",
      "isActive": true,
      "variables": ["caseNumber", "updateDetails"],
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 10
}
```

---

### POST /notifications/schedule
Schedule a future reminder.

**Request Body:**
```json
{
  "type": "DEADLINE_APPROACHING",
  "title": "Deadline Reminder",
  "message": "Filing deadline for Smith case is in 24 hours",
  "scheduledFor": "2025-01-24T09:00:00Z",
  "userId": "user_123",
  "caseId": "case_xyz789",
  "channel": "BOTH"
}
```

**Response: 201 Created**
```json
{
  "id": "notif_sched_001",
  "status": "SCHEDULED",
  "message": "Reminder scheduled successfully",
  "scheduledFor": "2025-01-24T09:00:00Z"
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/notifications/schedule" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DEADLINE_APPROACHING",
    "title": "Deadline Reminder",
    "message": "Filing deadline in 24 hours",
    "scheduledFor": "2025-01-24T09:00:00Z",
    "userId": "user_123",
    "channel": "EMAIL"
  }'
```

---

## Finance API

### Overview
Manage financial agreements, payments, invoices, and financial reporting.

### Endpoints Summary

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| GET | /finance/cases/:id | Case balance | Required | 300/min |
| GET | /finance/clients/:id | Client balance | Required | 300/min |
| GET | /finance/overview | Overall balance | Required | 300/min |
| POST | /finance/agreements | Create agreement | Required | 100/min |
| POST | /finance/payments | Record payment | Required | 100/min |
| GET | /finance/invoices | List invoices | Required | 300/min |
| POST | /finance/invoices | Generate invoice | Required | 100/min |
| GET | /finance/reports/monthly | Monthly report | Required | 100/min |
| GET | /finance/reports/annual | Annual report | Required | 100/min |
| GET | /finance/analytics | Financial analytics | Required | 100/min |

---

### GET /finance/cases/:id
Get complete financial overview for a case.

**Path Parameters:**
- `id`: Case ID

**Response: 200 OK**
```json
{
  "caseId": "case_xyz789",
  "caseNumber": "2025-001",
  "title": "Smith vs. Johnson - Contract Dispute",
  "agreements": [
    {
      "id": "agr_abc123",
      "type": "HOURLY",
      "totalAmount": "25000.00",
      "hourlyRate": "350.00",
      "status": "ACTIVE",
      "paidAmount": "15000.00",
      "balanceAmount": "10000.00",
      "signedDate": "2025-01-01T00:00:00Z"
    }
  ],
  "payments": [
    {
      "id": "pay_001",
      "amount": "5000.00",
      "method": "BANK_TRANSFER",
      "status": "CLEARED",
      "paymentDate": "2025-01-05T00:00:00Z"
    },
    {
      "id": "pay_002",
      "amount": "10000.00",
      "method": "CHECK",
      "status": "CLEARED",
      "paymentDate": "2025-01-10T00:00:00Z"
    }
  ],
  "invoices": [
    {
      "id": "inv_001",
      "invoiceNumber": "INV-2025-001",
      "total": "8500.00",
      "paidAmount": "8500.00",
      "balance": "0.00",
      "status": "PAID",
      "dueDate": "2025-01-15T00:00:00Z"
    }
  ],
  "summary": {
    "totalAgreed": "25000.00",
    "totalPaid": "15000.00",
    "totalOutstanding": "10000.00",
    "totalInvoiced": "8500.00",
    "unpaidInvoices": "0.00"
  }
}
```

**curl Example:**
```bash
curl -X GET "https://api.legalrag.com/api/v1/finance/cases/case_xyz789" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /finance/agreements
Create new financial agreement for a case.

**Request Body:**
```json
{
  "caseId": "case_xyz789",
  "type": "HOURLY",
  "totalAmount": 25000,
  "currency": "USD",
  "hourlyRate": 350,
  "paymentTerms": "Net 30 days from invoice date",
  "installments": 1,
  "signedDate": "2025-01-01T00:00:00Z"
}
```

**Response: 201 Created**
```json
{
  "id": "agr_new123",
  "caseId": "case_xyz789",
  "type": "HOURLY",
  "totalAmount": "25000.00",
  "status": "ACTIVE",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/finance/agreements" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "type": "HOURLY",
    "totalAmount": 25000,
    "hourlyRate": 350,
    "signedDate": "2025-01-01T00:00:00Z"
  }'
```

---

### POST /finance/payments
Record a payment received.

**Request Body:**
```json
{
  "agreementId": "agr_abc123",
  "caseId": "case_xyz789",
  "amount": 5000,
  "currency": "USD",
  "method": "BANK_TRANSFER",
  "referenceNumber": "TXN-12345",
  "paymentDate": "2025-01-15T00:00:00Z",
  "receivedDate": "2025-01-15T10:00:00Z",
  "notes": "First installment payment"
}
```

**Response: 201 Created**
```json
{
  "id": "pay_new001",
  "amount": "5000.00",
  "status": "RECEIVED",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/finance/payments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agreementId": "agr_abc123",
    "caseId": "case_xyz789",
    "amount": 5000,
    "method": "BANK_TRANSFER",
    "paymentDate": "2025-01-15T00:00:00Z"
  }'
```

---

### POST /finance/invoices
Generate new invoice.

**Request Body:**
```json
{
  "caseId": "case_xyz789",
  "clientName": "John Smith",
  "clientEmail": "john@example.com",
  "dueDate": "2025-02-15T00:00:00Z",
  "items": [
    {
      "description": "Legal consultation (10 hours)",
      "quantity": 10,
      "rate": 350,
      "amount": 3500
    },
    {
      "description": "Document preparation",
      "quantity": 1,
      "rate": 1500,
      "amount": 1500
    }
  ],
  "taxRate": 8.5,
  "paymentTerms": "Net 30 days",
  "notes": "Thank you for your business"
}
```

**Response: 201 Created**
```json
{
  "id": "inv_new001",
  "invoiceNumber": "INV-2025-042",
  "subtotal": "5000.00",
  "taxAmount": "425.00",
  "total": "5425.00",
  "balance": "5425.00",
  "status": "DRAFT",
  "pdfUrl": "/invoices/INV-2025-042.pdf",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**curl Example:**
```bash
curl -X POST "https://api.legalrag.com/api/v1/finance/invoices" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_xyz789",
    "clientName": "John Smith",
    "dueDate": "2025-02-15T00:00:00Z",
    "items": [
      {
        "description": "Legal consultation",
        "quantity": 10,
        "rate": 350,
        "amount": 3500
      }
    ]
  }'
```

---

### GET /finance/overview
Get overall financial overview.

**Response: 200 OK**
```json
{
  "summary": {
    "totalRevenue": "500000.00",
    "totalReceived": "375000.00",
    "totalOutstanding": "125000.00",
    "totalInvoiced": "450000.00",
    "unpaidInvoices": "75000.00",
    "activeCases": 12
  },
  "byAgreementType": {
    "HOURLY": {
      "count": 8,
      "totalAmount": "300000.00",
      "paidAmount": "225000.00",
      "balance": "75000.00"
    },
    "FLAT_FEE": {
      "count": 3,
      "totalAmount": "150000.00",
      "paidAmount": "120000.00",
      "balance": "30000.00"
    },
    "CONTINGENCY": {
      "count": 1,
      "totalAmount": "50000.00",
      "paidAmount": "30000.00",
      "balance": "20000.00"
    }
  },
  "byPaymentMethod": {
    "BANK_TRANSFER": {
      "count": 25,
      "totalAmount": "250000.00"
    },
    "CHECK": {
      "count": 15,
      "totalAmount": "100000.00"
    },
    "CREDIT_CARD": {
      "count": 8,
      "totalAmount": "25000.00"
    }
  },
  "recentPayments": [...],  // Last 10 payments
  "overdueInvoices": [...]  // Up to 10 overdue invoices
}
```

---

### GET /finance/reports/monthly
Get monthly financial report.

**Query Parameters:**
```typescript
{
  month: string;    // YYYY-MM format (e.g., "2025-01")
  caseId?: string;  // Optional: filter by case
}
```

**Response: 200 OK**
```json
{
  "month": "2025-01",
  "revenue": {
    "total": "45000.00",
    "byType": {
      "HOURLY": "30000.00",
      "FLAT_FEE": "12000.00",
      "CONTINGENCY": "3000.00"
    }
  },
  "payments": {
    "total": "38000.00",
    "count": 12,
    "byMethod": {
      "BANK_TRANSFER": "25000.00",
      "CHECK": "10000.00",
      "CREDIT_CARD": "3000.00"
    }
  },
  "invoices": {
    "generated": 8,
    "totalAmount": "42000.00",
    "paid": 5,
    "paidAmount": "28000.00",
    "overdue": 1,
    "overdueAmount": "5000.00"
  },
  "newCases": 3,
  "activeCases": 12
}
```

**curl Example:**
```bash
curl -X GET "https://api.legalrag.com/api/v1/finance/reports/monthly?month=2025-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /finance/analytics
Get financial analytics with trends and projections.

**Query Parameters:**
```typescript
{
  startDate: string;    // ISO 8601 datetime
  endDate: string;      // ISO 8601 datetime
  groupBy?: string;     // day | week | month | quarter (default: month)
  caseId?: string;      // Optional: filter by case
}
```

**Response: 200 OK**
```json
{
  "period": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "groupBy": "month"
  },
  "revenue": {
    "total": "540000.00",
    "trend": [
      {
        "period": "2024-01",
        "amount": "42000.00"
      },
      {
        "period": "2024-02",
        "amount": "48000.00"
      }
      // ... more periods
    ],
    "growth": 15.5  // Percentage
  },
  "payments": {
    "total": "480000.00",
    "count": 145,
    "averageAmount": "3310.34",
    "trend": [...]
  },
  "invoices": {
    "total": 96,
    "paid": 82,
    "overdue": 8,
    "averageDaysToPay": 18,
    "collectionRate": 85.4
  },
  "topCases": [
    {
      "caseId": "case_001",
      "caseNumber": "2024-015",
      "title": "Major Corp vs. Competitor",
      "revenue": "85000.00",
      "payments": "75000.00"
    }
    // ... up to 10 cases
  ],
  "projections": {
    "nextMonth": "52000.00",
    "nextQuarter": "156000.00"
  }
}
```

**curl Example:**
```bash
curl -X GET "https://api.legalrag.com/api/v1/finance/analytics?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&groupBy=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Appendix

### Data Types Reference

#### Event
```typescript
interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;  // ISO 8601
  endDate: string;    // ISO 8601
  allDay: boolean;
  location?: string;
  caseId?: string;
  userId: string;
  color: string;      // Hex color
  status: EventStatus;
  priority: Priority;
  isRecurring: boolean;
  recurrence?: Recurrence;
  reminders: Reminder[];
  createdAt: string;
  updatedAt: string;
}

enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
```

#### Task
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  caseId?: string;
  assignedTo: string;
  createdBy: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  checklist: ChecklistItem[];
  attachments: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
```

#### Financial Agreement
```typescript
interface FinancialAgreement {
  id: string;
  caseId: string;
  type: AgreementType;
  totalAmount: string;  // Decimal as string
  currency: string;
  hourlyRate?: string;
  contingencyRate?: string;
  flatFee?: string;
  retainerAmount?: string;
  paymentTerms?: string;
  installments: number;
  status: AgreementStatus;
  signedDate?: string;
  paidAmount: string;
  balanceAmount: string;
  createdAt: string;
  updatedAt: string;
}

enum AgreementType {
  HOURLY = 'HOURLY',
  CONTINGENCY = 'CONTINGENCY',
  FLAT_FEE = 'FLAT_FEE',
  RETAINER = 'RETAINER',
  HYBRID = 'HYBRID',
}
```

### Common Patterns

#### Pagination
All list endpoints support pagination:
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### Filtering
Use query parameters for filtering:
```
?status=ACTIVE&priority=HIGH&page=1&limit=20
```

#### Sorting
Use `sortBy` and `sortOrder` parameters:
```
?sortBy=dueDate&sortOrder=desc
```

#### Date Ranges
Use ISO 8601 datetime format:
```
?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z
```

### Security Best Practices

1. **Always use HTTPS** in production
2. **Never expose sensitive data** in URLs or logs
3. **Validate all input** on both client and server
4. **Use parameterized queries** to prevent SQL injection
5. **Implement proper CORS** policies
6. **Rotate JWT secrets** regularly
7. **Log all financial transactions** for audit trails
8. **Encrypt sensitive data** at rest

### Performance Optimization

1. **Use Redis caching** for frequently accessed data
2. **Implement database indexing** on commonly queried fields
3. **Use connection pooling** for database connections
4. **Paginate large result sets** (default: 20 items)
5. **Implement rate limiting** to prevent abuse
6. **Use database read replicas** for heavy read operations

### Support & Resources

- **API Documentation**: https://docs.legalrag.com/api
- **Support Email**: support@legalrag.com
- **Status Page**: https://status.legalrag.com
- **GitHub Issues**: https://github.com/legalrag/api/issues

---

**Version:** 1.0
**Last Updated:** January 2025
**License:** Proprietary
