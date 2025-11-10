# Legal RAG System - API Implementation Guide

## Architecture Overview

### Technology Stack

```
┌─────────────────────────────────────────────┐
│            Client Applications              │
│  (Web App, Mobile App, Third-party APIs)   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         API Gateway (Fastify)               │
│  - Authentication & Authorization           │
│  - Rate Limiting                            │
│  - Request Validation (Zod)                 │
│  - Error Handling                           │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌──────────────┐
│ Service Layer │   │ Cache Layer  │
│  - Business   │   │   (Redis)    │
│    Logic      │   └──────────────┘
│  - Validation │
└───────┬───────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│         Data Layer (Prisma ORM)             │
│  - PostgreSQL Database                      │
│  - Transaction Management                   │
│  - Query Optimization                       │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│         Background Jobs (Bull)              │
│  - Email Notifications                      │
│  - PDF Generation                           │
│  - Scheduled Reminders                      │
└─────────────────────────────────────────────┘
```

---

## Project Structure

```
legal/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── calendar.routes.ts       ✅ Created
│   │   │   │   ├── tasks.routes.ts          ✅ Created
│   │   │   │   ├── notifications.routes.ts  ⏳ To create
│   │   │   │   └── finance.routes.ts        ⏳ To create
│   │   │   ├── schemas/
│   │   │   │   ├── calendar.schemas.ts      ✅ Created
│   │   │   │   ├── tasks.schemas.ts         ✅ Created
│   │   │   │   ├── notifications.schemas.ts ✅ Created
│   │   │   │   └── finance.schemas.ts       ✅ Created
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts                  ✅ Created
│   │   │   │   ├── rate-limit.ts            ✅ Created
│   │   │   │   ├── error-handler.ts         ⏳ To create
│   │   │   │   └── logger.ts                ⏳ To create
│   │   │   ├── services/
│   │   │   │   ├── calendar.service.ts      ⏳ To create
│   │   │   │   ├── tasks.service.ts         ⏳ To create
│   │   │   │   ├── notifications.service.ts ⏳ To create
│   │   │   │   └── finance.service.ts       ⏳ To create
│   │   │   └── server.ts                    ⏳ To create
│   │   └── utils/
│   │       ├── validation.ts
│   │       ├── dates.ts
│   │       └── currency.ts
│   ├── prisma/
│   │   ├── schema.prisma                    ⏳ Update
│   │   └── schema-extensions.prisma         ✅ Created
│   └── jobs/
│       ├── email.job.ts
│       ├── reminders.job.ts
│       └── invoice.job.ts
├── docs/
│   ├── API_SPECIFICATION.md                 ✅ Created
│   ├── IMPLEMENTATION_GUIDE.md              ✅ Created (this file)
│   └── DEPLOYMENT.md                        ⏳ To create
├── tests/
│   ├── integration/
│   │   ├── calendar.test.ts
│   │   ├── tasks.test.ts
│   │   ├── notifications.test.ts
│   │   └── finance.test.ts
│   └── unit/
│       ├── services/
│       └── schemas/
└── package.json
```

---

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Database Setup
```bash
# Update main schema with extensions
cd prisma
cat schema-extensions.prisma >> schema.prisma

# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_calendar_tasks_finance
```

#### 1.2 Environment Variables
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/legalrag"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-token-secret"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
NODE_ENV="development"
API_PORT="3000"
```

#### 1.3 Install Dependencies
```bash
npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit
npm install zod
npm install jsonwebtoken bcrypt
npm install ioredis
npm install nodemailer
npm install bull
npm install pdfkit
npm install @prisma/client

# Dev dependencies
npm install -D @types/node @types/jsonwebtoken @types/bcrypt
npm install -D @types/nodemailer
npm install -D ts-node typescript
npm install -D vitest @vitest/ui
```

---

### Phase 2: Calendar & Events API (Week 2)

#### 2.1 Implementation Checklist

- [x] Database schema for events and reminders
- [x] Zod validation schemas
- [x] Calendar routes implementation
- [ ] Calendar service layer
- [ ] Recurring events logic
- [ ] Reminder scheduling job
- [ ] Integration tests
- [ ] API documentation examples

#### 2.2 Service Layer Example
```typescript
// src/lib/api/services/calendar.service.ts
import { PrismaClient } from '@prisma/client';
import { CreateEventInput } from '../schemas/calendar.schemas';

