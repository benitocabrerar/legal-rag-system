import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  StorageClass
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import {
  S3Location,
  BackupMetadata,
  StorageStats,
  BackupError
} from '../../types/backup.types';
import { logger } from '../../utils/logger';

export class BackupStorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.BACKUP_S3_BUCKET || 'legal-backups';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  /**
   * Upload backup to S3 with multipart support for large files
   */
  async uploadToS3(
    data: Buffer,
    metadata: BackupMetadata
  ): Promise<S3Location> {
    try {
      const key = this.generateS3Key(metadata);
      const tags = this.generateTags(metadata);

      // Use multipart upload for files > 100MB
      if (data.length > 100 * 1024 * 1024) {
        return await this.multipartUpload(data, key, metadata, tags);
      }

      // Standard upload for smaller files
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: 'application/octet-stream',
        Metadata: {
          backupId: metadata.backupId,
          timestamp: metadata.timestamp.toISOString(),
          type: metadata.type,
          databaseName: metadata.databaseName,
          databaseVersion: metadata.databaseVersion,
          compression: metadata.compression,
          encrypted: String(metadata.encrypted),
          checksum: metadata.checksum
        },
        Tagging: tags,
        ServerSideEncryption: 'AES256',
        StorageClass: this.getStorageClass(metadata)
      });

      const response = await this.s3Client.send(command);

      logger.info('Backup uploaded to S3', {
        bucket: this.bucket,
        key,
        size: data.length,
        versionId: response.VersionId
      });

      return {
        bucket: this.bucket,
        key,
        region: this.region,
        versionId: response.VersionId,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
      };
    } catch (error) {
      logger.error('Failed to upload backup to S3', { error, metadata });
      throw new BackupError(
        'Failed to upload backup to S3',
        'S3_UPLOAD_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Multipart upload for large files
   */
  private async multipartUpload(
    data: Buffer,
    key: string,
    metadata: BackupMetadata,
    tags: string
  ): Promise<S3Location> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: Readable.from(data),
          ContentType: 'application/octet-stream',
          Metadata: {
            backupId: metadata.backupId,
            timestamp: metadata.timestamp.toISOString(),
            type: metadata.type,
            databaseName: metadata.databaseName,
            databaseVersion: metadata.databaseVersion,
            compression: metadata.compression,
            encrypted: String(metadata.encrypted),
            checksum: metadata.checksum
          },
          Tagging: tags,
          ServerSideEncryption: 'AES256',
          StorageClass: this.getStorageClass(metadata)
        },
        queueSize: 4,
        partSize: 20 * 1024 * 1024, // 20MB parts
        leavePartsOnError: false
      });

      // Track upload progress
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          logger.debug('Upload progress', {
            key,
            percentage,
            loaded: progress.loaded,
            total: progress.total
          });
        }
      });

      const response = await upload.done();

      logger.info('Multipart upload completed', {
        bucket: this.bucket,
        key,
        size: data.length,
        versionId: response.VersionId
      });

      return {
        bucket: this.bucket,
        key,
        region: this.region,
        versionId: response.VersionId,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
      };
    } catch (error) {
      logger.error('Multipart upload failed', { error, key });
      throw new BackupError(
        'Multipart upload failed',
        'S3_MULTIPART_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Download backup from S3
   */
  async downloadFromS3(location: S3Location): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
        VersionId: location.versionId
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.info('Backup downloaded from S3', {
        bucket: location.bucket,
        key: location.key,
        size: buffer.length
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to download backup from S3', { error, location });
      throw new BackupError(
        'Failed to download backup from S3',
        'S3_DOWNLOAD_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Delete backup from S3
   */
  async deleteFromS3(location: S3Location): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
        VersionId: location.versionId
      });

      await this.s3Client.send(command);

      logger.info('Backup deleted from S3', {
        bucket: location.bucket,
        key: location.key
      });
    } catch (error) {
      logger.error('Failed to delete backup from S3', { error, location });
      throw new BackupError(
        'Failed to delete backup from S3',
        'S3_DELETE_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Verify S3 object exists
   */
  async verifyObject(location: S3Location): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
        VersionId: location.versionId
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if ((error as any).name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get object metadata
   */
  async getObjectMetadata(location: S3Location): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
        VersionId: location.versionId
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        storageClass: response.StorageClass,
        serverSideEncryption: response.ServerSideEncryption
      };
    } catch (error) {
      logger.error('Failed to get object metadata', { error, location });
      throw new BackupError(
        'Failed to get object metadata',
        'S3_METADATA_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageUsage(): Promise<StorageStats> {
    try {
      let totalSize = BigInt(0);
      let backupCount = 0;
      let oldestBackup: Date | undefined;
      let newestBackup: Date | undefined;
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: 'backups/',
          ContinuationToken: continuationToken
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const object of response.Contents) {
            totalSize += BigInt(object.Size || 0);
            backupCount++;

            if (object.LastModified) {
              if (!oldestBackup || object.LastModified < oldestBackup) {
                oldestBackup = object.LastModified;
              }
              if (!newestBackup || object.LastModified > newestBackup) {
                newestBackup = object.LastModified;
              }
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // Estimate monthly cost (rough calculation)
      const gbStored = Number(totalSize) / (1024 * 1024 * 1024);
      const estimatedMonthlyCost = this.estimateStorageCost(gbStored);

      // Get bucket quota if available (this is bucket-specific)
      const availableSize = BigInt(1024) * BigInt(1024) * BigInt(1024) * BigInt(1024); // 1TB default

      return {
        totalSize: availableSize,
        usedSize: totalSize,
        availableSize: availableSize - totalSize,
        backupCount,
        oldestBackup,
        newestBackup,
        s3Bucket: this.bucket,
        estimatedMonthlyCost
      };
    } catch (error) {
      logger.error('Failed to get storage usage', { error });
      throw new BackupError(
        'Failed to get storage usage',
        'S3_USAGE_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Generate S3 key for backup
   */
  private generateS3Key(metadata: BackupMetadata): string {
    const date = metadata.timestamp.toISOString().split('T')[0];
    const type = metadata.type.toLowerCase();
    return `backups/${date}/${type}/${metadata.backupId}.backup`;
  }

  /**
   * Generate tags for S3 object
   */
  private generateTags(metadata: BackupMetadata): string {
    const tags = [
      `Type=${metadata.type}`,
      `Database=${metadata.databaseName}`,
      `Encrypted=${metadata.encrypted}`,
      `Compression=${metadata.compression}`
    ];

    if (metadata.tags) {
      for (const [key, value] of Object.entries(metadata.tags)) {
        tags.push(`${key}=${value}`);
      }
    }

    return tags.join('&');
  }

  /**
   * Determine storage class based on backup type
   */
  private getStorageClass(metadata: BackupMetadata): StorageClass {
    // Use STANDARD for recent backups, STANDARD_IA for older ones
    // You can customize this based on your retention policy
    if (metadata.type === 'FULL') {
      return StorageClass.STANDARD_IA; // Infrequent Access for full backups
    }
    return StorageClass.STANDARD; // Standard for incremental/differential
  }

  /**
   * Estimate monthly storage cost
   */
  private estimateStorageCost(gbStored: number): number {
    // Rough AWS S3 pricing (adjust based on your region and tier)
    const standardPricePerGB = 0.023; // $0.023 per GB for first 50TB
    const iaPricePerGB = 0.0125; // $0.0125 per GB for Infrequent Access

    // Assume 30% is IA storage
    const standardGB = gbStored * 0.7;
    const iaGB = gbStored * 0.3;

    return (standardGB * standardPricePerGB) + (iaGB * iaPricePerGB);
  }

  /**
   * Stream download for large files
   */
  async streamDownload(
    location: S3Location,
    onChunk: (chunk: Buffer, progress: number) => void
  ): Promise<void> {
    try {
      // Get object size first
      const metadata = await this.getObjectMetadata(location);
      const totalSize = metadata.size;

      const command = new GetObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
        VersionId: location.versionId
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response from S3');
      }

      let downloadedSize = 0;
      for await (const chunk of response.Body as any) {
        downloadedSize += chunk.length;
        const progress = Math.round((downloadedSize / totalSize) * 100);
        onChunk(chunk, progress);
      }

      logger.info('Streaming download completed', {
        bucket: location.bucket,
        key: location.key,
        totalSize
      });
    } catch (error) {
      logger.error('Streaming download failed', { error, location });
      throw new BackupError(
        'Streaming download failed',
        'S3_STREAM_ERROR',
        500,
        error
      );
    }
  }
}