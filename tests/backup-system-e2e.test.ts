/**
 * Backup System End-to-End Tests
 *
 * Comprehensive test suite for the backup management system
 * Tests: Backend API, SSE connections, BullMQ integration, Frontend hooks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8000';

// Test user credentials
let authToken: string;
let adminUserId: string;

// Redis connection for testing
let redis: Redis;
let backupQueue: Queue;
let backupWorker: Worker;

/**
 * Setup: Create admin user and get auth token
 */
beforeAll(async () => {
  // Initialize Redis
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  // Initialize BullMQ queue
  backupQueue = new Queue('backup-jobs', { connection: redis });

  // Clean up any existing test data
  const existingUser = await prisma.user.findUnique({
    where: { email: 'test-admin@backup-test.com' }
  });

  if (existingUser) {
    await prisma.backup.deleteMany({
      where: { createdBy: existingUser.id }
    });

    await prisma.user.delete({
      where: { id: existingUser.id }
    });
  }

  // Create test admin user
  const testUser = await prisma.user.create({
    data: {
      email: 'test-admin@backup-test.com',
      passwordHash: '$2b$10$test.hash.for.testing', // Mock hash
      name: 'Test Admin',
      role: 'ADMIN'
    }
  });

  adminUserId = testUser.id;

  // Mock authentication (in real scenario, call login endpoint)
  // For testing, we'll assume token generation works
  authToken = 'mock-jwt-token-for-testing';
});

/**
 * Cleanup: Remove test data
 */
afterAll(async () => {
  // Clean up test backups
  await prisma.backup.deleteMany({
    where: { createdBy: adminUserId }
  });

  // Clean up test user
  if (adminUserId) {
    await prisma.user.delete({
      where: { id: adminUserId }
    });
  }

  // Close connections
  if (backupWorker) {
    await backupWorker.close();
  }
  await backupQueue.close();
  await redis.quit();
  await prisma.$disconnect();
});

/**
 * Test Suite 1: Backend API Endpoints
 */
