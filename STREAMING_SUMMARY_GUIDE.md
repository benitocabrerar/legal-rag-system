# Document Summarization Streaming Service

Comprehensive guide for the real-time document summarization streaming API using Server-Sent Events (SSE).

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Stream Chunk Format](#stream-chunk-format)
- [Client Integration](#client-integration)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Examples](#examples)

---

## Overview

The Document Summarization Streaming Service provides real-time streaming of AI-generated legal document summaries using Server-Sent Events (SSE). This allows clients to receive summary chunks as they're generated, providing a responsive user experience.

### Key Features

- **Real-time Streaming**: Receive summary text as it's generated
- **Multiple Summary Levels**: Brief (1-2 sentences), Standard (paragraph), Detailed (comprehensive)
- **Key Point Extraction**: Optional streaming of document key points
- **Comparative Analysis**: Stream comparisons of multiple documents
- **Caching Support**: Automatically streams cached summaries when available
- **Progress Tracking**: Metadata chunks provide progress information
- **Error Handling**: Graceful error events with detailed messages

---

## Architecture

### Service Layer

**File**: `src/services/ai/document-summarization.service.ts`

```typescript
class DocumentSummarizationService {
  // Stream a single document summary
  async *streamSummary(documentId: string, options?: StreamSummaryOptions): AsyncGenerator<StreamChunk>

  // Stream comparative analysis of multiple documents
  async *streamComparison(documentIds: string[]): AsyncGenerator<StreamChunk>
}
```

### Route Layer

**File**: `src/routes/summary-stream.ts`

Provides SSE-compatible HTTP endpoints that consume the async generators and format responses for EventSource clients.

### Data Flow

```
Client (EventSource)
    ↓
SSE Endpoint (Fastify route)
    ↓
Service Method (async generator)
    ↓
OpenAI Streaming API
    ↓
Database (Prisma - for caching)
```

---

## API Endpoints

### 1. Stream Document Summary

**Endpoint**: `GET /api/summaries/stream/:documentId`

**Query Parameters**:
- `level` (optional): `'brief'` | `'standard'` | `'detailed'` - Default: `'standard'`
- `language` (optional): `'es'` | `'en'` - Default: `'es'`
- `includeKeyPoints` (optional): `boolean` - Default: `true`
- `includeReferences` (optional): `boolean` - Default: `false`

**Example Request**:
```http
GET /api/summaries/stream/550e8400-e29b-41d4-a716-446655440000?level=detailed&includeKeyPoints=true
```

**Response**: Server-Sent Events stream

---

### 2. Stream Comparative Analysis

**Endpoint**: `POST /api/summaries/stream/compare`

**Request Body**:
```json
{
  "documentIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Constraints**:
- Minimum 2 documents
- Maximum 10 documents

**Response**: Server-Sent Events stream

---

### 3. Health Check

**Endpoint**: `GET /api/summaries/stream/health`

**Response**:
```json
{
  "status": "ok",
  "service": "document-summary-streaming",
  "timestamp": "2025-12-12T10:30:00.000Z",
  "endpoints": [
    "GET /api/summaries/stream/:documentId",
    "POST /api/summaries/stream/compare"
  ]
}
```

---

## Stream Chunk Format

All stream chunks follow this TypeScript interface:

```typescript
interface StreamChunk {
  type: 'text' | 'metadata' | 'error' | 'done' | 'keypoint' | 'reference';
  content: string;
  timestamp: number;
  metadata?: {
    wordCount?: number;
    chunkIndex?: number;
    totalChunks?: number;
    confidenceScore?: number;
  };
}
```

### Chunk Types

#### 1. `metadata` - Process Information

Sent at the beginning or during key phase changes.

```javascript
{
  type: 'metadata',
  content: '{"status":"started","documentId":"...","level":"detailed","language":"es"}',
  timestamp: 1702380000000
}
```

#### 2. `text` - Summary Content

Contains actual summary text chunks as they're generated.

```javascript
{
  type: 'text',
  content: 'Esta ley regula el sistema de ',
  timestamp: 1702380001000,
  metadata: {
    wordCount: 42
  }
}
```

#### 3. `keypoint` - Key Document Points

Individual key points extracted from the document.

```javascript
{
  type: 'keypoint',
  content: 'Establece derechos fundamentales de los ciudadanos',
  timestamp: 1702380002000
}
```

#### 4. `reference` - Legal References

Legal citations or references found in the document.

```javascript
{
  type: 'reference',
  content: 'Constitución de la República del Ecuador, Art. 66',
  timestamp: 1702380003000
}
```

#### 5. `done` - Completion Event

Final event indicating successful completion.

```javascript
{
  type: 'done',
  content: '{"summaryId":"...","wordCount":250,"cached":false,"processingTime":4532,"confidenceScore":0.85}',
  timestamp: 1702380010000,
  metadata: {
    wordCount: 250,
    confidenceScore: 0.85
  }
}
```

#### 6. `error` - Error Event

Sent when an error occurs during processing.

```javascript
{
  type: 'error',
  content: '{"error":"Document not found","documentId":"invalid-id"}',
  timestamp: 1702380000500
}
```

---

## Client Integration

### Browser - EventSource API (Recommended)

The EventSource API provides automatic reconnection and is the simplest approach for browsers.

```javascript
const eventSource = new EventSource(
  '/api/summaries/stream/doc-id?level=detailed'
);

// Handle different event types
eventSource.addEventListener('text', (event) => {
  const data = JSON.parse(event.data);
  displaySummaryText(data.content);
});

eventSource.addEventListener('keypoint', (event) => {
  const data = JSON.parse(event.data);
  addKeyPoint(data.content);
});

eventSource.addEventListener('done', (event) => {
  const data = JSON.parse(event.data);
  console.log('Completed:', JSON.parse(data.content));
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Error:', JSON.parse(data.content));
  eventSource.close();
});

// Clean up when done
function cleanup() {
  eventSource.close();
}
```

### Fetch API with ReadableStream

Works in both browsers and Node.js, provides more control.

```javascript
async function streamSummary(documentId, level = 'standard') {
  const response = await fetch(
    `/api/summaries/stream/${documentId}?level=${level}`
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      const eventMatch = line.match(/^event: (.+)$/m);
      const dataMatch = line.match(/^data: (.+)$/m);

      if (eventMatch && dataMatch) {
        const eventType = eventMatch[1];
        const eventData = JSON.parse(dataMatch[1]);

        handleEvent(eventType, eventData);
      }
    }
  }
}
```

### React Hook

```typescript
function useStreamingSummary(documentId: string | null, level = 'standard') {
  const [summary, setSummary] = React.useState('');
  const [keyPoints, setKeyPoints] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!documentId) return;

    setLoading(true);
    const eventSource = new EventSource(
      `/api/summaries/stream/${documentId}?level=${level}`
    );

    eventSource.addEventListener('text', (event) => {
      const data = JSON.parse(event.data);
      setSummary(prev => prev + data.content);
    });

    eventSource.addEventListener('keypoint', (event) => {
      const data = JSON.parse(event.data);
      setKeyPoints(prev => [...prev, data.content]);
    });

    eventSource.addEventListener('done', () => {
      setLoading(false);
      eventSource.close();
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      setError(JSON.parse(data.content).error);
      setLoading(false);
      eventSource.close();
    });

    return () => eventSource.close();
  }, [documentId, level]);

  return { summary, keyPoints, loading, error };
}

