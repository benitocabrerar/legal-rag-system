# Legal RAG System - Architecture Diagrams

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        THIRD[Third-party APIs]
    end

    subgraph "API Gateway Layer"
        GW[Fastify API Gateway<br/>Port 3000]
        AUTH[Auth Middleware<br/>JWT Validation]
        RATE[Rate Limiter<br/>Redis-based]
        VALID[Request Validation<br/>Zod Schemas]
    end

    subgraph "Service Layer"
        CAL[Calendar Service]
        TASK[Tasks Service]
        NOTIF[Notifications Service]
        FIN[Finance Service]
    end

    subgraph "Data Access Layer"
        PRISMA[Prisma ORM]
    end

    subgraph "Data Storage"
        PG[(PostgreSQL<br/>Main Database)]
        REDIS[(Redis<br/>Cache & Rate Limit)]
    end

    subgraph "Background Jobs"
        QUEUE[Bull Queue]
        EMAIL[Email Job]
        REMIND[Reminder Job]
        PDF[PDF Generation Job]
    end

    subgraph "External Services"
        SMTP[SMTP Server<br/>Email Delivery]
    end

    WEB --> GW
    MOBILE --> GW
    THIRD --> GW

    GW --> AUTH
    AUTH --> RATE
    RATE --> VALID
    VALID --> CAL
    VALID --> TASK
    VALID --> NOTIF
    VALID --> FIN

    CAL --> PRISMA
    TASK --> PRISMA
    NOTIF --> PRISMA
    FIN --> PRISMA

    PRISMA --> PG

    CAL -.-> REDIS
    TASK -.-> REDIS
    FIN -.-> REDIS
    RATE --> REDIS

    NOTIF --> QUEUE
    QUEUE --> EMAIL
    QUEUE --> REMIND
    FIN --> PDF

    EMAIL --> SMTP
```

---

## API Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant AUTH as Auth Middleware
    participant RL as Rate Limiter
    participant VAL as Validator
    participant SVC as Service Layer
    participant DB as Database
    participant CACHE as Redis Cache

    C->>GW: HTTP Request
    GW->>AUTH: Validate Token

    alt Token Invalid
        AUTH-->>C: 401 Unauthorized
    end

    AUTH->>RL: Check Rate Limit

    alt Rate Limit Exceeded
        RL-->>C: 429 Too Many Requests
    end

    RL->>VAL: Validate Request

    alt Validation Failed
        VAL-->>C: 400 Bad Request
    end

    VAL->>CACHE: Check Cache

    alt Cache Hit
        CACHE-->>C: 200 Cached Response
    end

    VAL->>SVC: Process Request
    SVC->>DB: Query Database
    DB-->>SVC: Return Data
    SVC->>CACHE: Update Cache
    SVC-->>C: 200 Success Response
```

---

## Database Schema Relationships

```mermaid
erDiagram
    User ||--o{ Event : creates
    User ||--o{ Task : "assigned to"
    User ||--o{ Task : creates
    User ||--o{ Notification : receives
    User ||--o{ Payment : records
    User ||--o{ Invoice : generates

    Case ||--o{ Event : "has events"
    Case ||--o{ Task : "has tasks"
    Case ||--o{ Notification : "related to"
    Case ||--o{ FinancialAgreement : "has agreements"
    Case ||--o{ Payment : "receives payments"
    Case ||--o{ Invoice : "has invoices"

    Event ||--o{ EventReminder : "has reminders"

    FinancialAgreement ||--o{ Payment : "receives"

    Event {
        string id PK
        string title
        datetime startDate
        datetime endDate
        boolean allDay
        string caseId FK
        string userId FK
        enum status
        enum priority
        boolean isRecurring
        json recurrence
    }

    EventReminder {
        string id PK
        string eventId FK
        int minutesBefore
        boolean sent
        datetime sentAt
    }

    Task {
        string id PK
        string title
        string caseId FK
        string assignedTo FK
        string createdBy FK
        enum status
        enum priority
        datetime dueDate
        datetime completedAt
        float estimatedHours
        float actualHours
        json checklist
        array tags
    }

    Notification {
        string id PK
        string userId FK
        string email
        enum type
        string title
        string message
        string caseId FK
        enum channel
        enum status
        datetime scheduledFor
        datetime sentAt
    }

    FinancialAgreement {
        string id PK
        string caseId FK
        enum type
        decimal totalAmount
        decimal hourlyRate
        decimal contingencyRate
        enum status
        decimal paidAmount
        decimal balanceAmount
    }

    Payment {
        string id PK
        string agreementId FK
        string caseId FK
        decimal amount
        enum method
        enum status
        datetime paymentDate
        datetime receivedDate
    }

    Invoice {
        string id PK
        string invoiceNumber
        string caseId FK
        json items
        decimal subtotal
        decimal taxAmount
        decimal total
        decimal paidAmount
        decimal balance
        enum status
        datetime dueDate
    }
```

