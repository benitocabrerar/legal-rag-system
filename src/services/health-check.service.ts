/**
 * Health Check Service
 *
 * Provides comprehensive health monitoring for all system dependencies.
 * Used for load balancer health checks, monitoring, and diagnostics.
 *
 * Checks:
 * - Database (Prisma) connectivity and latency
 * - Redis cache connectivity and latency
 * - OpenAI API availability
 * - Circuit breaker states
 * - System resources (memory, uptime)
 *
 * Health Levels:
 * - HEALTHY: All systems operational
 * - DEGRADED: Some non-critical systems down
 * - UNHEALTHY: Critical systems down
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import {
  openAICircuitBreaker,
  redisCircuitBreaker,
  databaseCircuitBreaker,
  CircuitState,
} from './circuit-breaker.service';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Individual service health check result
 */
export interface ServiceHealth {
  status: HealthStatus;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
  error?: string;
  timestamp: Date;
}

/**
 * Overall system health
 */
export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    openai: ServiceHealth;
  };
  circuitBreakers: {
    database: CircuitState;
    redis: CircuitState;
    openai: CircuitState;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
  };
}

/**
 * Health Check Service Class
 */
export class HealthCheckService {
  private prisma: PrismaClient;
  private redis: Redis | null;
  private openai: OpenAI | null;
  private startTime: Date;

  constructor(prisma: PrismaClient, redis?: Redis, openai?: OpenAI) {
    this.prisma = prisma;
    this.redis = redis || null;
    this.openai = openai || null;
    this.startTime = new Date();
  }

  /**
   * Checks database connectivity and latency
   *
   * @returns Database health status
   */
  public async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Simple query to test connectivity
      await this.prisma.$queryRaw`SELECT 1 as health`;

      const latency = Date.now() - startTime;

      // Consider slow if latency > 1000ms
      const status = latency > 1000 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;

