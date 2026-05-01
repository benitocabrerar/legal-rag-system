/**
 * Storage Utility para uploads de documentos.
 *
 * Refactorizado para pasar por src/lib/storage/StorageAdapter:
 *   - STORAGE_BACKEND=s3        → S3StorageAdapter (default, comportamiento actual)
 *   - STORAGE_BACKEND=supabase  → SupabaseStorage  (post-cutover)
 *
 * El nombre `cloudinary` se mantiene por compatibilidad histórica con call sites
 * (la implementación nunca fue Cloudinary realmente). API pública sin cambios.
 */
import path from 'path';
import fs from 'fs/promises';
import { getStorage } from '../lib/storage/storage-adapter.js';

interface UploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
}

interface CloudinaryUploader {
  upload: (
    filePath: string,
    options?: { resource_type?: string; folder?: string }
  ) => Promise<UploadResult>;
  destroy: (publicId: string) => Promise<{ result: string }>;
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Adapter-backed uploader. Funciona con S3 o Supabase según STORAGE_BACKEND.
 */
const adapterUploader: CloudinaryUploader = {
  async upload(filePath, options = {}) {
    const fileName = path.basename(filePath);
    const folder = options.folder ?? 'uploads';
    const ext = path.extname(fileName).toLowerCase();
    const key = `${folder}/${Date.now()}-${fileName}`;
    const fileContent = await fs.readFile(filePath);
    const contentType = CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream';

    const bucket = inferBucket(folder);
    const storage = await getStorage();
    const result = await storage.upload({
      bucket,
      key,
      body: fileContent,
      contentType,
    });

    // URL pública: para S3 reusa el patrón histórico (bucket.s3.region.amazonaws.com).
    // Para Supabase Storage usa signed URL con TTL largo (default 1h).
    const url =
      process.env.STORAGE_BACKEND === 'supabase'
        ? await storage.signedDownloadUrl(bucket, result.key, 3600 * 24)
        : `https://${bucket}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${result.key}`;

    return {
      secure_url: url,
      public_id: result.key,
      resource_type: options.resource_type ?? 'auto',
      format: ext.slice(1),
      bytes: result.size,
    };
  },

  async destroy(publicId) {
    try {
      const storage = await getStorage();
      // publicId es el key completo: "folder/file". Inferir bucket por prefijo.
      const folder = publicId.split('/')[0] ?? 'uploads';
      const bucket = inferBucket(folder);
      await storage.delete(bucket, publicId);
      return { result: 'ok' };
    } catch (err) {
      console.error('storage.destroy:', (err as Error).message);
      return { result: 'not found' };
    }
  },
};

/**
 * Local Storage Implementation (development sin S3 ni Supabase).
 * Se usa cuando STORAGE_BACKEND no está set y AWS_S3_BUCKET tampoco.
 */
const localUploader: CloudinaryUploader = {
  async upload(filePath, options = {}) {
    const uploadsDir = path.join(process.cwd(), 'uploads', options.folder ?? 'documents');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = path.basename(filePath);
    const newFileName = `${Date.now()}-${fileName}`;
    const destPath = path.join(uploadsDir, newFileName);

    await fs.copyFile(filePath, destPath);
    const stats = await fs.stat(destPath);
    const ext = path.extname(fileName);

    return {
      secure_url: `/uploads/${options.folder ?? 'documents'}/${newFileName}`,
      public_id: `${options.folder ?? 'documents'}/${newFileName}`,
      resource_type: options.resource_type ?? 'auto',
      format: ext.slice(1),
      bytes: stats.size,
    };
  },

  async destroy(publicId) {
    const filePath = path.join(process.cwd(), 'uploads', publicId);
    try {
      await fs.unlink(filePath);
      return { result: 'ok' };
    } catch {
      return { result: 'not found' };
    }
  },
};

/**
 * Mapea folder lógico → bucket de storage.
 *
 * Nota: en Supabase los buckets son fijos (creados en migration 0006).
 * En S3 históricamente todo iba a AWS_S3_BUCKET; mantenemos compat.
 */
function inferBucket(folder: string): string {
  if (process.env.STORAGE_BACKEND === 'supabase') {
    if (folder.startsWith('avatar')) return 'user-avatars';
    if (folder.startsWith('backup')) return 'backups';
    return 'legal-documents';
  }
  return process.env.AWS_S3_BUCKET ?? 'legal-rag-documents';
}

/**
 * Get signed URL for private downloads. Funciona en ambos backends.
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const storageType = process.env.STORAGE_BACKEND ?? process.env.STORAGE_TYPE;
  if (!storageType || storageType === 'local') {
    return `/uploads/${key}`;
  }
  const folder = key.split('/')[0] ?? 'uploads';
  const bucket = inferBucket(folder);
  const storage = await getStorage();
  return storage.signedDownloadUrl(bucket, key, expiresIn);
}

// Selección por env var. Default: 's3' (comportamiento histórico).
const STORAGE_TYPE = (process.env.STORAGE_BACKEND ?? process.env.STORAGE_TYPE ?? 'local').toLowerCase();
const selected: CloudinaryUploader =
  STORAGE_TYPE === 's3' || STORAGE_TYPE === 'supabase' ? adapterUploader : localUploader;

export const cloudinary = { uploader: selected };
export default cloudinary;
