# useSummarizationStreaming Hook Documentation

## Overview

`useSummarizationStreaming` is a custom React hook that provides real-time document summarization streaming using Server-Sent Events (SSE). It handles connection management, error recovery, cancellation, and provides a clean TypeScript API for consuming streaming summaries.

## Features

- **Real-time Streaming**: Receive summary content as it's generated
- **Automatic Reconnection**: Built-in retry logic for connection failures
- **Cancellation Support**: Stop streaming at any time
- **Error Handling**: Comprehensive error states and messages
- **TypeScript**: Full type safety with TypeScript
- **Clean Cleanup**: Automatic resource cleanup on unmount
- **Metadata Support**: Receive word count, compression ratio, and processing time
- **Multiple Implementations**: EventSource (default) and fetch-based alternatives

## Installation

```bash
npm install react
# Hook is already included in the project
```

## Basic Usage

```tsx
'use client';

import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';

export function DocumentSummary({ documentId }: { documentId: string }) {
  const {
    content,
    status,
    error,
    metadata,
    startStreaming,
    stopStreaming,
    isActive,
  } = useSummarizationStreaming();

  const handleSummarize = () => {
    startStreaming({
      documentId,
      level: 'standard',
      language: 'es',
    });
  };

  return (
    <div>
      <button onClick={handleSummarize} disabled={isActive}>
        Summarize
      </button>

      {isActive && (
        <button onClick={stopStreaming}>Cancel</button>
      )}

      {status === 'streaming' && <p>Streaming...</p>}

      {content && (
        <div className="summary">
          <p>{content}</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {metadata && (
        <div className="metadata">
          <span>Words: {metadata.wordCount}</span>
          <span>Compression: {(metadata.compressionRatio * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
```

## API Reference

### Return Value

The hook returns an object with the following properties:

```typescript
interface UseSummarizationStreamingReturn {
  // Current summary content (accumulated chunks)
  content: string;

  // Current streaming status
  status: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

  // Error message if status is 'error'
  error: string | null;

  // Summary metadata (available after completion)
  metadata?: {
    wordCount: number;
    compressionRatio: number;
    processingTime?: number;
    model?: string;
  };

  // Start streaming with options
  startStreaming: (options: StreamOptions) => void;

  // Stop current streaming
  stopStreaming: () => void;

  // Reset state to initial values
  resetState: () => void;

  // Whether streaming is currently active
  isActive: boolean;
}
```

### Stream Options

```typescript
interface StreamOptions {
  // Required: Document ID to summarize
  documentId: string;

  // Summary detail level
  level: 'brief' | 'standard' | 'detailed';

  // Optional: Output language (default: 'es')
  language?: string;

  // Optional: Include key points extraction
  includeKeyPoints?: boolean;

  // Optional: Maximum summary length in words
  maxLength?: number;
}
```

### Status States

- **idle**: Initial state, no streaming in progress
- **connecting**: Establishing connection to SSE endpoint
- **streaming**: Actively receiving summary chunks
- **complete**: Summary generation finished successfully
- **error**: An error occurred during streaming

## Advanced Usage

### With Language Selection

```tsx
import { useState } from 'react';
import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';

export function MultilingualSummary({ documentId }: { documentId: string }) {
  const [language, setLanguage] = useState<string>('es');
  const { content, startStreaming } = useSummarizationStreaming();

  const handleSummarize = () => {
    startStreaming({
      documentId,
      level: 'standard',
      language,
      includeKeyPoints: true,
    });
  };

  return (
    <div>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="es">Spanish</option>
        <option value="en">English</option>
        <option value="fr">French</option>
      </select>

      <button onClick={handleSummarize}>Summarize</button>

      <div>{content}</div>
    </div>
  );
}
```

### With Progress Indicator

```tsx
import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';

export function SummaryWithProgress({ documentId }: { documentId: string }) {
  const { content, status, metadata, startStreaming } = useSummarizationStreaming();

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <div>
      <button onClick={() => startStreaming({ documentId, level: 'standard' })}>
        Start
      </button>

      {status === 'streaming' && (
        <div className="progress">
          <span>Generating summary...</span>
          <span>{wordCount} words received</span>
        </div>
      )}

      {status === 'complete' && metadata && (
        <div className="stats">
          <span>Total words: {metadata.wordCount}</span>
          <span>Compression: {(metadata.compressionRatio * 100).toFixed(1)}%</span>
          <span>Time: {(metadata.processingTime! / 1000).toFixed(2)}s</span>
        </div>
      )}

      <div className="content">{content}</div>
    </div>
  );
}
```

### With Error Recovery

```tsx
import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';

export function RobustSummary({ documentId }: { documentId: string }) {
  const {
    content,
    status,
    error,
    startStreaming,
    resetState,
  } = useSummarizationStreaming();

  const handleRetry = () => {
    resetState();
    startStreaming({ documentId, level: 'standard' });
  };

  return (
    <div>
      {status === 'error' && (
        <div className="error-panel">
          <p>Error: {error}</p>
          <button onClick={handleRetry}>Retry</button>
        </div>
      )}

      {content && <div>{content}</div>}
    </div>
  );
}
```