      return {
        status,
        latency,
        message: status === HealthStatus.HEALTHY ? 'Database connected' : 'Database slow',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Database health check failed', { err: error });

      return {
        status: HealthStatus.UNHEALTHY,
        latency: Date.now() - startTime,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Checks Redis connectivity and latency
   *
   * @returns Redis health status
   */
  public async checkRedis(): Promise<ServiceHealth> {
    if (!this.redis) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'Redis not configured',
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      // PING command to test connectivity
      const response = await this.redis.ping();

      if (response !== 'PONG') {
        throw new Error('Unexpected Redis response');
      }

      const latency = Date.now() - startTime;

      // Consider slow if latency > 500ms
      const status = latency > 500 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;

      return {
        status,
        latency,
        message: status === HealthStatus.HEALTHY ? 'Redis connected' : 'Redis slow',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Redis health check failed', { err: error });

      return {
        status: HealthStatus.UNHEALTHY,
        latency: Date.now() - startTime,
        message: 'Redis connection failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Checks OpenAI API availability
   *
   * @returns OpenAI health status
   */
  public async checkOpenAI(): Promise<ServiceHealth> {
    if (!this.openai) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'OpenAI not configured',
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      // Light API call to check availability
      // List models is a cheap operation
      const models = await this.openai.models.list();

      if (!models || !models.data) {
        throw new Error('Unexpected OpenAI response');
      }

      const latency = Date.now() - startTime;

      // Consider slow if latency > 5000ms
      const status = latency > 5000 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;

      return {
        status,
        latency,
        message: status === HealthStatus.HEALTHY ? 'OpenAI API available' : 'OpenAI API slow',
        details: {
          modelsCount: models.data.length,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('OpenAI health check failed', { err: error });

      return {
        status: HealthStatus.UNHEALTHY,
        latency: Date.now() - startTime,
        message: 'OpenAI API unavailable',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets memory usage statistics
   *
   * @returns Memory usage info
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;
    const percentage = (used / total) * 100;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  /**
   * Gets system uptime in seconds
   *
   * @returns Uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Determines overall system health based on service checks
   *
   * @param services - Individual service health statuses
   * @returns Overall health status
   */
  private determineOverallHealth(services: Record<string, ServiceHealth>): HealthStatus {
    const statuses = Object.values(services).map((s) => s.status);

    // If any critical service (database) is unhealthy, system is unhealthy
    if (services.database.status === HealthStatus.UNHEALTHY) {
      return HealthStatus.UNHEALTHY;
    }

    // If any service is unhealthy, system is degraded
    if (statuses.includes(HealthStatus.UNHEALTHY)) {
      return HealthStatus.DEGRADED;
    }

    // If any service is degraded, system is degraded
    if (statuses.includes(HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    // All services healthy
    return HealthStatus.HEALTHY;
  }

  /**
   * Performs comprehensive health check of all services
   *
   * @returns Complete system health status
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();

    try {
      // Run all health checks in parallel
      const [databaseHealth, redisHealth, openaiHealth] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkOpenAI(),
      ]);

      const services = {
        database: databaseHealth,
        redis: redisHealth,
        openai: openaiHealth,
      };

      const overallStatus = this.determineOverallHealth(services);

      const health: SystemHealth = {
        status: overallStatus,
        timestamp: new Date(),
        uptime: this.getUptime(),
        services,
        circuitBreakers: {
          database: databaseCircuitBreaker.getState(),
          redis: redisCircuitBreaker.getState(),
          openai: openAICircuitBreaker.getState(),
        },
        system: {
          memory: this.getMemoryUsage(),
          uptime: this.getUptime(),
        },
      };

      const checkDuration = Date.now() - startTime;

      logger.info('Health check completed', {
        status: health.status,
        duration: checkDuration,
        services: {
          database: databaseHealth.status,
          redis: redisHealth.status,
          openai: openaiHealth.status,
        },
      });

      return health;
    } catch (error) {
      logger.error('Health check failed with error', { err: error });

      // Return unhealthy status
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        uptime: this.getUptime(),
        services: {
          database: {
            status: HealthStatus.UNHEALTHY,
            message: 'Health check failed',
            timestamp: new Date(),
          },
          redis: {
            status: HealthStatus.UNHEALTHY,
            message: 'Health check failed',
            timestamp: new Date(),
          },
          openai: {
            status: HealthStatus.UNHEALTHY,
            message: 'Health check failed',
            timestamp: new Date(),
          },
        },
        circuitBreakers: {
          database: databaseCircuitBreaker.getState(),
          redis: redisCircuitBreaker.getState(),
          openai: openAICircuitBreaker.getState(),
        },
        system: {
          memory: this.getMemoryUsage(),
          uptime: this.getUptime(),
        },
      };
    }
  }

  /**
   * Quick liveness check (minimal resource usage)
   * Used for load balancer health checks
   *
   * @returns true if system can accept requests
   */
  public async isAlive(): Promise<boolean> {
    try {
      // Only check critical services
      const dbHealth = await this.checkDatabase();

      // System is alive if database is not unhealthy
      return dbHealth.status !== HealthStatus.UNHEALTHY;
    } catch (error) {
      logger.error('Liveness check failed', { err: error });
      return false;
    }
  }

  /**
   * Readiness check (more comprehensive than liveness)
   * Used to determine if system can handle traffic
   *
   * @returns true if system is ready to handle requests
   */
  public async isReady(): Promise<boolean> {
    try {
      const health = await this.getSystemHealth();

      // System is ready if status is healthy or degraded (not unhealthy)
      return health.status !== HealthStatus.UNHEALTHY;
    } catch (error) {
      logger.error('Readiness check failed', { err: error });
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let healthCheckServiceInstance: HealthCheckService | null = null;

/**
 * Initializes the health check service
 *
 * @param prisma - Prisma client instance
 * @param redis - Redis client instance (optional)
 * @param openai - OpenAI client instance (optional)
 */
export function initHealthCheckService(
  prisma: PrismaClient,
  redis?: Redis,
  openai?: OpenAI
): HealthCheckService {
  healthCheckServiceInstance = new HealthCheckService(prisma, redis, openai);
  logger.info('Health check service initialized');
  return healthCheckServiceInstance;
}

/**
 * Gets the health check service instance
 *
 * @returns Health check service instance
 * @throws Error if service not initialized
 */
export function getHealthCheckService(): HealthCheckService {
  if (!healthCheckServiceInstance) {
    throw new Error('Health check service not initialized. Call initHealthCheckService first.');
  }
  return healthCheckServiceInstance;
}

/**
 * Convenience function to get system health
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  return getHealthCheckService().getSystemHealth();
}

/**
 * Convenience function to check if system is alive
 */
export async function isSystemAlive(): Promise<boolean> {
  return getHealthCheckService().isAlive();
}

/**
 * Convenience function to check if system is ready
 */
export async function isSystemReady(): Promise<boolean> {
  return getHealthCheckService().isReady();
}
