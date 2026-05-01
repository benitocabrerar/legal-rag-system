/**
 * useBackupSSE Hook
 *
 * React hook for real-time backup status monitoring using Server-Sent Events
 * Provides: Live progress updates, status changes, automatic reconnection
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface BackupEvent {
  type: 'connected' | 'initial' | 'progress' | 'completed' | 'failed' | 'update';
  backupId?: string;
  backup?: any;
  progress?: number;
  error?: string;
  activeBackups?: any[];
  timestamp: string;
  clientId?: string;
}

export interface UseBackupSSEOptions {
  backupId?: string;
  status?: string[];
  enabled?: boolean;
  onEvent?: (event: BackupEvent) => void;
  onError?: (error: Error) => void;
  reconnectInterval?: number;
}

export interface UseBackupSSEReturn {
  connected: boolean;
  events: BackupEvent[];
  lastEvent: BackupEvent | null;
  error: Error | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useBackupSSE(options: UseBackupSSEOptions = {}): UseBackupSSEReturn {
  const {
    backupId,
    status,
    enabled = true,
    onEvent,
    onError,
    reconnectInterval = 5000
  } = options;

  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<BackupEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<BackupEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Disconnect existing connection
    disconnect();

    try {
      // Build URL with filters
      const params = new URLSearchParams();
      if (backupId) params.append('backupId', backupId);
      if (status && status.length > 0) params.append('status', status.join(','));

      const url = `/api/admin/backups/events${params.toString() ? `?${params.toString()}` : ''}`;

      // Create EventSource
      const eventSource = new EventSource(url, {
        withCredentials: true
      });

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (e) => {
        try {
          const event: BackupEvent = JSON.parse(e.data);

          setLastEvent(event);
          setEvents((prev) => [...prev, event]);

          // Call event handler
          onEvent?.(event);
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);

        const errorObj = new Error('SSE connection failed');
        setError(errorObj);
        setConnected(false);

        onError?.(errorObj);

        // Auto-reconnect with exponential backoff
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
          30000 // Max 30 seconds
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`);
          connect();
        }, delay);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to create SSE connection');
      setError(errorObj);
      onError?.(errorObj);
    }
  }, [enabled, backupId, status, disconnect, reconnectInterval, onEvent, onError]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, backupId, status?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connected,
    events,
    lastEvent,
    error,
    reconnect,
    disconnect
  };
}

/**
 * Hook for monitoring a specific backup's progress
 */
export function useBackupProgress(backupId: string, enabled: boolean = true) {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('PENDING');
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { connected, lastEvent } = useBackupSSE({
    backupId,
    enabled,
    onEvent: (event) => {
      if (event.backupId !== backupId) return;

      switch (event.type) {
        case 'progress':
          if (event.progress !== undefined) {
            setProgress(event.progress);
            setStatus('IN_PROGRESS');
          }
          break;

        case 'completed':
          setProgress(100);
          setStatus('COMPLETED');
          setCompleted(true);
          break;

        case 'failed':
          setStatus('FAILED');
          setFailed(true);
          if (event.error) {
            setErrorMessage(event.error);
          }
          break;

        case 'update':
          if (event.backup) {
            setStatus(event.backup.status);
            if (event.backup.status === 'COMPLETED') {
              setProgress(100);
              setCompleted(true);
            } else if (event.backup.status === 'FAILED') {
              setFailed(true);
              setErrorMessage(event.backup.error || null);
            }
          }
          break;
      }
    }
  });

  return {
    connected,
    progress,
    status,
    completed,
    failed,
    errorMessage,
    lastUpdate: lastEvent?.timestamp
  };
}

/**
 * Hook for monitoring all active backups
 */
export function useActiveBackups(enabled: boolean = true) {
  const [activeBackups, setActiveBackups] = useState<any[]>([]);

  const { connected, lastEvent } = useBackupSSE({
    status: ['PENDING', 'IN_PROGRESS'],
    enabled,
    onEvent: (event) => {
      switch (event.type) {
        case 'initial':
          if (event.activeBackups) {
            setActiveBackups(event.activeBackups);
          }
          break;

        case 'progress':
        case 'update':
          if (event.backupId && event.backup) {
            setActiveBackups((prev) => {
              const index = prev.findIndex((b) => b.id === event.backupId);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = event.backup;
                return updated;
              }
              return [...prev, event.backup];
            });
          }
          break;

        case 'completed':
        case 'failed':
          if (event.backupId) {
            setActiveBackups((prev) => prev.filter((b) => b.id !== event.backupId));
          }
          break;
      }
    }
  });

  return {
    connected,
    activeBackups,
    lastUpdate: lastEvent?.timestamp
  };
}
