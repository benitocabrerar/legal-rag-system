/**
 * Backup Compression Service
 *
 * Handles compression and decompression of backup data
 * Supports: GZIP, BROTLI, LZ4
 */

import { promisify } from 'util';
import { gzip, gunzip, brotliCompress, brotliDecompress } from 'zlib';
import { CompressionType, BackupError } from '../../types/backup.types';
import { logger } from '../../utils/logger';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);

interface CompressionResult {
  data: Buffer;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

export class BackupCompressionService {
  /**
   * Compress data using specified compression type
   */
  async compress(
    data: Buffer,
    type: CompressionType
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = data.length;

    try {
      let compressed: Buffer;

      switch (type) {
        case CompressionType.GZIP:
          compressed = await this.compressGzip(data);
          break;

        case CompressionType.BROTLI:
          compressed = await this.compressBrotli(data);
          break;

        case CompressionType.LZ4:
          compressed = await this.compressLZ4(data);
          break;

        case CompressionType.NONE:
          compressed = data;
          break;

        default:
          throw new Error(`Unsupported compression type: ${type}`);
      }

      const size = compressed.length;
      const compressionRatio = originalSize > 0
        ? (originalSize - size) / originalSize * 100
        : 0;

      const duration = Date.now() - startTime;

      logger.info('Compression completed', {
        type,
        originalSize,
        compressedSize: size,
        compressionRatio: compressionRatio.toFixed(2) + '%',
        duration: duration + 'ms'
      });

      return {
        data: compressed,
        size,
        originalSize,
        compressionRatio
      };
    } catch (error) {
      logger.error('Compression failed', { error, type, originalSize });
      throw new BackupError(
        `Compression failed: ${(error as Error).message}`,
        'COMPRESSION_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Decompress data
   */
  async decompress(
    data: Buffer,
    type: CompressionType
  ): Promise<Buffer> {
    try {
      let decompressed: Buffer;

      switch (type) {
        case CompressionType.GZIP:
          decompressed = await this.decompressGzip(data);
          break;

        case CompressionType.BROTLI:
          decompressed = await this.decompressBrotli(data);
          break;

        case CompressionType.LZ4:
          decompressed = await this.decompressLZ4(data);
          break;

        case CompressionType.NONE:
          decompressed = data;
          break;

        default:
          throw new Error(`Unsupported compression type: ${type}`);
      }

      logger.info('Decompression completed', {
        type,
        compressedSize: data.length,
        decompressedSize: decompressed.length
      });

      return decompressed;
    } catch (error) {
      logger.error('Decompression failed', { error, type });
      throw new BackupError(
        `Decompression failed: ${(error as Error).message}`,
        'DECOMPRESSION_ERROR',
        500,
        error
      );
    }
  }

  /**
   * GZIP compression (best compatibility)
   */
  private async compressGzip(data: Buffer): Promise<Buffer> {
    return await gzipAsync(data, {
      level: 6, // Balance between speed and compression
      memLevel: 8,
      strategy: 0 // Default strategy
    });
  }

  /**
   * GZIP decompression
   */
  private async decompressGzip(data: Buffer): Promise<Buffer> {
    return await gunzipAsync(data);
  }

  /**
   * Brotli compression (better compression ratio)
   */
  private async compressBrotli(data: Buffer): Promise<Buffer> {
    return await brotliCompressAsync(data, {
      params: {
        [6]: 6, // BROTLI_PARAM_QUALITY - compression level (0-11)
        [4]: 22 // BROTLI_PARAM_LGWIN - window size (10-24)
      }
    });
  }

  /**
   * Brotli decompression
   */
  private async decompressBrotli(data: Buffer): Promise<Buffer> {
    return await brotliDecompressAsync(data);
  }

  /**
   * LZ4 compression (fastest, lower compression ratio)
   * Note: Requires lz4 npm package
   */
  private async compressLZ4(data: Buffer): Promise<Buffer> {
    // LZ4 implementation would go here
    // For now, fall back to GZIP
    logger.warn('LZ4 compression not implemented, falling back to GZIP');
    return this.compressGzip(data);
  }

  /**
   * LZ4 decompression
   */
  private async decompressLZ4(data: Buffer): Promise<Buffer> {
    // LZ4 implementation would go here
    // For now, fall back to GZIP
    logger.warn('LZ4 decompression not implemented, falling back to GZIP');
    return this.decompressGzip(data);
  }

  /**
   * Get recommended compression type based on data size
   */
  getRecommendedCompressionType(dataSize: number): CompressionType {
    // Small files (< 10MB): GZIP for compatibility
    if (dataSize < 10 * 1024 * 1024) {
      return CompressionType.GZIP;
    }

    // Medium files (10MB - 100MB): Brotli for better compression
    if (dataSize < 100 * 1024 * 1024) {
      return CompressionType.BROTLI;
    }

    // Large files (> 100MB): LZ4 for speed (or GZIP as fallback)
    return CompressionType.GZIP; // Use GZIP until LZ4 is implemented
  }

  /**
   * Estimate compression ratio
   */
  estimateCompressionRatio(
    dataSize: number,
    type: CompressionType
  ): number {
    // Rough estimates based on typical database dump compression
    const estimates: Record<CompressionType, number> = {
      [CompressionType.NONE]: 0,
      [CompressionType.GZIP]: 70, // ~70% compression
      [CompressionType.BROTLI]: 75, // ~75% compression
      [CompressionType.LZ4]: 60  // ~60% compression (faster but less compression)
    };

    return estimates[type] || 0;
  }
}
