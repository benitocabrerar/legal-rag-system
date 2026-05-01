# TypeScript Error Fix Guide - Legal RAG System

**Quick Reference Guide for Fixing All 118 TypeScript Errors**

---

## Quick Start - Fix Critical Issues First

```bash
# 1. Remove duplicate function (30 minutes)
# Edit: src/services/ai/pattern-detection.service.ts
# Remove duplicate identifyCommonClausePatterns() at line ~531

# 2. Update Prisma schema (see Section 1 below)
# Edit: prisma/schema.prisma

# 3. Regenerate Prisma types
npx prisma generate

# 4. Fix logger utility (see Section 2 below)
# Edit: src/utils/logger.ts
```

**Expected Result:** 70% reduction in errors (118 → ~35)

---

## Section 1: Prisma Schema Updates (CRITICAL)

### Add Missing GDPR Models

Add these models to `prisma/schema.prisma`:

```prisma
model DataExportRequest {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  status      String    @default("pending") // pending, processing, completed, failed
  requestedAt DateTime  @default(now()) @map("requested_at")
  completedAt DateTime? @map("completed_at")
  downloadUrl String?   @map("download_url")
  expiresAt   DateTime? @map("expires_at")
  format      String    @default("json") // json, csv, xml
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user User @relation("UserDataExports", fields: [userId], references: [id], onDelete: Cascade)

  @@map("data_export_requests")
  @@index([userId])
  @@index([status])
}

model DataDeletionRequest {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  status      String    @default("pending") // pending, processing, completed, failed
  reason      String?   @db.Text
  requestedAt DateTime  @default(now()) @map("requested_at")
  completedAt DateTime? @map("completed_at")
  verifiedAt  DateTime? @map("verified_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user User @relation("UserDataDeletions", fields: [userId], references: [id], onDelete: Cascade)

  @@map("data_deletion_requests")
  @@index([userId])
  @@index([status])
}

model DataRectificationRequest {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  fieldName   String    @map("field_name")
  oldValue    String?   @map("old_value") @db.Text
  newValue    String    @map("new_value") @db.Text
  reason      String?   @db.Text
  status      String    @default("pending") // pending, approved, rejected, completed
  requestedAt DateTime  @default(now()) @map("requested_at")
  reviewedAt  DateTime? @map("reviewed_at")
  completedAt DateTime? @map("completed_at")
  reviewedBy  String?   @map("reviewed_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user     User  @relation("UserDataRectifications", fields: [userId], references: [id], onDelete: Cascade)
  reviewer User? @relation("ReviewedDataRectifications", fields: [reviewedBy], references: [id])

  @@map("data_rectification_requests")
  @@index([userId])
  @@index([status])
}

model UserPreference {
  id                  String   @id @default(uuid())
  userId              String   @unique @map("user_id")
  theme               String   @default("light") // light, dark, auto
  language            String   @default("es") // es, en
  timezone            String   @default("America/Guayaquil")
  dateFormat          String   @default("DD/MM/YYYY") @map("date_format")
  timeFormat          String   @default("24h") @map("time_format")
  emailNotifications  Boolean  @default(true) @map("email_notifications")
  pushNotifications   Boolean  @default(true) @map("push_notifications")
  weeklyDigest        Boolean  @default(false) @map("weekly_digest")
  marketingEmails     Boolean  @default(false) @map("marketing_emails")
  settings            Json?    // Additional custom settings
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  user User @relation("UserPreferences", fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}
```

### Update User Model

Add these relations to the User model:

```prisma
model User {
  // ... existing fields ...

  // GDPR Relations
  dataExportRequests        DataExportRequest[]        @relation("UserDataExports")
  dataDeletionRequests      DataDeletionRequest[]      @relation("UserDataDeletions")
  dataRectificationRequests DataRectificationRequest[] @relation("UserDataRectifications")
  reviewedRectifications    DataRectificationRequest[] @relation("ReviewedDataRectifications")
  userPreference            UserPreference?            @relation("UserPreferences")

  // ... rest of model ...
}
```

### Update AuditLog Model (if needed)

Add these optional fields to AuditLog:

```prisma
model AuditLog {
  // ... existing fields ...

  entityType String? @map("entity_type") // Type of entity being audited
  resource   String? // Resource being accessed
  details    Json?   // Additional audit details

  // ... rest of model ...
}
```

### Update Notification Model

```prisma
model Notification {
  // ... existing fields ...

  data Json? // Additional notification data

  // ... rest of model ...
}
```

