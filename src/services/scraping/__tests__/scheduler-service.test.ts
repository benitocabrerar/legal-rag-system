/**
 * Tests for SchedulerService
 * Phase 6: Automated Document Monitoring
 */

import { SchedulerService } from '../scheduler-service';
import FirecrawlService from '../firecrawl-service';
import { LegalSource } from '../../../config/legal-sources';

// Mock the FirecrawlService
jest.mock('../firecrawl-service');

describe('SchedulerService', () => {
  let service: SchedulerService;
  let mockFirecrawlService: jest.Mocked<FirecrawlService>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock instance
    mockFirecrawlService = new FirecrawlService() as jest.Mocked<FirecrawlService>;

    // Create service with mocked dependency
    service = new SchedulerService(mockFirecrawlService);
  });

  afterEach(async () => {
    // Stop all jobs after each test
    await service.stopAll();
  });

  describe('constructor', () => {
    it('should create a new SchedulerService instance', () => {
      expect(service).toBeInstanceOf(SchedulerService);
    });

    it('should initialize with no active jobs', () => {
      const jobs = service.getJobs();
      expect(jobs.length).toBe(0);
    });
  });

  describe('scheduleJob', () => {
    it('should schedule a new job from legal source', async () => {
      const source: LegalSource = {
        id: 'test-source',
        name: 'Test Legal Source',
        url: 'https://www.registroficial.gob.ec',
        type: 'primary',
        cronExpression: '0 0 * * *', // Daily at midnight
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {
          searchPattern: '*.pdf',
          maxDepth: 2,
          extractMetadata: true
        }
      };

      await service.scheduleJob(source);

      const jobs = service.getJobs();
      expect(jobs.length).toBe(1);
      expect(jobs[0].sourceName).toBe('Test Legal Source');
    });

    it('should generate correct job ID', async () => {
      const source: LegalSource = {
        id: 'registro-oficial',
        name: 'Registro Oficial',
        url: 'https://www.registroficial.gob.ec',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {
          searchPattern: '*.pdf',
          extractMetadata: true
        }
      };

      await service.scheduleJob(source);

      const job = service.getJob('scrape_registro-oficial');
      expect(job).toBeDefined();
      expect(job?.sourceId).toBe('registro-oficial');
    });

    it('should set correct cron expression', async () => {
      const source: LegalSource = {
        id: 'daily-source',
        name: 'Daily Source',
        url: 'https://example.com',
        type: 'secondary',
        cronExpression: '0 0 * * *', // Daily at midnight
        frequency: 'daily',
        priority: 2,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      const job = service.getJob('scrape_daily-source');
      expect(job?.cronExpression).toBe('0 0 * * *');
      expect(job?.frequency).toBe('daily');
    });

    it('should calculate next run time', async () => {
      const source: LegalSource = {
        id: 'weekly-source',
        name: 'Weekly Source',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * 0', // Weekly on Sunday
        frequency: 'weekly',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      const job = service.getJob('scrape_weekly-source');
      expect(job?.nextRun).toBeDefined();
      expect(job?.nextRun).toBeInstanceOf(Date);
    });

    it('should throw error for invalid cron expression', async () => {
      const source: LegalSource = {
        id: 'invalid-source',
        name: 'Invalid Source',
        url: 'https://example.com',
        type: 'tertiary',
        cronExpression: 'invalid cron', // Invalid
        frequency: 'daily',
        priority: 3,
        isActive: true,
        config: {}
      };

      await expect(service.scheduleJob(source)).rejects.toThrow();
    });
  });

  describe('getJobs', () => {
    it('should return all scheduled jobs', async () => {
      const source1: LegalSource = {
        id: 'source-1',
        name: 'Source 1',
        url: 'https://example1.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      const source2: LegalSource = {
        id: 'source-2',
        name: 'Source 2',
        url: 'https://example2.com',
        type: 'secondary',
        cronExpression: '0 6 * * *',
        frequency: 'daily',
        priority: 2,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source1);
      await service.scheduleJob(source2);

      const jobs = service.getJobs();

      expect(jobs.length).toBe(2);
      expect(jobs.find(j => j.sourceName === 'Source 1')).toBeDefined();
      expect(jobs.find(j => j.sourceName === 'Source 2')).toBeDefined();
    });

    it('should return empty array when no jobs scheduled', () => {
      const jobs = service.getJobs();
      expect(jobs).toEqual([]);
    });
  });

  describe('getJob', () => {
    it('should return job by ID', async () => {
      const source: LegalSource = {
        id: 'test-job',
        name: 'Test Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      const job = service.getJob('scrape_test-job');

      expect(job).toBeDefined();
      expect(job?.id).toBe('scrape_test-job');
      expect(job?.sourceName).toBe('Test Job');
    });

    it('should return undefined for non-existent job', () => {
      const job = service.getJob('non-existent-id');
      expect(job).toBeUndefined();
    });
  });

  describe('pauseJob', () => {
    it('should pause an active job', async () => {
      const source: LegalSource = {
        id: 'pausable-job',
        name: 'Pausable Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      service.pauseJob('scrape_pausable-job');

      const job = service.getJob('scrape_pausable-job');
      expect(job?.isActive).toBe(false);
    });

    it('should throw error for non-existent job', () => {
      expect(() => {
        service.pauseJob('non-existent-id');
      }).toThrow();
    });
  });

  describe('resumeJob', () => {
    it('should resume a paused job', async () => {
      const source: LegalSource = {
        id: 'resumable-job',
        name: 'Resumable Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);
      service.pauseJob('scrape_resumable-job');
      service.resumeJob('scrape_resumable-job');

      const job = service.getJob('scrape_resumable-job');
      expect(job?.isActive).toBe(true);
    });

    it('should throw error for non-existent job', () => {
      expect(() => {
        service.resumeJob('non-existent-id');
      }).toThrow();
    });
  });

  describe('stopAll', () => {
    it('should stop all scheduled jobs', async () => {
      const source1: LegalSource = {
        id: 'job-1',
        name: 'Job 1',
        url: 'https://example1.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      const source2: LegalSource = {
        id: 'job-2',
        name: 'Job 2',
        url: 'https://example2.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 2,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source1);
      await service.scheduleJob(source2);

      await service.stopAll();

      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.totalJobs).toBe(2); // Jobs still exist, but stopped
    });

    it('should handle empty job list gracefully', async () => {
      await expect(service.stopAll()).resolves.not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('totalJobs');
      expect(status).toHaveProperty('activeJobs');
    });

    it('should track total jobs correctly', async () => {
      const source: LegalSource = {
        id: 'status-job',
        name: 'Status Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      const status = service.getStatus();
      expect(status.totalJobs).toBe(1);
      expect(status.activeJobs).toBe(1);
    });

    it('should track paused jobs separately', async () => {
      const source: LegalSource = {
        id: 'paused-status-job',
        name: 'Paused Status Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);
      service.pauseJob('scrape_paused-status-job');

      const status = service.getStatus();
      expect(status.totalJobs).toBe(1);
      expect(status.activeJobs).toBe(0);
    });
  });

  describe('job status tracking', () => {
    it('should track job status', async () => {
      const source: LegalSource = {
        id: 'track-job',
        name: 'Track Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      const job = service.getJob('scrape_track-job');
      expect(job?.status).toBeDefined();
      expect(['idle', 'running', 'failed', 'success']).toContain(job?.status);
    });

    it('should track last run time', async () => {
      const source: LegalSource = {
        id: 'last-run-job',
        name: 'Last Run Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      const job = service.getJob('scrape_last-run-job');
      // Initially undefined
      expect(job?.lastRun).toBeUndefined();
    });

    it('should track next run time', async () => {
      const source: LegalSource = {
        id: 'next-run-job',
        name: 'Next Run Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      await service.scheduleJob(source);

      const job = service.getJob('scrape_next-run-job');
      expect(job?.nextRun).toBeDefined();
      expect(job?.nextRun).toBeInstanceOf(Date);
    });
  });

  describe('error handling', () => {
    it('should handle scraping errors gracefully', async () => {
      mockFirecrawlService.scrapeDocument = jest.fn().mockRejectedValue(
        new Error('Scraping failed')
      );

      const source: LegalSource = {
        id: 'error-test-job',
        name: 'Error Test Job',
        url: 'https://example.com',
        type: 'primary',
        cronExpression: '0 0 * * *',
        frequency: 'daily',
        priority: 1,
        isActive: true,
        config: {}
      };

      // Should not throw when scheduling
      await expect(service.scheduleJob(source)).resolves.not.toThrow();
    });
  });
});
