# SummaryCard Integration Guide

Quick reference for integrating the SummaryCard component into your application.

## 5-Minute Quick Start

### Step 1: Import the Component

```typescript
import { SummaryCard, SummaryCardSkeleton } from '@/components/summarization';
```

### Step 2: Prepare Your Data

```typescript
// Example API response shape
interface APISummary {
  id: string;
  documentId: string;
  level: 'brief' | 'standard' | 'detailed';
  summary: string;
  wordCount: number;
  originalWordCount: number;
  compressionRatio: number;
  confidenceScore: number;
  language: string;
  generatedAt: string;
}
```

### Step 3: Use in Your Component

```typescript
function DocumentSummaryPage({ summaryId }: { summaryId: string }) {
  const [summary, setSummary] = useState<APISummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/summaries/${summaryId}`)
      .then(res => res.json())
      .then(data => {
        setSummary(data);
        setLoading(false);
      });
  }, [summaryId]);

  if (loading) {
    return <SummaryCardSkeleton />;
  }

  return (
    <SummaryCard
      summary={summary!}
      documentName="My Document"
      onViewDocument={() => router.push(`/documents/${summary!.documentId}`)}
    />
  );
}
```

---

## Common Integration Patterns

### Pattern 1: List View

Display multiple summaries in a grid:

```typescript
function SummaryListPage() {
  const { summaries, isLoading } = useSummaries();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {summaries.map(summary => (
        <SummaryCard
          key={summary.id}
          summary={summary}
          documentName={summary.document?.name}
          onViewDocument={() => navigate(`/documents/${summary.documentId}`)}
        />
      ))}
    </div>
  );
}
```

### Pattern 2: Detail View

Single summary with additional controls:

```typescript
function SummaryDetailPage({ summaryId }: { summaryId: string }) {
  const { summary, isLoading, document } = useSummaryDetail(summaryId);

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <button onClick={() => router.back()}>← Back to documents</button>
      </div>

      {isLoading ? (
        <SummaryCardSkeleton />
      ) : (
        <SummaryCard
          summary={summary}
          documentName={document.name}
          onViewDocument={() => router.push(`/documents/${summary.documentId}`)}
        />
      )}

      <div className="mt-6 flex gap-4">
        <button>Generate New Summary</button>
        <button>Export as PDF</button>
      </div>
    </div>
  );
}
```

### Pattern 3: Comparison View

Compare multiple summaries side-by-side:

```typescript
function SummaryComparisonPage({ summaryIds }: { summaryIds: string[] }) {
  const { summaries, isLoading } = useSummaries(summaryIds);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Compare Summaries</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          summaries.map(summary => (
            <SummaryCard
              key={summary.id}
              summary={summary}
              documentName={`Summary ${summary.level}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### Pattern 4: Modal/Dialog

Show summary in a modal:

```typescript
function DocumentPage() {
  const [showSummary, setShowSummary] = useState(false);
  const { summary, isLoading } = useDocumentSummary(documentId);

  return (
    <>
      <button onClick={() => setShowSummary(true)}>
        View Summary
      </button>

      <Dialog open={showSummary} onClose={() => setShowSummary(false)}>
        <div className="max-w-2xl mx-auto p-6">
          {isLoading ? (
            <SummaryCardSkeleton />
          ) : (
            <SummaryCard
              summary={summary}
              onViewDocument={() => {
                setShowSummary(false);
                scrollToDocument();
              }}
            />
          )}
        </div>
      </Dialog>
    </>
  );
}
```

### Pattern 5: With React Query

Integrate with React Query for data fetching:

```typescript
function SummaryWithQuery({ summaryId }: { summaryId: string }) {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['summary', summaryId],
    queryFn: () => fetchSummary(summaryId),
  });

  if (error) {
    return <div>Error loading summary: {error.message}</div>;
  }

  if (isLoading) {
    return <SummaryCardSkeleton />;
  }

  return (
    <SummaryCard
      summary={summary}
      onViewDocument={() => router.push(`/documents/${summary.documentId}`)}
    />
  );
}
```

---

## API Integration

### Fetch Summary from Backend

```typescript
async function fetchSummary(summaryId: string): Promise<APISummary> {
  const response = await fetch(`/api/summaries/${summaryId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch summary');
  }

  return response.json();
}
```

### Generate New Summary

```typescript
async function generateSummary(
  documentId: string,
  level: 'brief' | 'standard' | 'detailed'
): Promise<APISummary> {
  const response = await fetch('/api/summaries', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId, level }),
  });

  return response.json();
}

// Usage
function DocumentPage({ documentId }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const summary = await generateSummary(documentId, 'standard');
      // Show the new summary
      setSummary(summary);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button onClick={handleGenerate} disabled={generating}>
        {generating ? 'Generating...' : 'Generate Summary'}
      </button>

      {generating ? (
        <SummaryCardSkeleton />
      ) : summary ? (
        <SummaryCard summary={summary} />
      ) : null}
    </>
  );
}
```

---

## State Management Integration

### With Redux

```typescript
// Slice
const summariesSlice = createSlice({
  name: 'summaries',
  initialState: {
    items: {},
    loading: {},
  },
  reducers: {
    fetchSummaryStart: (state, action) => {
      state.loading[action.payload] = true;
    },
    fetchSummarySuccess: (state, action) => {
      state.items[action.payload.id] = action.payload;
      state.loading[action.payload.id] = false;
    },
  },
});

// Component
function SummaryWithRedux({ summaryId }) {
  const dispatch = useDispatch();
  const summary = useSelector(state => state.summaries.items[summaryId]);
  const isLoading = useSelector(state => state.summaries.loading[summaryId]);

  useEffect(() => {
    dispatch(fetchSummary(summaryId));
  }, [summaryId]);

  if (isLoading) {
    return <SummaryCardSkeleton />;
  }

  return <SummaryCard summary={summary} />;
}
```

### With Zustand

```typescript
// Store
const useSummaryStore = create((set) => ({
  summaries: {},
  loading: {},
  fetchSummary: async (id) => {
    set(state => ({ loading: { ...state.loading, [id]: true } }));
    const summary = await fetchSummary(id);
    set(state => ({
      summaries: { ...state.summaries, [id]: summary },
      loading: { ...state.loading, [id]: false },
    }));
  },
}));

// Component
function SummaryWithZustand({ summaryId }) {
  const summary = useSummaryStore(state => state.summaries[summaryId]);
  const isLoading = useSummaryStore(state => state.loading[summaryId]);
  const fetchSummary = useSummaryStore(state => state.fetchSummary);

  useEffect(() => {
    if (!summary && !isLoading) {
      fetchSummary(summaryId);
    }
  }, [summaryId]);

  if (isLoading) {
    return <SummaryCardSkeleton />;
  }

  return <SummaryCard summary={summary} />;
}
```

---

## Performance Optimization

### Memoization

```typescript
import React, { memo, useCallback } from 'react';

// Memoize the component
const MemoizedSummaryCard = memo(SummaryCard);

// Memoize callbacks
function SummaryList({ summaries }) {
  const handleViewDocument = useCallback((documentId: string) => {
    router.push(`/documents/${documentId}`);
  }, [router]);

  return (
    <>
      {summaries.map(summary => (
        <MemoizedSummaryCard
          key={summary.id}
          summary={summary}
          onViewDocument={() => handleViewDocument(summary.documentId)}
        />
      ))}
    </>
  );
}
```

### Virtual Scrolling

For large lists (50+ items):

```typescript
import { FixedSizeList } from 'react-window';

function VirtualSummaryList({ summaries }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <SummaryCard
        summary={summaries[index]}
        onViewDocument={() => navigate(`/docs/${summaries[index].documentId}`)}
      />
    </div>
  );

  return (
    <FixedSizeList
      height={800}
      itemCount={summaries.length}
      itemSize={450}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const SummaryCard = lazy(() => import('@/components/summarization'));

function LazyLoadedSummary({ summaryId }) {
  return (
    <Suspense fallback={<SummaryCardSkeleton />}>
      <SummaryCard summary={summaryData} />
    </Suspense>
  );
}
```

---

## Dark Mode Integration

### With next-themes

```typescript
import { ThemeProvider } from 'next-themes';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <YourApp />
    </ThemeProvider>
  );
}

// Component automatically responds to dark mode
function SummaryPage() {
  return <SummaryCard summary={summaryData} />;
}
```

### Manual Toggle

```typescript
function SummaryWithThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? 'dark' : ''}>
      <button onClick={() => setIsDark(!isDark)}>
        Toggle {isDark ? 'Light' : 'Dark'} Mode
      </button>

      <SummaryCard summary={summaryData} />
    </div>
  );
}
```

---

## Error Handling

### With Error Boundary

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function SummaryWithErrorBoundary({ summaryId }) {
  return (
    <ErrorBoundary fallback={<div>Failed to load summary</div>}>
      <SummaryCard summary={summaryData} />
    </ErrorBoundary>
  );
}
```

### With Try/Catch

```typescript
function SummaryWithErrorHandling({ summaryId }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary(summaryId)
      .then(setSummary)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [summaryId]);

  if (error) {
    return (
      <div className="p-6 border border-red-300 rounded-lg bg-red-50">
        <p className="text-red-800">Error: {error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return <SummaryCardSkeleton />;
  }

  return <SummaryCard summary={summary} />;
}
```

---

## Testing Integration

### Unit Test Setup

```typescript
import { render, screen } from '@testing-library/react';
import { SummaryCard } from '@/components/summarization';

const mockSummary = {
  id: 'test-1',
  documentId: 'doc-1',
  level: 'standard' as const,
  summary: 'Test summary',
  wordCount: 100,
  originalWordCount: 1000,
  compressionRatio: 0.1,
  confidenceScore: 0.9,
  language: 'EN',
  generatedAt: '2025-12-12T10:00:00Z',
};

test('renders summary card', () => {
  render(<SummaryCard summary={mockSummary} />);
  expect(screen.getByText('Test summary')).toBeInTheDocument();
});
```

### Integration Test

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('navigates to document on view button click', async () => {
  const mockRouter = { push: jest.fn() };
  const user = userEvent.setup();

  render(
    <SummaryCard
      summary={mockSummary}
      onViewDocument={() => mockRouter.push('/doc/123')}
    />
  );

  const viewButton = screen.getByRole('button', { name: /view document/i });
  await user.click(viewButton);

  expect(mockRouter.push).toHaveBeenCalledWith('/doc/123');
});
```

---

## Customization

### Custom Styles

```typescript
// Extend with custom classes
<SummaryCard
  summary={summaryData}
  className="custom-shadow border-2 border-blue-500"
/>
```

### Wrapper Component

```typescript
function CustomSummaryCard({ summary, ...props }) {
  return (
    <div className="relative">
      {/* Custom badge overlay */}
      {summary.confidenceScore > 0.95 && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded">
          High Quality
        </div>
      )}

      <SummaryCard summary={summary} {...props} />
    </div>
  );
}
```

---

## Troubleshooting

### Issue: Component not rendering

**Solution**: Ensure all required props are provided:
```typescript
// ❌ Missing required fields
<SummaryCard summary={{ id: '123' }} />

// ✅ All required fields
<SummaryCard summary={{
  id: '123',
  documentId: 'doc-1',
  level: 'standard',
  summary: 'Text here',
  wordCount: 100,
  originalWordCount: 1000,
  compressionRatio: 0.1,
  confidenceScore: 0.9,
  language: 'EN',
  generatedAt: '2025-12-12T10:00:00Z'
}} />
```

### Issue: Copy not working

**Solution**: Ensure HTTPS or localhost:
```typescript
// Check if clipboard API is available
if (!navigator.clipboard) {
  console.error('Clipboard API not available (requires HTTPS)');
}
```

### Issue: Dark mode not working

**Solution**: Add `dark` class to parent:
```typescript
<html className="dark">
  <SummaryCard summary={data} />
</html>
```

---

## Next Steps

1. ✅ Import component
2. ✅ Fetch data from API
3. ✅ Handle loading states
4. ✅ Add navigation callbacks
5. ✅ Test in your application
6. ✅ Deploy to production

For more examples, see `SummaryCard.example.tsx`.

For full documentation, see `README.md`.
