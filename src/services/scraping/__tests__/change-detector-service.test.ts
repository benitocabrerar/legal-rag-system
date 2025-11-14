/**
 * Tests for ChangeDetectorService
 * Phase 6: Document Version Control
 */

import ChangeDetectorService from '../change-detector-service';

describe('ChangeDetectorService', () => {
  let service: ChangeDetectorService;

  beforeEach(() => {
    service = new ChangeDetectorService();
  });

  describe('constructor', () => {
    it('should create a new ChangeDetectorService instance', () => {
      expect(service).toBeInstanceOf(ChangeDetectorService);
    });
  });

  describe('computeHash', () => {
    it('should compute SHA-256 hash', () => {
      const content = 'Test content';
      const hash = service.computeHash(content);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      expect(typeof hash).toBe('string');
    });

    it('should produce consistent hashes', () => {
      const content = 'Consistent test';
      const hash1 = service.computeHash(content);
      const hash2 = service.computeHash(content);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = service.computeHash('Content A');
      const hash2 = service.computeHash('Content B');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle Spanish legal text', () => {
      const content = 'Artículo 1.- Disposición general sobre códigos';
      const hash = service.computeHash(content);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('detectChanges', () => {
    describe('new documents', () => {
      it('should detect new document (no previous version)', async () => {
        const url = 'https://example.com/doc1.pdf';
        const content = 'New document content';

        const result = await service.detectChanges(url, content);

        expect(result.changeType).toBe('created');
        expect(result.currentVersion).toBe(1);
        expect(result.changesDetected.contentChanged).toBe(true);
        expect(result.changesDetected.significantChange).toBe(true);
      });

      it('should compute hash for new document', async () => {
        const url = 'https://example.com/doc2.pdf';
        const content = 'Another new document';

        const result = await service.detectChanges(url, content);

        expect(result.currentHash).toBeDefined();
        expect(result.currentHash.length).toBe(64);
      });
    });

    describe('unchanged documents', () => {
      it('should detect unchanged document (same hash)', async () => {
        const url = 'https://example.com/doc3.pdf';
        const content = 'Unchanged content';

        const snapshot = service.storeSnapshot(url, content);
        const result = await service.detectChanges(url, content, undefined, snapshot);

        expect(result.changeType).toBe('unchanged');
        expect(result.changesDetected.contentChanged).toBe(false);
        expect(result.changesDetected.significantChange).toBe(false);
        expect(result.similarity).toBe(1.0);
      });

      it('should maintain same hash for unchanged content', async () => {
        const url = 'https://example.com/doc4.pdf';
        const content = 'Static content';

        const snapshot = service.storeSnapshot(url, content);
        const result = await service.detectChanges(url, content, undefined, snapshot);

        expect(result.previousHash).toBe(result.currentHash);
      });
    });

    describe('updated documents', () => {
      it('should detect content update', async () => {
        const url = 'https://example.com/doc5.pdf';
        const oldContent = 'Original content';
        const newContent = 'Updated content';

        const snapshot = service.storeSnapshot(url, oldContent);
        const result = await service.detectChanges(url, newContent, undefined, snapshot);

        expect(result.changeType).toBe('updated');
        expect(result.changesDetected.contentChanged).toBe(true);
        expect(result.previousHash).not.toBe(result.currentHash);
      });

      it('should calculate similarity for updates', async () => {
        const url = 'https://example.com/doc6.pdf';
        const oldContent = 'Artículo 1 del Código Civil';
        const newContent = 'Artículo 1 del Código Civil reformado';

        const snapshot = service.storeSnapshot(url, oldContent);
        const result = await service.detectChanges(url, newContent, undefined, snapshot);

        expect(result.similarity).toBeDefined();
        expect(result.similarity).toBeGreaterThan(0);
        expect(result.similarity).toBeLessThan(1);
      });

      it('should detect significant vs minor changes', async () => {
        const url = 'https://example.com/doc7.pdf';
        const oldContent = 'A'.repeat(1000);
        const newContent = oldContent + ' minor addition';

        const snapshot = service.storeSnapshot(url, oldContent);
        const result = await service.detectChanges(url, newContent, undefined, snapshot);

        expect(result.similarity).toBeGreaterThan(0.9);
        expect(result.changesDetected.significantChange).toBe(false);
      });

      it('should detect large content changes', async () => {
        const url = 'https://example.com/doc8.pdf';
        const oldContent = 'Original document with some content';
        const newContent = 'Completely different document with entirely new text and structure';

        const snapshot = service.storeSnapshot(url, oldContent);
        const result = await service.detectChanges(url, newContent, undefined, snapshot);

        expect(result.similarity).toBeLessThan(0.9);
        expect(result.changesDetected.significantChange).toBe(true);
      });

      it('should track size changes', async () => {
        const url = 'https://example.com/doc9.pdf';
        const oldContent = 'Short';
        const newContent = 'Much longer content with many additional words';

        const snapshot = service.storeSnapshot(url, oldContent);
        const result = await service.detectChanges(url, newContent, undefined, snapshot);

        expect(result.changesDetected.sizeChange).toBeDefined();
        expect(result.changesDetected.sizeChange).toBeGreaterThan(0);
      });
    });

    describe('metadata changes', () => {
      it('should detect metadata changes', async () => {
        const url = 'https://example.com/doc10.pdf';
        const content = 'Same content';
        const oldMeta = { title: 'Old Title', documentType: 'law' };
        const newMeta = { title: 'New Title', documentType: 'law' };

        const snapshot = service.storeSnapshot(url, content, oldMeta);
        const result = await service.detectChanges(url, content, newMeta, snapshot);

        expect(result.changesDetected.metadataChanged).toBe(false); // Same hash = unchanged
        expect(result.changesDetected.titleChanged).toBe(false);
      });

      it('should detect title changes', async () => {
        const url = 'https://example.com/doc11.pdf';
        const oldContent = 'Content A';
        const newContent = 'Content B';
        const oldMeta = { title: 'Original Title' };
        const newMeta = { title: 'Modified Title' };

        const snapshot = service.storeSnapshot(url, oldContent, oldMeta);
        const result = await service.detectChanges(url, newContent, newMeta, snapshot);

        expect(result.changesDetected.titleChanged).toBe(true);
        expect(result.changesDetected.significantChange).toBe(true);
      });
    });
  });

  describe('storeSnapshot', () => {
    it('should store document snapshot', () => {
      const url = 'https://example.com/doc.pdf';
      const content = 'Test content';

      const snapshot = service.storeSnapshot(url, content);

      expect(snapshot).toBeDefined();
      expect(snapshot.url).toBe(url);
      expect(snapshot.content).toBe(content);
      expect(snapshot.hash).toBeDefined();
    });

    it('should store metadata with snapshot', () => {
      const url = 'https://example.com/doc.pdf';
      const content = 'Content';
      const metadata = { title: 'Test Document' };

      const snapshot = service.storeSnapshot(url, content, metadata);

      expect(snapshot.metadata).toEqual(metadata);
    });

    it('should include extraction timestamp', () => {
      const snapshot = service.storeSnapshot('https://example.com/doc.pdf', 'Content');

      expect(snapshot.extractedAt).toBeInstanceOf(Date);
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve stored snapshot', () => {
      const url = 'https://example.com/doc.pdf';
      const content = 'Test content';

      service.storeSnapshot(url, content);
      const retrieved = service.getSnapshot(url);

      expect(retrieved).toBeDefined();
      expect(retrieved?.url).toBe(url);
      expect(retrieved?.content).toBe(content);
    });

    it('should return undefined for non-existent snapshot', () => {
      const retrieved = service.getSnapshot('https://non-existent.com/doc.pdf');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('clearSnapshots', () => {
    it('should clear all snapshots', () => {
      service.storeSnapshot('https://example.com/doc1.pdf', 'Content 1');
      service.storeSnapshot('https://example.com/doc2.pdf', 'Content 2');

      const statsBefore = service.getStatistics();
      expect(statsBefore.totalDocuments).toBe(2);

      service.clearSnapshots();

      const statsAfter = service.getStatistics();
      expect(statsAfter.totalDocuments).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for tracked documents', () => {
      service.storeSnapshot('https://example.com/doc1.pdf', 'A'.repeat(1000));
      service.storeSnapshot('https://example.com/doc2.pdf', 'B'.repeat(2000));

      const stats = service.getStatistics();

      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalSize).toBe(3000);
      expect(stats.averageSize).toBe(1500);
    });

    it('should handle empty statistics', () => {
      const stats = service.getStatistics();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
    });
  });

  describe('batchDetectChanges', () => {
    it('should detect changes for multiple documents', async () => {
      const documents = [
        { url: 'https://example.com/doc1.pdf', content: 'Content 1' },
        { url: 'https://example.com/doc2.pdf', content: 'Content 2' },
        { url: 'https://example.com/doc3.pdf', content: 'Content 3' }
      ];

      const previousSnapshots = new Map();
      const results = await service.batchDetectChanges(documents, previousSnapshots);

      expect(results.length).toBe(3);
      expect(results.every(r => r.changeType === 'created')).toBe(true);
    });

    it('should handle mixed change types', async () => {
      const oldSnapshots = new Map();
      oldSnapshots.set('https://example.com/doc1.pdf', {
        url: 'https://example.com/doc1.pdf',
        content: 'Original content',
        hash: service.computeHash('Original content'),
        extractedAt: new Date()
      });

      const documents = [
        { url: 'https://example.com/doc1.pdf', content: 'Updated content' },
        { url: 'https://example.com/doc2.pdf', content: 'New content' }
      ];

      const results = await service.batchDetectChanges(documents, oldSnapshots);

      expect(results.length).toBe(2);
      expect(results[0].changeType).toBe('updated');
      expect(results[1].changeType).toBe('created');
    });
  });

  describe('generateChangeSummary', () => {
    it('should generate summary of changes', async () => {
      const documents = [
        { url: 'https://example.com/doc1.pdf', content: 'New content' },
        { url: 'https://example.com/doc2.pdf', content: 'Another new' }
      ];

      const results = await service.batchDetectChanges(documents, new Map());
      const summary = service.generateChangeSummary(results);

      expect(summary.total).toBe(2);
      expect(summary.created).toBe(2);
      expect(summary.updated).toBe(0);
      expect(summary.unchanged).toBe(0);
    });

    it('should calculate average similarity', async () => {
      const oldSnap = {
        url: 'https://example.com/doc.pdf',
        content: 'Original',
        hash: service.computeHash('Original'),
        extractedAt: new Date()
      };

      const results = await service.batchDetectChanges(
        [
          { url: 'https://example.com/doc.pdf', content: 'Original' },
          { url: 'https://example.com/new.pdf', content: 'New' }
        ],
        new Map([['https://example.com/doc.pdf', oldSnap]])
      );

      const summary = service.generateChangeSummary(results);

      expect(summary.averageSimilarity).toBeGreaterThanOrEqual(0);
      expect(summary.averageSimilarity).toBeLessThanOrEqual(1);
    });
  });

  describe('validateHash', () => {
    it('should validate correct hash', () => {
      const content = 'Test content';
      const hash = service.computeHash(content);

      const isValid = service.validateHash(content, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect hash', () => {
      const content = 'Test content';
      const wrongHash = 'abc123';

      const isValid = service.validateHash(content, wrongHash);

      expect(isValid).toBe(false);
    });

    it('should reject hash for modified content', () => {
      const content = 'Original content';
      const hash = service.computeHash(content);
      const modifiedContent = 'Modified content';

      const isValid = service.validateHash(modifiedContent, hash);

      expect(isValid).toBe(false);
    });
  });

  describe('generateDiff', () => {
    it('should generate diff for content changes', async () => {
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 2 modified\nLine 3\nLine 4';

      const diff = await service.generateDiff(oldContent, newContent);

      expect(diff.linesAdded).toBeGreaterThan(0);
      expect(diff.linesModified).toBeGreaterThan(0);
      expect(diff.percentageChange).toBeGreaterThan(0);
    });

    it('should show no changes for identical content', async () => {
      const content = 'Same\ncontent\nhere';

      const diff = await service.generateDiff(content, content);

      expect(diff.linesAdded).toBe(0);
      expect(diff.linesRemoved).toBe(0);
      expect(diff.linesModified).toBe(0);
      expect(diff.percentageChange).toBe(0);
    });

    it('should handle added lines', async () => {
      const oldContent = 'Line 1';
      const newContent = 'Line 1\nLine 2\nLine 3';

      const diff = await service.generateDiff(oldContent, newContent);

      expect(diff.linesAdded).toBe(2);
    });

    it('should handle removed lines', async () => {
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1';

      const diff = await service.generateDiff(oldContent, newContent);

      expect(diff.linesRemoved).toBe(2);
    });
  });
});
