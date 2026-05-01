/**
 * Abstracción de storage para coexistencia AWS S3 ↔ Supabase Storage durante
 * la migración. Permite cambiar el backend con una env var.
 *
 * Fase 3 del plan: el código de routes/services llama sólo al adapter.
 * Los call sites actuales en `services/backup/backup-storage.service.ts`
 * y `utils/cloudinary.ts` se refactorizan para usar `getStorage()`.
 */
export interface StorageAdapter {
  /** Subir un buffer/stream con un key determinístico. */
  upload(params: UploadParams): Promise<UploadResult>;

  /** Generar URL firmada para descarga directa por el cliente. */
  signedDownloadUrl(bucket: string, key: string, expiresInSec?: number): Promise<string>;

  /** Eliminar un objeto. */
  delete(bucket: string, key: string): Promise<void>;

  /** Listar objetos (paginado). */
  list(bucket: string, prefix?: string, limit?: number): Promise<StorageObject[]>;

  /** Obtener metadata sin descargar el contenido. */
  head(bucket: string, key: string): Promise<StorageObject | null>;
}

export interface UploadParams {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  size: number;
  etag?: string;
  url?: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
}

let _adapter: StorageAdapter | null = null;

/**
 * Selecciona el adapter según `STORAGE_BACKEND` env var.
 * Valores: 's3' (default) | 'supabase'.
 *
 * Durante la migración (Fase 4), se puede activar dual-write con
 * STORAGE_BACKEND='supabase' y STORAGE_DUAL_WRITE_LEGACY='true'.
 */
export async function getStorage(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;

  const backend = (process.env.STORAGE_BACKEND ?? 's3').toLowerCase();

  if (backend === 'supabase') {
    const { SupabaseStorage } = await import('./supabase-storage.js');
    _adapter = new SupabaseStorage();
  } else if (backend === 's3') {
    const { S3StorageAdapter } = await import('./s3-storage.js');
    _adapter = new S3StorageAdapter();
  } else {
    throw new Error(`STORAGE_BACKEND desconocido: ${backend}`);
  }

  return _adapter;
}
