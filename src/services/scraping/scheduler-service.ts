/**
 * Scheduler Service - Manages periodic scraping jobs
 * Uses cron expressions to schedule automatic scraping of legal sources
 */

import { CronJob } from 'cron';
import FirecrawlService from './firecrawl-service';
import { LegalSource, getActiveLegalSources } from '../../config/legal-sources';

export interface ScheduledJob {
  id: string;
  sourceId: string;
  sourceName: string;
  cronExpression: string;
  frequency: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'failed' | 'success';
  cronJob?: CronJob;
}

export interface JobResult {
  sourceId: string;
  success: boolean;
  documentsFound: number;
  documentsScrapped: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

/**
 * SchedulerService - Manages cron-based scraping jobs
 */
export class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();
  private firecrawlService: FirecrawlService;
  private isRunning: boolean = false;

  constructor(firecrawlService: FirecrawlService) {
    this.firecrawlService = firecrawlService;
  }

  /**
   * Initialize all scheduled jobs from legal sources configuration
   */
  async initialize(): Promise<void> {
    console.log('[SchedulerService] Initializing scheduled jobs...');

    const activeSources = getActiveLegalSources();
    console.log(`[SchedulerService] Found ${activeSources.length} active legal sources`);

    for (const source of activeSources) {
      await this.scheduleJob(source);
    }

    this.isRunning = true;
    console.log(`[SchedulerService] ${this.jobs.size} jobs scheduled and running`);
  }

  /**
   * Schedule a job for a legal source
   */
  async scheduleJob(source: LegalSource): Promise<void> {
    try {
      console.log(`[SchedulerService] Scheduling job for: ${source.name}`);

      const jobId = `scrape_${source.id}`;

      // Create cron job
      const cronJob = new CronJob(
        source.cronExpression,
        async () => {
          await this.executeJob(source);
        },
        null, // onComplete
        true, // start immediately
        'America/Guayaquil' // Ecuador timezone
      );

      const scheduledJob: ScheduledJob = {
        id: jobId,
        sourceId: source.id,
        sourceName: source.name,
        cronExpression: source.cronExpression,
        frequency: source.frequency,
        isActive: true,
        nextRun: cronJob.nextDate().toJSDate(),
        status: 'idle',
        cronJob
      };

      this.jobs.set(jobId, scheduledJob);

      console.log(`[SchedulerService] ✓ Scheduled ${source.name} (${source.frequency}) - Next run: ${scheduledJob.nextRun}`);
    } catch (error) {
      console.error(`[SchedulerService] Error scheduling job for ${source.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a scraping job for a legal source
   */
  async executeJob(source: LegalSource): Promise<JobResult> {
    const startTime = new Date();
    const jobId = `scrape_${source.id}`;
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`[SchedulerService] 🚀 Executing job: ${source.name}`);
    job.status = 'running';
    job.lastRun = startTime;

    const result: JobResult = {
      sourceId: source.id,
      success: false,
      documentsFound: 0,
      documentsScrapped: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0
    };

    try {
      // Step 1: Map the website to discover URLs
      console.log(`[SchedulerService] Step 1: Mapping website ${source.url}`);
      const mapResults = await this.firecrawlService.mapWebsite({
        url: source.url,
        search: source.config.searchPattern,
        limit: 100,
        includeSubdomains: source.config.includeSubdomains
      });

      result.documentsFound = mapResults.length;
      console.log(`[SchedulerService] Found ${result.documentsFound} documents`);

      if (result.documentsFound === 0) {
        console.log(`[SchedulerService] ⚠️ No documents found for ${source.name}`);
        job.status = 'success';
        return result;
      }

      // Step 2: Filter URLs by document types
      const relevantUrls = this.filterRelevantUrls(
        mapResults.map(r => r.url),
        source.config.documentTypes || []
      );

      console.log(`[SchedulerService] Filtered to ${relevantUrls.length} relevant documents`);

      // Step 3: Scrape documents (limit to 20 per job to avoid overload)
      const urlsToScrape = relevantUrls.slice(0, 20);
      console.log(`[SchedulerService] Step 2: Scraping ${urlsToScrape.length} documents`);

      const scrapeResults = await this.firecrawlService.batchScrape(urlsToScrape);
      result.documentsScrapped = scrapeResults.length;

      // Step 4: Extract metadata if configured
      if (source.config.extractMetadata && scrapeResults.length > 0) {
        console.log(`[SchedulerService] Step 3: Extracting metadata from ${scrapeResults.length} documents`);

        const schema = FirecrawlService.getLegalMetadataSchema();
        const metadataResults = await this.firecrawlService.extractMetadata(
          scrapeResults.map(r => r.metadata.sourceURL || ''),
          schema
        );

        console.log(`[SchedulerService] Extracted metadata from ${metadataResults.length} documents`);
      }

      // Mark as success
      result.success = true;
      job.status = 'success';

      console.log(`[SchedulerService] ✓ Job completed: ${source.name} - ${result.documentsScrapped} documents scrapped`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SchedulerService] ✗ Job failed: ${source.name} - ${errorMessage}`);

      result.errors.push(errorMessage);
      job.status = 'failed';
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      // Update next run time
      if (job.cronJob) {
        job.nextRun = job.cronJob.nextDate().toJSDate();
      }
    }

    return result;
  }

  /**
   * Filter URLs based on document types
   */
  private filterRelevantUrls(urls: string[], documentTypes: string[]): string[] {
    if (documentTypes.length === 0) {
      return urls;
    }

    // Common patterns for Ecuadorian legal documents
    const patterns: Record<string, RegExp> = {
      law: /ley|leyes|legislaci[oó]n/i,
      decree: /decreto|decretos/i,
      regulation: /reglamento|reglamentos/i,
      resolution: /resoluci[oó]n|resoluciones/i,
      ruling: /sentencia|sentencias|fallo|fallos/i,
      agreement: /acuerdo|acuerdos|convenio/i,
      circular: /circular|circulares/i,
      jurisprudence: /jurisprudencia/i,
      bill: /proyecto|proyectos/i,
      reform: /reforma|reformas/i,
      report: /informe|informes/i
    };

    return urls.filter(url => {
      return documentTypes.some(type => {
        const pattern = patterns[type];
        return pattern && pattern.test(url);
      });
    });
  }

  /**
   * Get all scheduled jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      cronJob: undefined // Don't expose CronJob instance
    }));
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ScheduledJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    return {
      ...job,
      cronJob: undefined
    };
  }

  /**
   * Pause a job
   */
  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.cronJob) {
      job.cronJob.stop();
      job.isActive = false;
      console.log(`[SchedulerService] Job paused: ${job.sourceName}`);
    }
  }

  /**
   * Resume a job
   */
  resumeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.cronJob) {
      job.cronJob.start();
      job.isActive = true;
      job.nextRun = job.cronJob.nextDate().toJSDate();
      console.log(`[SchedulerService] Job resumed: ${job.sourceName} - Next run: ${job.nextRun}`);
    }
  }

  /**
   * Stop all jobs
   */
  async stopAll(): Promise<void> {
    console.log('[SchedulerService] Stopping all jobs...');

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.cronJob) {
        job.cronJob.stop();
      }
    }

    this.isRunning = false;
    console.log('[SchedulerService] All jobs stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    totalJobs: number;
    activeJobs: number;
    idleJobs: number;
    runningJobs: number;
    failedJobs: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      isRunning: this.isRunning,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.isActive).length,
      idleJobs: jobs.filter(j => j.status === 'idle').length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length
    };
  }
}

export default SchedulerService;
