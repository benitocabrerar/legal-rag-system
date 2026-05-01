# SummaryCard Streaming Mode Documentation

## Overview

The `SummaryCard` component now supports real-time streaming mode, allowing you to display AI-generated summaries as they are being generated, providing a better user experience with immediate visual feedback.

## Features

### Streaming Mode Features
- Real-time text streaming with typing animation
- Live word count updates during streaming
- Animated streaming indicator badge
- Progress animations for metrics
- Visual feedback with pulsing animations
- Smooth transition from streaming to completed state
- Copy functionality works with partial streaming content

## Props

### New Props for Streaming

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isStreaming` | `boolean` | `false` | Indicates if the summary is currently streaming |
| `streamingContent` | `string` | `''` | The partial content being streamed in real-time |
| `onStreamingComplete` | `() => void` | `undefined` | Callback fired when streaming completes |

### Existing Props (Unchanged)

All existing props continue to work as before:
- `summary` - Summary data object (required)
- `documentName` - Name of the document
- `isLoading` - Loading skeleton state
- `onViewDocument` - Callback for viewing the document

## Usage Examples

### Basic Streaming Example

```tsx
import { SummaryCard } from '@/components/summarization/SummaryCard';
import { useState } from 'react';

function MyComponent() {
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');

  const summary = {
    id: 'sum-123',
    documentId: 'doc-456',
    level: 'standard',
    summary: 'Full summary text here...',
    wordCount: 150,
    originalWordCount: 1500,
    compressionRatio: 0.1,
    confidenceScore: 0.92,
    language: 'ES',
    generatedAt: new Date().toISOString(),
  };

  return (
    <SummaryCard
      summary={summary}
      documentName="Contract Agreement 2025"
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      onStreamingComplete={() => {
        setIsStreaming(false);
        console.log('Streaming finished!');
      }}
    />
  );
}
```

### With SSE (Server-Sent Events)

```tsx
import { SummaryCard } from '@/components/summarization/SummaryCard';
import { useState, useEffect } from 'react';

