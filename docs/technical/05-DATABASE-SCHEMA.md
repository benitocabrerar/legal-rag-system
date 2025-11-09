# Database Schema Documentation - Legal RAG System

## Database Technology

- **Database**: PostgreSQL 14+
- **ORM**: Prisma Client 5.10.0
- **Host**: Render.com (Managed PostgreSQL)
- **Connection**: SSL Required
- **Backup**: Automated daily backups

## Schema Overview

The database consists of **6 core models**:

1. **User** - User accounts and authentication
2. **Case** - Legal cases managed by users
3. **Document** - Case documents
4. **DocumentChunk** - Text segments with embeddings
5. **LegalDocument** - Global legal reference documents
6. **LegalDocumentChunk** - Chunks of legal documents

```
┌──────────┐
│   User   │
└────┬─────┘
     │
     │ owns
     │
     ├─────────────────────┐
     │                     │
     ▼                     ▼
┌──────────┐         ┌──────────────┐
│   Case   │         │LegalDocument │
└────┬─────┘         └──────┬───────┘
     │                      │
     │ has                  │ has
     │                      │
     ▼                      ▼
┌──────────┐         ┌────────────────────┐
│ Document │         │LegalDocumentChunk  │
└────┬─────┘         └────────────────────┘
     │
     │ has
     │
     ▼
┌───────────────┐
│DocumentChunk  │
└───────────────┘
```

## Prisma Schema

### Complete Schema Definition

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  passwordHash  String    @map("password_hash")
  role          String    @default("user")
  planTier      String    @default("free") @map("plan_tier")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  cases         Case[]
  documents     Document[]
  legalDocuments LegalDocument[]

  @@map("users")
}

