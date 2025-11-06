import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

// ============================================================================
// Configuration
// ============================================================================

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '3072', 10),
    chatModel: 'gpt-4-turbo-preview',
  },

  // Anthropic
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022',
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  // AWS S3
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'legal-rag-documents',
    region: process.env.AWS_REGION || 'us-east-1',
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },

  // Plan Limits
  planLimits: {
    free: parseInt(process.env.MAX_CASES_FREE || '5', 10),
    basic: parseInt(process.env.MAX_CASES_BASIC || '50', 10),
    professional: parseInt(process.env.MAX_CASES_PROFESSIONAL || '200', 10),
    team: parseInt(process.env.MAX_CASES_TEAM || '1000', 10),
  },

  // File Upload
  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    allowedFileTypes: (
      process.env.ALLOWED_FILE_TYPES ||
      'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ).split(','),
  },

  // RAG Configuration
  rag: {
    chunkSize: 512, // tokens
    chunkOverlap: 128, // tokens
    topK: 5, // number of chunks to retrieve
    minSimilarity: 0.7, // minimum cosine similarity
    temperature: 0.2, // LLM temperature for factual responses
    maxTokens: 2000, // max response tokens
  },
} as const;

// Validation
export function validateConfig() {
  const required = {
    DATABASE_URL: config.databaseUrl,
    JWT_SECRET: config.jwt.secret,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about optional but recommended config
  if (!config.openai.apiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set - RAG features will not work');
  }

  if (!config.redisUrl) {
    console.warn('⚠️  REDIS_URL not set - caching will be disabled');
  }
}

export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';
export const isTest = config.env === 'test';
