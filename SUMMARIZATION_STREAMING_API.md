# Document Summarization Streaming API

## Overview

Real-time Server-Sent Events (SSE) streaming endpoints for document summarization with live progress updates, chunk-by-chunk processing, and graceful error handling.

## Features

- **Real-time Progress Updates**: Track summarization stages and progress percentage
- **Chunk Streaming**: Receive summary text incrementally as it's generated
- **Concurrent Stream Management**: Up to 3 simultaneous streams per user
- **Auto-reconnect Support**: Graceful handling of client disconnections
- **Rate Limiting**: Resource control and fair usage
- **Heartbeat Mechanism**: Keep-alive to maintain long-running connections

---

## Endpoints

### 1. Stream Document Summary

**POST** `/api/v1/summarization/stream`

Generate a document summary with real-time progress updates and streaming text output.

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "documentId": "uuid-string",
  "level": "brief" | "standard" | "detailed",
  "language": "es" | "en",
  "includeKeyPoints": true,
  "includeReferences": false,
  "streamChunks": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `documentId` | UUID | Yes | - | Document to summarize |
| `level` | Enum | Yes | - | Summary detail level |
| `language` | Enum | No | `"es"` | Output language |
| `includeKeyPoints` | Boolean | No | `true` | Extract key points |
| `includeReferences` | Boolean | No | `false` | Include legal references |
| `streamChunks` | Boolean | No | `true` | Stream text incrementally |

#### Response (SSE Stream)

The endpoint returns a Server-Sent Events stream with the following event types:

##### Event Type: `connected`

Sent immediately upon successful connection.

```json
{
  "type": "connected",
  "timestamp": "2025-12-12T10:30:00.000Z",
  "data": {
    "streamId": "user-123-1702378200000-abc123",
    "documentId": "doc-uuid",
    "documentTitle": "Código Civil del Ecuador",
    "level": "standard",
    "timeout": 900000
  }
}
```

##### Event Type: `progress`

Progress updates throughout the summarization process.

```json
{
  "type": "progress",
  "timestamp": "2025-12-12T10:30:05.000Z",
  "progress": 30,
  "data": {
    "stage": "summarizing",
    "progress": 30,
    "message": "Generating standard summary...",
    "details": {
      "streaming": true
    }
  }
}
```

**Stages:**
- `initializing` (5%): Preparing document
- `analyzing` (15%): Analyzing structure
- `summarizing` (30-70%): Generating summary
- `extracting` (70-90%): Extracting key points
- `finalizing` (95%): Finalizing results
- `completed` (100%): Process complete

##### Event Type: `chunk`

Incremental text chunks as the summary is generated (only if `streamChunks: true`).

```json
{
  "type": "chunk",
  "timestamp": "2025-12-12T10:30:10.000Z",
  "data": {
    "chunk": "El Código Civil del Ecuador establece...",
    "totalLength": 245,
    "chunkIndex": 10,
    "isFinal": false
  }
}
```

##### Event Type: `keypoint`

Individual key points as they're extracted.

```json
{
  "type": "keypoint",
  "timestamp": "2025-12-12T10:30:20.000Z",
  "progress": 75,
  "data": {
    "id": "kp-uuid",
    "point": "Establece los derechos civiles fundamentales",
    "importance": "high",
    "category": "rights",
    "articleReference": "Art. 1"
  }
}
```

##### Event Type: `completed`

Final results when summarization is complete.

```json
{
  "type": "completed",
  "timestamp": "2025-12-12T10:30:30.000Z",
  "progress": 100,
  "data": {
    "id": "summary-1702378230000",
    "documentId": "doc-uuid",
    "documentTitle": "Código Civil del Ecuador",
    "level": "standard",
    "summary": "El Código Civil del Ecuador es el conjunto de normas...",
    "keyPoints": [
      {
        "id": "kp-1",
        "point": "Define derechos civiles",
        "importance": "high",
        "category": "rights"
      }
    ],
    "wordCount": 178,
    "language": "es",
    "confidenceScore": 0.85
  }
}
```

##### Event Type: `error`

Error encountered during processing.

```json
{
  "type": "error",
  "timestamp": "2025-12-12T10:30:15.000Z",
  "data": {
    "error": "OpenAI API rate limit exceeded",
    "code": "RATE_LIMIT_ERROR"
  }
}
```

##### Event Type: `timeout`

Connection timeout or server shutdown.

```json
{
  "type": "timeout",
  "timestamp": "2025-12-12T10:45:00.000Z",
  "data": {
    "reason": "connection_timeout"
  }
}
```

#### Error Responses (HTTP)