---

## Calendar Module Architecture

```mermaid
graph LR
    subgraph "Calendar Routes"
        R1[GET /events]
        R2[POST /events]
        R3[GET /events/calendar/:month]
        R4[GET /events/upcoming]
        R5[GET /events/reminders]
    end

    subgraph "Calendar Service"
        S1[createEvent]
        S2[updateEvent]
        S3[deleteEvent]
        S4[getCalendarView]
        S5[getUpcoming]
        S6[scheduleReminders]
    end

    subgraph "Background Jobs"
        J1[Reminder Scheduler]
        J2[Recurring Events Generator]
        J3[Notification Sender]
    end

    subgraph "Database"
        DB1[(Event Table)]
        DB2[(EventReminder Table)]
    end

    R1 --> S1
    R2 --> S1
    R3 --> S4
    R4 --> S5
    R5 --> S6

    S1 --> DB1
    S2 --> DB1
    S3 --> DB1
    S4 --> DB1
    S5 --> DB1
    S6 --> DB2

    S1 --> J1
    S1 --> J2
    J1 --> J3
```

---

## Tasks Module Architecture

```mermaid
graph LR
    subgraph "Tasks Routes"
        R1[GET /tasks]
        R2[POST /tasks]
        R3[GET /tasks/overdue]
        R4[GET /tasks/urgent]
        R5[PATCH /tasks/:id/status]
    end

    subgraph "Tasks Service"
        S1[createTask]
        S2[updateTask]
        S3[getOverdue]
        S4[getUrgent]
        S5[updateStatus]
        S6[sendAssignmentNotification]
    end

    subgraph "Background Jobs"
        J1[Overdue Detection]
        J2[Urgent Task Alerts]
    end

    subgraph "Database"
        DB1[(Task Table)]
    end

    subgraph "Notifications"
        N1[Notification Service]
    end

    R1 --> S1
    R2 --> S1
    R3 --> S3
    R4 --> S4
    R5 --> S5

    S1 --> DB1
    S2 --> DB1
    S3 --> DB1
    S4 --> DB1
    S5 --> DB1

    S1 --> S6
    S5 --> S6
    S6 --> N1

    J1 --> N1
    J2 --> N1
```

---

## Notifications Module Architecture

```mermaid
graph TB
    subgraph "Notification Triggers"
        T1[Task Assigned]
        T2[Event Reminder]
        T3[Payment Received]
        T4[Invoice Generated]
        T5[Manual Notification]
    end

    subgraph "Notification Service"
        NS[Notification Service]
        TMP[Template Engine]
        SCHED[Scheduler]
    end

    subgraph "Delivery Channels"
        EMAIL[Email Channel]
        INAPP[In-App Channel]
    end

    subgraph "Storage"
        DB[(Notification Table)]
        QUEUE[Job Queue]
    end

    subgraph "External Services"
        SMTP[SMTP Server]
    end

    T1 --> NS
    T2 --> NS
    T3 --> NS
    T4 --> NS
    T5 --> NS

    NS --> TMP
    TMP --> SCHED

    SCHED --> EMAIL
    SCHED --> INAPP

    NS --> DB
    SCHED --> QUEUE

    EMAIL --> SMTP
    INAPP --> DB
```

---

## Finance Module Architecture

