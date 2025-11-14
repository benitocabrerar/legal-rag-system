import Bull from 'bull';
import { OpenAI } from 'openai';

interface OpenAIJob {
  type: 'embedding' | 'chat' | 'extraction';
  payload: any;
  priority?: number;
}

interface OpenAIJobResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * OpenAI Queue Service
 *
 * Manages async OpenAI API requests using Bull queue
 * Features:
 * - Rate limiting (5 concurrent, configurable)
 * - Job prioritization
 * - Retry logic with exponential backoff
 * - Failed job tracking
 */
export class OpenAIQueueService {
  private queue: Bull.Queue<OpenAIJob>;
  private openai: OpenAI;
  private maxConcurrent: number;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for OpenAI Queue');
    }

    this.maxConcurrent = parseInt(process.env.OPENAI_MAX_CONCURRENT || '5');
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.OPENAI_RETRY_ATTEMPTS || '3'),
    });

    // Create Bull queue
    this.queue = new Bull<OpenAIJob>('openai-requests', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
      limiter: {
        max: parseInt(process.env.OPENAI_RATE_LIMIT || '100'),
        duration: 60000, // per minute
      },
    });

    this.setupProcessors();
    console.log(`✅ OpenAI Queue initialized (max ${this.maxConcurrent} concurrent)`);
  }

  private setupProcessors(): void {
    this.queue.process('embedding', this.maxConcurrent, async (job) => {
      return this.processEmbedding(job.data.payload);
    });

    this.queue.process('chat', this.maxConcurrent, async (job) => {
      return this.processChatCompletion(job.data.payload);
    });

    this.queue.process('extraction', this.maxConcurrent, async (job) => {
      return this.processExtraction(job.data.payload);
    });

    this.queue.on('failed', (job, error) => {
      console.error(`Job ${job.id} failed:`, error.message);
    });
  }

  private async processEmbedding(payload: { text: string }): Promise<OpenAIJobResult> {
    try {
      const response = await this.openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
        input: payload.text,
      });

      return {
        success: true,
        data: response.data[0].embedding,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async processChatCompletion(payload: {
    messages: any[];
    temperature?: number;
  }): Promise<OpenAIJobResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: payload.messages,
        temperature: payload.temperature || 0.7,
      });

      return {
        success: true,
        data: response.choices[0].message.content,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async processExtraction(payload: {
    content: string;
    schema: any;
  }): Promise<OpenAIJobResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Extract structured data from the provided content.',
          },
          {
            role: 'user',
            content: payload.content,
          },
        ],
        functions: [
          {
            name: 'extract_data',
            parameters: payload.schema,
          },
        ],
        function_call: { name: 'extract_data' },
      });

      const functionCall = response.choices[0].message.function_call;
      const extracted = functionCall ? JSON.parse(functionCall.arguments) : null;

      return {
        success: true,
        data: extracted,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async addJob(job: OpenAIJob): Promise<Bull.Job<OpenAIJob>> {
    return this.queue.add(job.type, job, {
      priority: job.priority || 5,
    });
  }

  async getJobStatus(jobId: string): Promise<'completed' | 'failed' | 'active' | 'waiting' | 'delayed' | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return state;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

let queueInstance: OpenAIQueueService | null = null;

export function getOpenAIQueueService(): OpenAIQueueService {
  if (!queueInstance) {
    queueInstance = new OpenAIQueueService();
  }
  return queueInstance;
}