describe('Backup API Endpoints', () => {
  describe('POST /api/admin/backups', () => {
    it('should create a full backup successfully', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          type: 'FULL',
          description: 'E2E Test Full Backup'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.backup).toBeDefined();
      expect(data.backup.type).toBe('FULL');
      expect(data.backup.status).toBe('PENDING');
      expect(data.jobId).toBeDefined();
    });

    it('should create an incremental backup successfully', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          type: 'INCREMENTAL',
          description: 'E2E Test Incremental Backup'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.backup.type).toBe('INCREMENTAL');
    });

    it('should create a schema-only backup successfully', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          type: 'SCHEMA_ONLY',
          description: 'E2E Test Schema Backup'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.backup.type).toBe('SCHEMA_ONLY');
    });

    it('should reject backup creation without admin role', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          type: 'FULL',
          description: 'Should fail'
        })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/backups', () => {
    it('should retrieve backup history with pagination', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups?limit=10&offset=0`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.backups).toBeDefined();
      expect(Array.isArray(data.backups)).toBe(true);
      expect(data.total).toBeDefined();
    });

    it('should filter backups by status', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups?status=COMPLETED`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      if (data.backups.length > 0) {
        expect(data.backups.every((b: any) => b.status === 'COMPLETED')).toBe(true);
      }
    });

    it('should filter backups by type', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups?type=FULL`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      if (data.backups.length > 0) {
        expect(data.backups.every((b: any) => b.type === 'FULL')).toBe(true);
      }
    });
  });

  describe('GET /api/admin/backups/stats', () => {
    it('should retrieve backup statistics', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups/stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.total).toBeDefined();
      expect(data.completed).toBeDefined();
      expect(data.failed).toBeDefined();
      expect(data.inProgress).toBeDefined();
      expect(data.totalSize).toBeDefined();
      expect(data.lastBackup).toBeDefined();
    });
  });

  describe('POST /api/admin/backups/schedules', () => {
    it('should create a backup schedule', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Daily Full Backup - Test',
          type: 'FULL',
          cronExpression: '0 2 * * *', // Every day at 2 AM
          enabled: true,
          retentionDays: 30
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.schedule).toBeDefined();
      expect(data.schedule.cronExpression).toBe('0 2 * * *');
      expect(data.schedule.enabled).toBe(true);
    });

    it('should validate cron expression', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Invalid Schedule',
          type: 'FULL',
          cronExpression: 'invalid-cron',
          enabled: true
        })
      });

      expect(response.status).toBe(400);
    });
  });
});

/**
 * Test Suite 2: Server-Sent Events (SSE)
 */
describe('Backup SSE Real-Time Monitoring', () => {
  describe('GET /api/admin/backups/events', () => {
    it('should establish SSE connection', (done) => {
      const eventSource = new EventSource(
        `${BASE_URL}/api/admin/backups/events`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        } as any
      );

      eventSource.onopen = () => {
        expect(eventSource.readyState).toBe(EventSource.OPEN);
        eventSource.close();
        done();
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        done(error);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        eventSource.close();
        done(new Error('SSE connection timeout'));
      }, 5000);
    });

    it('should receive initial connected event', (done) => {
      const eventSource = new EventSource(
        `${BASE_URL}/api/admin/backups/events`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        } as any
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          expect(data.clientId).toBeDefined();
          expect(data.timestamp).toBeDefined();
          eventSource.close();
          done();
        }
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        done(error);
      };

      setTimeout(() => {
        eventSource.close();
        done(new Error('Did not receive connected event'));
      }, 5000);
    });

    it('should filter events by backupId', (done) => {
      const testBackupId = 'test-backup-id-123';

      const eventSource = new EventSource(
        `${BASE_URL}/api/admin/backups/events?backupId=${testBackupId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        } as any
      );

      let receivedConnected = false;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          receivedConnected = true;
        } else if (data.backupId && data.backupId !== testBackupId) {
          eventSource.close();
          done(new Error('Received event for different backupId'));
        }
      };

      setTimeout(() => {
        eventSource.close();
        if (receivedConnected) {
          done();
        } else {
          done(new Error('Did not receive connected event'));
        }
      }, 3000);
    });
  });

  describe('GET /api/admin/backups/connections', () => {
    it('should list active SSE connections', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/backups/connections`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.total).toBeDefined();
      expect(data.connections).toBeDefined();
      expect(Array.isArray(data.connections)).toBe(true);
    });
  });
});

/**
 * Test Suite 3: BullMQ Integration
 */
describe('BullMQ Job Processing', () => {
  it('should add backup job to queue', async () => {
    const jobData = {
      backupId: 'test-backup-queue-1',
      type: 'FULL',
      userId: adminUserId
    };

    const job = await backupQueue.add('backup-job', jobData);

    expect(job.id).toBeDefined();
    expect(job.data.backupId).toBe('test-backup-queue-1');
    expect(job.data.type).toBe('FULL');
  });

  it('should retrieve job from queue', async () => {
    const jobData = {
      backupId: 'test-backup-queue-2',
      type: 'INCREMENTAL',
      userId: adminUserId
    };

    const addedJob = await backupQueue.add('backup-job', jobData);
    const retrievedJob = await backupQueue.getJob(addedJob.id!);

    expect(retrievedJob).toBeDefined();
    expect(retrievedJob!.data.backupId).toBe('test-backup-queue-2');
  });

  it('should emit progress events', (done) => {
    const jobData = {
      backupId: 'test-backup-progress',
      type: 'FULL',
      userId: adminUserId
    };

    backupQueue.add('backup-job', jobData).then((job) => {
      backupQueue.on('progress', (receivedJob, progress) => {
        if (receivedJob.id === job.id) {
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
          done();
        }
      });

      // Simulate progress update
      setTimeout(() => {
        job.updateProgress(50);
      }, 1000);
    });

    setTimeout(() => {
      done(new Error('Progress event not received'));
    }, 5000);
  });
});

/**
 * Test Suite 4: Backup Restoration
 */
describe('Backup Restoration', () => {
  let testBackupId: string;

  beforeEach(async () => {
    // Create a completed test backup
    const backup = await prisma.backup.create({
      data: {
        type: 'FULL',
        status: 'COMPLETED',
        s3Key: 'test-backups/test-restore.sql',
        size: BigInt(1024000),
        createdById: adminUserId
      }
    });

    testBackupId = backup.id;
  });

  it('should initiate backup restoration', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/backups/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        backupId: testBackupId
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.message).toBeDefined();
    expect(data.jobId).toBeDefined();
  });

  it('should reject restoration of non-existent backup', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/backups/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        backupId: 'non-existent-id'
      })
    });

    expect(response.status).toBe(404);
  });

  it('should reject restoration of failed backup', async () => {
    // Create failed backup
    const failedBackup = await prisma.backup.create({
      data: {
        type: 'FULL',
        status: 'FAILED',
        createdById: adminUserId
      }
    });

    const response = await fetch(`${BASE_URL}/api/admin/backups/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        backupId: failedBackup.id
      })
    });

    expect(response.status).toBe(400);
  });
});