### Using Fetch-Based Implementation

For environments where EventSource doesn't work well (e.g., certain authentication schemes):

```tsx
import { useSummarizationStreamingFetch } from '@/hooks/useSummarizationStreaming';

export function FetchBasedSummary({ documentId }: { documentId: string }) {
  const { content, status, startStreaming } = useSummarizationStreamingFetch();

  return (
    <div>
      <button onClick={() => startStreaming({ documentId, level: 'standard' })}>
        Summarize (Fetch)
      </button>
      <div>{content}</div>
    </div>
  );
}
```

## SSE Message Format

The backend should send messages in the following format:

### Chunk Message
```json
data: {"type":"chunk","content":"This is a portion of the summary. "}
```

### Metadata Message
```json
data: {"type":"metadata","metadata":{"wordCount":250,"compressionRatio":0.35,"processingTime":1234,"model":"gpt-4"}}
```

### Complete Message
```json
data: {"type":"complete"}
```

### Error Message
```json
data: {"type":"error","error":"Document not found"}
```

## Environment Variables

Set the API base URL in your environment:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Performance Considerations

1. **Memory Management**: The hook accumulates content in state. For very long summaries, consider implementing chunking or pagination.

2. **Reconnection Strategy**: The hook attempts up to 3 reconnections with a 2-second delay. Adjust `maxReconnectAttempts` and `reconnectDelay` if needed.

3. **Cleanup**: Always ensure proper cleanup by calling `stopStreaming()` or `resetState()` when component unmounts or user navigates away.

## Accessibility Checklist

- [ ] Use `aria-live="polite"` on content container for screen reader updates
- [ ] Provide clear status messages (connecting, streaming, complete)
- [ ] Include keyboard navigation for start/stop buttons
- [ ] Add `aria-busy` attribute when streaming
- [ ] Use semantic HTML (`<article>`, `<section>`) for summary content
- [ ] Provide alternative text for status indicators

Example:
```tsx
<div
  role="region"
  aria-label="Document summary"
  aria-live="polite"
  aria-busy={isActive}
>
  {content}
</div>
```

## Testing

### Unit Tests

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSummarizationStreaming } from './useSummarizationStreaming';

test('should stream content chunks', async () => {
  const { result } = renderHook(() => useSummarizationStreaming());

  act(() => {
    result.current.startStreaming({
      documentId: 'test-123',
      level: 'standard',
    });
  });

  await waitFor(() => {
    expect(result.current.status).toBe('streaming');
  });

  // Simulate SSE message
  // (requires mocking EventSource)

  await waitFor(() => {
    expect(result.current.content).toBeTruthy();
  });
});
```

### Integration Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SummaryComponent } from './SummaryComponent';

test('should display streaming summary', async () => {
  render(<SummaryComponent documentId="test-123" />);

  const button = screen.getByRole('button', { name: /summarize/i });
  fireEvent.click(button);

  await waitFor(() => {
    expect(screen.getByText(/streaming/i)).toBeInTheDocument();
  });

  // Wait for completion
  await waitFor(
    () => {
      expect(screen.getByText(/complete/i)).toBeInTheDocument();
    },
    { timeout: 5000 }
  );
});
```

## Troubleshooting

### EventSource not connecting

**Problem**: Status stays on "connecting" indefinitely

**Solutions**:
1. Check CORS configuration on backend
2. Verify endpoint URL is correct
3. Ensure authentication headers are properly set
4. Try `useSummarizationStreamingFetch` as alternative

### Content not updating

**Problem**: Content remains empty despite streaming

**Solutions**:
1. Check SSE message format matches expected structure
2. Verify `type: "chunk"` is in message
3. Check browser console for parsing errors
4. Ensure backend sends proper `Content-Type: text/event-stream`

### Memory leaks

**Problem**: Application slows down after multiple uses

**Solutions**:
1. Always call `stopStreaming()` when done
2. Use `resetState()` before starting new stream
3. Implement cleanup in `useEffect` return function
4. Check for orphaned EventSource connections in dev tools

### Authentication issues

**Problem**: 401 Unauthorized errors

**Solutions**:
1. Ensure `withCredentials: true` is set
2. Check cookies are being sent with request
3. Verify token is valid and not expired
4. Use custom headers if needed (requires fetch implementation)

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 13+)
- **IE11**: Not supported (use polyfill or fetch implementation)

## Related Hooks

- `useDocumentQuery`: For standard (non-streaming) document queries
- `useAIAssistant`: For conversational AI interactions
- `useDocumentAnalysis`: For batch document processing

## Contributing

To extend this hook:

1. Add new message types in `SSEMessage` interface
2. Implement handler in `handleMessage` callback
3. Update state interface if needed
4. Add tests for new functionality

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- File a bug report on GitHub
- Contact support@example.com
- Check documentation at https://docs.example.com