### Update QueryLog Model

```prisma
model QueryLog {
  // ... existing fields ...

  timestamp DateTime @default(now()) // Add if missing

  // ... rest of model ...

  @@index([timestamp]) // Add index for sorting
}
```

### Migration Command

After updating schema:

```bash
# Create migration
npx prisma migrate dev --name add_gdpr_models

# Or if in production
npx prisma migrate deploy

# Generate new types
npx prisma generate
```

---

## Section 2: Logger Utility Fix (HIGH PRIORITY)

### Current Logger Interface

File: `src/utils/logger.ts`

**Problem:**
```typescript
// Current (simplified)
export class Logger {
  error(message: string): void {
    console.error(message);
  }
}
```

### Solution A: Update Logger to Accept Metadata (RECOMMENDED)

```typescript
export class Logger {
  private formatMessage(message: string, meta?: Record<string, unknown>): string {
    if (!meta) return message;
    return `${message} ${JSON.stringify(meta, null, 2)}`;
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(this.formatMessage(message, meta));
    // Also log to external service if configured
    if (this.externalLogger) {
      this.externalLogger.error(message, meta);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatMessage(message, meta));
    if (this.externalLogger) {
      this.externalLogger.warn(message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(this.formatMessage(message, meta));
    if (this.externalLogger) {
      this.externalLogger.info(message, meta);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(message, meta));
    }
    if (this.externalLogger) {
      this.externalLogger.debug(message, meta);
    }
  }
}
```

### Solution B: Stringify at Call Sites (NOT RECOMMENDED)

If you can't modify logger, update all call sites:

```typescript
// Before
logger.error('Error occurred', { requestId, error });

// After
logger.error(`Error occurred: ${JSON.stringify({ requestId, error })}`);
```

**Files to Update (20+ files):**
- src/middleware/global-error-handler.ts
- src/middleware/api-versioning.middleware.ts
- src/services/circuit-breaker.service.ts
- src/routes/admin/migration-embedded.ts
- src/routes/admin/migration.ts
- src/routes/auth.ts

---

## Section 3: Remove Duplicate Function (CRITICAL)

### File: src/services/ai/pattern-detection.service.ts

**Problem:** Function `identifyCommonClausePatterns()` is defined twice:
- Line ~280
- Line ~531

**Solution:** Remove one of the implementations (keep the first one, remove the second)

**Line ~531-580:** DELETE THIS ENTIRE BLOCK

```typescript
// DELETE FROM HERE
async identifyCommonClausePatterns(): Promise<ClausePattern[]> {
  // ... entire duplicate function ...
}
// TO HERE
```

**Keep the implementation at line ~280**

---

## Section 4: OpenAI Response Type Handling

### File: src/services/ai/async-openai-service.ts

**Problem (Line 182):**
```typescript
const completion = await this.queue.execute(async () => {
  return await this.openai.chat.completions.create({...});
});

// completion is ChatCompletion | Stream<ChatCompletionChunk>
const chatCompletion = completion as OpenAI.Chat.ChatCompletion;
const result = chatCompletion.choices[0]?.message?.content || '';
```

**Solution: Add Type Guard**

```typescript
// Add type guard function
private isChatCompletion(
  response: OpenAI.Chat.ChatCompletion | Stream<ChatCompletionChunk>
): response is OpenAI.Chat.ChatCompletion {
  return 'choices' in response && !('controller' in response);
}

// Update completion handling
const completion = await this.queue.execute(async () => {
  return await this.openai.chat.completions.create({
    stream: false, // Explicitly disable streaming
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: options.temperature ?? this.config.temperature,
    max_tokens: options.max_tokens ?? this.config.maxTokens,
    ...options
  });
});

if (this.isChatCompletion(completion)) {
  const result = completion.choices[0]?.message?.content || '';
  // ... rest of logic
} else {
  throw new Error('Unexpected streaming response when stream=false');
}
```

### File: src/services/ai/async-openai.service.ts (if similar issue exists)

Apply same fix pattern.

---

## Section 5: Fix JSON Type Incompatibilities

### Add Index Signatures to Custom Types

**File: src/services/ai/pattern-detection.service.ts**

```typescript
// Before
interface PatternStatistics {
  totalPatterns: number;
  commonPatterns: number;
  rarePatterns: number;
  avgFrequency: number;
}

// After
interface PatternStatistics {
  totalPatterns: number;
  commonPatterns: number;
  rarePatterns: number;
  avgFrequency: number;
  [key: string]: number; // Add index signature
}
```

