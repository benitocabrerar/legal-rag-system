import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StorageAdapter } from '../../src/lib/storage/storage-adapter.js';

describe('StorageAdapter selection', () => {
  beforeEach(() => {
    // reset module-level cache
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.STORAGE_BACKEND;
  });

  it('default backend = s3 → S3StorageAdapter', async () => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    const { getStorage } = await import('../../src/lib/storage/storage-adapter.js');
    const a: StorageAdapter = await getStorage();
    expect(a).toBeDefined();
    expect(a.constructor.name).toBe('S3StorageAdapter');
  });

  it('STORAGE_BACKEND=supabase → SupabaseStorage', async () => {
    process.env.STORAGE_BACKEND = 'supabase';
    process.env.SUPABASE_URL = 'https://stub.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';
    const { getStorage } = await import('../../src/lib/storage/storage-adapter.js');
    const a: StorageAdapter = await getStorage();
    expect(a.constructor.name).toBe('SupabaseStorage');
  });

  it('STORAGE_BACKEND inválido lanza', async () => {
    process.env.STORAGE_BACKEND = 'gcs';
    const { getStorage } = await import('../../src/lib/storage/storage-adapter.js');
    await expect(getStorage()).rejects.toThrow(/STORAGE_BACKEND/);
  });
});