function StreamingSummaryComponent({ documentId }) {
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const [summary, setSummary] = useState(initialSummary);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/summarization/stream?documentId=${documentId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'content') {
        setStreamingContent(prev => prev + data.chunk);
      } else if (data.type === 'complete') {
        setIsStreaming(false);
        setSummary(data.summary);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setIsStreaming(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [documentId]);

  return (
    <SummaryCard
      summary={summary}
      documentName="Legal Document"
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      onStreamingComplete={() => {
        console.log('Summary streaming completed');
      }}
    />
  );
}
```

### With Custom Hook

```tsx
import { SummaryCard } from '@/components/summarization/SummaryCard';
import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';

function DocumentSummaryPage({ documentId }) {
  const {
    content,
    isActive,
    metadata,
    startStreaming,
  } = useSummarizationStreaming();

  useEffect(() => {
    startStreaming({
      documentId,
      level: 'standard',
      language: 'es',
    });
  }, [documentId]);

  const summary = {
    id: metadata?.id || '',
    documentId,
    level: 'standard',
    summary: content,
    wordCount: metadata?.wordCount || 0,
    originalWordCount: metadata?.originalWordCount || 0,
    compressionRatio: metadata?.compressionRatio || 0,
    confidenceScore: 0.85,
    language: 'ES',
    generatedAt: new Date().toISOString(),
  };

  return (
    <SummaryCard
      summary={summary}
      documentName="Legal Document"
      isStreaming={isActive}
      streamingContent={content}
      onStreamingComplete={() => {
        console.log('Streaming complete!');
      }}
    />
  );
}
```

## Visual States

### 1. Streaming State (`isStreaming: true`)

When streaming is active, the component displays:

- **Header**: Green pulsing "Streaming..." badge with spinner icon
- **Content**: StreamingText component with typing animation and blinking cursor
- **Metrics**:
  - Word Count: Shows live count with spinning loader icon
  - Compression: Shows "Calculating..."
  - Confidence: Shows animated progress bar
  - Timestamp: Shows "In progress..."
- **Progress Indicator**: Blue animated bouncing dots with message
- **Footer**: Copy button works with partial content

### 2. Completed State (`isStreaming: false`)

When streaming completes:

- **Header**: Normal badges without streaming indicator
- **Content**: Full static text without cursor
- **Metrics**: All metrics show final calculated values
- **Progress Indicator**: Hidden
- **Footer**: All buttons fully functional

### 3. Loading State (`isLoading: true`)

Initial loading skeleton (unchanged from before):
- Skeleton placeholders for all content
- No streaming animations

## Styling

### Color Scheme

The streaming mode uses these visual indicators:

```tsx
// Streaming badge (green with pulse)
className="bg-green-500 dark:bg-green-600 text-white animate-pulse"

// Progress dots (blue with bounce)
className="bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"

// Progress bar (blue with pulse)
className="bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"

// Progress container (light blue background)
className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
```

### Animations

- **Streaming Badge**: Pulsing animation
- **Loader Icon**: Continuous spin
- **Progress Bar**: Pulsing width animation
- **Bouncing Dots**: Sequential bounce with delays (-0.3s, -0.15s, 0s)
- **Cursor**: Blinking animation (handled by StreamingText)

## Accessibility

### ARIA Attributes

The streaming mode maintains full accessibility:

```tsx
// Progress bar during streaming
<div
  role="progressbar"
  aria-label="Confidence score: calculating"
/>

// Screen reader announcements (via StreamingText)
<div className="sr-only" aria-live="polite" aria-atomic="false">
  {isStreaming ? 'Content is streaming' : 'Content loaded'}
</div>
```

### Keyboard Navigation

All interactive elements remain keyboard accessible:
- Copy button: `Tab` to focus, `Enter` to activate
- View Document button: `Tab` to focus, `Enter` to activate

## Performance Considerations

### Optimizations

1. **StreamingText Component**: Uses optimized typing animation with configurable speed
2. **Word Count Calculation**: Simple split operation on streaming content
3. **State Updates**: Minimal re-renders with proper React hooks usage
4. **Animation Performance**: CSS animations (GPU-accelerated)

### Best Practices

```tsx
// ✅ Good: Update streaming content efficiently
setStreamingContent(prev => prev + newChunk);

// ❌ Bad: Recreate entire string each time
setStreamingContent(fullString.substring(0, index));

// ✅ Good: Use callback for completion
onStreamingComplete={() => {
  console.log('Done');
  cleanup();
}}

// ✅ Good: Proper cleanup
useEffect(() => {
  const eventSource = new EventSource(url);
  return () => eventSource.close();
}, []);
```

## Integration Guide

### Step 1: Set Up State

```tsx
const [isStreaming, setIsStreaming] = useState(false);
const [streamingContent, setStreamingContent] = useState('');
```

### Step 2: Connect to Streaming Source

```tsx
// Option A: Server-Sent Events (SSE)
const eventSource = new EventSource('/api/stream');
eventSource.onmessage = (e) => {
  setStreamingContent(prev => prev + e.data);
};

// Option B: WebSocket
const ws = new WebSocket('ws://localhost:3000/stream');
ws.onmessage = (e) => {
  setStreamingContent(prev => prev + e.data);
};

// Option C: Polling
const interval = setInterval(async () => {
  const response = await fetch('/api/stream/next');
  const data = await response.json();
  setStreamingContent(prev => prev + data.chunk);
}, 100);
```

### Step 3: Render Component

```tsx
<SummaryCard
  summary={summary}
  isStreaming={isStreaming}
  streamingContent={streamingContent}
  onStreamingComplete={() => setIsStreaming(false)}
/>
```

## Testing

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import { SummaryCard } from './SummaryCard';

describe('SummaryCard Streaming', () => {
  it('shows streaming badge when isStreaming is true', () => {
    render(
      <SummaryCard
        summary={mockSummary}
        isStreaming={true}
        streamingContent="Partial content..."
      />
    );

    expect(screen.getByText('Streaming...')).toBeInTheDocument();
  });

  it('calls onStreamingComplete when streaming finishes', () => {
    const handleComplete = jest.fn();

    render(
      <SummaryCard
        summary={mockSummary}
        isStreaming={false}
        streamingContent="Complete content"
        onStreamingComplete={handleComplete}
      />
    );

    // StreamingText will call onComplete when done
    expect(handleComplete).toHaveBeenCalled();
  });

  it('updates word count during streaming', () => {
    const { rerender } = render(
      <SummaryCard
        summary={mockSummary}
        isStreaming={true}
        streamingContent="First few words"
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();

    rerender(
      <SummaryCard
        summary={mockSummary}
        isStreaming={true}
        streamingContent="First few words and more"
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Streaming doesn't show animation

**Problem**: Text appears instantly without typing effect.

**Solution**: Ensure `isStreaming={true}` and `streamingContent` is being updated incrementally.

```tsx
// ❌ Wrong: Setting full text at once
setStreamingContent(fullSummary);

// ✅ Correct: Adding chunks incrementally
setStreamingContent(prev => prev + chunk);
```

#### 2. Completion callback not firing

**Problem**: `onStreamingComplete` is not called.

**Solution**: The callback is triggered by the StreamingText component when:
- `isStreaming` becomes `false`
- `streamingContent` matches the full content

```tsx
// Ensure you set isStreaming to false when done
eventSource.addEventListener('complete', () => {
  setIsStreaming(false);
});
```

#### 3. Word count not updating

**Problem**: Word count stays at 0 during streaming.

**Solution**: Ensure `streamingContent` is a non-empty string.

```tsx
// The component calculates word count like this:
const wordCount = streamingContent.split(/\s+/).filter(Boolean).length;
```

## Migration Guide

### Upgrading from Static to Streaming

If you have existing `SummaryCard` usage, no changes are required. The new props are optional:

```tsx
// Old code - still works!
<SummaryCard summary={summary} />

// New code - with streaming
<SummaryCard
  summary={summary}
  isStreaming={isActive}
  streamingContent={content}
/>
```

### Breaking Changes

**None!** All changes are backward compatible.

## Related Components

- **StreamingText**: Core streaming text component with typing animation
- **useSummarizationStreaming**: Hook for managing streaming state
- **SummaryOptions**: Configure summary parameters before streaming

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All modern browsers with support for:
- CSS animations (`animate-pulse`, `animate-bounce`, `animate-spin`)
- EventSource API (for SSE)
- Flexbox and Grid layouts

## Examples Repository

See `SummaryCard.example.tsx` for complete working examples:

1. **BasicSummaryExample**: Standard static usage
2. **StreamingSummaryExample**: Simple streaming demo
3. **StreamingWithControlsExample**: Start/stop/reset controls
4. **StreamingComparisonExample**: Side-by-side streaming vs static
5. **DarkModeSummaryExample**: Dark mode support
6. **SummaryGridExample**: Multiple summaries in grid layout

## License

MIT - Same as parent project
