# SummaryCard - Quick Reference Card

## Import
```typescript
import { SummaryCard, SummaryCardSkeleton } from '@/components/summarization';
```

## Basic Usage
```typescript
<SummaryCard
  summary={{
    id: 'sum-123',
    documentId: 'doc-456',
    level: 'standard',
    summary: 'Your summary text here...',
    wordCount: 150,
    originalWordCount: 1500,
    compressionRatio: 0.1,
    confidenceScore: 0.92,
    language: 'ES',
    generatedAt: '2025-12-12T10:30:00Z'
  }}
  documentName="Document Name"
  onViewDocument={() => router.push('/documents/doc-456')}
/>
```

## With Loading State
```typescript
{isLoading ? <SummaryCardSkeleton /> : <SummaryCard summary={data} />}
```

## Props Quick Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `summary` | `Summary` | Yes | - | Summary data object |
| `summary.id` | `string` | Yes | - | Unique ID |
| `summary.documentId` | `string` | Yes | - | Source document ID |
| `summary.level` | `'brief'\|'standard'\|'detailed'` | Yes | - | Detail level |
| `summary.summary` | `string` | Yes | - | Summary text |
| `summary.wordCount` | `number` | Yes | - | Summary word count |
| `summary.originalWordCount` | `number` | Yes | - | Original doc word count |
| `summary.compressionRatio` | `number` | Yes | - | Compression (0-1) |
| `summary.confidenceScore` | `number` | Yes | - | AI confidence (0-1) |
| `summary.language` | `string` | Yes | - | Language code |
| `summary.generatedAt` | `string` | Yes | - | ISO timestamp |
| `documentName` | `string` | No | `Document ${documentId}` | Display name |
| `isLoading` | `boolean` | No | `false` | Show skeleton |
| `onViewDocument` | `() => void` | No | - | View callback |

## Summary Levels

| Level | Badge Color | Use Case | Typical Length |
|-------|-------------|----------|----------------|
| `brief` | Gray | Quick overview | 50-100 words |
| `standard` | Blue | Balanced detail | 150-300 words |
| `detailed` | Green | Comprehensive | 300-500+ words |

## Confidence Score Colors

| Score Range | Color | Label | Visual |
|-------------|-------|-------|--------|
| 90-100% | Green | High | 🟢 |
| 70-89% | Yellow | Medium | 🟡 |
| 0-69% | Red | Low | 🔴 |

## Icons Used

| Icon | Purpose | Size |
|------|---------|------|
| `FileText` | Document indicator | 20px |
| `Copy` | Copy button | 16px |
| `CheckCircle2` | Copy success | 16px |
| `Eye` | View document | 16px |
| `Clock` | Timestamp | 14px |
| `BarChart2` | Metrics | 14px |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Next element |
| `Shift+Tab` | Previous element |
| `Enter` / `Space` | Activate button |

## Common Patterns

### Pattern 1: List with Loading
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {isLoading ? (
    Array(6).fill(0).map((_, i) => <SummaryCardSkeleton key={i} />)
  ) : (
    summaries.map(s => <SummaryCard key={s.id} summary={s} />)
  )}
</div>
```

### Pattern 2: With React Query
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['summary', id],
  queryFn: () => fetchSummary(id)
});

return isLoading ? <SummaryCardSkeleton /> : <SummaryCard summary={data} />;
```

### Pattern 3: Memoized for Performance
```typescript
const MemoCard = memo(SummaryCard);
const handleView = useCallback(() => navigate(`/docs/${id}`), [id]);

<MemoCard summary={data} onViewDocument={handleView} />
```

## Styling Classes

### Light Mode
- Background: `bg-white`
- Text: `text-gray-900`
- Border: `border-gray-200`
- Hover: `shadow-md`

### Dark Mode
- Background: `dark:bg-gray-800`
- Text: `dark:text-gray-100`
- Border: `dark:border-gray-700`
- Hover: `dark:shadow-lg`

## Responsive Breakpoints

```css
/* Mobile First */
default: single column, stacked buttons

/* Tablet (768px+) */
md: 2-column grid, side-by-side buttons

/* Desktop (1024px+) */
lg: 3-column grid, optimized spacing
```

