/**
 * Simple Logger Utility
 *
 * Provides structured logging with different levels (debug, info, warn, error).
 * Can be extended to integrate with external logging services.
 *
 * @module utils/logger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  [key: string]: any;
}

/**
 * Logger class for structured application logging
 */
export class Logger {
  private context?: string;
  private minLevel: LogLevel;

  /**
   * Create a new logger instance
   * @param context - Optional context identifier (e.g., service name)
   * @param minLevel - Minimum log level to output (default: 'info')
   */
  constructor(context?: string, minLevel: LogLevel = 'info') {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Check if a log level should be output based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLevel);
    return currentIndex >= minIndex;
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const metadataStr = metadata ? `\n${JSON.stringify(metadata, null, 2)}` : '';

    return `[${timestamp}] [${level.toUpperCase()}] ${contextStr} ${message}${metadataStr}`;
  }

  /**
   * Log debug message (lowest priority)
   * Use for detailed debugging information
   *
   * @param message - Log message
   * @param metadata - Optional structured metadata
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog('debug')) return;
    console.debug(this.formatMessage('debug', message, metadata));
  }

  /**
   * Log info message (normal priority)
   * Use for general informational messages
   *
   * @param message - Log message
   * @param metadata - Optional structured metadata
   */
  info(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog('info')) return;
    console.info(this.formatMessage('info', message, metadata));
  }

  /**
   * Log warning message (elevated priority)
   * Use for potentially harmful situations
   *
   * @param message - Log message
   * @param metadata - Optional structured metadata
   */
  warn(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message, metadata));
  }

  /**
   * Log error message (highest priority)
   * Use for error events
   *
   * @param message - Log message
   * @param metadata - Optional structured metadata (can include error objects)
   */
  error(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog('error')) return;

    // If metadata contains an Error object, extract stack trace
    const enhancedMetadata = metadata ? { ...metadata } : {};
    if (enhancedMetadata.error instanceof Error) {
      enhancedMetadata.stack = enhancedMetadata.error.stack;
      enhancedMetadata.error = {
        name: enhancedMetadata.error.name,
        message: enhancedMetadata.error.message
      };
    }

    console.error(this.formatMessage('error', message, enhancedMetadata));
  }

  /**
   * Create a child logger with the same configuration but different context
   *
   * @param childContext - Context for the child logger
   * @returns New logger instance
   */
  child(childContext: string): Logger {
    const fullContext = this.context
      ? `${this.context}:${childContext}`
      : childContext;
    return new Logger(fullContext, this.minLevel);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with specific context
 *
 * @param context - Context identifier (e.g., service name)
 * @param minLevel - Minimum log level (default: 'info')
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger('QueryService');
 * logger.info('Processing query', { queryId: '123' });
 * ```
 */
export function createLogger(context: string, minLevel: LogLevel = 'info'): Logger {
  return new Logger(context, minLevel);
}
