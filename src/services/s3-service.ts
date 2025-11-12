/**
 * S3 Service - Manages file uploads/downloads to AWS S3
 *
 * This service handles all interactions with AWS S3 for storing and retrieving
 * legal document PDF files.
 *
 * Features:
 * - Upload PDF files to S3
 * - Generate presigned URLs for secure file access
 * - Delete files from S3
 * - Automatic file path generation
 *
 * @module S3Service
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  size: number;
}

export interface DownloadUrlResult {
  url: string;
  expiresIn: number;
}

// ============================================================================
// S3 SERVICE CLASS
// ============================================================================

export class S3Service {
  private client: S3Client;
  private bucket: string;

  /**
   * Initialize S3 Service
   *
   * @param bucket - S3 bucket name (defaults to env variable)
   * @param region - AWS region (defaults to env variable)
   */
  constructor(
    bucket?: string,
    region?: string
  ) {
    // Validate environment variables
    const awsRegion = region || process.env.AWS_REGION;
    const awsBucket = bucket || process.env.AWS_S3_BUCKET;

    if (!awsRegion) {
      throw new Error('AWS_REGION environment variable is required');
    }

    if (!awsBucket) {
      throw new Error('AWS_S3_BUCKET environment variable is required');
    }

    // Initialize S3 client
    this.client = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucket = awsBucket;
  }

  /**
   * Generate S3 key for a legal document
   *
   * @param documentId - Unique document identifier
   * @param filename - Original filename
   * @returns S3 key path
   */
  private generateKey(documentId: string, filename: string): string {
    // Sanitize filename (remove special characters, keep extension)
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();

    return `legal-documents/${documentId}/${timestamp}_${sanitized}`;
  }

  /**
   * Upload a PDF file to S3
   *
   * @param documentId - Unique document identifier
   * @param filename - Original filename
   * @param fileBuffer - File content as Buffer
   * @param metadata - Optional metadata to attach to file
   * @returns Upload result with S3 key and URL
   */
  async uploadFile(
    documentId: string,
    filename: string,
    fileBuffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      const key = this.generateKey(documentId, filename);

      const params: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'application/pdf',
        Metadata: metadata || {},
        // Server-side encryption
        ServerSideEncryption: 'AES256',
        // Cache control
        CacheControl: 'max-age=31536000', // 1 year
      };

      const command = new PutObjectCommand(params);
      await this.client.send(command);

      return {
        key,
        bucket: this.bucket,
        url: `s3://${this.bucket}/${key}`,
        size: fileBuffer.length,
      };
    } catch (error: any) {
      console.error('S3 Upload Error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for downloading a file
   *
   * Presigned URLs allow temporary access to private S3 objects.
   * The URL expires after the specified time.
   *
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @param filename - Optional filename for download (Content-Disposition header)
   * @returns Presigned URL and expiration time
   */
  async getDownloadUrl(
    key: string,
    expiresIn: number = 3600,
    filename?: string
  ): Promise<DownloadUrlResult> {
    try {
      const params: any = {
        Bucket: this.bucket,
        Key: key,
      };

      // Set Content-Disposition for download with specific filename
      if (filename) {
        params.ResponseContentDisposition = `inline; filename="${filename}"`;
      }

      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(this.client, command, { expiresIn });

      return {
        url,
        expiresIn,
      };
    } catch (error: any) {
      console.error('S3 Get URL Error:', error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   *
   * @param key - S3 object key
   * @returns true if deleted successfully
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      console.error('S3 Delete Error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in S3
   *
   * @param key - S3 object key
   * @returns true if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      console.error('S3 Head Object Error:', error);
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  /**
   * Get file metadata from S3
   *
   * @param key - S3 object key
   * @returns File metadata (size, content-type, last-modified, etc.)
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata: Record<string, string>;
  } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/pdf',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
      };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return null;
      }
      console.error('S3 Get Metadata Error:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let s3ServiceInstance: S3Service | null = null;

/**
 * Get singleton instance of S3Service
 *
 * @returns S3Service instance
 */
export function getS3Service(): S3Service {
  if (!s3ServiceInstance) {
    s3ServiceInstance = new S3Service();
  }
  return s3ServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default S3Service;
