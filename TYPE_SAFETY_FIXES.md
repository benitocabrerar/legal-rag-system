# Type Safety Fixes - Implementation Guide
## Quick Reference for Fixing Type Issues

This document provides copy-paste ready code fixes for all identified type safety issues.

---

## File 1: Create Shared Types

### frontend/src/types/summarization.ts (NEW FILE)

```typescript
/**
 * Shared types for document summarization features
 */

export type SummaryLevel = 'brief' | 'standard' | 'detailed';
export type SummaryLanguage = 'es' | 'en';

export interface KeyPoint {
  id: string;
  text: string;
  category: string;
  importance: number;
  context?: string;
  pageNumber?: number;
  sourceText?: string;
}

export interface DocumentSummary {
  id: string;
  documentId: string;
  summary: string;
  level: SummaryLevel;
  language: SummaryLanguage;
  keyPoints?: KeyPoint[];
  wordCount: number;
  originalWordCount: number;
  compressionRatio: number;
  confidenceScore: number;
  generatedAt: string;
  metadata?: {
    processingTime?: number;
    confidence?: number;
    model?: string;
  };
}

export interface SummarizeOptions {
  level?: SummaryLevel;
  language?: SummaryLanguage;
  includeKeyPoints?: boolean;
  includeReferences?: boolean;
  maxLength?: number;
  focusAreas?: string[];
}
```

---

### frontend/src/types/navigator.d.ts (NEW FILE)

```typescript
/**
 * Type augmentation for browser APIs
 */

interface Navigator {
  /**
   * iOS-specific property indicating if app is in standalone mode
   * @see https://developer.apple.com/documentation/webkitjs/navigator/standalone
   */
  standalone?: boolean;
}

interface Window {
  /**
   * BeforeInstallPromptEvent for PWA installation
   */
  beforeinstallprompt?: Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
}
```

---

### frontend/src/types/api.ts (NEW FILE)

```typescript
/**
 * API error and response types
 */

export interface ApiErrorResponse {
  error?: string | string[] | Array<{ message: string }>;
  message?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface AxiosLikeError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  message?: string;
  code?: string;
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
  statusCode?: number;
}
```

---

### frontend/src/types/forms.ts (NEW FILE)

```typescript
/**
 * Form-related types
 */

export type DocumentCategory =
  | 'constitution'
  | 'law'
  | 'code'
  | 'regulation'
  | 'jurisprudence';

export type FinancePeriod = 'month' | 'quarter' | 'year';

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'general';

export interface DocumentFormData {
  title: string;
  category: DocumentCategory;
  content: string;
  year: string;
  number: string;
  jurisdiction: string;
}
```

---

### frontend/src/types/ui.ts (NEW FILE)

```typescript
/**
 * UI component shared types
 */

import { type VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface FeedbackTypeConfig {
  value: FeedbackType;
  label: string;
  variant: BadgeVariant;
}
```

---

### frontend/src/types/index.ts (NEW FILE)

```typescript
/**
 * Central export point for all types
 */

export * from './summarization';
export * from './api';
export * from './forms';
export * from './ui';
```

---

## File 2: Fix SummaryCard Component

### frontend/src/components/summarization/SummaryCard.tsx

