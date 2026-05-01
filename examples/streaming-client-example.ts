/**
 * Document Summary Streaming Client Examples
 *
 * Demonstrates how to consume the streaming summary API
 * using both EventSource (browser) and fetch (Node.js/browser)
 */

// ============================================================================
// EXAMPLE 1: Browser EventSource API (Recommended for browsers)
// ============================================================================

/**
 * Stream document summary using EventSource API
 */
function streamDocumentSummaryBrowser(documentId: string, level: 'brief' | 'standard' | 'detailed' = 'standard') {
  const eventSource = new EventSource(
    `/api/summaries/stream/${documentId}?level=${level}&includeKeyPoints=true`
  );

  let summaryText = '';
  const keyPoints: string[] = [];

  // Handle text chunks
  eventSource.addEventListener('text', (event) => {
    const data = JSON.parse(event.data);
    summaryText += data.content;
    console.log('Text chunk received:', data.content);

    // Update UI with streaming text
    document.getElementById('summary-text')!.textContent = summaryText;

    // Show progress if available
    if (data.metadata?.wordCount) {
      console.log('Words generated:', data.metadata.wordCount);
    }
  });

  // Handle key points
  eventSource.addEventListener('keypoint', (event) => {
    const data = JSON.parse(event.data);
    keyPoints.push(data.content);
    console.log('Key point:', data.content);

    // Update key points list in UI
    const listElement = document.getElementById('key-points-list')!;
    const li = document.createElement('li');
    li.textContent = data.content;
    listElement.appendChild(li);
  });

  // Handle metadata events
  eventSource.addEventListener('metadata', (event) => {
    const data = JSON.parse(event.data);
    console.log('Metadata:', JSON.parse(data.content));

    // Show loading states based on metadata
    if (JSON.parse(data.content).status === 'extracting_key_points') {
      console.log('Now extracting key points...');
    }
  });

  // Handle completion
  eventSource.addEventListener('done', (event) => {
    const data = JSON.parse(event.data);
    const completionData = JSON.parse(data.content);

    console.log('Summary completed!', completionData);
    console.log('Summary ID:', completionData.summaryId);
    console.log('Word count:', completionData.wordCount);
    console.log('Processing time:', completionData.processingTime + 'ms');
    console.log('Cached:', completionData.cached);

    // Close the connection
    eventSource.close();

    // Show completion message in UI
    document.getElementById('status')!.textContent = 'Summary completed!';
  });

  // Handle errors
  eventSource.addEventListener('error', (event) => {
    const data = JSON.parse(event.data);
    console.error('Error:', JSON.parse(data.content));

    // Close the connection
    eventSource.close();

    // Show error in UI
    document.getElementById('error')!.textContent = 'Error: ' + JSON.parse(data.content).error;
  });

  // Handle connection errors
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    eventSource.close();
  };

  // Return a function to cancel the stream
  return () => eventSource.close();
}

// ============================================================================
// EXAMPLE 2: Fetch API with ReadableStream (Works in Node.js and browsers)
// ============================================================================

/**
 * Stream document summary using Fetch API
 */