// Usage
function SummaryComponent({ documentId }) {
  const { summary, keyPoints, loading, error } = useStreamingSummary(
    documentId,
    'detailed'
  );

  if (loading) return <div>Generating summary...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Summary</h2>
      <p>{summary}</p>

      <h3>Key Points</h3>
      <ul>
        {keyPoints.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Vue 3 Composable

```typescript
function useStreamingSummary(documentId: Ref<string | null>) {
  const summary = ref('');
  const keyPoints = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  watch(documentId, (newId) => {
    if (!newId) return;

    loading.value = true;
    summary.value = '';
    keyPoints.value = [];

    const eventSource = new EventSource(
      `/api/summaries/stream/${newId}?level=detailed`
    );

    eventSource.addEventListener('text', (event) => {
      const data = JSON.parse(event.data);
      summary.value += data.content;
    });

    eventSource.addEventListener('keypoint', (event) => {
      const data = JSON.parse(event.data);
      keyPoints.value.push(data.content);
    });

    eventSource.addEventListener('done', () => {
      loading.value = false;
      eventSource.close();
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      error.value = JSON.parse(data.content).error;
      loading.value = false;
      eventSource.close();
    });
  });

  return { summary, keyPoints, loading, error };
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Document Not Found

```javascript
{
  type: 'error',
  content: '{"error":"Document not found","documentId":"invalid-id"}',
  timestamp: 1702380000000
}
```

#### 2. OpenAI API Error

```javascript
{
  type: 'error',
  content: '{"error":"OpenAI API error","phase":"generation","stack":"..."}',
  timestamp: 1702380000000
}
```

#### 3. Invalid Parameters

```javascript
{
  type: 'error',
  content: '{"error":"At least 2 documents required"}',
  timestamp: 1702380000000
}
```

### Client-Side Error Handling

```javascript
eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  const errorInfo = JSON.parse(data.content);

  // Log error details
  console.error('Stream error:', errorInfo.error);
  if (errorInfo.phase) {
    console.error('Failed during:', errorInfo.phase);
  }

  // Update UI
  showErrorMessage(errorInfo.error);

  // Clean up
  eventSource.close();
});