```mermaid
graph TB
    subgraph "Finance Routes"
        R1[POST /finance/agreements]
        R2[POST /finance/payments]
        R3[POST /finance/invoices]
        R4[GET /finance/overview]
        R5[GET /finance/analytics]
        R6[GET /finance/reports/monthly]
    end

    subgraph "Finance Service"
        S1[createAgreement]
        S2[recordPayment]
        S3[generateInvoice]
        S4[getOverview]
        S5[getAnalytics]
        S6[getMonthlyReport]
    end

    subgraph "Background Jobs"
        J1[Invoice PDF Generator]
        J2[Payment Reminder]
        J3[Analytics Calculator]
    end

    subgraph "Database"
        DB1[(FinancialAgreement)]
        DB2[(Payment)]
        DB3[(Invoice)]
    end

    subgraph "External"
        PDF[PDF Service]
        EMAIL[Email Service]
    end

    R1 --> S1
    R2 --> S2
    R3 --> S3
    R4 --> S4
    R5 --> S5
    R6 --> S6

    S1 --> DB1
    S2 --> DB2
    S3 --> DB3

    S3 --> J1
    S2 --> J2

    J1 --> PDF
    J2 --> EMAIL

    S4 --> DB1
    S4 --> DB2
    S4 --> DB3

    S5 --> J3
    J3 --> DB1
    J3 --> DB2
    J3 --> DB3
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant AUTH as Auth Service
    participant DB as Database
    participant CACHE as Redis

    C->>API: POST /auth/login
    API->>AUTH: Validate Credentials
    AUTH->>DB: Find User
    DB-->>AUTH: User Data
    AUTH->>AUTH: Verify Password

    alt Invalid Credentials
        AUTH-->>C: 401 Unauthorized
    end

    AUTH->>AUTH: Generate JWT
    AUTH->>CACHE: Store Refresh Token
    AUTH-->>C: Access Token + Refresh Token

    Note over C,API: Subsequent Requests

    C->>API: GET /events (with token)
    API->>AUTH: Validate JWT

    alt Token Expired
        AUTH-->>C: 401 Token Expired
        C->>API: POST /auth/refresh
        API->>CACHE: Validate Refresh Token
        CACHE-->>API: Token Valid
        API->>AUTH: Generate New Access Token
        AUTH-->>C: New Access Token
    end

    AUTH->>API: Token Valid
    API->>API: Process Request
    API-->>C: 200 Success
```

---

## Rate Limiting Flow

```mermaid
graph TB
    REQ[Incoming Request]
    EXTRACT[Extract Key<br/>user_id or IP]
    REDIS{Check Redis Counter}
    INCREMENT[Increment Counter]
    TTL{Has TTL?}
    SET_TTL[Set TTL]
    CHECK{Count > Limit?}
    ALLOW[Process Request]
    DENY[429 Too Many Requests]
    HEADERS[Add Rate Limit Headers]

    REQ --> EXTRACT
    EXTRACT --> REDIS
    REDIS --> INCREMENT
    INCREMENT --> TTL
    TTL -->|No| SET_TTL
    TTL -->|Yes| CHECK
    SET_TTL --> CHECK
    CHECK -->|No| HEADERS
    CHECK -->|Yes| DENY
    HEADERS --> ALLOW
```

---

## Caching Strategy

