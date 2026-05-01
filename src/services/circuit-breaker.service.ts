/**
 * Circuit Breaker Service
 *
 * Implements the Circuit Breaker pattern to prevent cascading failures
 * when calling external services (OpenAI, Redis, etc.).
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit is tripped, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 *
 * Features:
 * - Automatic failure detection and recovery
 * - Configurable thresholds and timeouts
 * - Graceful degradation
 * - Monitoring and metrics
 *
 * @see https://martinfowler.com/bliki/CircuitBreaker.html
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { ExternalServiceError, ServiceUnavailableError } from '../errors/http-errors';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening circuit
   * @default 5
   */
  failureThreshold: number;

  /**
   * Number of successes to close circuit from HALF_OPEN
   * @default 2
   */
  successThreshold: number;

  /**
   * Timeout in milliseconds for each request
   * @default 30000 (30 seconds)
   */
  timeout: number;

  /**
   * Time in milliseconds to wait before attempting to close circuit
   * @default 60000 (60 seconds)
   */
  resetTimeout: number;

  /**
   * Name for logging and monitoring
   */
  name: string;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  totalTimeouts: number;
  totalRejections: number;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private stats: Omit<CircuitBreakerStats, 'state'> = {
    failures: 0,
    successes: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    totalTimeouts: 0,
    totalRejections: 0,
  };

  constructor(private config: CircuitBreakerConfig) {
    super();
    logger.info('Circuit breaker initialized', {
      name: config.name,
      config: {
        failureThreshold: config.failureThreshold,
        successThreshold: config.successThreshold,
        timeout: config.timeout,
        resetTimeout: config.resetTimeout,
      },
    });
  }

  /**
   * Executes a function with circuit breaker protection
   *
   * @param fn - Async function to execute
   * @returns Promise with function result
   * @throws ServiceUnavailableError if circuit is OPEN
   * @throws Error if function times out or fails
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.stats.totalRejections++;
        const retryAfter = Math.ceil((this.nextAttempt - Date.now()) / 1000);

        logger.warn('Circuit breaker is OPEN, rejecting request', {
          circuit: this.config.name,
          state: this.state,
          retryAfter,
        });

        throw new ServiceUnavailableError(
          `${this.config.name} circuit breaker is OPEN`,
          retryAfter
        );
      }

      // Transition to HALF_OPEN to test service
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);

      // Record success
      this.onSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Executes function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.stats.totalTimeouts++;
        reject(
          new Error(`${this.config.name} request timeout after ${this.config.timeout}ms`)
        );
      }, this.config.timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Handles successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.stats.consecutiveFailures = 0;
    this.stats.consecutiveSuccesses++;
    this.stats.totalSuccesses++;
    this.stats.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      logger.debug('Circuit breaker success in HALF_OPEN state', {
        circuit: this.config.name,
        successCount: this.successCount,
        threshold: this.config.successThreshold,
      });

      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }

    this.emit('success');
  }

  /**
   * Handles failed execution
   */
  private onFailure(error: unknown): void {
    this.successCount = 0;
    this.failureCount++;
    this.stats.consecutiveSuccesses = 0;
    this.stats.consecutiveFailures++;
    this.stats.totalFailures++;
    this.stats.lastFailureTime = new Date();

    logger.warn('Circuit breaker recorded failure', {
      circuit: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error instanceof Error ? error.message : String(error),
    });

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionTo(CircuitState.OPEN);
    }

    this.emit('failure', error);
  }

  /**
   * Transitions circuit to new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;

    logger.info('Circuit breaker state transition', {
      circuit: this.config.name,
      previousState,
      newState,
    });

    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.stats.nextAttemptTime = new Date(this.nextAttempt);

      logger.warn('Circuit breaker is now OPEN', {
        circuit: this.config.name,
        resetTimeout: this.config.resetTimeout,
        nextAttempt: this.stats.nextAttemptTime,
      });
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      delete this.stats.nextAttemptTime;

      logger.info('Circuit breaker is now CLOSED', {
        circuit: this.config.name,
      });
    }

    this.emit('stateChange', { previousState, newState });
  }

  /**
   * Gets current circuit state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Gets circuit breaker statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      ...this.stats,
    };
  }

  /**
   * Manually resets the circuit breaker
   */
  public reset(): void {
    logger.info('Circuit breaker manually reset', {
      circuit: this.config.name,
      previousState: this.state,
    });

    this.transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;

    this.emit('reset');
  }

  /**
   * Manually opens the circuit breaker
   */
  public open(): void {
    logger.warn('Circuit breaker manually opened', {
      circuit: this.config.name,
      previousState: this.state,
    });

    this.transitionTo(CircuitState.OPEN);
    this.emit('manualOpen');
  }

  /**
   * Gets health status based on circuit state
   */
  public isHealthy(): boolean {
    return this.state !== CircuitState.OPEN;
  }
}

/**
 * Creates a circuit breaker with default configuration
 */
export function createCircuitBreaker(
  name: string,
  overrides?: Partial<Omit<CircuitBreakerConfig, 'name'>>
): CircuitBreaker {
  const config: CircuitBreakerConfig = {
    name,
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
    ...overrides,
  };

  return new CircuitBreaker(config);
}

/**
 * Pre-configured circuit breakers for common external services
 */

/**
 * OpenAI API circuit breaker
 */
export const openAICircuitBreaker = createCircuitBreaker('OpenAI', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60000, // 60 seconds for AI operations
  resetTimeout: 120000, // 2 minutes
});

/**
 * Redis circuit breaker
 */
export const redisCircuitBreaker = createCircuitBreaker('Redis', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 5000, // 5 seconds for cache
  resetTimeout: 30000, // 30 seconds
});

/**
 * Database circuit breaker
 */
export const databaseCircuitBreaker = createCircuitBreaker('Database', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 10000, // 10 seconds
  resetTimeout: 60000, // 1 minute
});

/**
 * Firecrawl circuit breaker
 */
export const firecrawlCircuitBreaker = createCircuitBreaker('Firecrawl', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 120000, // 2 minutes for scraping
  resetTimeout: 300000, // 5 minutes
});

// Set up logging for circuit breaker events
[openAICircuitBreaker, redisCircuitBreaker, databaseCircuitBreaker, firecrawlCircuitBreaker].forEach(
  (breaker) => {
    breaker.on('stateChange', ({ previousState, newState }) => {
      logger.info('Circuit state changed', {
        circuit: (breaker as any).config.name,
        previousState,
        newState,
      });
    });
  }
);

/**
 * Gets health status of all circuit breakers
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  return {
    openai: openAICircuitBreaker.getStats(),
    redis: redisCircuitBreaker.getStats(),
    database: databaseCircuitBreaker.getStats(),
    firecrawl: firecrawlCircuitBreaker.getStats(),
  };
}
