/**
 * Document Event Bus - Central event system for document processing
 *
 * This event-driven architecture ensures loose coupling between services
 * and enables async processing of document analysis tasks
 */

import { EventEmitter } from 'events';
import { Logger } from 'pino';

// Event Types
export enum DocumentEventType {
  // Upload Events
  DOCUMENT_UPLOADED = 'document:uploaded',
  LEGAL_DOCUMENT_UPLOADED = 'legal_document:uploaded',

  // Analysis Events
  ANALYSIS_STARTED = 'analysis:started',
  ANALYSIS_PROGRESS = 'analysis:progress',
  ANALYSIS_COMPLETED = 'analysis:completed',
  ANALYSIS_FAILED = 'analysis:failed',

  // Registry Events
  REGISTRY_UPDATED = 'registry:updated',
  HIERARCHY_REBUILT = 'hierarchy:rebuilt',

  // Notification Events
  NOTIFICATION_QUEUED = 'notification:queued',
  NOTIFICATION_SENT = 'notification:sent',
  NOTIFICATION_FAILED = 'notification:failed',

  // Search Index Events
  INDEX_UPDATE_REQUIRED = 'index:update_required',
  INDEX_UPDATED = 'index:updated',

  // Version Control Events
  DOCUMENT_VERSION_CREATED = 'document:version_created',
  DOCUMENT_SUPERSEDED = 'document:superseded'
}

// Event Payloads
export interface DocumentUploadedEvent {
  documentId: string;
  documentType: 'Document' | 'LegalDocument';
  userId?: string;
  caseId?: string;
  title: string;
  fileUrl?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AnalysisProgressEvent {
  documentId: string;
  documentType: 'Document' | 'LegalDocument';
  stage: string;
  progress: number; // 0-100
  currentStep: string;
  totalSteps: number;
  timestamp: Date;
}

export interface AnalysisCompletedEvent {
  documentId: string;
  documentType: 'Document' | 'LegalDocument';
  results: {
    articlesExtracted: number;
    sectionsExtracted: number;
    chaptersExtracted: number;
    summariesGenerated: number;
    embeddingsGenerated: number;
    entitiesFound: number;
    crossReferencesFound: number;
    processingTimeMs: number;
  };
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface NotificationEvent {
  type: 'email' | 'in-app' | 'webhook';
  recipients: string[];
  subject: string;
  message: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: Date;
}

/**
 * DocumentEventBus - Singleton event bus for document processing
 */
export class DocumentEventBus extends EventEmitter {
  private static instance: DocumentEventBus;
  private logger: Logger;
  private eventHistory: Map<string, any[]> = new Map();
  private eventMetrics: Map<string, number> = new Map();

  private constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.setMaxListeners(100); // Increase for production use
    this.setupMetricsTracking();
  }

  public static getInstance(logger: Logger): DocumentEventBus {
    if (!DocumentEventBus.instance) {
      DocumentEventBus.instance = new DocumentEventBus(logger);
    }
    return DocumentEventBus.instance;
  }

  /**
   * Emit a typed event with automatic logging and metrics
   */
  public emitEvent<T = any>(eventType: DocumentEventType, payload: T): void {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date(),
      id: this.generateEventId()
    };

    // Log event
    this.logger.info({
      msg: 'Event emitted',
      eventType,
      eventId: event.id,
      payload: this.sanitizePayload(payload)
    });

    // Track metrics
    this.trackEventMetric(eventType);

    // Store in history (last 100 events per type)
    this.storeEventHistory(eventType, event);

    // Emit the event
    this.emit(eventType, event);
  }

  /**
   * Subscribe to events with automatic error handling
   */
  public subscribe<T = any>(
    eventType: DocumentEventType,
    handler: (event: { type: DocumentEventType; payload: T; timestamp: Date; id: string }) => Promise<void> | void,
    context?: string
  ): void {
    const wrappedHandler = async (event: any) => {
      try {
        this.logger.debug({
          msg: 'Handling event',
          eventType,
          eventId: event.id,
          context
        });

        const startTime = Date.now();
        await handler(event);
        const duration = Date.now() - startTime;

        this.logger.debug({
          msg: 'Event handled successfully',
          eventType,
          eventId: event.id,
          context,
          durationMs: duration
        });
      } catch (error) {
        this.logger.error({
          msg: 'Event handler error',
          eventType,
          eventId: event.id,
          context,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        // Re-emit as failure event if it's a critical event
        if (this.isCriticalEvent(eventType)) {
          this.emit('error', {
            originalEvent: event,
            error,
            context
          });
        }
      }
    };

    this.on(eventType, wrappedHandler);
  }

  /**
   * One-time event subscription
   */
  public subscribeOnce<T = any>(
    eventType: DocumentEventType,
    handler: (event: { type: DocumentEventType; payload: T; timestamp: Date; id: string }) => Promise<void> | void,
    context?: string
  ): void {
    const wrappedHandler = async (event: any) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error({
          msg: 'One-time event handler error',
          eventType,
          context,
          error
        });
      }
    };

    this.once(eventType, wrappedHandler);
  }

  /**
   * Wait for an event with timeout
   */
  public async waitForEvent(
    eventType: DocumentEventType,
    timeoutMs: number = 30000,
    filter?: (event: any) => boolean
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(eventType, handler);
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeoutMs);

      const handler = (event: any) => {
        if (!filter || filter(event)) {
          clearTimeout(timer);
          this.removeListener(eventType, handler);
          resolve(event);
        }
      };

      this.on(eventType, handler);
    });
  }

  /**
   * Get event history for a specific event type
   */
  public getEventHistory(eventType: DocumentEventType, limit: number = 10): any[] {
    const history = this.eventHistory.get(eventType) || [];
    return history.slice(-limit);
  }

  /**
   * Get event metrics
   */
  public getEventMetrics(): Record<string, number> {
    return Object.fromEntries(this.eventMetrics);
  }

  /**
   * Clear event history (for testing)
   */
  public clearHistory(): void {
    this.eventHistory.clear();
  }

  // Private methods

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizePayload(payload: any): any {
    // Remove sensitive data from logging
    if (!payload) return payload;

    const sanitized = { ...payload };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'credential'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private trackEventMetric(eventType: DocumentEventType): void {
    const count = this.eventMetrics.get(eventType) || 0;
    this.eventMetrics.set(eventType, count + 1);
  }

  private storeEventHistory(eventType: DocumentEventType, event: any): void {
    if (!this.eventHistory.has(eventType)) {
      this.eventHistory.set(eventType, []);
    }

    const history = this.eventHistory.get(eventType)!;
    history.push(event);

    // Keep only last 100 events
    if (history.length > 100) {
      history.shift();
    }
  }

  private isCriticalEvent(eventType: DocumentEventType): boolean {
    const criticalEvents = [
      DocumentEventType.DOCUMENT_UPLOADED,
      DocumentEventType.LEGAL_DOCUMENT_UPLOADED,
      DocumentEventType.ANALYSIS_FAILED
    ];

    return criticalEvents.includes(eventType);
  }

  private setupMetricsTracking(): void {
    // Reset metrics every hour
    setInterval(() => {
      const metrics = this.getEventMetrics();
      if (Object.keys(metrics).length > 0) {
        this.logger.info({
          msg: 'Event metrics snapshot',
          metrics,
          timestamp: new Date()
        });
      }
      this.eventMetrics.clear();
    }, 3600000); // 1 hour
  }
}

// Export singleton getter
export function getDocumentEventBus(logger: Logger): DocumentEventBus {
  return DocumentEventBus.getInstance(logger);
}