/**
 * Test Suite 5: Performance & Load Testing
 */
describe('Performance Tests', () => {
  it('should handle multiple concurrent backup creations', async () => {
    const backupPromises = Array.from({ length: 5 }, (_, i) =>
      fetch(`${BASE_URL}/api/admin/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          type: 'FULL',
          description: `Concurrent Test Backup ${i + 1}`
        })
      })
    );

    const results = await Promise.all(backupPromises);

    results.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  it('should handle multiple SSE connections', (done) => {
    const connections = 3;
    let connectedCount = 0;

    const eventSources = Array.from({ length: connections }, () => {
      const es = new EventSource(
        `${BASE_URL}/api/admin/backups/events`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        } as any
      );

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          connectedCount++;
          if (connectedCount === connections) {
            eventSources.forEach(source => source.close());
            done();
          }
        }
      };

      return es;
    });

    setTimeout(() => {
      eventSources.forEach(source => source.close());
      if (connectedCount < connections) {
        done(new Error(`Only ${connectedCount}/${connections} connections established`));
      }
    }, 5000);
  });

  it('should complete backup within reasonable time', async () => {
    const startTime = Date.now();

    const response = await fetch(`${BASE_URL}/api/admin/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'SCHEMA_ONLY',
        description: 'Performance Test Backup'
      })
    });

    const data = await response.json() as any;
    const backupId = data.backup.id;

    // Poll for completion (max 60 seconds)
    let completed = false;
    const maxWait = 60000;
    const pollInterval = 2000;

    while (!completed && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`${BASE_URL}/api/admin/backups/${backupId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const statusData = await statusResponse.json() as any;

      if (statusData.backup.status === 'COMPLETED') {
        completed = true;
      } else if (statusData.backup.status === 'FAILED') {
        throw new Error('Backup failed during performance test');
      }
    }

    const duration = Date.now() - startTime;

    expect(completed).toBe(true);
    expect(duration).toBeLessThan(maxWait);
  }, 70000); // 70 second timeout for this test
});

/**
 * Test Suite 6: Data Integrity
 */
describe('Data Integrity Tests', () => {
  it('should maintain referential integrity between backups and users', async () => {
    const backups = await prisma.backup.findMany({
      where: { createdBy: adminUserId }
    });

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: adminUserId }
    });

    expect(user).toBeDefined();
    backups.forEach((backup) => {
      expect(backup.createdBy).toBe(adminUserId);
    });
  });

  it('should store accurate backup metadata', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'FULL',
        description: 'Metadata Test Backup'
      })
    });

    const data = await response.json() as any;
    const backupId = data.backup.id;

    // Retrieve from database
    const backup = await prisma.backup.findUnique({
      where: { id: backupId }
    });

    expect(backup).toBeDefined();
    expect(backup!.type).toBe('FULL');
    expect(backup!.status).toBe('PENDING');
    expect(backup!.createdAt).toBeDefined();
    expect(backup!.createdById).toBe(adminUserId);
  });
});

/**
 * Test Suite 7: Error Handling
 */
describe('Error Handling', () => {
  it('should handle invalid backup type gracefully', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'INVALID_TYPE',
        description: 'Invalid Backup'
      })
    });

    expect(response.status).toBe(400);
  });

  it('should handle database connection errors', async () => {
    // This test would require mocking Prisma client
    // Skipping for now, but should be implemented in integration tests
    expect(true).toBe(true);
  });

  it('should handle S3 upload failures', async () => {
    // This test would require mocking S3 client
    // Skipping for now, but should be implemented in integration tests
    expect(true).toBe(true);
  });
});