## Performance Tips

1. **Memoize for lists**: `const MemoCard = memo(SummaryCard);`
2. **Virtual scroll for 50+**: Use `react-window`
3. **Lazy load**: `const Card = lazy(() => import('@/components/summarization'));`
4. **Debounce updates**: When filtering/searching

## Accessibility Checklist

- [x] Keyboard navigable
- [x] Screen reader labels
- [x] Color contrast (4.5:1)
- [x] Focus indicators
- [x] ARIA attributes
- [x] Semantic HTML

## Browser Requirements

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Clipboard API (HTTPS required)

## Common Issues & Solutions

### Issue: "Cannot find module '@/components/ui/card'"
**Solution**: Ensure path alias configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Copy button not working
**Solution**:
- Check HTTPS (clipboard API requires secure context)
- Test: `navigator.clipboard ? 'Available' : 'Not available'`

### Issue: Dark mode not showing
**Solution**: Add `dark` class to root:
```html
<html className="dark">
```

## File Locations

```
frontend/src/components/summarization/
├── SummaryCard.tsx              # Main component
├── SummaryCard.test.tsx         # Tests
├── SummaryCard.example.tsx      # Examples
├── index.ts                     # Exports
├── README.md                    # Full docs
├── COMPONENT_SUMMARY.md         # Delivery summary
├── INTEGRATION_GUIDE.md         # Integration patterns
├── VISUAL_REFERENCE.md          # Visual specs
└── QUICK_REFERENCE.md           # This file
```

## Testing

```bash
# Run tests
npm test SummaryCard.test.tsx

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Example Data Generator

```typescript
function mockSummary(overrides = {}): Summary {
  return {
    id: 'sum-' + Math.random().toString(36).substr(2, 9),
    documentId: 'doc-' + Math.random().toString(36).substr(2, 9),
    level: 'standard',
    summary: 'Sample summary text...',
    wordCount: 150,
    originalWordCount: 1500,
    compressionRatio: 0.1,
    confidenceScore: 0.92,
    language: 'ES',
    generatedAt: new Date().toISOString(),
    ...overrides
  };
}

// Usage
<SummaryCard summary={mockSummary({ level: 'brief' })} />
```

## API Response Example

```json
{
  "id": "sum-abc123",
  "documentId": "doc-xyz789",
  "level": "standard",
  "summary": "This contract establishes...",
  "wordCount": 180,
  "originalWordCount": 1800,
  "compressionRatio": 0.1,
  "confidenceScore": 0.89,
  "language": "EN",
  "generatedAt": "2025-12-12T10:30:00.000Z"
}
```

## TypeScript Types

```typescript
type SummaryLevel = 'brief' | 'standard' | 'detailed';

interface Summary {
  id: string;
  documentId: string;
  level: SummaryLevel;
  summary: string;
  wordCount: number;
  originalWordCount: number;
  compressionRatio: number;
  confidenceScore: number;
  language: string;
  generatedAt: string;
}

interface SummaryCardProps {
  summary: Summary;
  documentName?: string;
  isLoading?: boolean;
  onViewDocument?: () => void;
}
```

## Color Palette

### Light Mode
- Primary: Blue-600 (#2563EB)
- Success: Green-500 (#22C55E)
- Warning: Yellow-500 (#EAB308)
- Danger: Red-500 (#EF4444)
- Text: Gray-900 (#111827)
- Border: Gray-200 (#E5E7EB)

### Dark Mode
- Primary: Blue-400 (#60A5FA)
- Success: Green-400 (#4ADE80)
- Warning: Yellow-400 (#FACC15)
- Danger: Red-400 (#F87171)
- Text: Gray-100 (#F3F4F6)
- Border: Gray-700 (#374151)

## Dependencies

```json
{
  "react": "^18.x",
  "lucide-react": "^0.330.0",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

## Version

- **Current**: 1.0.0
- **Created**: 2025-12-12
- **Status**: Production Ready

---

**Quick Start**: Import → Prepare Data → Render
**Full Docs**: See README.md
**Examples**: See SummaryCard.example.tsx
**Integration**: See INTEGRATION_GUIDE.md
