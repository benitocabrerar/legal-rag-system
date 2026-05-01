# DocumentSelector - API Integration Guide

This guide shows how to migrate the DocumentSelector from mock data to real API integration.

## Current Implementation (Mock Data)

Currently, the component uses hardcoded mock data:

```typescript
const mockDocuments: LegalDocument[] = [
  {
    id: '1',
    title: 'Constitución del Ecuador 2008',
    type: 'CONSTITUCION',
    jurisdiction: 'NACIONAL',
    year: 2008,
  },
  // ... more documents
];
```

## Future Implementation (API Integration)

### Step 1: Update Component Props

Add new props to support external data:

```typescript
interface DocumentSelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;

  // New props for API integration
  documents?: LegalDocument[];      // External documents data
  isLoading?: boolean;              // Loading state from parent
  onSearch?: (query: string) => void; // Server-side search callback
}
```

### Step 2: Create API Client Hook

Create a custom hook for fetching documents:

```typescript
// src/hooks/useLegalDocuments.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UseLegalDocumentsOptions {
  search?: string;
  type?: DocumentType;
  jurisdiction?: JurisdictionType;
  limit?: number;
  offset?: number;
}

export function useLegalDocuments(options: UseLegalDocumentsOptions = {}) {
  return useQuery({
    queryKey: ['legal-documents', options],
    queryFn: async () => {
      const response = await apiClient.get<{ documents: LegalDocument[] }>(
        '/api/legal-documents',
        { params: options }
      );
      return response.data.documents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### Step 3: Update DocumentSelector Component

Modify the component to accept external documents:

```typescript
export function DocumentSelector({
  value,
  onChange,
  multiple = false,
  placeholder = 'Seleccionar documento...',
  disabled = false,
  className,
  maxSelections,
  documents: externalDocuments, // New prop
  isLoading: externalLoading,   // New prop
  onSearch,                      // New prop
}: DocumentSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // Use external documents if provided, otherwise use mock data
  const documents = externalDocuments || mockDocuments;
  const isLoading = externalLoading || false;

  // Handle search with debouncing
  React.useEffect(() => {
    if (onSearch) {
      const timeoutId = setTimeout(() => {
        onSearch(search);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [search, onSearch]);

  // Rest of the component remains the same...
}
```

### Step 4: Usage with API

```typescript
import { DocumentSelector } from '@/components/summarization';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { useState } from 'react';

function MyComponent() {
  const [documentId, setDocumentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documents, isLoading } = useLegalDocuments({
    search: searchQuery,
  });

  return (
    <DocumentSelector
      value={documentId}
      onChange={setDocumentId}
      documents={documents}
      isLoading={isLoading}
      onSearch={setSearchQuery}
      placeholder="Search legal documents..."
    />
  );
}
```

## API Endpoints

### GET /api/legal-documents

Fetch list of legal documents with optional filters.

**Query Parameters:**

```typescript
{
  search?: string;          // Search by title, number
  type?: DocumentType;      // Filter by document type
  jurisdiction?: JurisdictionType; // Filter by jurisdiction
  limit?: number;           // Pagination limit (default: 50)
  offset?: number;          // Pagination offset (default: 0)
  sortBy?: 'title' | 'year' | 'createdAt'; // Sort field
  order?: 'asc' | 'desc';   // Sort order
}
```

**Response:**

```typescript
{
  documents: LegalDocument[];
  total: number;
  limit: number;
  offset: number;
}
```

**Example:**

```bash
GET /api/legal-documents?search=constitución&jurisdiction=NACIONAL&limit=20
```

### GET /api/legal-documents/:id

Fetch single document details.

**Response:**

```typescript
{
  id: string;
  title: string;
  type: DocumentType;
  jurisdiction: JurisdictionType;
  number?: string;
  year?: number;
  content: string;
  metadata: {
    fileSize: number;
    pageCount: number;
    uploadedAt: string;
    uploadedBy: string;
  };
}
```

## Advanced Features

### Infinite Scroll

For large datasets, implement infinite scroll:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function useLegalDocumentsInfinite(search: string) {
  return useInfiniteQuery({
    queryKey: ['legal-documents', 'infinite', search],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await apiClient.get('/api/legal-documents', {
        params: { search, offset: pageParam, limit: 20 },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.documents.length < 20) return undefined;
      return pages.length * 20;
    },
  });
}
```

### Server-Side Filtering

Add filters to the component:

```typescript
interface DocumentSelectorProps {
  // ... existing props
  filters?: {
    type?: DocumentType[];
    jurisdiction?: JurisdictionType[];
    yearFrom?: number;
    yearTo?: number;
  };
}

// Usage
<DocumentSelector
  value={documentId}
  onChange={setDocumentId}
  filters={{
    type: ['LEY_ORGANICA', 'CODIGO'],
    jurisdiction: ['NACIONAL'],
    yearFrom: 2000,
  }}
/>
```

### Caching Strategy

Implement smart caching:

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});
```

### Optimistic Updates

For better UX, implement optimistic updates:

```typescript
const mutation = useMutation({
  mutationFn: addDocument,
  onMutate: async (newDocument) => {
    await queryClient.cancelQueries(['legal-documents']);

    const previousDocuments = queryClient.getQueryData(['legal-documents']);

    queryClient.setQueryData(['legal-documents'], (old: any) => ({
      ...old,
      documents: [...old.documents, newDocument],
    }));

    return { previousDocuments };
  },
  onError: (err, newDocument, context) => {
    queryClient.setQueryData(['legal-documents'], context?.previousDocuments);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['legal-documents']);
  },
});
```

## Performance Optimization

### 1. Debounced Search

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function MyComponent() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: documents } = useLegalDocuments({
    search: debouncedSearch,
  });
}
```

### 2. Virtual Scrolling

For very large lists, use virtual scrolling:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = React.useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: documents.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  overscan: 5,
});
```

### 3. Memoization

Memoize expensive computations:

```typescript
const filteredDocuments = React.useMemo(() => {
  if (!search) return documents;

  return documents.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );
}, [documents, search]);
```

## Error Handling

Add error boundaries and fallbacks:

```typescript
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function DocumentSelectorWithData() {
  const { data, isLoading, error } = useLegalDocuments();

  if (error) {
    return (
      <div className="text-red-600">
        Error loading documents: {error.message}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DocumentSelector
        documents={data}
        isLoading={isLoading}
        // ... other props
      />
    </ErrorBoundary>
  );
}
```

## Migration Checklist

- [ ] Create API endpoints for documents
- [ ] Implement `useLegalDocuments` hook
- [ ] Update DocumentSelector props
- [ ] Add loading states
- [ ] Add error handling
- [ ] Implement debounced search
- [ ] Add pagination/infinite scroll
- [ ] Set up caching strategy
- [ ] Add optimistic updates
- [ ] Performance testing
- [ ] Update documentation
- [ ] Update tests with API mocks

## Testing with API

Mock API responses in tests:

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/legal-documents', (req, res, ctx) => {
    return res(
      ctx.json({
        documents: mockDocuments,
        total: mockDocuments.length,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Backwards Compatibility

Keep mock data fallback for development:

```typescript
const DocumentSelector = ({ documents, ...props }) => {
  const effectiveDocuments = documents || mockDocuments;
  // Use effectiveDocuments throughout component
};
```

This ensures the component works both with and without API integration.