**File: src/services/documentAnalyzer.ts**

```typescript
// Before
interface DocumentStructure {
  chapters: number;
  sections: number;
  articles: number;
}

// After
interface DocumentStructure {
  chapters: number;
  sections: number;
  articles: number;
  [key: string]: number | string | DocumentStructure[]; // Add flexible index signature
}
```

### Alternative: Use Prisma.JsonValue

```typescript
import { Prisma } from '@prisma/client';

// When creating records with complex JSON
await this.prisma.aIAnalytics.create({
  data: {
    documentId,
    statistics: patternStats as Prisma.JsonValue, // Type assertion
    processingTimeMs,
    timestamp: new Date().toISOString()
  }
});
```

---

## Section 6: Fix Implicit Any Parameters

### Add Explicit Type Annotations

**File: src/routes/gdpr.ts (Lines 430, 438, 448, 453, 458, 463, 469)**

```typescript
// Before
user.subscriptions?.map(s => ({
  id: s.id,
  status: s.status
}))

// After
user.subscriptions?.map((s: Subscription) => ({
  id: s.id,
  status: s.status
}))
```

**File: src/services/cache/multi-tier-cache-service.ts (Line 96)**

```typescript
// Before
dispose: (value, key) => {
  this.emit('eviction', { key, tier: 'L1' });
}

// After
dispose: (value: CacheEntry, key: string) => {
  this.emit('eviction', { key, tier: 'L1' });
}
```

**File: src/services/cache/multi-tier-cache.service.ts (Line 148)**

```typescript
// Before
this.l1Cache.keys().forEach(key => {
  // ...
})

// After
this.l1Cache.keys().forEach((key: string) => {
  // ...
})
```

---

## Section 7: Fix Enum Type References

### File: src/schemas/legal-document-schemas.ts

**Problem (Lines 276-279):**
```typescript
export type LegacyToNewTransform = {
  mapLegacyCategory: (category: string) => z.infer<typeof LegalHierarchyEnum>;
  inferNormType: (title: string, category: string) => z.infer<typeof NormTypeEnum>;
  extractPublicationInfo: (metadata: any) => {
    publicationType?: z.infer<typeof PublicationTypeEnum>;
  };
};
```

**Solution: Use Prisma Enum Types**

```typescript
import { LegalHierarchy, NormType, PublicationType } from '@prisma/client';

export type LegacyToNewTransform = {
  mapLegacyCategory: (category: string) => LegalHierarchy;
  inferNormType: (title: string, category: string) => NormType;
  extractPublicationInfo: (metadata: any) => {
    publicationType?: PublicationType;
    publicationNumber?: string;
    publicationDate?: Date;
  };
};
```

---

## Section 8: Fix Field Name Mismatches

### Update to Match Prisma Schema

**File: src/routes/gdpr/gdpr.routes.ts**

**Line 179:**
```typescript
// Before
select: {
  lastLoginAt: true
}

// After
select: {
  lastLogin: true
}
```

**Line 188:**
```typescript
// Before
where: {
  uploadedById: userId
}

// After
where: {
  uploadedBy: userId
}
```

**Line 192:**
```typescript
// Before
select: {
  documentType: true
}

// After - Remove if field doesn't exist, or use correct field
select: {
  normType: true // Use actual field from schema
}
```

**File: src/routes/gdpr.ts**

**Line 375:**
```typescript
// Before
orderBy: { timestamp: 'desc' }

// After
orderBy: { createdAt: 'desc' }
```

---

## Section 9: Fix CORS Configuration

### File: src/config/cors.config.ts

**Problem (Line 223):**
```typescript
origin: origins.includes('*') && env !== 'production'
  ? true
  : createOriginValidator(allowedOriginsSet) as unknown as FastifyCorsOptions['origin']
```

**Solution: Fix Type Compatibility**

```typescript
import type { FastifyCorsOptions } from '@fastify/cors';

// Update origin validator function signature
function createOriginValidator(allowedOrigins: Set<string>) {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ): void => {
    // No origin (same-origin request) - allow in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }

    // Check if origin is allowed
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };
}

// Use correct type
const config: FastifyCorsOptions = {
  origin: origins.includes('*') && env !== 'production'
    ? true
    : createOriginValidator(allowedOriginsSet),
  methods: ALLOWED_METHODS,
  // ... rest of config
};
```

---

## Section 10: Fix SearchResponse Type

### Create Type Definition