model Case {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  title       String
  description String?
  clientName  String?  @map("client_name")
  caseNumber  String?  @map("case_number")
  status      String   @default("active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents   Document[]

  @@map("cases")
}

model Document {
  id          String   @id @default(uuid())
  caseId      String   @map("case_id")
  userId      String   @map("user_id")
  title       String
  content     String   @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  case        Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunks      DocumentChunk[]

  @@map("documents")
}

model DocumentChunk {
  id          String   @id @default(uuid())
  documentId  String   @map("document_id")
  content     String   @db.Text
  chunkIndex  Int      @map("chunk_index")
  embedding   Json?
  createdAt   DateTime @default(now()) @map("created_at")

  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("document_chunks")
}

model LegalDocument {
  id          String   @id @default(uuid())
  title       String
  category    String
  content     String   @db.Text
  metadata    Json?
  uploadedBy  String   @map("uploaded_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  uploader    User     @relation(fields: [uploadedBy], references: [id], onDelete: Cascade)
  chunks      LegalDocumentChunk[]

  @@map("legal_documents")
}

model LegalDocumentChunk {
  id               String   @id @default(uuid())
  legalDocumentId  String   @map("legal_document_id")
  content          String   @db.Text
  chunkIndex       Int      @map("chunk_index")
  embedding        Json?
  createdAt        DateTime @default(now()) @map("created_at")

  legalDocument    LegalDocument @relation(fields: [legalDocumentId], references: [id], onDelete: Cascade)

  @@index([legalDocumentId])
  @@map("legal_document_chunks")
}
```

## Model Details

### User Model

**Purpose**: Store user accounts and authentication credentials

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique user identifier |
| email | String | Unique, Required | User email address |
| name | String | Nullable | User full name |
| passwordHash | String | Required | Bcrypt hashed password |
| role | String | Default: "user" | User role (user/lawyer/admin) |
| planTier | String | Default: "free" | Subscription tier |
| createdAt | DateTime | Auto | Account creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relationships**:
- One-to-Many with `Case`
- One-to-Many with `Document`
- One-to-Many with `LegalDocument`

**Indexes**:
- Primary: `id`
- Unique: `email`

**Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "lawyer@example.com",
  "name": "Jane Doe",
  "passwordHash": "$2b$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG",
  "role": "lawyer",
  "planTier": "pro",
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-08T15:30:00.000Z"
}
```

### Case Model

**Purpose**: Organize legal cases for users

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique case identifier |
| userId | UUID | Foreign Key | Owner of the case |
| title | String | Required | Case title |
| description | String | Nullable | Case description |
| clientName | String | Nullable | Client name |
| caseNumber | String | Nullable | Case reference number |
| status | String | Default: "active" | Case status |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relationships**:
- Many-to-One with `User` (userId)
- One-to-Many with `Document`

**Cascade Delete**: Deleting a case deletes all associated documents

**Valid Statuses**:
- `active` - Case is currently active
- `pending` - Awaiting action
- `closed` - Case is closed

**Example**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Contract Dispute - ABC Corp vs XYZ Inc",
  "description": "Client disputes payment terms in service agreement",
  "clientName": "ABC Corporation",
  "caseNumber": "2025-CASE-001",
  "status": "active",
  "createdAt": "2025-01-05T09:00:00.000Z",
  "updatedAt": "2025-01-08T14:20:00.000Z"
}
```

### Document Model

**Purpose**: Store case documents and their content

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Document identifier |
| caseId | UUID | Foreign Key | Associated case |
| userId | UUID | Foreign Key | Document uploader |
| title | String | Required | Document title |
| content | Text | Required | Full document text |
| createdAt | DateTime | Auto | Upload timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relationships**:
- Many-to-One with `Case` (caseId)
- Many-to-One with `User` (userId)
- One-to-Many with `DocumentChunk`

**Cascade Delete**: Deleting a document deletes all chunks

**Storage**:
- Text stored in PostgreSQL `Text` column (unlimited size)
- Large documents chunked automatically

**Example**:
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440000",
  "caseId": "650e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Service Agreement - Final Draft",
  "content": "This Service Agreement (\"Agreement\") is entered into...",
  "createdAt": "2025-01-06T11:30:00.000Z",
  "updatedAt": "2025-01-06T11:30:00.000Z"
}
```

### DocumentChunk Model

**Purpose**: Store document segments with vector embeddings for RAG

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Chunk identifier |
| documentId | UUID | Foreign Key | Parent document |
| content | Text | Required | Chunk text (≈1000 chars) |
| chunkIndex | Integer | Required | Sequence number |
| embedding | JSON | Nullable | 1536-dim vector array |
| createdAt | DateTime | Auto | Creation timestamp |

**Relationships**:
- Many-to-One with `Document` (documentId)

**Embedding Structure**:
```json
{
  "embedding": [0.0023, -0.0145, 0.0078, ..., 0.0091]
  // Array of 1536 floating-point numbers from OpenAI
}
```

**Chunking Strategy**:
- Maximum 1000 characters per chunk
- Overlap: 100 characters (to maintain context)
- Splitting: Sentence boundaries when possible

**Vector Search**:
- Similarity: Cosine similarity calculation
- Dimensions: 1536 (OpenAI ada-002)
- Query: Top-k retrieval (k=5 default)

**Example**:
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440000",
  "documentId": "750e8400-e29b-41d4-a716-446655440000",
  "content": "This Service Agreement (\"Agreement\") is entered into as of January 1, 2025, by and between ABC Corporation, a Delaware corporation (\"Client\"), and XYZ Services Inc., a California corporation (\"Provider\"). WHEREAS, Client desires to engage Provider to provide consulting services...",
  "chunkIndex": 0,
  "embedding": [0.0023, -0.0145, 0.0078, ..., 0.0091],
  "createdAt": "2025-01-06T11:31:00.000Z"
}
```

### LegalDocument Model

**Purpose**: Global legal reference documents (admin-managed)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Document identifier |
| title | String | Required | Document title |
| category | String | Required | Legal category |
| content | Text | Required | Full document text |
| metadata | JSON | Nullable | Additional metadata |
| uploadedBy | UUID | Foreign Key | Admin who uploaded |
| createdAt | DateTime | Auto | Upload timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Relationships**:
- Many-to-One with `User` (uploadedBy)
- One-to-Many with `LegalDocumentChunk`

**Categories**:
- `constitution` - Constitutional documents
- `law` - Statutory laws
- `code` - Legal codes
- `regulation` - Regulations and rules
- `jurisprudence` - Case law and precedents

**Metadata Structure**:
```json
{
  "year": "2024",
  "jurisdiction": "Federal",
  "court": "Supreme Court",
  "citation": "123 U.S. 456 (2024)",
  "keywords": ["contract", "liability", "damages"]
}
```

**Example**:
```json
{
  "id": "950e8400-e29b-41d4-a716-446655440000",
  "title": "Civil Code - Title V: Obligations and Contracts",
  "category": "code",
  "content": "TITLE FIVE\nOBLIGATIONS AND CONTRACTS\n\nChapter 1: General Provisions...",
  "metadata": {
    "year": "2024",
    "jurisdiction": "Federal",
    "sections": ["Article 1101-1314"]
  },
  "uploadedBy": "admin-user-uuid",
  "createdAt": "2025-01-01T08:00:00.000Z",
  "updatedAt": "2025-01-01T08:00:00.000Z"
}
```

### LegalDocumentChunk Model

**Purpose**: Chunks of legal documents with embeddings

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Chunk identifier |
| legalDocumentId | UUID | Foreign Key, Indexed | Parent legal document |
| content | Text | Required | Chunk text |
| chunkIndex | Integer | Required | Sequence number |
| embedding | JSON | Nullable | 1536-dim vector |
| createdAt | DateTime | Auto | Creation timestamp |

**Relationships**:
- Many-to-One with `LegalDocument` (legalDocumentId)

**Indexes**:
- Composite index on `legalDocumentId` for fast filtering

**Example**:
```json
{
  "id": "a50e8400-e29b-41d4-a716-446655440000",
  "legalDocumentId": "950e8400-e29b-41d4-a716-446655440000",
  "content": "Article 1101. Obligations arising from contracts have the force of law between the contracting parties and must be performed in good faith. A contract is a meeting of minds between two persons whereby one binds himself, with respect to the other...",
  "chunkIndex": 0,
  "embedding": [-0.0012, 0.0234, -0.0067, ..., 0.0145],
  "createdAt": "2025-01-01T08:05:00.000Z"
}
```

## Relationships & Constraints

### Foreign Key Constraints

```sql
-- Case references User
ALTER TABLE cases ADD CONSTRAINT fk_case_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Document references Case and User
ALTER TABLE documents ADD CONSTRAINT fk_document_case
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;