export class CalendarService {
  constructor(private prisma: PrismaClient) {}

  async createEvent(userId: string, data: CreateEventInput) {
    // Validate case access
    if (data.caseId) {
      const hasAccess = await this.validateCaseAccess(userId, data.caseId);
      if (!hasAccess) {
        throw new Error('No access to this case');
      }
    }

    // Handle recurring events
    const events = data.isRecurring
      ? await this.createRecurringEvents(userId, data)
      : await this.createSingleEvent(userId, data);

    // Schedule reminders
    await this.scheduleReminders(events);

    return events;
  }

  private async createRecurringEvents(userId: string, data: CreateEventInput) {
    const occurrences = this.generateRecurrences(data);

    return Promise.all(
      occurrences.map(occurrence =>
        this.prisma.event.create({
          data: {
            ...data,
            userId,
            startDate: occurrence.start,
            endDate: occurrence.end,
            reminders: {
              create: data.reminders.map(min => ({ minutesBefore: min })),
            },
          },
        })
      )
    );
  }

  private generateRecurrences(data: CreateEventInput) {
    // Implement recurrence logic based on data.recurrence
    const { frequency, interval, endDate } = data.recurrence!;
    const occurrences = [];

    let currentDate = new Date(data.startDate);
    const stopDate = endDate ? new Date(endDate) : this.getDefaultEndDate();

    while (currentDate <= stopDate) {
      occurrences.push({
        start: new Date(currentDate),
        end: new Date(currentDate.getTime() +
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime())),
      });

      currentDate = this.incrementDate(currentDate, frequency, interval);
    }

    return occurrences;
  }
}
```

---

### Phase 3: Tasks API (Week 3)

#### 3.1 Implementation Checklist

- [x] Database schema for tasks
- [x] Zod validation schemas
- [x] Task routes implementation
- [ ] Task service layer
- [ ] Task assignment notifications
- [ ] Overdue task detection job
- [ ] Task completion tracking
- [ ] Integration tests

#### 3.2 Background Job Example
```typescript
// src/jobs/overdue-tasks.job.ts
import { Queue, Worker } from 'bull';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../lib/api/services/notifications.service';

const overdueTaskQueue = new Queue('overdue-tasks', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Schedule job to run every hour
overdueTaskQueue.add(
  'check-overdue',
  {},
  {
    repeat: { cron: '0 * * * *' }, // Every hour
  }
);

const worker = new Worker('overdue-tasks', async (job) => {
  const prisma = new PrismaClient();
  const notificationService = new NotificationService(prisma);

  try {
    const now = new Date();

    // Find tasks that just became overdue
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: now,
          gte: new Date(now.getTime() - 3600000), // Last hour
        },
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
      include: {
        user: true,
        case: true,
      },
    });

    // Send notifications
    for (const task of overdueTasks) {
      await notificationService.send({
        userId: task.assignedTo,
        type: 'TASK_OVERDUE',
        title: 'Task Overdue',
        message: `Task "${task.title}" is now overdue`,
        taskId: task.id,
        caseId: task.caseId || undefined,
        channel: 'BOTH',
      });
    }

    return { processed: overdueTasks.length };
  } finally {
    await prisma.$disconnect();
  }
});
```

---

### Phase 4: Notifications API (Week 4)

#### 4.1 Implementation Checklist

- [x] Database schema for notifications
- [x] Zod validation schemas
- [ ] Notification routes implementation
- [ ] Notification service with email
- [ ] Template engine integration
- [ ] Scheduled notifications job
- [ ] Email delivery tracking
- [ ] Integration tests

#### 4.2 Email Service Example
```typescript
// src/lib/api/services/email.service.ts
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

