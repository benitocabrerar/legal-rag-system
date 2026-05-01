'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SSEMessage,
  StreamingState,
  StreamOptions,
  UseSummarizationStreamingReturn,
  SummaryLanguage,
} from '@/types/summarization.types';

/**
 * Custom React hook for handling SSE streaming of document summaries
 *
 * Features:
 * - EventSource-based SSE connection
 * - Automatic reconnection handling
 * - Proper cleanup on unmount
 * - TypeScript type safety
 * - Cancellation support
 * - Error handling with retry logic
 *
 * @example
 * ```tsx
 * const { content, status, error, startStreaming, stopStreaming } = useSummarizationStreaming();
 *
 * // Start streaming
 * startStreaming({
 *   documentId: '123',
 *   level: 'standard',
 *   language: 'es'
 * });
 *
 * // Stop streaming
 * stopStreaming();
 * ```
 */
export function useSummarizationStreaming(): UseSummarizationStreamingReturn {
  const [state, setState] = useState<StreamingState>({
    content: '',
    status: 'idle',
    error: null,
    metadata: undefined,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const reconnectDelay = 2000;

  /**
   * Parse SSE data format
   * Handles both single-line and multi-line JSON
   */
  const parseSSEData = useCallback((rawData: string): SSEMessage | null => {
    try {
      // Remove 'data: ' prefix if present
      const jsonString = rawData.replace(/^data:\s*/, '').trim();

      if (!jsonString || jsonString === '') {
        return null;
      }

      return JSON.parse(jsonString) as SSEMessage;
    } catch (error) {
      console.error('Failed to parse SSE data:', error, 'Raw data:', rawData);
      return null;
    }
  }, []);

  /**
   * Handle SSE message events
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    const message = parseSSEData(event.data);

    if (!message) {
      return;
    }

    switch (message.type) {
      case 'chunk':
        // Append content chunk to existing content
        if (message.content) {
          setState(prev => ({
            ...prev,
            content: prev.content + message.content,
            status: 'streaming',
            error: null,
          }));
        }
        break;

      case 'metadata':
        // Update metadata without changing content
        if (message.metadata) {
          setState(prev => ({
            ...prev,
            metadata: message.metadata,
          }));
        }
        break;

      case 'complete':
        // Mark stream as complete
        setState(prev => ({
          ...prev,
          status: 'complete',
          error: null,
        }));
        // Close the connection
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        break;

      case 'error':
        // Handle server-side error
        setState(prev => ({
          ...prev,
          status: 'error',
          error: message.error || 'Unknown error occurred',
        }));
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        break;

      default:
        console.warn('Unknown SSE message type:', message);
    }
  }, [parseSSEData]);

  /**
   * Handle connection open event
   */
  const handleOpen = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'streaming',
      error: null,
    }));
    // Reset reconnect attempts on successful connection
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Handle connection error event
   */
  const handleError = useCallback((event: Event) => {
    console.error('SSE connection error:', event);

    const eventSource = eventSourceRef.current;

    // Check if we should attempt reconnection
    if (
      eventSource &&
      eventSource.readyState === EventSource.CLOSED &&
      reconnectAttemptsRef.current < maxReconnectAttempts
    ) {
      reconnectAttemptsRef.current += 1;

      setState(prev => ({
        ...prev,
        status: 'connecting',
        error: `Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
      }));

      // Attempt reconnection after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        // EventSource will auto-reconnect, we just need to wait
      }, reconnectDelay);
    } else {
      // Max reconnect attempts reached or connection permanently failed
      setState(prev => ({
        ...prev,
        status: 'error',
        error: prev.error || 'Connection to streaming service failed',
      }));

      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    }
  }, []);

  /**
   * Build SSE URL with query parameters
   */
  const buildStreamURL = useCallback((options: StreamOptions): string => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = new URL('/api/v1/summarization/stream', baseURL);

    // Add query parameters
    url.searchParams.append('documentId', options.documentId);
    url.searchParams.append('level', options.level);

    if (options.language) {
      url.searchParams.append('language', options.language);
    }

    if (options.includeKeyPoints !== undefined) {
      url.searchParams.append('includeKeyPoints', String(options.includeKeyPoints));
    }

    if (options.maxLength) {
      url.searchParams.append('maxLength', String(options.maxLength));
    }

    return url.toString();
  }, []);

  /**
   * Start streaming summarization
   */
  const startStreaming = useCallback((options: StreamOptions) => {
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;

    // Reset state
    setState({
      content: '',
      status: 'connecting',
      error: null,
      metadata: undefined,
    });

    try {
      const url = buildStreamURL(options);

      // Create new EventSource connection
      const eventSource = new EventSource(url, {
        withCredentials: true, // Include cookies for authentication
      });

      // Attach event listeners
      eventSource.addEventListener('message', handleMessage);
      eventSource.addEventListener('open', handleOpen);
      eventSource.addEventListener('error', handleError);

      // Store reference
      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to start streaming:', error);
      setState({
        content: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start streaming',
        metadata: undefined,
      });
    }
  }, [buildStreamURL, handleMessage, handleOpen, handleError]);

  /**
   * Stop streaming and close connection
   */
  const stopStreaming = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Update state if streaming
    setState(prev => {
      if (prev.status === 'streaming' || prev.status === 'connecting') {
        return {
          ...prev,
          status: 'idle',
          error: 'Streaming cancelled by user',
        };
      }
      return prev;
    });
  }, []);

  /**
   * Reset state to initial values
   */
  const resetState = useCallback(() => {
    stopStreaming();
    setState({
      content: '',
      status: 'idle',
      error: null,
      metadata: undefined,
    });
  }, [stopStreaming]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Close EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    resetState,
    isActive: state.status === 'connecting' || state.status === 'streaming',
  };
}

/**
 * Alternative implementation using fetch with ReadableStream
 * Use this if EventSource doesn't work due to CORS or authentication issues
 */
export function useSummarizationStreamingFetch(): UseSummarizationStreamingReturn {
  const [state, setState] = useState<StreamingState>({
    content: '',
    status: 'idle',
    error: null,
    metadata: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  /**
   * Parse SSE data format from fetch stream
   */
  const parseSSELine = useCallback((line: string): SSEMessage | null => {
    if (!line.startsWith('data: ')) {
      return null;
    }

    try {
      const jsonString = line.slice(6).trim();
      return JSON.parse(jsonString) as SSEMessage;
    } catch (error) {
      console.error('Failed to parse SSE line:', error);
      return null;
    }
  }, []);

  /**
   * Process SSE stream chunk
   */
  const processChunk = useCallback((chunk: string) => {
    const lines = chunk.split('\n');

    for (const line of lines) {
      const message = parseSSELine(line);

      if (!message) {
        continue;
      }

      switch (message.type) {
        case 'chunk':
          if (message.content) {
            setState(prev => ({
              ...prev,
              content: prev.content + message.content,
              status: 'streaming',
              error: null,
            }));
          }
          break;

        case 'metadata':
          if (message.metadata) {
            setState(prev => ({
              ...prev,
              metadata: message.metadata,
            }));
          }
          break;

        case 'complete':
          setState(prev => ({
            ...prev,
            status: 'complete',
            error: null,
          }));
          break;

        case 'error':
          setState(prev => ({
            ...prev,
            status: 'error',
            error: message.error || 'Unknown error occurred',
          }));
          break;
      }
    }
  }, [parseSSELine]);

  /**
   * Start streaming using fetch
   */
  const startStreaming = useCallback(async (options: StreamOptions) => {
    // Clean up existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState({
      content: '',
      status: 'connecting',
      error: null,
      metadata: undefined,
    });

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = new URL('/api/v1/summarization/stream', baseURL);

      // Add query parameters
      url.searchParams.append('documentId', options.documentId);
      url.searchParams.append('level', options.level);
      if (options.language) {
        url.searchParams.append('language', options.language);
      }
      if (options.includeKeyPoints !== undefined) {
        url.searchParams.append('includeKeyPoints', String(options.includeKeyPoints));
      }
      if (options.maxLength) {
        url.searchParams.append('maxLength', String(options.maxLength));
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Read stream
      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      setState(prev => ({ ...prev, status: 'streaming' }));

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (buffer) {
            processChunk(buffer);
          }
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete messages (separated by \n\n)
        const messages = buffer.split('\n\n');

        // Keep the last incomplete message in the buffer
        buffer = messages.pop() || '';

        // Process complete messages
        for (const message of messages) {
          if (message.trim()) {
            processChunk(message);
          }
        }
      }

      // Check final state
      setState(prev => {
        if (prev.status === 'streaming') {
          return { ...prev, status: 'complete' };
        }
        return prev;
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          status: 'idle',
          error: 'Streaming cancelled',
        }));
      } else {
        console.error('Streaming error:', error);
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Streaming failed',
        }));
      }
    }
  }, [processChunk]);

  /**
   * Stop streaming
   */
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
  }, []);

  /**
   * Reset state
   */
  const resetState = useCallback(() => {
    stopStreaming();
    setState({
      content: '',
      status: 'idle',
      error: null,
      metadata: undefined,
    });
  }, [stopStreaming]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (readerRef.current) {
        readerRef.current.cancel();
      }
    };
  }, []);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    resetState,
    isActive: state.status === 'connecting' || state.status === 'streaming',
  };
}
