# TypeScript Error Fix - Quick Reference Guide

**Total Errors:** 229 | **Estimated Fix Time:** 22-42 hours

---

## Quick Start - Fix 99 Errors in 8-16 Hours

### Step 1: Sync Prisma Schema (Resolves ~79 errors)

```bash
# 1. Backup your database first!
pg_dump your_database > backup.sql  # PostgreSQL
# or appropriate backup for your database

# 2. Pull schema from database
cd C:\Users\benito\poweria\legal
npx prisma db pull

# 3. Review the generated schema
# Check prisma/schema.prisma for new models

# 4. Manually add missing GDPR models if needed
# See "Missing Models Template" below

# 5. Generate Prisma Client
npx prisma generate

# 6. Restart TypeScript server
# In VS Code: Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

### Step 2: Fix Logger Calls (Resolves ~20 errors)

**Pattern to Find:** Logger calls with object as first parameter

**Files to Update:**
- `src/middleware/api-versioning.middleware.ts`
- `src/middleware/global-error-handler.ts`
- `src/services/circuit-breaker.service.ts`

**Before (WRONG):**
```typescript
logger.info({ current: 1, min: 1, max: 3 });
logger.error({ err: error, stack: error.stack });
logger.warn({ circuit: 'api', state: 'OPEN' });
```

**After (CORRECT):**
```typescript
logger.info('API version configuration updated', { current: 1, min: 1, max: 3 });
logger.error('Server error occurred', { err: error, stack: error.stack });
logger.warn('Circuit breaker opened', { circuit: 'api', state: 'OPEN' });
```

**VS Code Find & Replace:**
1. Open Search (Ctrl+Shift+F)
2. Enable Regex mode
3. Search in: `src/middleware, src/services`
4. Find: `logger\.(info|warn|error)\(\{`
5. Manually review and fix each occurrence

---

## Missing Models Template

Add these to `prisma/schema.prisma` if they don't exist after `db pull`:

```prisma
model DataExportRequest {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  status      String   @default("pending") // pending, processing, completed, failed
  requestedAt DateTime @default(now())
  completedAt DateTime?
  exportUrl   String?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

model DataDeletionRequest {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  status      String   @default("pending") // pending, processing, completed, failed
  requestedAt DateTime @default(now())
  completedAt DateTime?
  reason      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

model DataRectificationRequest {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  status      String   @default("pending")
  field       String
  oldValue    String?
  newValue    String
  requestedAt DateTime @default(now())
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

model UserPreference {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  language              String   @default("es")
  theme                 String   @default("light")
  emailNotifications    Boolean  @default(true)
  pushNotifications     Boolean  @default(true)
  marketingEmails       Boolean  @default(false)
  dataProcessingConsent Boolean  @default(false)
  cookieConsent         Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([userId])
}

// Add these relations to User model:
model User {
  // ... existing fields ...

  // Add these relations:
  dataExportRequests        DataExportRequest[]
  dataDeletionRequests      DataDeletionRequest[]
  dataRectificationRequests DataRectificationRequest[]
  preferences               UserPreference?

  // If these don't exist, add them too:
  // subscriptions          Subscription[]
  // cases                  Case[]
  // documents              Document[]
  // legalDocuments         LegalDocument[]
  // queryLogs              QueryLog[]
  // notifications          Notification[]
  // payments               Payment[]
}
```

---

## Quick Fixes Checklist

### Phase 1: Immediate (1-2 hours)

- [ ] Install missing type definitions
  ```bash
  npm install --save-dev @types/lru-cache
  ```

- [ ] Fix property name typos
  - [ ] `lastLoginAt` → `lastLogin` in `src/routes/gdpr/gdpr.routes.ts`
  - [ ] `uploadedById` → `uploadedBy` in `src/routes/gdpr/gdpr.routes.ts`
  - [ ] `legalDocumentRevision` → `legalDocumentSection` in `src/routes/legal-documents-v2.ts`

- [ ] Remove 'tags' from FastifySchema (if not using Swagger)
  ```typescript
  // In src/routes/feedback.ts, src/routes/trends.ts, src/routes/ai-predictions.ts
  // Delete lines like:
  // tags: ['Feedback'],
  // tags: ['Trends'],
  // tags: ['AI Predictions'],
  ```

### Phase 2: Logger Fixes (2-4 hours)

- [ ] `src/middleware/api-versioning.middleware.ts` - 4 fixes
- [ ] `src/middleware/global-error-handler.ts` - 4 fixes
- [ ] `src/services/circuit-breaker.service.ts` - 8 fixes

### Phase 3: Schema Updates (4-8 hours)

- [ ] Run `npx prisma db pull`
- [ ] Add missing GDPR models
- [ ] Update User relations
- [ ] Run `npx prisma generate`
- [ ] Verify no new errors introduced

### Phase 4: Type Annotations (2-4 hours)

- [ ] Add types to callback parameters in `src/routes/gdpr.ts`
  ```typescript
  // Before:
  .map(s => s.id)

  // After:
  .map((s: Subscription) => s.id)
  ```

---

## File-by-File Fix Guide

### src/middleware/api-versioning.middleware.ts

**Errors:** 4 (all logger-related)

**Line 100:**
```typescript
// Before:
logger.info({
  current: globalVersionConfig.current,
  min: globalVersionConfig.min,
  max: globalVersionConfig.max,
  default: globalVersionConfig.default,
});

// After:
logger.info('API version configuration updated', {
  current: globalVersionConfig.current,
  min: globalVersionConfig.min,
  max: globalVersionConfig.max,
  default: globalVersionConfig.default,
});
```

**Lines 283, 296, 396:** Similar pattern - add descriptive message as first parameter

---

### src/middleware/global-error-handler.ts

**Errors:** 5 (4 logger + 1 type mismatch)

**Line 72:** Fix FieldError type
```typescript
// Before:
const errors: FieldError[] = details.map(d => ({
  field: d.path || {},  // ERROR: {} is not string
  message: d.message,
  code: d.type || 'validation_error',
}));

// After:
const errors: FieldError[] = details.map(d => ({
  field: String(d.path || 'unknown'),
  message: d.message,
  code: d.type || 'validation_error',
}));
```

**Lines 148, 157, 159, 164:** Add message strings to logger calls

---

### src/services/circuit-breaker.service.ts

**Errors:** 8 (all logger-related)

**Pattern:** Add descriptive messages
```typescript
// Line 110:
logger.info('Circuit breaker created', { name, config: { ... } });

// Line 141:
logger.warn('Circuit breaker opened', { circuit, state, retryAfter });

// Line 212:
logger.info('Circuit breaker success threshold met', { circuit, successCount, threshold });

// Continue for all 8 occurrences...
```

---

### src/schemas/legal-document-schemas.ts

**Errors:** 3 (enum type references)

**Lines 276-279:**
```typescript
// Before:
export type LegacyToNewTransform = {
  mapLegacyCategory: (category: string) => z.infer<typeof LegalHierarchyEnum>;
  inferNormType: (title: string, category: string) => z.infer<typeof NormTypeEnum>;
  extractPublicationInfo: (metadata: any) => {
    publicationType?: z.infer<typeof PublicationTypeEnum>;
    // ...
  };
};

// After:
export type LegacyToNewTransform = {
  mapLegacyCategory: (category: string) => string;
  inferNormType: (title: string, category: string) => string;
  extractPublicationInfo: (metadata: any) => {
    publicationType?: string;
    // ...
  };
};

// Or use the proper enum type if LegalHierarchyEnum is defined as a const enum
```

---

### src/routes/legal-documents.ts

**Errors:** 1 (missing required fields)

**Line 39:** Add required fields for new schema
```typescript
// Before:
const document = await prisma.legalDocument.create({
  data: {
    title: body.title,
    category: body.category,
    content: body.content,
    metadata: {
      number: body.number,
      year: body.year,
      jurisdiction: body.jurisdiction,
    },
    uploadedBy: request.user.id,
  },
});

// After:
const document = await prisma.legalDocument.create({
  data: {
    title: body.title,
    category: body.category,
    content: body.content,

    // Add new required fields:
    normType: inferNormType(body.title, body.category),
    normTitle: body.title,
    legalHierarchy: mapCategoryToHierarchy(body.category),
    publicationType: 'REGISTRO_OFICIAL', // or extract from metadata

    metadata: {
      number: body.number,
      year: body.year,
      jurisdiction: body.jurisdiction,
    },
    uploadedBy: { connect: { id: request.user.id } },
  },
});

// Helper functions:
function mapCategoryToHierarchy(category: string): string {
  const mapping: Record<string, string> = {
    'constitution': 'CONSTITUTIONAL',
    'law': 'LEGAL',
    'regulation': 'REGULATORY',
    // ... add all mappings
  };
  return mapping[category] || 'REGULATORY';
}

function inferNormType(title: string, category: string): string {
  // Logic to infer norm type from title/category
  if (category === 'constitution') return 'CONSTITUCION';
  if (title.includes('Código')) return 'CODIGO';
  if (title.includes('Ley')) return 'LEY';
  return 'REGLAMENTO';
}
```

---

## Testing After Fixes

```bash
# 1. Run TypeScript compiler
npx tsc --noEmit

# 2. Check for remaining errors
# Should see fewer errors after each fix

# 3. Run tests
npm test

# 4. Start dev server
npm run dev

# 5. Verify no runtime errors
```

---

## Verification Checklist

After completing fixes:

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All tests pass: `npm test`
- [ ] Dev server starts without errors: `npm run dev`
- [ ] Prisma Client generated successfully: `npx prisma generate`
- [ ] No console errors in browser developer tools
- [ ] API endpoints respond correctly
- [ ] Database queries work as expected

---

## Common Pitfalls

1. **Don't forget to regenerate Prisma Client** after schema changes
   ```bash
   npx prisma generate
   ```

2. **Restart TypeScript server** in VS Code after major changes
   - Press `Ctrl+Shift+P`
   - Type "TypeScript: Restart TS Server"

3. **Check excluded files in tsconfig.json** - some errors might be hidden
   - Review `exclude` array in `tsconfig.json`
   - Consider removing exclusions as you fix errors

4. **Backup database** before running `prisma db pull`
   - Schema sync might reveal unexpected differences

5. **Test in development first** before applying to production
   - These changes affect core types and database

---

## Need Help?

- Review detailed analysis: `TYPESCRIPT_ERROR_ANALYSIS.md`
- Full JSON report: `typescript-error-analysis-report.json`
- TypeScript error logs: `tsc-errors-new.txt`

---

**Last Updated:** 2025-12-12
**Status:** Ready for implementation