```json
// 404 Not Found
{
  "error": "NOT_FOUND",
  "message": "Document not found"
}

// 400 Bad Request
{
  "error": "INVALID_DOCUMENT",
  "message": "Document has insufficient content to summarize"
}

// 429 Too Many Requests
{
  "error": "TOO_MANY_STREAMS",
  "message": "Maximum 3 concurrent streams allowed",
  "retryAfter": 60
}

// 500 Internal Server Error
{
  "error": "STREAMING_FAILED",
  "message": "Failed to start summary stream"
}
```

---

### 2. Stream Document Comparison

**POST** `/api/v1/summarization/stream/compare`

Compare multiple documents with real-time progress updates.

#### Request Body

```json
{
  "documentIds": ["uuid-1", "uuid-2", "uuid-3"],
  "language": "es",
  "includeDocumentSummaries": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `documentIds` | UUID[] | Yes | - | 2-5 documents to compare |
| `language` | Enum | No | `"es"` | Output language |
| `includeDocumentSummaries` | Boolean | No | `true` | Include individual summaries |

#### Response (SSE Stream)

Similar event structure as document summary, with final completion:

```json
{
  "type": "completed",
  "timestamp": "2025-12-12T10:35:00.000Z",
  "progress": 100,
  "data": {
    "id": "comparison-uuid",
    "documentIds": ["uuid-1", "uuid-2"],
    "commonThemes": [
      "Ambos documentos regulan derechos civiles",
      "Comparten estructura de artículos numerados"
    ],
    "differences": [
      "Alcance territorial diferente",
      "Fecha de promulgación distinta"
    ],
    "conflicts": [
      "Definiciones contradictorias de capacidad legal"
    ],
    "recommendations": [
      "Consultar ambos documentos para casos transfronterizos"
    ],
    "overallAnalysis": "Los documentos presentan similitudes estructurales..."
  }
}
```

---

### 3. Get Stream Status

**GET** `/api/v1/summarization/stream/status`

Retrieve information about active streaming sessions.

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "activeStreams": 2,
  "maxStreams": 3,
  "streams": [
    {
      "streamId": "user-123-1702378200000-abc123",
      "documentId": "doc-uuid-1",
      "connectedAt": "2025-12-12T10:30:00.000Z",
      "durationMs": 45000,
      "lastActivity": "2025-12-12T10:30:45.000Z"
    },
    {
      "streamId": "user-123-1702378220000-def456",
      "documentId": "doc-uuid-2",
      "connectedAt": "2025-12-12T10:30:20.000Z",
      "durationMs": 25000,
      "lastActivity": "2025-12-12T10:30:40.000Z"
    }
  ],
  "totalActiveStreams": 15
}
```

---

## Client Implementation Examples

### JavaScript (Browser)

```javascript
async function streamDocumentSummary(documentId, level = 'standard') {
  const token = localStorage.getItem('jwt_token');

  const response = await fetch('/api/v1/summarization/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documentId,
      level,
      language: 'es',
      includeKeyPoints: true,
      streamChunks: true
    })
  });

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
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6));
        handleEvent(event);
      }
    }
  }
}

function handleEvent(event) {
  switch (event.type) {
    case 'connected':
      console.log('Stream connected:', event.data.streamId);
      break;

    case 'progress':
      console.log(`Progress: ${event.progress}% - ${event.data.message}`);
      updateProgressBar(event.progress);
      break;

    case 'chunk':
      appendSummaryText(event.data.chunk);
      break;

    case 'keypoint':
      addKeyPoint(event.data);
      break;

    case 'completed':
      console.log('Summary complete:', event.data);
      displayFinalSummary(event.data);
      break;

    case 'error':
      console.error('Stream error:', event.data.error);
      showError(event.data.error);
      break;
  }
}
```

### Node.js (EventSource)

```javascript
import EventSource from 'eventsource';

function streamDocumentSummary(documentId, level, token) {
  const url = new URL('/api/v1/summarization/stream', 'http://localhost:8000');

  const es = new EventSource(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ documentId, level })
  });

  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Event:', data.type, data);

    if (data.type === 'completed') {
      es.close();
    }
  };

  es.onerror = (error) => {
    console.error('Stream error:', error);
    es.close();
  };

  return es;
}
```

### Python

