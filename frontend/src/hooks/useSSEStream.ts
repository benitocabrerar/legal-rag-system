/**
 * useSSEStream Hook
 *
 * Generic React hook for consuming Server-Sent Events with streaming support
 * Features: Auto-reconnect, error handling, streaming text accumulation
 */

import { useCallback, useRef, useState } from 'react';

export interface SSEStreamEvent {
  type: 'start' | 'token' | 'done' | 'error' | 'metadata';
  content?: string;
  metadata?: Record<string, any>;
  error?: string;
  timestamp: number;
}

export interface UseSSEStreamOptions {
  /** Base URL for the SSE endpoint */
  url: string;
  /** HTTP method (default: POST) */
  method?: 'GET' | 'POST';
  /** Request headers */
  headers?: Record<string, string>;
  /** Callback when stream starts */
  onStart?: () => void;
  /** Callback for each token/chunk received */
  onToken?: (token: string, accumulated: string) => void;
  /** Callback when stream completes */
  onComplete?: (fullText: string, metadata?: Record<string, any>) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Retry attempts on error (default: 3) */
  maxRetries?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
}

export interface UseSSEStreamReturn {
  /** Whether stream is currently active */
  isStreaming: boolean;
  /** Accumulated text from stream */
  streamedText: string;
  /** Any error that occurred */
  error: Error | null;
  /** Events received */
  events: SSEStreamEvent[];
  /** Start streaming with payload */
  startStream: (payload: Record<string, any>) => Promise<void>;
  /** Abort current stream */
  abortStream: () => void;
  /** Reset state */
  reset: () => void;
}

export function useSSEStream(options: UseSSEStreamOptions): UseSSEStreamReturn {
  const {
    url,
    method = 'POST',
    headers = {},
    onStart,
    onToken,
    onComplete,
    onError,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [events, setEvents] = useState<SSEStreamEvent[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const accumulatedTextRef = useRef('');

  const reset = useCallback(() => {
    setIsStreaming(false);
    setStreamedText('');
    setError(null);
    setEvents([]);
    accumulatedTextRef.current = '';
    retryCountRef.current = 0;
  }, []);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const processSSELine = useCallback((line: string): SSEStreamEvent | null => {
    if (!line.startsWith('data: ')) return null;

    const data = line.slice(6);
    if (data === '[DONE]') {
      return { type: 'done', timestamp: Date.now() };
    }

    try {
      const parsed = JSON.parse(data);
      return {
        type: parsed.type || 'token',
        content: parsed.content || parsed.token || parsed.text || '',
        metadata: parsed.metadata,
        error: parsed.error,
        timestamp: Date.now(),
      };
    } catch {
      // Plain text token
      return {
        type: 'token',
        content: data,
        timestamp: Date.now(),
      };
    }
  }, []);

  const startStream = useCallback(async (payload: Record<string, any>) => {
    // Reset state
    reset();
    setIsStreaming(true);
    onStart?.();

    // Create abort controller
    abortControllerRef.current = new AbortController();

    const attemptStream = async (): Promise<void> => {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            ...headers,
          },
          body: method === 'POST' ? JSON.stringify(payload) : undefined,
          signal: abortControllerRef.current?.signal,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              const event = processSSELine(buffer.trim());
              if (event) {
                setEvents((prev) => [...prev, event]);
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const event = processSSELine(trimmedLine);
            if (!event) continue;

            setEvents((prev) => [...prev, event]);

            switch (event.type) {
              case 'start':
                // Stream started
                break;

              case 'token':
                if (event.content) {
                  accumulatedTextRef.current += event.content;
                  setStreamedText(accumulatedTextRef.current);
                  onToken?.(event.content, accumulatedTextRef.current);
                }
                break;

              case 'done':
                setIsStreaming(false);
                onComplete?.(accumulatedTextRef.current, event.metadata);
                return;

              case 'error':
                const streamError = new Error(event.error || 'Stream error');
                setError(streamError);
                setIsStreaming(false);
                onError?.(streamError);
                return;

              case 'metadata':
                // Store metadata
                break;
            }
          }
        }

        // Stream ended naturally
        setIsStreaming(false);
        onComplete?.(accumulatedTextRef.current);

      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Stream was aborted intentionally
          setIsStreaming(false);
          return;
        }

        const streamError = err instanceof Error ? err : new Error('Stream failed');

        // Retry logic
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`SSE stream retry ${retryCountRef.current}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay * retryCountRef.current));
          return attemptStream();
        }

        setError(streamError);
        setIsStreaming(false);
        onError?.(streamError);
      }
    };

    await attemptStream();
  }, [url, method, headers, onStart, onToken, onComplete, onError, maxRetries, retryDelay, reset, processSSELine]);

  return {
    isStreaming,
    streamedText,
    error,
    events,
    startStream,
    abortStream,
    reset,
  };
}

/**
 * Specialized hook for AI Assistant streaming
 */
export interface UseAIStreamOptions {
  /** API endpoint (default: /api/ai/stream) */
  endpoint?: string;
  /** Callback when response starts */
  onStart?: () => void;
  /** Callback for each chunk */
  onChunk?: (chunk: string, accumulated: string) => void;
  /** Callback when response completes */
  onComplete?: (response: string, metadata?: Record<string, any>) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface AIStreamPayload {
  message: string;
  context?: {
    caseId?: string;
    documentIds?: string[];
    sessionId?: string;
  };
}

export function useAIStream(options: UseAIStreamOptions = {}) {
  const {
    endpoint = '/api/ai/stream',
    onStart,
    onChunk,
    onComplete,
    onError,
  } = options;

  const {
    isStreaming,
    streamedText,
    error,
    events,
    startStream,
    abortStream,
    reset,
  } = useSSEStream({
    url: endpoint,
    onStart,
    onToken: onChunk,
    onComplete,
    onError,
  });

  const sendMessage = useCallback(async (payload: AIStreamPayload) => {
    await startStream(payload);
  }, [startStream]);

  return {
    isStreaming,
    streamedText,
    error,
    events,
    sendMessage,
    abortStream,
    reset,
  };
}

export default useSSEStream;