```mermaid
graph LR
    subgraph "Request Processing"
        REQ[Request]
        CACHE_CHECK{Cache Hit?}
        FETCH[Fetch from DB]
        CACHE_WRITE[Write to Cache]
        RETURN[Return Response]
    end

    subgraph "Cache Invalidation"
        UPDATE[Data Updated]
        INV_PATTERN[Invalidate Pattern]
        DEL_KEYS[Delete Cache Keys]
    end

    subgraph "Redis Cache"
        KEY1[event:*]
        KEY2[task:*]
        KEY3[finance:*]
        TTL[TTL: 3600s]
    end

    REQ --> CACHE_CHECK
    CACHE_CHECK -->|Yes| RETURN
    CACHE_CHECK -->|No| FETCH
    FETCH --> CACHE_WRITE
    CACHE_WRITE --> RETURN

    UPDATE --> INV_PATTERN
    INV_PATTERN --> DEL_KEYS

    CACHE_WRITE --> KEY1
    CACHE_WRITE --> KEY2
    CACHE_WRITE --> KEY3
    KEY1 --> TTL
    KEY2 --> TTL
    KEY3 --> TTL
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx Load Balancer]
    end

    subgraph "Application Servers"
        APP1[Fastify Instance 1]
        APP2[Fastify Instance 2]
        APP3[Fastify Instance 3]
    end

    subgraph "Data Layer"
        PG_MASTER[(PostgreSQL Master)]
        PG_REPLICA1[(PostgreSQL Replica 1)]
        PG_REPLICA2[(PostgreSQL Replica 2)]
        REDIS_CLUSTER[(Redis Cluster)]
    end

    subgraph "Background Workers"
        WORKER1[Bull Worker 1]
        WORKER2[Bull Worker 2]
    end

    subgraph "Monitoring"
        PROM[Prometheus]
        GRAF[Grafana]
        SENTRY[Sentry]
    end

    LB --> APP1
    LB --> APP2
    LB --> APP3

    APP1 --> PG_MASTER
    APP2 --> PG_MASTER
    APP3 --> PG_MASTER

    APP1 -.-> PG_REPLICA1
    APP2 -.-> PG_REPLICA1
    APP3 -.-> PG_REPLICA2

    APP1 --> REDIS_CLUSTER
    APP2 --> REDIS_CLUSTER
    APP3 --> REDIS_CLUSTER

    WORKER1 --> REDIS_CLUSTER
    WORKER2 --> REDIS_CLUSTER

    WORKER1 --> PG_MASTER
    WORKER2 --> PG_MASTER

    APP1 --> PROM
    APP2 --> PROM
    APP3 --> PROM

    PROM --> GRAF

    APP1 --> SENTRY
    APP2 --> SENTRY
    APP3 --> SENTRY

    PG_MASTER --> PG_REPLICA1
    PG_MASTER --> PG_REPLICA2
```

---

## Error Handling Flow

```mermaid
graph TB
    START[Request Received]
    TRY{Try Processing}
    AUTH_ERR{Auth Error?}
    VAL_ERR{Validation Error?}
    BIZ_ERR{Business Logic Error?}
    DB_ERR{Database Error?}
    UNKNOWN{Unknown Error?}

    LOG[Log Error]
    SENTRY[Send to Sentry]

    R401[Return 401]
    R400[Return 400]
    R422[Return 422]
    R500[Return 500]
    R200[Return Success]

    START --> TRY
    TRY -->|Error| AUTH_ERR
    TRY -->|Success| R200

    AUTH_ERR -->|Yes| LOG
    AUTH_ERR -->|No| VAL_ERR

    VAL_ERR -->|Yes| LOG
    VAL_ERR -->|No| BIZ_ERR

    BIZ_ERR -->|Yes| LOG
    BIZ_ERR -->|No| DB_ERR

    DB_ERR -->|Yes| LOG
    DB_ERR -->|No| UNKNOWN

    UNKNOWN --> LOG
    LOG --> SENTRY

    SENTRY -->|Auth| R401
    SENTRY -->|Validation| R400
    SENTRY -->|Business| R422
    SENTRY -->|Database| R500
    SENTRY -->|Unknown| R500
```

---

## Background Job Processing

```mermaid
sequenceDiagram
    participant APP as Application
    participant QUEUE as Bull Queue
    participant WORKER as Worker Process
    participant DB as Database
    participant SMTP as SMTP Server

    APP->>QUEUE: Add Job (Email)
    Note over QUEUE: Job stored in Redis

    WORKER->>QUEUE: Poll for Jobs
    QUEUE-->>WORKER: Job Data

    WORKER->>DB: Get Template
    DB-->>WORKER: Template

    WORKER->>WORKER: Render Template

    WORKER->>SMTP: Send Email

    alt Email Sent
        SMTP-->>WORKER: Success
        WORKER->>DB: Update Status (SENT)
        WORKER->>QUEUE: Job Complete
    else Email Failed
        SMTP-->>WORKER: Error
        WORKER->>DB: Update Status (FAILED)
        WORKER->>QUEUE: Retry Job
    end

    Note over QUEUE,WORKER: Max 3 retries
```

---

**End of Architecture Diagrams**