```python
import requests
import json

def stream_document_summary(document_id, level='standard', token=None):
    url = 'http://localhost:8000/api/v1/summarization/stream'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    body = {
        'documentId': document_id,
        'level': level,
        'language': 'es',
        'includeKeyPoints': True,
        'streamChunks': True
    }

    response = requests.post(url, headers=headers, json=body, stream=True)

    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                event = json.loads(line[6:])
                handle_event(event)

def handle_event(event):
    event_type = event.get('type')

    if event_type == 'progress':
        print(f"Progress: {event['progress']}% - {event['data']['message']}")
    elif event_type == 'chunk':
        print(event['data']['chunk'], end='', flush=True)
    elif event_type == 'completed':
        print(f"\n\nSummary complete! Word count: {event['data']['wordCount']}")
    elif event_type == 'error':
        print(f"Error: {event['data']['error']}")
```

---

## Configuration

### Environment Variables

```bash
# SSE Configuration
SSE_SUMMARIZATION_TIMEOUT_MS=900000  # 15 minutes max per stream
OPENAI_TIMEOUT=60000                  # OpenAI request timeout
OPENAI_API_KEY=sk-...                 # OpenAI API key

# Rate Limiting
RATE_LIMIT_MAX=100                    # Requests per window
RATE_LIMIT_WINDOW=15m                 # Rate limit window
```

### Stream Limits

- **Max Concurrent Streams per User**: 3
- **Max Connection Duration**: 15 minutes
- **Heartbeat Interval**: 30 seconds
- **Documents per Comparison**: 2-5

---

## Best Practices

### Client-Side

1. **Implement Reconnection Logic**: Handle network interruptions gracefully
2. **Buffer Management**: Process chunks incrementally to avoid memory issues
3. **Progress UI**: Show visual feedback for long-running operations
4. **Error Handling**: Gracefully handle timeouts and errors
5. **Connection Cleanup**: Close streams when navigating away

### Server-Side

1. **Resource Management**: Monitor active streams and memory usage
2. **Rate Limiting**: Implement appropriate rate limits for API key protection
3. **Logging**: Track stream lifecycle for debugging
4. **Graceful Shutdown**: Notify clients before server shutdown

---

## Monitoring and Metrics

### Key Metrics to Track

- **Active Streams**: Current number of open SSE connections
- **Stream Duration**: Average and max stream duration
- **Completion Rate**: Percentage of streams that complete successfully
- **Error Rate**: Failed streams per total streams
- **Token Usage**: OpenAI API tokens consumed per stream

### Health Checks

Monitor stream health via the status endpoint:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/summarization/stream/status
```

---

## Troubleshooting

### Common Issues

#### Connection Immediately Closes

**Cause**: Missing or invalid authentication token
**Solution**: Verify JWT token is valid and not expired

#### No Events Received

**Cause**: Proxy or load balancer buffering SSE
**Solution**: Configure proxy to disable buffering for SSE endpoints

```nginx
# Nginx configuration
location /api/v1/summarization/stream {
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
}
```

#### Too Many Streams Error

**Cause**: User exceeded concurrent stream limit
**Solution**: Close inactive streams or wait for existing streams to complete

#### Timeout During Processing

**Cause**: Document too large or API rate limits
**Solution**: Use non-streaming endpoint for very large documents

---

## Security Considerations

1. **Authentication Required**: All streaming endpoints require valid JWT
2. **Rate Limiting**: Prevents abuse and resource exhaustion
3. **Resource Limits**: Max 3 concurrent streams per user
4. **Connection Timeout**: Automatic cleanup after 15 minutes
5. **Input Validation**: Zod schema validation on all inputs
6. **Error Sanitization**: Sensitive errors not exposed to clients

---

## Performance Optimization

### Recommended Practices

1. **Use Brief Summaries for Quick Operations**: Faster and cheaper
2. **Batch Related Documents**: Use comparison endpoint for multiple docs
3. **Cache Results**: Store completed summaries for reuse
4. **Monitor Token Usage**: Track OpenAI API costs
5. **Implement Retry Logic**: Handle transient failures gracefully

### Expected Performance

| Level | Document Size | Processing Time | Token Usage |
|-------|--------------|-----------------|-------------|
| Brief | 1-5 KB | 5-10 seconds | ~500 tokens |
| Standard | 5-20 KB | 15-30 seconds | ~1,500 tokens |
| Detailed | 20-50 KB | 45-90 seconds | ~3,000 tokens |
| Comparison (2 docs) | 10-40 KB | 30-60 seconds | ~2,000 tokens |

---

## API Changelog

### Version 1.0.0 (2025-12-12)

- Initial release of streaming summarization endpoints
- Support for brief, standard, and detailed summaries
- Real-time progress updates and chunk streaming
- Document comparison streaming
- Stream status monitoring

---

## Support

For issues or questions:
- GitHub Issues: [legal-rag-system/issues](https://github.com/your-org/legal-rag-system/issues)
- Email: support@legalrag.com
- Documentation: https://docs.legalrag.com/streaming-api
