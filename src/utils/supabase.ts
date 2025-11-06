import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

// ============================================================================
// Supabase Client for Backend (Service Role)
// ============================================================================

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get Supabase client with service role key (full access)
 * Use this for server-side operations that need to bypass RLS
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!config.supabase.url || !config.supabase.serviceKey) {
    throw new Error('Supabase URL and Service Key are required');
  }

  supabaseInstance = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

/**
 * Get Supabase client with anon key (respects RLS)
 * Use this when you want to respect Row Level Security policies
 */
export function getSupabaseClient(): SupabaseClient {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error('Supabase URL and Anon Key are required');
  }

  return createClient(config.supabase.url, config.supabase.anonKey);
}

// Export default admin client
export const supabase = getSupabaseAdmin();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify Supabase connection
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

/**
 * Get user by ID (admin operation)
 */
export async function getUserById(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  if (error) throw error;
  return data;
}

/**
 * Verify user's JWT token
 */
export async function verifyUserToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);

  if (error) throw error;
  return data.user;
}

// ============================================================================
// Storage Helper Functions
// ============================================================================

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Buffer,
  options?: { contentType?: string; upsert?: boolean }
) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? false,
  });

  if (error) throw error;
  return data;
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Download file from Supabase Storage
 */
export async function downloadFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) throw error;
  return data;
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) throw error;
}

// ============================================================================
// Vector Search Helper Functions
// ============================================================================

/**
 * Search legal documents using vector similarity
 */
export async function searchLegalDocuments(
  queryEmbedding: number[],
  options: {
    matchThreshold?: number;
    matchCount?: number;
    filters?: {
      jurisdiction?: string;
      type?: string;
    };
  } = {}
) {
  const { matchThreshold = 0.7, matchCount = 5, filters } = options;

  let query = supabase.rpc('match_legal_documents', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  // Apply filters if provided
  if (filters?.jurisdiction) {
    query = query.eq('jurisdiction', filters.jurisdiction);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Search case documents using vector similarity
 */
export async function searchCaseDocuments(
  caseId: string,
  queryEmbedding: number[],
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
) {
  const { matchThreshold = 0.7, matchCount = 5 } = options;

  const { data, error } = await supabase.rpc('match_case_documents', {
    query_embedding: queryEmbedding,
    case_id: caseId,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) throw error;
  return data;
}

/**
 * Insert embeddings for a document chunk
 */
export async function insertDocumentChunk(chunk: {
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  metadata?: any;
}) {
  const { data, error } = await supabase.from('legal_document_chunks').insert({
    document_id: chunk.documentId,
    content: chunk.content,
    embedding: chunk.embedding,
    chunk_index: chunk.chunkIndex,
    metadata: chunk.metadata || {},
  });

  if (error) throw error;
  return data;
}

/**
 * Insert embeddings for a case document chunk
 */
export async function insertCaseDocumentChunk(chunk: {
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  pageNumber?: number;
  metadata?: any;
}) {
  const { data, error } = await supabase.from('case_document_chunks').insert({
    document_id: chunk.documentId,
    content: chunk.content,
    embedding: chunk.embedding,
    chunk_index: chunk.chunkIndex,
    page_number: chunk.pageNumber,
    metadata: chunk.metadata || {},
  });

  if (error) throw error;
  return data;
}