async function streamDocumentSummaryFetch(
  documentId: string,
  level: 'brief' | 'standard' | 'detailed' = 'standard',
  callbacks: {
    onText?: (content: string, metadata?: any) => void;
    onKeyPoint?: (point: string) => void;
    onMetadata?: (metadata: any) => void;
    onDone?: (data: any) => void;
    onError?: (error: any) => void;
  } = {}
) {
  try {
    const response = await fetch(
      `/api/summaries/stream/${documentId}?level=${level}&includeKeyPoints=true`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete message in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        // Parse SSE message
        const eventMatch = line.match(/^event: (.+)$/m);
        const dataMatch = line.match(/^data: (.+)$/m);

        if (eventMatch && dataMatch) {
          const eventType = eventMatch[1];
          const eventData = JSON.parse(dataMatch[1]);

          // Route to appropriate callback
          switch (eventType) {
            case 'text':
              callbacks.onText?.(eventData.content, eventData.metadata);
              break;
            case 'keypoint':
              callbacks.onKeyPoint?.(eventData.content);
              break;
            case 'metadata':
              callbacks.onMetadata?.(JSON.parse(eventData.content));
              break;
            case 'done':
              callbacks.onDone?.(JSON.parse(eventData.content));
              break;
            case 'error':
              callbacks.onError?.(JSON.parse(eventData.content));
              break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Fetch stream error:', error);
    callbacks.onError?.(error);
  }
}

// ============================================================================
// EXAMPLE 3: Comparative Document Analysis Stream
// ============================================================================

/**
 * Stream comparative analysis of multiple documents
 */
async function streamComparativeAnalysis(
  documentIds: string[],
  onChunk: (chunk: string) => void,
  onComplete: (data: any) => void,
  onError: (error: any) => void
) {
  try {
    const response = await fetch('/api/summaries/stream/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentIds }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body!.getReader();
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

          switch (eventType) {
            case 'text':
              onChunk(eventData.content);
              break;
            case 'done':
              onComplete(JSON.parse(eventData.content));
              break;
            case 'error':
              onError(JSON.parse(eventData.content));
              break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Comparison stream error:', error);
    onError(error);
  }
}

// ============================================================================
// EXAMPLE 4: React Hook for Streaming Summary
// ============================================================================

/**
 * React hook for streaming document summaries
 */
function useStreamingSummary(documentId: string | null, level: 'brief' | 'standard' | 'detailed' = 'standard') {
  const [summary, setSummary] = React.useState('');
  const [keyPoints, setKeyPoints] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [metadata, setMetadata] = React.useState<any>(null);

  React.useEffect(() => {
    if (!documentId) return;

    setLoading(true);
    setError(null);
    setSummary('');
    setKeyPoints([]);

    const eventSource = new EventSource(
      `/api/summaries/stream/${documentId}?level=${level}&includeKeyPoints=true`
    );

    eventSource.addEventListener('text', (event) => {
      const data = JSON.parse(event.data);
      setSummary((prev) => prev + data.content);
    });

    eventSource.addEventListener('keypoint', (event) => {
      const data = JSON.parse(event.data);
      setKeyPoints((prev) => [...prev, data.content]);
    });

    eventSource.addEventListener('metadata', (event) => {
      const data = JSON.parse(event.data);
      const meta = JSON.parse(data.content);
      setMetadata(meta);
    });

    eventSource.addEventListener('done', (event) => {
      const data = JSON.parse(event.data);
      const completionData = JSON.parse(data.content);
      setMetadata(completionData);
      setLoading(false);
      eventSource.close();
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      const errorData = JSON.parse(data.content);
      setError(errorData.error);
      setLoading(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setError('Connection error');
      setLoading(false);
      eventSource.close();
    };

    // Cleanup
    return () => {
      eventSource.close();
      setLoading(false);
    };
  }, [documentId, level]);

  return { summary, keyPoints, loading, error, metadata };
}

// ============================================================================
// EXAMPLE 5: Vue 3 Composable for Streaming Summary
// ============================================================================

/**
 * Vue 3 composable for streaming document summaries
 */
function useStreamingSummaryVue(documentId: Ref<string | null>, level: Ref<'brief' | 'standard' | 'detailed'> = ref('standard')) {
  const summary = ref('');
  const keyPoints = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const metadata = ref<any>(null);

  const startStream = () => {
    if (!documentId.value) return;

    loading.value = true;
    error.value = null;
    summary.value = '';
    keyPoints.value = [];

    const eventSource = new EventSource(
      `/api/summaries/stream/${documentId.value}?level=${level.value}&includeKeyPoints=true`
    );

    eventSource.addEventListener('text', (event) => {
      const data = JSON.parse(event.data);
      summary.value += data.content;
    });

    eventSource.addEventListener('keypoint', (event) => {
      const data = JSON.parse(event.data);
      keyPoints.value.push(data.content);
    });

    eventSource.addEventListener('done', (event) => {
      const data = JSON.parse(event.data);
      metadata.value = JSON.parse(data.content);
      loading.value = false;
      eventSource.close();
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      error.value = JSON.parse(data.content).error;
      loading.value = false;
      eventSource.close();
    });

    return () => eventSource.close();
  };

  watch([documentId, level], () => {
    startStream();
  });

  return { summary, keyPoints, loading, error, metadata, startStream };
}

// ============================================================================
// EXAMPLE 6: Usage in a simple HTML page
// ============================================================================

/**
 * Example HTML integration
 */
const htmlExample = `
<!DOCTYPE html>
<html>
<head>
  <title>Streaming Summary Demo</title>
  <style>
    #summary-text { white-space: pre-wrap; }
    .loading { color: #666; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Document Summary</h1>

  <div id="status" class="loading">Loading...</div>
  <div id="error" class="error"></div>

  <h2>Summary</h2>
  <div id="summary-text"></div>

  <h2>Key Points</h2>
  <ul id="key-points-list"></ul>

  <script>
    const documentId = 'your-document-id-here';
    streamDocumentSummaryBrowser(documentId, 'detailed');
  </script>
</body>
</html>
`;

// Export examples
export {
  streamDocumentSummaryBrowser,
  streamDocumentSummaryFetch,
  streamComparativeAnalysis,
  useStreamingSummary,
  useStreamingSummaryVue,
  htmlExample
};
