import { supabase, uploadFile, downloadFile, deleteFile, getPublicUrl } from '@/utils/supabase';
import { config } from '@/utils/config';
import { logger } from '@/utils/logger';

// ============================================================================
// Storage Service - Handles file upload/download with Supabase Storage
// ============================================================================

export class StorageService {
  /**
   * Upload a case document to Supabase Storage
   */
  async uploadCaseDocument(
    caseId: string,
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<{ path: string; url: string }> {
    const path = `${caseId}/${Date.now()}-${filename}`;

    try {
      await uploadFile(config.storage.caseDocuments, path, file, {
        contentType,
        upsert: false,
      });

      const url = getPublicUrl(config.storage.caseDocuments, path);

      logger.info(`File uploaded successfully: ${path}`);

      return { path, url };
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download a case document from Supabase Storage
   */
  async downloadCaseDocument(path: string): Promise<Blob> {
    try {
      const blob = await downloadFile(config.storage.caseDocuments, path);
      return blob;
    } catch (error) {
      logger.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a case document from Supabase Storage
   */
  async deleteCaseDocument(path: string): Promise<void> {
    try {
      await deleteFile(config.storage.caseDocuments, path);
      logger.info(`File deleted successfully: ${path}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    userId: string,
    file: Buffer,
    contentType: string
  ): Promise<{ path: string; url: string }> {
    const extension = contentType.split('/')[1];
    const path = `${userId}/avatar.${extension}`;

    try {
      await uploadFile(config.storage.avatars, path, file, {
        contentType,
        upsert: true, // Overwrite if exists
      });

      const url = getPublicUrl(config.storage.avatars, path);

      logger.info(`Avatar uploaded successfully for user: ${userId}`);

      return { path, url };
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      throw new Error(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    return getPublicUrl(bucket, path);
  }

  /**
   * Create storage buckets (run on setup)
   */
  async createBuckets(): Promise<void> {
    try {
      // Create case-documents bucket
      const { error: caseDocsError } = await supabase.storage.createBucket(
        config.storage.caseDocuments,
        {
          public: false, // Private by default
          fileSizeLimit: config.upload.maxFileSizeMB * 1024 * 1024,
        }
      );

      if (caseDocsError && !caseDocsError.message.includes('already exists')) {
        throw caseDocsError;
      }

      // Create avatars bucket
      const { error: avatarsError } = await supabase.storage.createBucket(
        config.storage.avatars,
        {
          public: true, // Public avatars
          fileSizeLimit: 2 * 1024 * 1024, // 2MB limit for avatars
        }
      );

      if (avatarsError && !avatarsError.message.includes('already exists')) {
        throw avatarsError;
      }

      logger.info('Storage buckets created/verified successfully');
    } catch (error) {
      logger.error('Error creating storage buckets:', error);
      throw error;
    }
  }

  /**
   * List files in a case directory
   */
  async listCaseDocuments(caseId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from(config.storage.caseDocuments)
        .list(caseId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
