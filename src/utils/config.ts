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

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Database (Prisma with Supabase PostgreSQL)
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',

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

  // Supabase Storage buckets
  storage: {
    caseDocuments: 'case-documents',
    avatars: 'avatars',
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
    SUPABASE_URL: config.supabase.url,
    SUPABASE_SERVICE_ROLE_KEY: config.supabase.serviceKey,
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

  if (!config.supabase.anonKey) {
    console.warn('⚠️  SUPABASE_ANON_KEY not set - some features may not work');
  }
}

export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';
export const isTest = config.env === 'test';