```typescript
// REPLACE lines 1-40 with:
/**
 * SummaryCard Component
 * Professional card for displaying document summarization results
 * Features: Dark mode, loading states, copy-to-clipboard, confidence visualization
 */

'use client';

import React, { useState } from 'react';
import { FileText, Copy, Clock, BarChart2, CheckCircle2, Eye } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDateTime } from '@/lib/utils';
import type { DocumentSummary, SummaryLevel } from '@/types/summarization';
import type { BadgeVariant } from '@/types/ui';

export interface SummaryCardProps {
  summary?: DocumentSummary;
  documentName?: string;
  isLoading?: boolean;
  onViewDocument?: () => void;
}

// REPLACE lines 79-87 with:
const getLevelBadge = (level: SummaryLevel): { label: string; variant: BadgeVariant } => {
  const configs: Record<SummaryLevel, { label: string; variant: BadgeVariant }> = {
    brief: { label: 'Brief', variant: 'secondary' },
    standard: { label: 'Standard', variant: 'default' },
    detailed: { label: 'Detailed', variant: 'success' },
  };
  return configs[level];
};

// REPLACE lines 104-137 with:
if (isLoading || !summary) {
  return (
    <Card className="w-full dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton variant="text" width="70%" height="24px" />
            <div className="flex gap-2">
              <Skeleton variant="rectangular" width="80px" height="22px" />
              <Skeleton variant="rectangular" width="50px" height="22px" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height="16px" />
          <Skeleton variant="text" width="95%" height="16px" />
          <Skeleton variant="text" width="88%" height="16px" />
          <Skeleton variant="text" width="92%" height="16px" />
          <Skeleton variant="text" width="75%" height="16px" />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4">
        <div className="flex justify-between">
          <Skeleton variant="text" width="120px" height="16px" />
          <Skeleton variant="text" width="100px" height="16px" />
        </div>
      </CardFooter>
    </Card>
  );
}

// REPLACE lines 289-293 with:
// Export loading skeleton as separate component for flexibility
export function SummaryCardSkeleton() {
  return <SummaryCard isLoading={true} />;
}
```

---

## File 3: Fix Admin Page

### frontend/src/app/dashboard/admin/page.tsx

```typescript
// ADD import at top:
import type { DocumentCategory, DocumentFormData } from '@/types/forms';

// REPLACE lines 34-41 with:
const [formData, setFormData] = useState<DocumentFormData>({
  title: '',
  category: 'law',
  content: '',
  year: '',
  number: '',
  jurisdiction: '',
});

// ADD handler function before the useEffect:
const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setFormData({
    ...formData,
    category: e.target.value as DocumentCategory,
  });
};

// REPLACE line 223 with:
onChange={handleCategoryChange}
```

---

## File 4: Fix Cases Page

### frontend/src/app/dashboard/cases/[id]/page.tsx

```typescript
// ADD near top of component:
const handleQuerySubmit = () => {
  if (!query.trim()) return;
  // Your query submission logic
  console.log('Submitting query:', query);
};

// REPLACE lines 607-612 with:
onKeyDown={(e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleQuerySubmit();
  }
}}
```

---

## File 5: Fix Feedback Page

### frontend/src/app/feedback/page.tsx

```typescript
// ADD imports at top:
import type { BadgeVariant } from '@/types/ui';
import type { FeedbackType, FeedbackTypeConfig } from '@/types/forms';

// REPLACE lines 23-28 with:
const FEEDBACK_TYPES: FeedbackTypeConfig[] = [
  { value: 'bug', label: 'Reporte de Error', variant: 'destructive' },
  { value: 'feature', label: 'Solicitud de Función', variant: 'default' },
  { value: 'improvement', label: 'Mejora', variant: 'success' },
  { value: 'general', label: 'General', variant: 'secondary' },
];

// REPLACE lines 231-237 with:
<Badge
  variant={
    FEEDBACK_TYPES.find((t) => t.value === feedback.type)?.variant || 'secondary'
  }
>
  {FEEDBACK_TYPES.find((t) => t.value === feedback.type)?.label || feedback.type}
</Badge>
```

---

## File 6: Fix Finance Page

### frontend/src/app/dashboard/finance/page.tsx

```typescript
// ADD import at top:
import type { FinancePeriod } from '@/types/forms';

// UPDATE state declaration:
const [selectedPeriod, setSelectedPeriod] = useState<FinancePeriod>('month');

// ADD handler function:
const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setSelectedPeriod(e.target.value as FinancePeriod);
};

// REPLACE line 63 with:
onChange={handlePeriodChange}
```

---

## File 7: Fix PWAInstallPrompt

### frontend/src/components/PWAInstallPrompt.tsx

```typescript
// The navigator.d.ts file we created handles this automatically
// Just ensure it's being used:

// REPLACE line 21 with:
const isInstalled =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;  // Now type-safe!
```

---

## File 8: Fix API Client

### frontend/src/lib/api-client.ts

