/**
 * Health Check Service
 *
 * Health and readiness probes for Kubernetes/Docker
 * Week 5-6: Observabilidad - Health Checks
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import Redis from 'ioredis';

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      message?: string;
      responseTime?: number;
      details?: any;
    };
  };
  timestamp: string;
  uptime: number;
}

/**
 * Health Check Service
 */
export class HealthService {
  private startTime = Date.now();

  /**
   * Comprehensive health check
   */
  async healthCheck(): Promise<HealthCheck> {
    const checks: HealthCheck['checks'] = {};

    // Check database
    const dbCheck = await this.checkDatabase();
    checks.database = dbCheck;

    // Check Redis
    const redisCheck = await this.checkRedis();
    checks.redis = redisCheck;

    // Check OpenAI API
    const openaiCheck = await this.checkOpenAI();
    checks.openai = openaiCheck;

    // Check system resources
    const systemCheck = this.checkSystem();
    checks.system = systemCheck;

    // Determine overall status
    const statuses = Object.values(checks).map((c) => c.status);
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (statuses.some((s) => s === 'down')) {
      overallStatus = 'unhealthy';
    } else if (statuses.some((s) => s === 'degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Lightweight readiness check
   */
  async readinessCheck(): Promise<{ ready: boolean; message?: string }> {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;

      return { ready: true };
    } catch (error) {
      return {
        ready: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Lightweight liveness check
   */
  livenessCheck(): { alive: boolean } {
    // Simple check to see if the process is running
    return { alive: true };
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthCheck['checks'][string]> {
    const startTime = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime > 1000 ? 'degraded' : 'up',
        message: 'Database connection successful',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Database connection failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<HealthCheck['checks'][string]> {
    const startTime = Date.now();

    try {
      // Skip if Redis is not configured
      if (!process.env.REDIS_URL) {
        return {
          status: 'degraded',
          message: 'Redis not configured',
        };
      }

      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });

      await redis.ping();
      await redis.quit();

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime > 1000 ? 'degraded' : 'up',
        message: 'Redis connection successful',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Redis connection failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check OpenAI API health
   */
  private async checkOpenAI(): Promise<HealthCheck['checks'][string]> {
    try {
      // Skip if OpenAI is not configured
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: 'degraded',
          message: 'OpenAI API key not configured',
        };
      }

      // Simple check - just verify the API key exists
      // Actual API call would be too expensive for health checks
      return {
        status: 'up',
        message: 'OpenAI API configured',
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'OpenAI check failed',
      };
    }
  }

  /**
   * Check system resources
   */
  private checkSystem(): HealthCheck['checks'][string] {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Medimos RSS (memoria residente real del proceso dentro del contenedor),
    // NO el ratio heapUsed/heapTotal. El heap de V8 vive de forma natural
    // pegado al 100% (heapTotal crece justo por encima de heapUsed), así que
    // usar ese ratio como señal de salud marcaba el sistema como 'down' con
    // el servicio perfectamente sano → /observability/health devolvía 503 de
    // forma permanente. RSS contra el límite del contenedor sí es real.
    const rssMB = memoryUsage.rss / 1024 / 1024;
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    // Límite de memoria del contenedor (Render starter = 512 MB). Configurable.
    const limitMB = Number(process.env.MEMORY_LIMIT_MB) || 512;
    const memoryPercentage = (rssMB / limitMB) * 100;

    // La presión de memoria SOLO puede degradar, nunca marcar 'down': un
    // proceso con la memoria alta sigue atendiendo tráfico con normalidad.
    // 'down' se reserva para fallos reales (DB/Redis caídos). Así el health
    // check no vuelve a tumbar al servicio (503 → Render lo da por muerto)
    // por un falso positivo de memoria.
    const status: 'up' | 'degraded' | 'down' = memoryPercentage > 85 ? 'degraded' : 'up';

    return {
      status,
      message: `Memory RSS: ${rssMB.toFixed(2)}MB / ${limitMB}MB (${memoryPercentage.toFixed(2)}%)`,
      details: {
        memory: {
          used: rssMB,
          total: limitMB,
          percentage: memoryPercentage,
          heapUsed: heapUsedMB,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: process.uptime(),
      },
    };
  }
}

// Singleton instance
let healthServiceInstance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (!healthServiceInstance) {
    healthServiceInstance = new HealthService();
  }
  return healthServiceInstance;
}
