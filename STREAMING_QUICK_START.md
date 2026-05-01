# Streaming Summarization Quick Start Guide

## 30-Second Setup

### 1. Start the Server
```bash
npm run dev
```

### 2. Get Your JWT Token
```bash
# Login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

### 3. Test Streaming
Open in browser:
```
file:///C:/Users/benito/poweria/legal/examples/summarization-streaming-client.html
```

Or use cURL:
```bash
curl -N -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:8000/api/v1/summarization/stream \
     -d '{
       "documentId": "YOUR_DOCUMENT_UUID",
       "level": "standard",
       "language": "es",
       "includeKeyPoints": true,
       "streamChunks": true
     }'
```

---

## API Endpoints

### Stream Document Summary
```http
POST /api/v1/summarization/stream
Authorization: Bearer <token>
Content-Type: application/json

{
  "documentId": "uuid",
  "level": "brief|standard|detailed",
  "language": "es|en",
  "includeKeyPoints": true,
  "streamChunks": true
}
```

### Stream Document Comparison
```http
POST /api/v1/summarization/stream/compare
Authorization: Bearer <token>
Content-Type: application/json

{
  "documentIds": ["uuid1", "uuid2"],
  "language": "es",
  "includeDocumentSummaries": true
}
```

### Get Stream Status
```http
GET /api/v1/summarization/stream/status
Authorization: Bearer <token>
```

---

## Event Types

SSE events received during streaming:

| Event | Progress | Description |
|-------|----------|-------------|
| `connected` | 0% | Stream established |
| `progress` | 5-95% | Stage updates |
| `chunk` | - | Incremental text |
| `keypoint` | 70-90% | Individual key points |
| `completed` | 100% | Final results |
| `error` | - | Error occurred |
| `timeout` | - | Connection timeout |

---

## Processing Stages

1. **initializing** (5%) - Fetching document
2. **analyzing** (15%) - Analyzing structure
3. **summarizing** (30-70%) - Generating summary
4. **extracting** (70-90%) - Extracting key points
5. **finalizing** (95%) - Finalizing results
6. **completed** (100%) - Done

---

## JavaScript Client Example

```javascript
async function streamSummary(documentId, token) {
  const response = await fetch('http://localhost:8000/api/v1/summarization/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documentId,
      level: 'standard',
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
        console.log(event.type, event.data);

        if (event.type === 'chunk') {
          process.stdout.write(event.data.chunk);
        }
      }
    }
  }
}

// Usage
streamSummary('doc-uuid', 'your-jwt-token');
```

---

## Common Configurations

### Brief Summary (Fast)
```json
{
  "level": "brief",
  "language": "es",
  "includeKeyPoints": false,
  "streamChunks": false
}
```
**Time**: 5-10 seconds

### Standard Summary (Balanced)
```json
{
  "level": "standard",
  "language": "es",
  "includeKeyPoints": true,
  "streamChunks": true
}
```
**Time**: 15-30 seconds

### Detailed Summary (Comprehensive)
```json
{
  "level": "detailed",
  "language": "es",
  "includeKeyPoints": true,
  "includeReferences": true,
  "streamChunks": true
}
```
**Time**: 45-90 seconds

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Document not found |
| `INVALID_DOCUMENT` | 400 | Document has no content |
| `TOO_MANY_STREAMS` | 429 | Max 3 concurrent streams |
| `STREAMING_FAILED` | 500 | Internal error |

---

## Limits

- **Max Concurrent Streams**: 3 per user
- **Connection Timeout**: 15 minutes
- **Heartbeat Interval**: 30 seconds
- **Documents per Comparison**: 2-5

---

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret

# Optional
SSE_SUMMARIZATION_TIMEOUT_MS=900000
OPENAI_TIMEOUT=60000
PORT=8000
```

---

## Testing Checklist

- [ ] Server running on port 8000
- [ ] Valid JWT token obtained
- [ ] Document UUID exists in database
- [ ] Document has content (>50 characters)
- [ ] Browser/client supports EventSource or fetch streaming
- [ ] No proxy buffering SSE responses

---

## Troubleshooting

**No events received?**
- Check JWT token is valid and not expired
- Verify document ID exists: `GET /api/v1/legal-documents/{id}`
- Check browser console for errors

**Connection closes immediately?**
- Verify Authorization header: `Bearer <token>`
- Check you're not exceeding 3 concurrent streams
- Ensure document has content to summarize

**Slow performance?**
- Large document? Use `level: "brief"`
- Disable streaming: `streamChunks: false`
- Check OpenAI API status

---

## Next Steps

1. ✅ Read full API docs: `SUMMARIZATION_STREAMING_API.md`
2. ✅ Try demo client: `examples/summarization-streaming-client.html`
3. ✅ Review implementation: `SUMMARIZATION_STREAMING_IMPLEMENTATION.md`
4. ✅ Integrate into your app
5. ✅ Monitor performance and metrics

---

## Support

- **Documentation**: `SUMMARIZATION_STREAMING_API.md`
- **Examples**: `examples/summarization-streaming-client.html`
- **Code**: `src/routes/summarization-streaming.ts`

---

**Quick Links**:
- Main endpoint: `http://localhost:8000/api/v1/summarization/stream`
- Status check: `http://localhost:8000/api/v1/summarization/stream/status`
- Demo client: `file:///C:/Users/benito/poweria/legal/examples/summarization-streaming-client.html`