```typescript
// ADD imports at top:
import type { ApiErrorResponse, AxiosLikeError } from '@/types/api';

// REPLACE lines 84-108 with:
/**
 * Parse API error into user-friendly message
 */
export const parseApiError = (error: unknown): string => {
  if (!error) {
    return 'Error de conexión con el servidor';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle Axios-like errors
  const axiosError = error as AxiosLikeError;
  const errorData = axiosError.response?.data;

  if (!errorData) {
    return axiosError.message || 'Error de conexión con el servidor';
  }

  if (errorData.error) {
    if (Array.isArray(errorData.error)) {
      return errorData.error
        .map((e) => (typeof e === 'string' ? e : e.message))
        .join(', ');
    }
    return String(errorData.error);
  }

  if (errorData.message) {
    return String(errorData.message);
  }

  return 'Error al procesar la solicitud';
};

/**
 * Type guard to check if error is an Axios-like error
 */
export const isAxiosError = (error: unknown): error is AxiosLikeError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  );
};

export default apiClient;
```

---

## File 9: Fix Summarization Page

### frontend/src/app/summarization/page.tsx

```typescript
// ADD helper function near top:
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Ocurrió un error desconocido';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  const apiError = error as { message?: string; error?: string };
  return apiError.message || apiError.error || 'Ocurrió un error. Por favor intenta nuevamente.';
};

// REPLACE lines 340-343 with:
<p className="text-sm mt-1">
  {getErrorMessage(summarizeMutation.error)}
</p>
```

---

## File 10: Fix Badge Component

### frontend/src/components/ui/badge.tsx

```typescript
// REPLACE entire file with:
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-600 text-white",
        secondary: "border-transparent bg-gray-200 text-gray-900",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "text-gray-900 border-gray-300",
        success: "border-transparent bg-green-600 text-white",
        warning: "border-transparent bg-yellow-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Export the variant type for external use
export type BadgeVariant = NonNullable<BadgeProps['variant']>;

export { Badge, badgeVariants, type BadgeProps }
```

---

## File 11: Update Hooks

### frontend/src/hooks/useSummarization.ts

```typescript
// REPLACE imports at top with:
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  SummaryLevel,
  SummaryLanguage,
  KeyPoint,
  DocumentSummary,
  SummarizeOptions,
} from '@/types/summarization';

// REMOVE lines 12-66 (now imported from types)
```

---

## File 12: Update Component Index

### frontend/src/components/summarization/index.ts

```typescript
// REPLACE entire file with:
/**
 * Summarization Components
 * Export all summarization-related components and types
 */

export { SummaryCard, SummaryCardSkeleton } from './SummaryCard';
export type { SummaryCardProps } from './SummaryCard';

export { SummaryOptions } from './SummaryOptions';
export type { SummaryOptionsProps } from './SummaryOptions';

export {
  DocumentSelector,
  type DocumentSelectorProps,
  type LegalDocument,
  type DocumentType,
  type JurisdictionType,
} from './DocumentSelector';

// Re-export types for convenience
export type {
  DocumentSummary,
  SummaryLevel,
  SummaryLanguage,
  KeyPoint,
  SummarizeOptions,
} from '@/types/summarization';
```

---

## Implementation Order

1. **First** - Create all type files (types/*.ts)
2. **Second** - Update Badge component (exports BadgeVariant)
3. **Third** - Update SummaryCard component (uses shared types)
4. **Fourth** - Update API client (proper error types)
5. **Fifth** - Update all page components (admin, cases, feedback, finance)
6. **Sixth** - Update hooks (useSummarization)
7. **Last** - Update component index files

---

## Verification Checklist

After implementing fixes, verify:

- [ ] `npx tsc --noEmit` runs without errors
- [ ] No `as any` assertions remain in codebase
- [ ] All Badge variants are type-safe
- [ ] SummaryCard loading state works without type errors
- [ ] Form handlers use proper types
- [ ] Error messages display correctly
- [ ] PWA detection works without type warnings
- [ ] All component prop types are exported

---

## Testing Commands

```bash
# Check for remaining type issues
cd frontend
npx tsc --noEmit

# Search for remaining as any
grep -r "as any" src --include="*.tsx" --include="*.ts"

# Verify all type exports
grep -r "export type" src/types

# Run tests
npm test
```

---

**Note:** Make sure to test each change individually and commit working code before moving to the next fix.
