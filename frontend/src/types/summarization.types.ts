/**
 * Type definitions for document summarization streaming
 * Used by useSummarizationStreaming hook and related components
 */

/**
 * SSE message types received from the summarization endpoint
 */
export type SSEMessageType = 'chunk' | 'metadata' | 'complete' | 'error';

/**
 * Base SSE message structure
 */
export interface SSEMessage {
  type: SSEMessageType;
  content?: string;
  metadata?: SummaryMetadata;
  error?: string;
}

/**
 * SSE chunk message - contains partial summary content
 */
export interface SSEChunkMessage extends SSEMessage {
  type: 'chunk';
  content: string;
}

/**
 * SSE metadata message - contains summary statistics
 */
export interface SSEMetadataMessage extends SSEMessage {
  type: 'metadata';
  metadata: SummaryMetadata;
}

/**
 * SSE complete message - indicates streaming is finished
 */
export interface SSECompleteMessage extends SSEMessage {
  type: 'complete';
}

/**
 * SSE error message - contains error information
 */
export interface SSEErrorMessage extends SSEMessage {
  type: 'error';
  error: string;
}

/**
 * Summary metadata returned by the API
 */
export interface SummaryMetadata {
  wordCount: number;
  compressionRatio: number;
  processingTime?: number;
  model?: string;
  language?: string;
  keyPoints?: string[];
  confidence?: number;
}

/**
 * Streaming status states
 */
export type StreamingStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

/**
 * Summary detail levels
 */
export type SummaryLevel = 'brief' | 'standard' | 'detailed';

/**
 * Supported languages for summarization
 */
export type SummaryLanguage = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it';

/**
 * Options for starting a summarization stream
 */
export interface StreamOptions {
  documentId: string;
  level: SummaryLevel;
  language?: SummaryLanguage;
  includeKeyPoints?: boolean;
  maxLength?: number;
  focus?: string; // Optional focus area for the summary
}

/**
 * State of the streaming process
 */
export interface StreamingState {
  content: string;
  status: StreamingStatus;
  error: string | null;
  metadata?: SummaryMetadata;
}

/**
 * Return type of useSummarizationStreaming hook
 */
export interface UseSummarizationStreamingReturn extends StreamingState {
  startStreaming: (options: StreamOptions) => void;
  stopStreaming: () => void;
  resetState: () => void;
  isActive: boolean;
}

/**
 * Configuration for SSE connection
 */
export interface SSEConnectionConfig {
  url: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Summary quality metrics
 */
export interface SummaryQualityMetrics {
  coherenceScore: number; // 0-1
  completenessScore: number; // 0-1
  conciseness: number; // 0-1
  readabilityScore: number; // 0-100 (Flesch Reading Ease)
}

/**
 * Enhanced metadata with quality metrics
 */
export interface EnhancedSummaryMetadata extends SummaryMetadata {
  quality?: SummaryQualityMetrics;
  sourceDocumentLength?: number;
  generatedAt?: string; // ISO timestamp
  version?: string; // API version
}

/**
 * Summarization request payload (for REST API)
 */
export interface SummarizationRequest {
  documentId: string;
  level: SummaryLevel;
  language?: SummaryLanguage;
  options?: {
    includeKeyPoints?: boolean;
    maxLength?: number;
    minLength?: number;
    focus?: string;
    extractQuotes?: boolean;
    includeCitations?: boolean;
  };
}

/**
 * Summarization response (for REST API)
 */
export interface SummarizationResponse {
  summary: string;
  metadata: EnhancedSummaryMetadata;
  keyPoints?: string[];
  quotes?: string[];
  citations?: string[];
}

/**
 * Error response from API
 */
export interface SummarizationError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable?: boolean;
}

/**
 * Streaming event types for custom event handling
 */
export enum StreamingEventType {
  CONNECTED = 'connected',
  CHUNK_RECEIVED = 'chunk_received',
  METADATA_RECEIVED = 'metadata_received',
  COMPLETED = 'completed',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  CANCELLED = 'cancelled',
}

/**
 * Custom event data for streaming events
 */
export interface StreamingEventData {
  type: StreamingEventType;
  timestamp: number;
  data?: any;
}

/**
 * Streaming statistics for monitoring
 */
export interface StreamingStatistics {
  startTime: number;
  endTime?: number;
  duration?: number;
  chunksReceived: number;
  totalBytes: number;
  averageChunkSize: number;
  reconnectAttempts: number;
}

/**
 * Hook options for advanced configuration
 */
export interface UseSummarizationStreamingOptions {
  baseURL?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onEvent?: (event: StreamingEventData) => void;
  enableStatistics?: boolean;
}

/**
 * Type guard to check if message is a chunk
 */
export function isChunkMessage(message: SSEMessage): message is SSEChunkMessage {
  return message.type === 'chunk' && typeof message.content === 'string';
}

/**
 * Type guard to check if message is metadata
 */
export function isMetadataMessage(message: SSEMessage): message is SSEMetadataMessage {
  return message.type === 'metadata' && message.metadata !== undefined;
}

/**
 * Type guard to check if message is complete
 */
export function isCompleteMessage(message: SSEMessage): message is SSECompleteMessage {
  return message.type === 'complete';
}

/**
 * Type guard to check if message is error
 */
export function isErrorMessage(message: SSEMessage): message is SSEErrorMessage {
  return message.type === 'error' && typeof message.error === 'string';
}
