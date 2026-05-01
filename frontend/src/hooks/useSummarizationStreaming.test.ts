import { renderHook, act, waitFor } from '@testing-library/react';
import { useSummarizationStreaming, useSummarizationStreamingFetch } from './useSummarizationStreaming';

/**
 * Unit tests for useSummarizationStreaming hook
 */

// Mock EventSource
class MockEventSource {
  public url: string;
  public withCredentials: boolean;
  public readyState: number = 0;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private listeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials || false;
    this.readyState = MockEventSource.CONNECTING;

    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 10);
  }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }

    // Call direct event handlers
    if (event.type === 'open' && this.onopen) {
      this.onopen(event);
    } else if (event.type === 'message' && this.onmessage && event instanceof MessageEvent) {
      this.onmessage(event);
    } else if (event.type === 'error' && this.onerror) {
      this.onerror(event);
    }

    return true;
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }

  // Helper method for testing
  simulateMessage(data: string): void {
    const event = new MessageEvent('message', { data });
    this.dispatchEvent(event);
  }

  simulateError(): void {
    const event = new Event('error');
    this.dispatchEvent(event);
  }
}

// Set up global mock
(global as any).EventSource = MockEventSource;

describe('useSummarizationStreaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    expect(result.current.content).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.metadata).toBeUndefined();
    expect(result.current.isActive).toBe(false);
  });

  it('should start streaming and update status to connecting', () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    expect(result.current.status).toBe('connecting');
    expect(result.current.isActive).toBe(true);
  });

  it('should handle chunk messages and append content', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    // Wait for connection to open
    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    // Simulate receiving content chunks
    const eventSource = (global as any).EventSource.mock?.instances?.[0];

    act(() => {
      eventSource?.simulateMessage(
        'data: {"type":"chunk","content":"This is the first chunk. "}\n\n'
      );
    });

    await waitFor(() => {
      expect(result.current.content).toBe('This is the first chunk. ');
    });

    act(() => {
      eventSource?.simulateMessage(
        'data: {"type":"chunk","content":"This is the second chunk."}\n\n'
      );
    });

    await waitFor(() => {
      expect(result.current.content).toBe('This is the first chunk. This is the second chunk.');
    });
  });

  it('should handle metadata messages', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];

    act(() => {
      eventSource?.simulateMessage(
        'data: {"type":"metadata","metadata":{"wordCount":150,"compressionRatio":0.3}}\n\n'
      );
    });

    await waitFor(() => {
      expect(result.current.metadata).toEqual({
        wordCount: 150,
        compressionRatio: 0.3,
      });
    });
  });

  it('should handle complete message and close connection', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];

    act(() => {
      eventSource?.simulateMessage('data: {"type":"complete"}\n\n');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('complete');
      expect(result.current.isActive).toBe(false);
    });
  });

  it('should handle error messages', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];

    act(() => {
      eventSource?.simulateMessage(
        'data: {"type":"error","error":"Document not found"}\n\n'
      );
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Document not found');
      expect(result.current.isActive).toBe(false);
    });
  });

  it('should stop streaming when stopStreaming is called', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    act(() => {
      result.current.stopStreaming();
    });

    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });
  });

  it('should reset state when resetState is called', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];

    act(() => {
      eventSource?.simulateMessage('data: {"type":"chunk","content":"Test content"}\n\n');
    });

    await waitFor(() => {
      expect(result.current.content).toBe('Test content');
    });

    act(() => {
      result.current.resetState();
    });

    await waitFor(() => {
      expect(result.current.content).toBe('');
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.metadata).toBeUndefined();
    });
  });

  it('should clean up EventSource on unmount', async () => {
    const { result, unmount } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];
    const closeSpy = jest.spyOn(eventSource, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should build correct URL with query parameters', () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'detailed',
        language: 'es',
        includeKeyPoints: true,
        maxLength: 500,
      });
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];
    const url = new URL(eventSource.url);

    expect(url.searchParams.get('documentId')).toBe('test-doc-123');
    expect(url.searchParams.get('level')).toBe('detailed');
    expect(url.searchParams.get('language')).toBe('es');
    expect(url.searchParams.get('includeKeyPoints')).toBe('true');
    expect(url.searchParams.get('maxLength')).toBe('500');
  });

  it('should parse SSE data correctly', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];

    // Test with 'data: ' prefix
    act(() => {
      eventSource?.simulateMessage('data: {"type":"chunk","content":"Test"}');
    });

    await waitFor(() => {
      expect(result.current.content).toBe('Test');
    });
  });

  it('should handle connection errors with retry logic', async () => {
    const { result } = renderHook(() => useSummarizationStreaming());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    const eventSource = (global as any).EventSource.mock?.instances?.[0];
    eventSource.readyState = MockEventSource.CLOSED;

    act(() => {
      eventSource?.simulateError();
    });

    // Should show reconnecting status
    await waitFor(() => {
      expect(result.current.status).toBe('connecting');
      expect(result.current.error).toContain('Reconnecting');
    });
  });
});

describe('useSummarizationStreamingFetch', () => {
  // Mock fetch for ReadableStream tests
  const mockReadableStream = (chunks: string[]) => {
    let index = 0;

    return new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        function push() {
          if (index < chunks.length) {
            controller.enqueue(encoder.encode(chunks[index]));
            index++;
            setTimeout(push, 10);
          } else {
            controller.close();
          }
        }

        push();
      },
    });
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useSummarizationStreamingFetch());

    expect(result.current.status).toBe('idle');
    expect(result.current.content).toBe('');
  });

  it('should handle streaming with fetch and ReadableStream', async () => {
    const chunks = [
      'data: {"type":"chunk","content":"First chunk"}\n\n',
      'data: {"type":"chunk","content":" Second chunk"}\n\n',
      'data: {"type":"complete"}\n\n',
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockReadableStream(chunks),
    });

    const { result } = renderHook(() => useSummarizationStreamingFetch());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(
      () => {
        expect(result.current.status).toBe('complete');
      },
      { timeout: 3000 }
    );

    expect(result.current.content).toBe('First chunk Second chunk');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSummarizationStreamingFetch());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Network error');
    });
  });

  it('should abort fetch when stopStreaming is called', async () => {
    const chunks = ['data: {"type":"chunk","content":"Test"}\n\n'];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockReadableStream(chunks),
    });

    const { result } = renderHook(() => useSummarizationStreamingFetch());

    act(() => {
      result.current.startStreaming({
        documentId: 'test-doc-123',
        level: 'standard',
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('streaming');
    });

    act(() => {
      result.current.stopStreaming();
    });

    // Should handle abort gracefully
    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });
  });
});
