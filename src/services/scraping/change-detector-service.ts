/**
 * Change Detector Service - Detects changes in legal documents
 * Uses hash-based comparison to track document versions over time
 */

import crypto from 'crypto';

export interface DocumentSnapshot {
  url: string;
  content: string;
  hash: string;
  metadata?: any;
  extractedAt: Date;
}

export interface ChangeDetectionResult {
  url: string;
  changeType: 'created' | 'updated' | 'deleted' | 'unchanged';
  previousHash?: string;
  currentHash: string;
  previousVersion?: number;
  currentVersion: number;
  changesDetected: {
    contentChanged: boolean;
    metadataChanged: boolean;
    titleChanged: boolean;
    sizeChange?: number;
    significantChange: boolean;
  };
  similarity?: number;
  detectedAt: Date;
}

export interface VersionHistory {
  url: string;
  versions: Array<{
    version: number;
    hash: string;
    extractedAt: Date;
    changeType: string;
  }>;
  currentVersion: number;
  totalVersions: number;
}

/**
 * ChangeDetectorService - Detects and tracks changes in legal documents
 */
export class ChangeDetectorService {
  private documentHashes: Map<string, DocumentSnapshot> = new Map();

  constructor() {
    // Service ready
  }

  /**
   * Compute SHA-256 hash of document content
   */
  computeHash(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content, 'utf8')
      .digest('hex');
  }

  /**
   * Detect changes in a document compared to its previous version
   */
  async detectChanges(
    url: string,
    currentContent: string,
    currentMetadata?: any,
    previousSnapshot?: DocumentSnapshot
  ): Promise<ChangeDetectionResult> {
    const currentHash = this.computeHash(currentContent);
    const detectedAt = new Date();

    // Case 1: New document (no previous version)
    if (!previousSnapshot) {
      return {
        url,
        changeType: 'created',
        currentHash,
        currentVersion: 1,
        changesDetected: {
          contentChanged: true,
          metadataChanged: false,
          titleChanged: false,
          significantChange: true
        },
        detectedAt
      };
    }

    // Case 2: Document unchanged (same hash)
    if (currentHash === previousSnapshot.hash) {
      return {
        url,
        changeType: 'unchanged',
        previousHash: previousSnapshot.hash,
        currentHash,
        previousVersion: 1, // Would come from database
        currentVersion: 1,
        changesDetected: {
          contentChanged: false,
          metadataChanged: false,
          titleChanged: false,
          significantChange: false
        },
        similarity: 1.0,
        detectedAt
      };
    }

    // Case 3: Document updated (different hash)
    const sizeChange = currentContent.length - previousSnapshot.content.length;
    const similarity = this.calculateSimilarity(previousSnapshot.content, currentContent);

    // Detect metadata changes
    const metadataChanged = this.hasMetadataChanged(
      previousSnapshot.metadata,
      currentMetadata
    );

    const titleChanged = this.hasTitleChanged(
      previousSnapshot.metadata?.title,
      currentMetadata?.title
    );

    // Determine if change is significant (>10% content change or metadata change)
    const significantChange = similarity < 0.9 || metadataChanged || titleChanged;

    return {
      url,
      changeType: 'updated',
      previousHash: previousSnapshot.hash,
      currentHash,
      previousVersion: 1, // Would come from database
      currentVersion: 2,
      changesDetected: {
        contentChanged: true,
        metadataChanged,
        titleChanged,
        sizeChange,
        significantChange
      },
      similarity,
      detectedAt
    };
  }

  /**
   * Calculate content similarity using Levenshtein distance approximation
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // For very large documents, use sampling to improve performance
    if (text1.length > 10000 || text2.length > 10000) {
      text1 = this.sampleText(text1, 5000);
      text2 = this.sampleText(text2, 5000);
    }

    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) {
      return 1.0;
    }

    // Simple word-based similarity for performance
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Sample text evenly for similarity comparison
   */
  private sampleText(text: string, sampleSize: number): string {
    if (text.length <= sampleSize) {
      return text;
    }

    const step = Math.floor(text.length / sampleSize);
    let sample = '';

    for (let i = 0; i < text.length; i += step) {
      sample += text[i];
    }

    return sample;
  }

  /**
   * Check if metadata has changed
   */
  private hasMetadataChanged(oldMeta?: any, newMeta?: any): boolean {
    if (!oldMeta && !newMeta) return false;
    if (!oldMeta || !newMeta) return true;

    // Compare key metadata fields
    const keyFields = [
      'documentType',
      'documentNumber',
      'institution',
      'jurisdiction',
      'legalArea'
    ];

    return keyFields.some(field => {
      const oldValue = oldMeta[field];
      const newValue = newMeta[field];
      return oldValue !== newValue;
    });
  }

  /**
   * Check if title has changed
   */
  private hasTitleChanged(oldTitle?: string, newTitle?: string): boolean {
    if (!oldTitle && !newTitle) return false;
    if (!oldTitle || !newTitle) return true;

    // Normalize titles for comparison
    const normalize = (title: string) =>
      title
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    return normalize(oldTitle) !== normalize(newTitle);
  }

  /**
   * Store document snapshot in memory
   */
  storeSnapshot(url: string, content: string, metadata?: any): DocumentSnapshot {
    const snapshot: DocumentSnapshot = {
      url,
      content,
      hash: this.computeHash(content),
      metadata,
      extractedAt: new Date()
    };

    this.documentHashes.set(url, snapshot);
    return snapshot;
  }

  /**
   * Get document snapshot from memory
   */
  getSnapshot(url: string): DocumentSnapshot | undefined {
    return this.documentHashes.get(url);
  }

  /**
   * Clear all stored snapshots
   */
  clearSnapshots(): void {
    this.documentHashes.clear();
  }

  /**
   * Get statistics about tracked documents
   */
  getStatistics(): {
    totalDocuments: number;
    totalSize: number;
    averageSize: number;
  } {
    const snapshots = Array.from(this.documentHashes.values());

    const totalSize = snapshots.reduce(
      (sum, snapshot) => sum + snapshot.content.length,
      0
    );

    return {
      totalDocuments: snapshots.length,
      totalSize,
      averageSize: snapshots.length > 0 ? Math.floor(totalSize / snapshots.length) : 0
    };
  }

  /**
   * Batch detect changes for multiple documents
   */
  async batchDetectChanges(
    documents: Array<{
      url: string;
      content: string;
      metadata?: any;
    }>,
    previousSnapshots: Map<string, DocumentSnapshot>
  ): Promise<ChangeDetectionResult[]> {
    const results: ChangeDetectionResult[] = [];

    for (const doc of documents) {
      const previousSnapshot = previousSnapshots.get(doc.url);
      const result = await this.detectChanges(
        doc.url,
        doc.content,
        doc.metadata,
        previousSnapshot
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Generate change summary report
   */
  generateChangeSummary(results: ChangeDetectionResult[]): {
    total: number;
    created: number;
    updated: number;
    unchanged: number;
    deleted: number;
    significantChanges: number;
    averageSimilarity: number;
  } {
    const summary = {
      total: results.length,
      created: 0,
      updated: 0,
      unchanged: 0,
      deleted: 0,
      significantChanges: 0,
      averageSimilarity: 0
    };

    let totalSimilarity = 0;
    let similarityCount = 0;

    for (const result of results) {
      switch (result.changeType) {
        case 'created':
          summary.created++;
          break;
        case 'updated':
          summary.updated++;
          break;
        case 'unchanged':
          summary.unchanged++;
          break;
        case 'deleted':
          summary.deleted++;
          break;
      }

      if (result.changesDetected.significantChange) {
        summary.significantChanges++;
      }

      if (result.similarity !== undefined) {
        totalSimilarity += result.similarity;
        similarityCount++;
      }
    }

    summary.averageSimilarity =
      similarityCount > 0 ? totalSimilarity / similarityCount : 0;

    return summary;
  }

  /**
   * Validate document hash
   */
  validateHash(content: string, expectedHash: string): boolean {
    const actualHash = this.computeHash(content);
    return actualHash === expectedHash;
  }

  /**
   * Compare two document versions and generate diff
   */
  async generateDiff(
    oldContent: string,
    newContent: string
  ): Promise<{
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    percentageChange: number;
  }> {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let added = 0;
    let removed = 0;
    let modified = 0;

    // Simple line-by-line comparison
    const maxLength = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (!oldLine && newLine) {
        added++;
      } else if (oldLine && !newLine) {
        removed++;
      } else if (oldLine !== newLine) {
        modified++;
      }
    }

    const totalLines = Math.max(oldLines.length, newLines.length, 1);
    const changedLines = added + removed + modified;
    const percentageChange = (changedLines / totalLines) * 100;

    return {
      linesAdded: added,
      linesRemoved: removed,
      linesModified: modified,
      percentageChange
    };
  }
}

export default ChangeDetectorService;