export class EmailService {
  private transporter;

  constructor(private prisma: PrismaClient) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendTemplatedEmail(
    to: string,
    templateId: string,
    variables: Record<string, any>
  ) {
    // Get template
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Replace variables
    const subject = this.replaceVariables(template.subject, variables);
    const body = this.replaceVariables(template.body, variables);

    // Send email
    const result = await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text: body,
      html: this.convertToHtml(body),
    });

    return result;
  }

  private replaceVariables(text: string, variables: Record<string, any>) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private convertToHtml(text: string) {
    return `<html><body>${text.replace(/\n/g, '<br>')}</body></html>`;
  }
}
```

---

### Phase 5: Finance API (Week 5-6)

#### 5.1 Implementation Checklist

- [x] Database schema for finance
- [x] Zod validation schemas
- [ ] Finance routes implementation
- [ ] Finance service layer
- [ ] Invoice PDF generation
- [ ] Payment processing integration
- [ ] Financial reports generation
- [ ] Analytics calculations
- [ ] Integration tests

#### 5.2 Invoice Generation Example
```typescript
// src/lib/api/services/invoice.service.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

export class InvoiceService {
  constructor(private prisma: PrismaClient) {}

  async generateInvoice(invoiceId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        case: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Generate PDF
    const doc = new PDFDocument();
    const fileName = `${invoice.invoiceNumber}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', 'invoices', fileName);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text('INVOICE', { align: 'right' })
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' })
      .text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, {
        align: 'right',
      })
      .moveDown();

    // Client info
    doc
      .fontSize(12)
      .text('Bill To:', { underline: true })
      .fontSize(10)
      .text(invoice.clientName)
      .text(invoice.clientEmail || '')
      .moveDown();

    // Line items
    doc.fontSize(12).text('Description', 50, 250);
    doc.text('Qty', 300, 250);
    doc.text('Rate', 350, 250);
    doc.text('Amount', 450, 250);
    doc.moveTo(50, 265).lineTo(550, 265).stroke();

    let y = 280;
    const items = invoice.items as any[];

    items.forEach((item) => {
      doc.fontSize(10);
      doc.text(item.description, 50, y);
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`$${item.rate.toFixed(2)}`, 350, y);
      doc.text(`$${item.amount.toFixed(2)}`, 450, y);
      y += 20;
    });

    // Totals
    y += 20;
    doc.fontSize(12);
    doc.text('Subtotal:', 350, y);
    doc.text(`$${invoice.subtotal}`, 450, y);

    y += 20;
    doc.text('Tax:', 350, y);
    doc.text(`$${invoice.taxAmount}`, 450, y);

    y += 20;
    doc.fontSize(14);
    doc.text('Total:', 350, y);
    doc.text(`$${invoice.total}`, 450, y);

    // Footer
    if (invoice.notes) {
      doc.moveDown().fontSize(10).text(`Notes: ${invoice.notes}`);
    }

    doc.end();

    // Wait for file to be written
    await new Promise((resolve) => stream.on('finish', resolve));

    // Update invoice with PDF URL
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        pdfUrl: `/invoices/${fileName}`,
      },
    });

    return `/invoices/${fileName}`;
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// tests/unit/services/calendar.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarService } from '../../../src/lib/api/services/calendar.service';
import { PrismaClient } from '@prisma/client';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    service = new CalendarService(prisma);
  });

  it('should create a single event', async () => {
    const data = {
      title: 'Test Meeting',
      startDate: '2025-01-20T10:00:00Z',
      endDate: '2025-01-20T11:00:00Z',
      isRecurring: false,
      reminders: [15],
    };

    const result = await service.createEvent('user_123', data);

    expect(result).toBeDefined();
    expect(result.title).toBe('Test Meeting');
  });

  it('should create recurring events', async () => {
    const data = {
      title: 'Weekly Meeting',
      startDate: '2025-01-20T10:00:00Z',
      endDate: '2025-01-20T11:00:00Z',
      isRecurring: true,
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        endDate: '2025-03-20T00:00:00Z',
      },
      reminders: [15],
    };

    const results = await service.createEvent('user_123', data);

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(1);
  });
});
```

### Integration Tests
```typescript
// tests/integration/calendar.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { calendarRoutes } from '../../src/lib/api/routes/calendar.routes';

describe('Calendar API Integration', () => {
  const app = Fastify();
  let token: string;

  beforeAll(async () => {
    await app.register(calendarRoutes, { prefix: '/api/v1' });
    await app.ready();

    // Get auth token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    token = JSON.parse(loginResponse.payload).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /events should return paginated events', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/events?page=1&limit=20',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('events');
    expect(body).toHaveProperty('pagination');
  });

  it('POST /events should create new event', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: 'Test Event',
        startDate: '2025-01-20T10:00:00Z',
        endDate: '2025-01-20T11:00:00Z',
        reminders: [15],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.title).toBe('Test Event');
  });
});
```

---

## Performance Optimization

### Database Indexing
```sql
-- Calendar Events
CREATE INDEX idx_events_user_id ON "Event"(userId);
CREATE INDEX idx_events_case_id ON "Event"(caseId);
CREATE INDEX idx_events_start_date ON "Event"(startDate);
CREATE INDEX idx_events_status ON "Event"(status);

-- Tasks
CREATE INDEX idx_tasks_assigned_to ON "Task"(assignedTo);
CREATE INDEX idx_tasks_case_id ON "Task"(caseId);
CREATE INDEX idx_tasks_status ON "Task"(status);
CREATE INDEX idx_tasks_due_date ON "Task"(dueDate);

-- Finance
CREATE INDEX idx_payments_case_id ON "Payment"(caseId);
CREATE INDEX idx_payments_agreement_id ON "Payment"(agreementId);
CREATE INDEX idx_invoices_case_id ON "Invoice"(caseId);
CREATE INDEX idx_invoices_status ON "Invoice"(status);
```

### Caching Strategy
```typescript
// src/lib/api/services/cache.service.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Usage in service
async getEvent(id: string) {
  const cacheKey = `event:${id}`;

  // Try cache first
  let event = await this.cache.get(cacheKey);

  if (!event) {
    // Fetch from database
    event = await this.prisma.event.findUnique({ where: { id } });

    // Cache for 1 hour
    if (event) {
      await this.cache.set(cacheKey, event, 3600);
    }
  }

  return event;
}
```

---

## Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Redis connection verified
- [ ] SMTP credentials verified
- [ ] API documentation updated
- [ ] Security audit completed
- [ ] Performance testing done

### Production Environment

```bash
# Database
DATABASE_URL="postgresql://prod_user:secure_pass@db.production.com:5432/legalrag_prod"

# Security
JWT_SECRET="<generate-strong-random-secret>"
JWT_REFRESH_SECRET="<generate-another-strong-secret>"

# Redis
REDIS_HOST="redis.production.com"
REDIS_PORT="6379"
REDIS_PASSWORD="<redis-password>"

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="<sendgrid-api-key>"

# Application
NODE_ENV="production"
API_PORT="3000"
API_BASE_URL="https://api.legalrag.com"
```

### Monitoring

- Set up error tracking (Sentry)
- Configure application metrics (Prometheus)
- Set up uptime monitoring (UptimeRobot)
- Enable request logging
- Configure alerts for critical errors

---

## Next Steps

1. **Complete remaining route implementations**
   - Notifications routes
   - Finance routes

2. **Implement service layer**
   - Extract business logic from routes
   - Add comprehensive error handling

3. **Set up background jobs**
   - Email sending
   - Reminder scheduling
   - Invoice generation

4. **Write comprehensive tests**
   - Unit tests for all services
   - Integration tests for all endpoints
   - E2E tests for critical flows

5. **Performance optimization**
   - Add caching layer
   - Optimize database queries
   - Implement connection pooling

6. **Security hardening**
   - Add CORS configuration
   - Implement CSRF protection
   - Add input sanitization
   - Set up security headers

---

**Version:** 1.0
**Last Updated:** January 2025
