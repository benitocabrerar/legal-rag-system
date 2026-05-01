# Type Safety Quick Reference Guide

## At-a-Glance Summary

### Critical Issues: 7 `as any` Assertions

| File | Line | Issue | Fix Time |
|------|------|-------|----------|
| SummaryCard.tsx | 292 | Skeleton loading | 15 min |
| admin/page.tsx | 223 | Category selection | 10 min |
| cases/[id]/page.tsx | 610 | Event handler | 10 min |
| feedback/page.tsx | 233 | Badge variant | 15 min |
| finance/page.tsx | 63 | Period selection | 10 min |
| PWAInstallPrompt.tsx | 21 | Navigator API | 5 min |
| summarization/page.tsx | 341 | Error message | 10 min |

**Total Fix Time: ~1.5 hours**

---

## Type System Health Score

```
Overall Type Safety: 7.5/10

✓ Strict mode enabled
✓ Component props mostly typed
✓ React Query hooks well-typed
✗ 7 unsafe type assertions
✗ Missing type exports
✗ Incomplete error types
```

---

## Problem Categories

### 1. Unsafe Type Assertions (7 instances)
```typescript
// BAD
onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}

// GOOD
const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setFormData({ ...formData, category: e.target.value as DocumentCategory });
};
```

### 2. Missing Type Exports (2 instances)
```typescript
// BAD - Internal only
interface SummaryCardProps { ... }

// GOOD - Exportable
export interface SummaryCardProps { ... }
```

### 3. Incomplete Type Definitions (2 instances)
```typescript
// BAD
export const parseApiError = (error: any): string => { ... }

// GOOD
export const parseApiError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const apiError = error as ApiErrorResponse;
  // ...
}
```

---

## Type Patterns to Use

### Pattern 1: Union Types for Enums
```typescript
// Instead of string
type SummaryLevel = 'brief' | 'standard' | 'detailed';

// Usage
const level: SummaryLevel = 'brief'; // ✓ Type-safe
const badLevel: SummaryLevel = 'invalid'; // ✗ Type error
```

### Pattern 2: Discriminated Unions
```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Type narrows automatically
function handleResponse<T>(response: ApiResponse<T>) {
  if (response.success) {
    console.log(response.data); // T is available
  } else {
    console.log(response.error); // string is available
  }
}
```

### Pattern 3: Type Guards
```typescript
function isAxiosError(error: unknown): error is AxiosLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  );
}

// Usage
if (isAxiosError(error)) {
  console.log(error.response.status); // Type-safe!
}
```

### Pattern 4: Generic Constraints
```typescript
interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
}

// Usage
const response: ApiSuccessResponse<User> = {
  data: { id: '1', name: 'John' }
};
```

---

## Component Type Patterns

### Pattern 1: Optional Props with Loading State
```typescript
interface ComponentProps {
  data?: DataType;
  isLoading?: boolean;
}

function Component({ data, isLoading = false }: ComponentProps) {
  if (isLoading || !data) {
    return <LoadingSkeleton />;
  }
  // data is guaranteed to exist here
  return <div>{data.value}</div>;
}
```

### Pattern 2: Event Handlers
```typescript
// Inline with proper type
<input onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
}} />

// Extracted handler
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

### Pattern 3: Form Data
```typescript
interface FormData {
  email: string;
  password: string;
}

const [formData, setFormData] = useState<FormData>({
  email: '',
  password: ''
});

const updateField = <K extends keyof FormData>(
  field: K,
  value: FormData[K]
) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

---

## Badge Variant Mapping

### Current Issue
```typescript
// WRONG - 'red' is not a Badge variant
const TYPES = [
  { value: 'bug', color: 'red' }  // ✗
];
```

### Fixed Version
```typescript
import type { BadgeVariant } from '@/types/ui';

const TYPES: Array<{ value: string; variant: BadgeVariant }> = [
  { value: 'bug', variant: 'destructive' },    // ✓
  { value: 'feature', variant: 'default' },    // ✓
  { value: 'improvement', variant: 'success' }, // ✓
  { value: 'general', variant: 'secondary' }   // ✓
];
```

### Available Badge Variants
- `default` - Blue
- `secondary` - Gray
- `destructive` - Red
- `outline` - Border only
- `success` - Green
- `warning` - Yellow