// Handle connection errors
eventSource.onerror = (error) => {
  console.error('Connection error:', error);
  showErrorMessage('Connection to server lost');
  eventSource.close();
};
```

---

## Performance Considerations

### Caching

The service automatically caches generated summaries. Subsequent requests for the same document and level will stream the cached version:

```javascript
{
  type: 'done',
  content: '{"summaryId":"...","cached":true,"processingTime":123}',
  timestamp: 1702380000000
}
```

Cached summaries are streamed in chunks with simulated delays for a smooth UX.

### Token Limits

Different summary levels use different models and token limits:

- **Brief**: GPT-3.5-Turbo, max 150 tokens
- **Standard**: GPT-4, max 800 tokens
- **Detailed**: GPT-4, max 1500 tokens

### Request Timeouts

Streaming requests can take longer than standard requests. Configure appropriate timeouts:

```javascript
// EventSource doesn't have built-in timeout, implement manually
const timeout = setTimeout(() => {
  eventSource.close();
  showError('Request timed out');
}, 120000); // 2 minutes

eventSource.addEventListener('done', () => {
  clearTimeout(timeout);
  eventSource.close();
});
```

### Concurrent Streams

The service can handle multiple concurrent streams, but be mindful of:
- OpenAI API rate limits
- Database connection pool limits
- Client browser connection limits (typically 6 per domain)

---

## Examples

### Complete HTML Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Document Summary Stream</title>
  <style>
    .summary-container { max-width: 800px; margin: 0 auto; }
    .loading { color: #666; font-style: italic; }
    .error { color: red; font-weight: bold; }
    #summary-text { white-space: pre-wrap; line-height: 1.6; }
    .key-points { list-style-type: none; }
    .key-points li:before { content: "• "; color: #007bff; }
  </style>
</head>
<body>
  <div class="summary-container">
    <h1>Legal Document Summary</h1>

    <div id="status" class="loading">Initializing...</div>
    <div id="error" class="error"></div>

    <div id="progress"></div>

    <h2>Summary</h2>
    <div id="summary-text"></div>

    <h2>Key Points</h2>
    <ul id="key-points-list" class="key-points"></ul>
  </div>

  <script>
    const documentId = 'your-document-id-here';
    const level = 'detailed';

    const eventSource = new EventSource(
      `/api/summaries/stream/${documentId}?level=${level}&includeKeyPoints=true`
    );

    const statusEl = document.getElementById('status');
    const errorEl = document.getElementById('error');
    const progressEl = document.getElementById('progress');
    const summaryEl = document.getElementById('summary-text');
    const keyPointsEl = document.getElementById('key-points-list');

    statusEl.textContent = 'Generating summary...';

    eventSource.addEventListener('text', (event) => {
      const data = JSON.parse(event.data);
      summaryEl.textContent += data.content;

      if (data.metadata?.wordCount) {
        progressEl.textContent = `Words generated: ${data.metadata.wordCount}`;
      }
    });

    eventSource.addEventListener('keypoint', (event) => {
      const data = JSON.parse(event.data);
      const li = document.createElement('li');
      li.textContent = data.content;
      keyPointsEl.appendChild(li);
    });

    eventSource.addEventListener('done', (event) => {
      const data = JSON.parse(event.data);
      const info = JSON.parse(data.content);

      statusEl.textContent = `Summary completed in ${info.processingTime}ms ${info.cached ? '(cached)' : ''}`;
      statusEl.className = '';
      progressEl.textContent = '';

      eventSource.close();
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      const errorInfo = JSON.parse(data.content);

      errorEl.textContent = `Error: ${errorInfo.error}`;
      statusEl.textContent = '';

      eventSource.close();
    });

    eventSource.onerror = () => {
      errorEl.textContent = 'Connection error';
      statusEl.textContent = '';
      eventSource.close();
    };
  </script>
</body>
</html>
```

---

## Testing

### Unit Tests

See `src/tests/streaming-summary.test.ts` for comprehensive test coverage.

Run tests:
```bash
npm test streaming-summary.test.ts
```

### Manual Testing with curl

```bash
# Stream a summary
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/api/summaries/stream/YOUR_DOC_ID?level=standard"

# Stream comparison
curl -N -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"documentIds":["ID1","ID2"]}' \
  http://localhost:3000/api/summaries/stream/compare
```

---

## License

This service is part of the Legal RAG System and follows the same license terms.

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
