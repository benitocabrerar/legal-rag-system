import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  StorageAdapter,
  UploadParams,
  UploadResult,
  StorageObject,
} from './storage-adapter.js';

/**
 * S3StorageAdapter — wrapper sobre @aws-sdk/client-s3 que cumple StorageAdapter.
 * Reutiliza la configuración existente de AWS_* env vars.
 *
 * Sigue siendo el default durante Fases 0-3 del plan de migración.
 * En Fase 4 (cutover) se cambia STORAGE_BACKEND='supabase' y este adapter
 * queda en standby como fallback durante la ventana de rollback.
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION ?? 'us-east-1';
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async upload(p: UploadParams): Promise<UploadResult> {
    const resp = await this.client.send(
      new PutObjectCommand({
        Bucket: p.bucket,
        Key: p.key,
        Body: p.body,
        ContentType: p.contentType,
        CacheControl: p.cacheControl,
        Metadata: p.metadata,
        ServerSideEncryption: 'AES256',
      })
    );
    return {
      key: p.key,
      size: p.body.byteLength,
      etag: resp.ETag,
    };
  }

  async signedDownloadUrl(bucket: string, key: string, expiresInSec = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSec }
    );
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async list(bucket: string, prefix?: string, limit = 100): Promise<StorageObject[]> {
    const resp = await this.client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: limit })
    );
    return (resp.Contents ?? []).map((o) => ({
      key: o.Key ?? '',
      size: o.Size ?? 0,
      lastModified: o.LastModified ?? new Date(0),
      etag: o.ETag,
    }));
  }

  async head(bucket: string, key: string): Promise<StorageObject | null> {
    try {
      const resp = await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key })
      );
      return {
        key,
        size: resp.ContentLength ?? 0,
        lastModified: resp.LastModified ?? new Date(0),
        contentType: resp.ContentType,
        etag: resp.ETag,
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFound' || e.name === 'NoSuchKey') return null;
      throw err;
    }
  }
}