**File: src/types/search.d.ts** (create if doesn't exist)

```typescript
export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  score: number;
  highlights?: string[];
  category?: string;
  jurisdiction?: string;
  createdAt: Date;
}

export interface SearchMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  processingTime: number;
  query: string;
}

export interface SearchFilters {
  category?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  jurisdiction?: string[];
}

export interface SearchResponse {
  documents: SearchDocument[];
  metadata: SearchMetadata;
  filters?: SearchFilters;
  suggestions?: string[];
}
```

### Update Unified Search Route

**File: src/routes/unified-search.ts**

```typescript
import { SearchResponse } from '../types/search';

// Fix filter parsing (Line 79)
const filters: SearchFilters = {
  category: query.documentType ? [query.documentType] : undefined,
  jurisdiction: query.jurisdiction ? [query.jurisdiction] : undefined,
  dateRange: query.dateFrom && query.dateTo ? {
    start: new Date(query.dateFrom),
    end: new Date(query.dateTo)
  } : undefined
};

// Fix response handling (Lines 89, 94)
const searchResults: SearchResponse = await unifiedSearchOrchestrator.search({
  query: query.query,
  filters,
  page: query.page || 1,
  limit: query.limit || 10
});

return reply.send({
  success: true,
  documents: searchResults.documents,
  metadata: searchResults.metadata,
  filters: searchResults.filters
});
```

---

## Section 11: Fix LegalDocument Creation

### File: src/routes/legal-documents.ts

**Problem (Line 39):**
```typescript
const document = await prisma.legalDocument.create({
  data: {
    title: body.title,
    category: body.category,
    content: body.content,
    metadata: body.metadata,
    uploadedBy: request.user.id
  }
});
```

**Solution: Add Required Fields**

```typescript
import { NormType, LegalHierarchy, PublicationType, DocumentState, Jurisdiction } from '@prisma/client';

const document = await prisma.legalDocument.create({
  data: {
    // New required fields
    normType: body.normType || NormType.ORDINARY_LAW,
    normTitle: body.title,
    legalHierarchy: body.legalHierarchy || LegalHierarchy.LEYES_ORDINARIAS,
    publicationType: body.publicationType || PublicationType.ORDINARIO,
    publicationNumber: body.publicationNumber || 'N/A',
    publicationDate: body.publicationDate ? new Date(body.publicationDate) : null,
    documentState: DocumentState.ORIGINAL,
    jurisdiction: body.jurisdiction || Jurisdiction.NACIONAL,

    // Content
    content: body.content,
    metadata: body.metadata,

    // Legacy fields (backward compatibility)
    title: body.title,
    category: body.category,

    // Admin fields
    uploadedBy: request.user.id,
    isActive: true
  }
});
```

### Update Request Schema

```typescript
const createDocumentSchema = z.object({
  // Required new fields
  normType: z.nativeEnum(NormType),
  normTitle: z.string().min(1),
  legalHierarchy: z.nativeEnum(LegalHierarchy),
  publicationType: z.nativeEnum(PublicationType),
  publicationNumber: z.string(),

  // Optional fields
  publicationDate: z.string().datetime().optional(),
  lastReformDate: z.string().datetime().optional(),
  jurisdiction: z.nativeEnum(Jurisdiction).optional(),

  // Content
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),

  // Legacy (optional for backward compatibility)
  title: z.string().optional(),
  category: z.string().optional()
});
```

---

## Section 12: Fix Type Conversion Errors

### File: src/middleware/error-sanitizer.middleware.ts

**Problem (Lines 306-307):**
```typescript
const sanitized = request as Record<string, unknown>;
```

**Solution: Double Assertion Through Unknown**

```typescript
// Before
const sanitized = request as Record<string, unknown>;

// After
const sanitized = request as unknown as Record<string, unknown>;
```

---

## Section 13: Fix NodeCache Type Import

### File: src/services/cache/multi-tier-cache.service.ts

**Problem (Line 14):**
```typescript
import NodeCache from 'node-cache';

// Later used as type
private l1Cache: NodeCache;
```

**Solution: Separate Type Import**

```typescript
import NodeCache from 'node-cache';
import type { default as NodeCacheType } from 'node-cache';

export class MultiTierCacheService {
  private l1Cache: NodeCacheType;

  constructor() {
    this.l1Cache = new NodeCache({
      stdTTL: 300,
      checkperiod: 60
    });
  }
}

// Or simpler: use instance type
export class MultiTierCacheService {
  private l1Cache: InstanceType<typeof NodeCache>;

  constructor() {
    this.l1Cache = new NodeCache({
      stdTTL: 300,
      checkperiod: 60
    });
  }
}
```

---

## Section 14: Fix Null Safety Issues

### File: src/services/ai/legal-assistant.ts

**Problem (Line 368):**
```typescript
const conversations = await this.prisma.aIConversation.findMany({
  select: {
    id: true,
    title: true, // Can be null
    startedAt: true,
    lastMessageAt: true,
    messageCount: true,
    isActive: true
  }
});

// Type error: title is string | null but return type expects string
return conversations;
```

**Solution: Handle Null Values**

```typescript
const conversations = await this.prisma.aIConversation.findMany({
  select: {
    id: true,
    title: true,
    startedAt: true,
    lastMessageAt: true,
    messageCount: true,
    isActive: true
  }
});

return conversations.map(conv => ({
  id: conv.id,
  title: conv.title || 'Untitled Conversation', // Handle null
  startedAt: conv.startedAt,
  lastMessageAt: conv.lastMessageAt,
  messageCount: conv.messageCount,
  isActive: conv.isActive
}));
```

---

## Section 15: Verification Steps

After making all fixes, verify:

### 1. Run TypeScript Compiler

```bash
npx tsc --noEmit
```

**Expected:** 0 errors

### 2. Check Specific Directories

```bash
# Check AI services
npx tsc --noEmit src/services/ai/**/*.ts

# Check routes
npx tsc --noEmit src/routes/**/*.ts

# Check middleware
npx tsc --noEmit src/middleware/**/*.ts
```

### 3. Verify Prisma Types

```bash
# Ensure types are generated
npx prisma generate

# Check if types are accessible
npx tsc --noEmit --skipLibCheck false
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run type tests specifically
npm run test:types # If you have type tests
```

### 5. Build Project

```bash
# Backend
npm run build

# Frontend
cd frontend && npm run build
```

---

## Checklist: Fix Progress Tracker

Use this checklist to track your progress:

### Critical Fixes (Day 1-2)
- [ ] Remove duplicate function in pattern-detection.service.ts
- [ ] Add GDPR models to Prisma schema
- [ ] Add User relations for GDPR models
- [ ] Run `npx prisma migrate dev`
- [ ] Run `npx prisma generate`
- [ ] Update Logger utility interface
- [ ] Test Logger changes

### High Priority (Day 3-5)
- [ ] Fix OpenAI response type handling
- [ ] Add index signatures to JSON types
- [ ] Fix enum type references in schemas
- [ ] Add required fields to LegalDocument creation
- [ ] Fix all implicit any parameters (10 instances)
- [ ] Fix field name mismatches
- [ ] Test critical routes

### Medium Priority (Day 6-8)
- [ ] Fix CORS configuration types
- [ ] Create SearchResponse interface
- [ ] Fix type conversion errors
- [ ] Fix NodeCache type import
- [ ] Handle null safety issues
- [ ] Update unified search route

### Final Cleanup (Day 9-10)
- [ ] Run full TypeScript check
- [ ] Fix any remaining errors
- [ ] Update tsconfig exclude list
- [ ] Run all tests
- [ ] Build project successfully
- [ ] Document changes

### Verification
- [ ] `npx tsc --noEmit` returns 0 errors
- [ ] All tests pass
- [ ] Build succeeds (backend and frontend)
- [ ] Manual testing of critical features
- [ ] Code review completed

---

## Emergency Quick Fixes

If you need to fix errors quickly for deployment:

### 1. Suppress Specific Errors (TEMPORARY ONLY)

```typescript
// @ts-expect-error: TODO - Fix Prisma schema mismatch
const data = await prisma.dataExportRequest.findMany();
```

**WARNING:** Only use for deployment emergencies. Create tickets for proper fixes.

### 2. Add to tsconfig Exclude (LAST RESORT)

```json
{
  "exclude": [
    "src/routes/gdpr.ts" // TEMPORARY - Fix ASAP
  ]
}
```

**WARNING:** This hides problems, doesn't fix them.

---

## Support and Resources

### TypeScript Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

### Prisma Documentation
- [Prisma Schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [JSON Fields](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields#working-with-json-fields)

### Project-Specific
- Main Analysis: `TYPESCRIPT_ANALYSIS_REPORT.json`
- Summary: `TYPESCRIPT_ANALYSIS_SUMMARY.md`
- This Guide: `TYPESCRIPT_FIX_GUIDE.md`

---

**Last Updated:** 2025-12-12
**Maintainer:** Development Team
**Status:** Ready for Implementation
