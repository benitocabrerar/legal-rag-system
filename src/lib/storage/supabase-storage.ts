import { serviceRoleClient } from '../supabase.js';
import type {
  StorageAdapter,
  UploadParams,
  UploadResult,
  StorageObject,
} from './storage-adapter.js';

/**
 * Implementación de StorageAdapter sobre Supabase Storage.
 * Usa SERVICE_ROLE key — sólo backend.
 *
 * Las políticas de bucket se gestionan en supabase/migrations/0006_storage_policies.sql
 * (a generar en Fase 3 del plan).
 */
export class SupabaseStorage implements StorageAdapter {
  async upload(p: UploadParams): Promise<UploadResult> {
    const client = serviceRoleClient();
    const { data, error } = await client.storage.from(p.bucket).upload(p.key, p.body, {
      contentType: p.contentType,
      cacheControl: p.cacheControl ?? '3600',
      upsert: false,
      metadata: p.metadata,
    });

    if (error) {
      throw new Error(`SupabaseStorage.upload(${p.bucket}/${p.key}): ${error.message}`);
    }

    return {
      key: data.path,
      size: p.body.byteLength,
    };
  }

  async signedDownloadUrl(bucket: string, key: string, expiresInSec = 3600): Promise<string> {
    const client = serviceRoleClient();
    const { data, error } = await client.storage.from(bucket).createSignedUrl(key, expiresInSec);
    if (error || !data) {
      throw new Error(`SupabaseStorage.signedDownloadUrl(${bucket}/${key}): ${error?.message}`);
    }
    return data.signedUrl;
  }

  async delete(bucket: string, key: string): Promise<void> {
    const client = serviceRoleClient();
    const { error } = await client.storage.from(bucket).remove([key]);
    if (error) {
      throw new Error(`SupabaseStorage.delete(${bucket}/${key}): ${error.message}`);
    }
  }

  async list(bucket: string, prefix?: string, limit = 100): Promise<StorageObject[]> {
    const client = serviceRoleClient();
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit });
    if (error) {
      throw new Error(`SupabaseStorage.list(${bucket}): ${error.message}`);
    }
    return (data ?? []).map((o) => ({
      key: prefix ? `${prefix}/${o.name}` : o.name,
      size: (o.metadata as { size?: number })?.size ?? 0,
      lastModified: new Date(o.updated_at ?? o.created_at ?? Date.now()),
      contentType: (o.metadata as { mimetype?: string })?.mimetype,
      etag: (o.metadata as { eTag?: string })?.eTag,
    }));
  }

  async head(bucket: string, key: string): Promise<StorageObject | null> {
    const client = serviceRoleClient();
    const lastSlash = key.lastIndexOf('/');
    const prefix = lastSlash >= 0 ? key.slice(0, lastSlash) : '';
    const filename = lastSlash >= 0 ? key.slice(lastSlash + 1) : key;

    const { data, error } = await client.storage.from(bucket).list(prefix, {
      search: filename,
      limit: 1,
    });
    if (error || !data || data.length === 0) return null;
    const o = data[0];
    return {
      key,
      size: (o.metadata as { size?: number })?.size ?? 0,
      lastModified: new Date(o.updated_at ?? o.created_at ?? Date.now()),
      contentType: (o.metadata as { mimetype?: string })?.mimetype,
      etag: (o.metadata as { eTag?: string })?.eTag,
    };
  }
}
