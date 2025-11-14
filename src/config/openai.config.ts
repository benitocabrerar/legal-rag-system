import OpenAI from 'openai';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  timeout: number;
  maxRetries: number;
}

export const openAIConfig: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4-turbo-preview', // GPT-4 Turbo for enhanced metadata extraction
  temperature: 0.2, // Lower temperature for more consistent output
  maxTokens: 4096,
  topP: 0.9,
  timeout: 60000, // 60 seconds
  maxRetries: 3, // Retry failed requests up to 3 times
};

export const createOpenAIClient = (): OpenAI => {
  if (!openAIConfig.apiKey) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }

  return new OpenAI({
    apiKey: openAIConfig.apiKey,
    timeout: openAIConfig.timeout,
    maxRetries: openAIConfig.maxRetries,
  });
};

/**
 * Exponential backoff delay for retries
 */
export const getRetryDelay = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  // Retry on rate limits, timeouts, and server errors
  if (error?.status === 429) return true; // Rate limit
  if (error?.status === 500) return true; // Server error
  if (error?.status === 503) return true; // Service unavailable
  if (error?.code === 'ETIMEDOUT') return true; // Timeout
  if (error?.code === 'ECONNRESET') return true; // Connection reset
  return false;
};