ALTER TABLE documents ADD CONSTRAINT fk_document_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- DocumentChunk references Document
ALTER TABLE document_chunks ADD CONSTRAINT fk_chunk_document
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- LegalDocument references User
ALTER TABLE legal_documents ADD CONSTRAINT fk_legal_doc_user
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;

-- LegalDocumentChunk references LegalDocument
ALTER TABLE legal_document_chunks ADD CONSTRAINT fk_legal_chunk_document
  FOREIGN KEY (legal_document_id) REFERENCES legal_documents(id) ON DELETE CASCADE;
```

### Cascade Delete Behavior

```
User deleted
  └─► All Cases deleted
       └─► All Documents deleted
            └─► All DocumentChunks deleted
  └─► All LegalDocuments deleted
       └─► All LegalDocumentChunks deleted
```

## Indexes

### Automatic Indexes

Prisma automatically creates indexes for:
1. Primary keys (`id` fields)
2. Unique constraints (`email`)
3. Foreign keys (`userId`, `caseId`, etc.)

### Custom Indexes

```prisma
@@index([legalDocumentId])  // On legal_document_chunks
```

### Query Performance

| Query | Index Used | Performance |
|-------|-----------|-------------|
| Find user by email | `email` unique index | O(log n) |
| Find cases by userId | `userId` foreign key index | O(log n) |
| Find documents by caseId | `caseId` foreign key index | O(log n) |
| Find chunks by documentId | `documentId` foreign key index | O(log n) |
| Vector similarity search | Sequential scan + cosine calc | O(n) |

**Note**: Vector search is currently O(n). For production at scale, consider pgvector extension or Pinecone.

## Migrations

### Migration Structure

```
prisma/migrations/
├── 20250101_init/
│   └── migration.sql         # Initial schema
├── 20250105_add_legal_docs/
│   └── migration.sql         # Add legal documents
└── 20250108_add_legal_chunks/
    └── migration.sql         # Add legal doc chunks
```

### Running Migrations

```bash
# Development
npx prisma migrate dev --name migration_name

# Production
npx prisma migrate deploy
```

### Schema Sync

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# View current schema
npx prisma studio
```

## Data Integrity

### Constraints
- **NOT NULL**: Required fields enforced at DB level
- **UNIQUE**: Email uniqueness enforced
- **FOREIGN KEY**: Referential integrity
- **CASCADE DELETE**: Automatic cleanup

### Validation
- Application-level validation with Zod
- Database-level constraints
- Prisma type safety

### Transactions

```typescript
// Example: Atomic document upload
await prisma.$transaction(async (tx) => {
  const document = await tx.document.create({
    data: { ... }
  });

  await tx.documentChunk.createMany({
    data: chunks.map((chunk, i) => ({
      documentId: document.id,
      content: chunk,
      chunkIndex: i,
      embedding: embeddings[i]
    }))
  });
});
```

## Performance Considerations

### Connection Pooling

```typescript
// Prisma Client configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
});
```

**Default Pool Size**: 10 connections

### Query Optimization

1. **Select specific fields**:
```typescript
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true }
});
```

2. **Use pagination**:
```typescript
const cases = await prisma.case.findMany({
  take: 20,
  skip: offset,
  orderBy: { createdAt: 'desc' }
});
```

3. **Include relations efficiently**:
```typescript
const caseWithDocs = await prisma.case.findUnique({
  where: { id },
  include: {
    documents: {
      select: { id: true, title: true, createdAt: true }
    }
  }
});
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
