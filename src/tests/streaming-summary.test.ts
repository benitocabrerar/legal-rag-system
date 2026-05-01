/**
 * Document Summary Streaming Tests
 *
 * Tests for streaming document summarization functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DocumentSummarizationService } from '../services/ai/document-summarization.service.js';

describe('Document Summary Streaming', () => {
  let prisma: PrismaClient;
  let service: DocumentSummarizationService;
  let testDocumentId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new DocumentSummarizationService(prisma);

    // Create a test document
    const testDoc = await prisma.legalDocument.create({
      data: {
        normTitle: 'Test Legal Document for Streaming',
        normType: 'LEY',
        legalHierarchy: 'LEY_ORDINARIA',
        content: `
          Esta es una ley de prueba para verificar la funcionalidad de streaming.

          Artículo 1. Objeto
          La presente ley tiene como objeto regular el sistema de streaming de documentos legales.

          Artículo 2. Ámbito de Aplicación
          Esta ley se aplica a todos los sistemas de información legal que requieran
          procesamiento en tiempo real de documentos.

          Artículo 3. Derechos de los Usuarios
          Los usuarios tienen derecho a:
          1. Recibir información en tiempo real
          2. Acceder a resúmenes de calidad
          3. Conocer el progreso del procesamiento

          Artículo 4. Obligaciones del Sistema
          El sistema debe garantizar:
          - Respuesta en tiempo real
          - Manejo apropiado de errores
          - Trazabilidad completa del proceso

          Artículo 5. Disposiciones Finales
          Esta ley entra en vigencia desde su publicación.
        `,
        publicationDate: new Date(),
        status: 'ACTIVE',
        sourceUrl: 'https://example.com/test-law',
        ecuadorianSource: 'REGISTRO_OFICIAL',
        officialId: 'TEST-001'
      }
    });

    testDocumentId = testDoc.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testDocumentId) {
      await prisma.legalDocumentSummary.deleteMany({
        where: { legalDocumentId: testDocumentId }
      });
      await prisma.legalDocument.delete({
        where: { id: testDocumentId }
      });
    }
    await prisma.$disconnect();
  });

  describe('streamSummary', () => {
    it('should stream a brief summary', async () => {
      const chunks: any[] = [];
      let textContent = '';
      let hasMetadata = false;
      let hasDone = false;

      for await (const chunk of service.streamSummary(testDocumentId, { level: 'brief' })) {
        chunks.push(chunk);

        if (chunk.type === 'text') {
          textContent += chunk.content;
        } else if (chunk.type === 'metadata') {
          hasMetadata = true;
        } else if (chunk.type === 'done') {
          hasDone = true;
        }
      }

      // Assertions
      expect(chunks.length).toBeGreaterThan(0);
      expect(textContent.length).toBeGreaterThan(0);
      expect(hasMetadata).toBe(true);
      expect(hasDone).toBe(true);

      // Verify no errors
      const errorChunks = chunks.filter(c => c.type === 'error');
      expect(errorChunks.length).toBe(0);
    }, 30000);

    it('should stream a standard summary with key points', async () => {
      const chunks: any[] = [];
      let textContent = '';
      const keyPoints: string[] = [];
      let completionData: any = null;

      for await (const chunk of service.streamSummary(testDocumentId, {
        level: 'standard',
        includeKeyPoints: true
      })) {
        chunks.push(chunk);

        if (chunk.type === 'text') {
          textContent += chunk.content;
        } else if (chunk.type === 'keypoint') {
          keyPoints.push(chunk.content);
        } else if (chunk.type === 'done') {
          completionData = JSON.parse(chunk.content);
        }
      }

      // Assertions
      expect(textContent.length).toBeGreaterThan(50);
      expect(keyPoints.length).toBeGreaterThan(0);
      expect(completionData).toBeDefined();
      expect(completionData.summaryId).toBeDefined();
      expect(completionData.wordCount).toBeGreaterThan(0);
      expect(completionData.processingTime).toBeGreaterThan(0);
    }, 60000);

    it('should stream a detailed summary', async () => {
      const chunks: any[] = [];
      let wordCount = 0;

      for await (const chunk of service.streamSummary(testDocumentId, {
        level: 'detailed',
        language: 'es',
        includeKeyPoints: true
      })) {
        chunks.push(chunk);

        if (chunk.type === 'text' && chunk.metadata?.wordCount) {
          wordCount = chunk.metadata.wordCount;
        }
      }

      // Detailed summaries should have significant content
      expect(wordCount).toBeGreaterThan(100);

      // Should have metadata chunks for progress
      const metadataChunks = chunks.filter(c => c.type === 'metadata');
      expect(metadataChunks.length).toBeGreaterThan(0);
    }, 90000);

    it('should handle cached summaries efficiently', async () => {
      // First, generate a summary (already done in previous tests)
      const firstRun: any[] = [];
      for await (const chunk of service.streamSummary(testDocumentId, { level: 'brief' })) {
        firstRun.push(chunk);
      }

      // Second run should use cache
      const secondRun: any[] = [];
      const startTime = Date.now();

      for await (const chunk of service.streamSummary(testDocumentId, { level: 'brief' })) {
        secondRun.push(chunk);
      }

      const processingTime = Date.now() - startTime;

      // Verify second run used cache
      const doneChunk = secondRun.find(c => c.type === 'done');
      expect(doneChunk).toBeDefined();

      const completionData = JSON.parse(doneChunk.content);
      expect(completionData.cached).toBe(true);

      // Cached version should be faster (though streaming simulation adds delay)
      // Just verify we got chunks
      expect(secondRun.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle invalid document ID gracefully', async () => {
      const chunks: any[] = [];
      let errorOccurred = false;

      for await (const chunk of service.streamSummary('invalid-id-12345', { level: 'brief' })) {
        chunks.push(chunk);

        if (chunk.type === 'error') {
          errorOccurred = true;
          const errorData = JSON.parse(chunk.content);
          expect(errorData.error).toBeDefined();
        }
      }

      expect(errorOccurred).toBe(true);
    });

    it('should include timestamps in all chunks', async () => {
      const chunks: any[] = [];

      for await (const chunk of service.streamSummary(testDocumentId, { level: 'brief' })) {
        chunks.push(chunk);
      }

      // All chunks should have timestamps
      chunks.forEach(chunk => {
        expect(chunk.timestamp).toBeDefined();
        expect(typeof chunk.timestamp).toBe('number');
        expect(chunk.timestamp).toBeGreaterThan(0);
      });
    }, 30000);

    it('should emit proper chunk types', async () => {
      const chunkTypes = new Set<string>();

      for await (const chunk of service.streamSummary(testDocumentId, {
        level: 'standard',
        includeKeyPoints: true
      })) {
        chunkTypes.add(chunk.type);
      }

      // Should have at least metadata, text, and done
      expect(chunkTypes.has('metadata')).toBe(true);
      expect(chunkTypes.has('text')).toBe(true);
      expect(chunkTypes.has('done')).toBe(true);
    }, 60000);
  });

  describe('streamComparison', () => {
    let secondDocumentId: string;

    beforeAll(async () => {
      // Create a second test document
      const secondDoc = await prisma.legalDocument.create({
        data: {
          normTitle: 'Second Test Legal Document',
          normType: 'REGLAMENTO',
          legalHierarchy: 'REGLAMENTO',
          content: `
            Este es un reglamento complementario a la ley de streaming.

            Artículo 1. Reglamentación
            El presente reglamento desarrolla la Ley de Streaming.

            Artículo 2. Requisitos Técnicos
            Los sistemas deben cumplir con estándares de calidad definidos.
          `,
          publicationDate: new Date(),
          status: 'ACTIVE',
          sourceUrl: 'https://example.com/test-regulation',
          ecuadorianSource: 'REGISTRO_OFICIAL',
          officialId: 'TEST-002'
        }
      });

      secondDocumentId = secondDoc.id;
    });

    afterAll(async () => {
      if (secondDocumentId) {
        await prisma.legalDocument.delete({
          where: { id: secondDocumentId }
        });
      }
    });

    it('should stream comparative analysis', async () => {
      const chunks: any[] = [];
      let textContent = '';
      let hasMetadata = false;
      let hasDone = false;

      for await (const chunk of service.streamComparison([testDocumentId, secondDocumentId])) {
        chunks.push(chunk);

        if (chunk.type === 'text') {
          textContent += chunk.content;
        } else if (chunk.type === 'metadata') {
          hasMetadata = true;
        } else if (chunk.type === 'done') {
          hasDone = true;
        }
      }

      // Assertions
      expect(chunks.length).toBeGreaterThan(0);
      expect(textContent.length).toBeGreaterThan(0);
      expect(hasMetadata).toBe(true);
      expect(hasDone).toBe(true);
    }, 90000);

    it('should validate minimum document count', async () => {
      const chunks: any[] = [];
      let errorOccurred = false;

      for await (const chunk of service.streamComparison([testDocumentId])) {
        chunks.push(chunk);

        if (chunk.type === 'error') {
          errorOccurred = true;
          const errorData = JSON.parse(chunk.content);
          expect(errorData.error).toContain('At least 2 documents required');
        }
      }

      expect(errorOccurred).toBe(true);
    });

    it('should handle invalid document IDs in comparison', async () => {
      const chunks: any[] = [];
      let errorOccurred = false;

      for await (const chunk of service.streamComparison([testDocumentId, 'invalid-id'])) {
        chunks.push(chunk);

        if (chunk.type === 'error') {
          errorOccurred = true;
        }
      }

      expect(errorOccurred).toBe(true);
    }, 30000);
  });

  describe('Chunk Format Validation', () => {
    it('should produce valid SSE-compatible chunks', async () => {
      for await (const chunk of service.streamSummary(testDocumentId, { level: 'brief' })) {
        // Verify chunk structure
        expect(chunk).toHaveProperty('type');
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('timestamp');

        // Verify type is valid
        expect(['text', 'metadata', 'error', 'done', 'keypoint', 'reference']).toContain(chunk.type);

        // Verify content is string
        expect(typeof chunk.content).toBe('string');

        // Verify timestamp is valid
        expect(typeof chunk.timestamp).toBe('number');
        expect(chunk.timestamp).toBeGreaterThan(0);

        // If metadata exists, verify it's an object
        if (chunk.metadata) {
          expect(typeof chunk.metadata).toBe('object');
        }
      }
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should stream chunks progressively (not all at once)', async () => {
      const timestamps: number[] = [];

      for await (const chunk of service.streamSummary(testDocumentId, { level: 'standard' })) {
        timestamps.push(chunk.timestamp);
      }

      // Verify chunks arrive over time (not all at the exact same millisecond)
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBeGreaterThan(1);
    }, 60000);

    it('should include progress metadata where applicable', async () => {
      let foundProgressMetadata = false;

      for await (const chunk of service.streamSummary(testDocumentId, { level: 'detailed' })) {
        if (chunk.type === 'text' && chunk.metadata?.wordCount) {
          foundProgressMetadata = true;
          expect(chunk.metadata.wordCount).toBeGreaterThan(0);
        }
      }

      // At least some text chunks should have progress metadata
      expect(foundProgressMetadata).toBe(true);
    }, 90000);
  });
});