---

## Error Handling Pattern

### Before
```typescript
catch (error) {
  setError((error as any)?.message || 'Error');
}
```

### After
```typescript
import { parseApiError } from '@/lib/api-client';

catch (error) {
  setError(parseApiError(error));
}

// Or with custom helper
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'An error occurred';
};
```

---

## File Organization

### Before
```
src/
├── components/
│   └── SummaryCard.tsx  (types defined inline)
└── hooks/
    └── useSummarization.ts  (duplicate types)
```

### After
```
src/
├── types/
│   ├── index.ts           (re-exports all)
│   ├── summarization.ts   (shared types)
│   ├── api.ts             (API types)
│   ├── forms.ts           (form types)
│   ├── ui.ts              (UI component types)
│   └── navigator.d.ts     (global augmentations)
├── components/
│   └── SummaryCard.tsx    (imports from @/types)
└── hooks/
    └── useSummarization.ts (imports from @/types)
```

---

## Import Patterns

### Type-Only Imports (Recommended)
```typescript
// Type imports (no runtime code)
import type { SummaryLevel, DocumentSummary } from '@/types/summarization';

// Mixed import
import { useSummarization } from '@/hooks/useSummarization';
import type { SummarizeOptions } from '@/types/summarization';
```

### Re-Exports
```typescript
// types/index.ts - Central export point
export * from './summarization';
export * from './api';
export * from './forms';
export * from './ui';

// Usage - Clean imports
import type { DocumentSummary, BadgeVariant } from '@/types';
```

---

## TypeScript Config Recommendations

### Current
```json
{
  "compilerOptions": {
    "strict": true,
    // ...
  }
}
```

### Recommended Additions
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## Common Mistakes to Avoid

### 1. Using `any` Instead of `unknown`
```typescript
// BAD
function parseError(error: any) { ... }

// GOOD
function parseError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  // Type narrowing required
}
```

### 2. Not Exporting Types
```typescript
// BAD - Internal only
interface Props { ... }

// GOOD - Reusable
export interface Props { ... }
```

### 3. Inline Type Definitions
```typescript
// BAD - Repeated everywhere
const data: { id: string; name: string } = ...;

// GOOD - Defined once
type User = { id: string; name: string };
const data: User = ...;
```

### 4. String Instead of Union
```typescript
// BAD
status: string;

// GOOD
status: 'pending' | 'approved' | 'rejected';
```

---

## Testing Type Safety

### Type Testing Library (tsd)
```typescript
import { expectType } from 'tsd';

// Test type inference
const level: SummaryLevel = 'brief';
expectType<SummaryLevel>(level);

// Test that invalid values are rejected
// @ts-expect-error
const invalid: SummaryLevel = 'invalid';
```

### Runtime Validation (Zod)
```typescript
import { z } from 'zod';

const SummaryLevelSchema = z.enum(['brief', 'standard', 'detailed']);
type SummaryLevel = z.infer<typeof SummaryLevelSchema>;

// Validates at runtime
const level = SummaryLevelSchema.parse(userInput);
```

---

## Quick Wins Checklist

High-impact, low-effort improvements:

- [ ] Create `frontend/src/types/` directory (5 min)
- [ ] Define shared types (30 min)
- [ ] Export BadgeVariant type (2 min)
- [ ] Fix FEEDBACK_TYPES array (5 min)
- [ ] Add type to parseApiError (10 min)
- [ ] Export component prop interfaces (10 min)
- [ ] Replace all `as any` with proper types (30 min)

**Total: ~1.5 hours for 80% improvement**

---

## Resources

### TypeScript Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

### React + TypeScript
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Event Handler Types](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forms_and_events/)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [ts-pattern](https://github.com/gvergnaud/ts-pattern) - Pattern matching
- [zod](https://github.com/colinhacks/zod) - Runtime validation

---

## Support

For questions or issues:
1. Check `TYPESCRIPT_TYPE_SAFETY_AUDIT.md` for detailed analysis
2. Check `TYPE_SAFETY_FIXES.md` for code examples
3. Check `TYPE_SAFETY_CHECKLIST.md` for implementation tracking

---

**Last Updated:** December 12, 2025
**Maintainer:** Legal RAG Development Team
