import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { LegalDocumentService } from '../services/legal-document-service';

// Mock Prisma and OpenAI
vi.mock('@prisma/client');
vi.mock('openai');

describe('LegalDocumentService - Phase 1: GPT-4 Metadata Extraction', () => {
  let service: LegalDocumentService;
  let mockPrisma: any;
  let mockOpenAI: any;

  beforeEach(() => {
    // Create mock instances
    mockPrisma = {
      $transaction: vi.fn(),
      legalDocument: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      legalDocumentChunk: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      $queryRaw: vi.fn(),
    };

    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      embeddings: {
        create: vi.fn(),
      },
    };

    service = new LegalDocumentService(mockPrisma as any, mockOpenAI as any);
  });

  describe('extractMetadataWithAI', () => {
    it('should successfully extract metadata from legal document', async () => {
      // Mock successful OpenAI response
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORDINARY_LAW',
              normTitle: 'Ley de Comercio Electrónico',
              legalHierarchy: 'LEYES_ORDINARIAS',
              publicationType: 'ORDINARIO',
              publicationNumber: '577',
              publicationDate: '2002-04-17',
              documentState: 'REFORMADO',
              jurisdiction: 'NACIONAL',
              lastReformDate: '2021-12-21',
              keywords: ['comercio electrónico', 'firma digital', 'mensajes de datos'],
              confidence: 'high',
              reasoning: 'Documento claramente identificado como ley ordinaria de comercio electrónico'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const content = `LEY DE COMERCIO ELECTRÓNICO, FIRMAS ELECTRÓNICAS Y MENSAJES DE DATOS

      Publicado en Registro Oficial 577 de 17 de abril de 2002
      Última reforma: 21-dic-2021

      El Congreso Nacional
      Considerando:
      Que el comercio electrónico...`;

      const result = await service.extractMetadataWithAI(content);

      // Verify the extraction
      expect(result.suggestions.normType).toBe('ORDINARY_LAW');
      expect(result.suggestions.normTitle).toBe('Ley de Comercio Electrónico');
      expect(result.suggestions.legalHierarchy).toBe('LEYES_ORDINARIAS');
      expect(result.suggestions.publicationNumber).toBe('577');
      expect(result.suggestions.publicationDate).toBe('2002-04-17');
      expect(result.confidence).toBe('high');
      expect(result.suggestions.keywords).toContain('comercio electrónico');

      // Verify OpenAI was called with correct configuration
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          temperature: 0.2,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should handle invalid norm type and correct it', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'INVALID_TYPE', // Invalid type
              normTitle: 'Test Document',
              legalHierarchy: 'LEYES_ORDINARIAS',
              confidence: 'medium',
              reasoning: 'Test'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractMetadataWithAI('Test content');

      // Should default to ORDINARY_LAW
      expect(result.suggestions.normType).toBe('ORDINARY_LAW');
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors?.length).toBeGreaterThan(0);
      expect(result.confidence).toBe('medium'); // Confidence adjusted
    });

    it('should retry on rate limit errors', async () => {
      // First call fails with rate limit, second succeeds
      const rateError = new Error('Rate limit exceeded');
      (rateError as any).status = 429;

      const successResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORDINARY_LAW',
              normTitle: 'Test Law',
              legalHierarchy: 'LEYES_ORDINARIAS',
              confidence: 'high',
              reasoning: 'Success after retry'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(rateError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.extractMetadataWithAI('Test content');

      expect(result.suggestions.normType).toBe('ORDINARY_LAW');
      expect(result.confidence).toBe('high');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ETIMEDOUT';

      const successResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORGANIC_LAW',
              normTitle: 'Test Organic Law',
              legalHierarchy: 'LEYES_ORGANICAS',
              confidence: 'high',
              reasoning: 'Success after timeout'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.extractMetadataWithAI('Test content');

      expect(result.suggestions.normType).toBe('ORGANIC_LAW');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should return default metadata after max retries', async () => {
      const rateError = new Error('Rate limit exceeded');
      (rateError as any).status = 429;

      // All attempts fail
      mockOpenAI.chat.completions.create.mockRejectedValue(rateError);

      const result = await service.extractMetadataWithAI('Test content');

      // Should return defaults
      expect(result.suggestions.normType).toBe('ORDINARY_LAW');
      expect(result.suggestions.normTitle).toBe('');
      expect(result.confidence).toBe('low');
      expect(result.reasoning).toContain('Error');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3); // max retries
    });

    it('should validate and correct invalid dates', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORDINARY_LAW',
              normTitle: 'Test Law',
              legalHierarchy: 'LEYES_ORDINARIAS',
              publicationDate: 'invalid-date',
              lastReformDate: '2023/12/25', // Wrong format
              confidence: 'high',
              reasoning: 'Test'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractMetadataWithAI('Test content');

      // Dates should be null due to invalid format
      expect(result.suggestions.publicationDate).toBeNull();
      expect(result.suggestions.lastReformDate).toBeNull();
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors?.length).toBeGreaterThan(0);
    });

    it('should handle empty content', async () => {
      const result = await service.extractMetadataWithAI('');

      expect(result.suggestions.normType).toBe('ORDINARY_LAW');
      expect(result.confidence).toBe('low');
      expect(result.reasoning).toContain('vacío');
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should truncate very long content', async () => {
      const longContent = 'A'.repeat(10000); // 10k characters

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORDINARY_LAW',
              normTitle: 'Test Law',
              legalHierarchy: 'LEYES_ORDINARIAS',
              confidence: 'medium',
              reasoning: 'Truncated content'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await service.extractMetadataWithAI(longContent);

      // Verify content was truncated to 8000 chars
      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const userMessage = call.messages[1].content;
      expect(userMessage.length).toBeLessThanOrEqual(8100); // 8000 + some overhead
      expect(userMessage).toContain('[contenido truncado]');
    });

    it('should ensure normType and legalHierarchy consistency', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORGANIC_CODE',
              normTitle: 'Código Orgánico de Planificación',
              legalHierarchy: 'CODIGOS_ORGANICOS',
              confidence: 'high',
              reasoning: 'Correctly identified organic code'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractMetadataWithAI('Test content');

      expect(result.suggestions.normType).toBe('ORGANIC_CODE');
      expect(result.suggestions.legalHierarchy).toBe('CODIGOS_ORGANICOS');
      expect(result.validationErrors).toBeUndefined(); // No validation errors
    });

    it('should extract keywords as array', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORDINARY_LAW',
              normTitle: 'Test Law',
              legalHierarchy: 'LEYES_ORDINARIAS',
              keywords: ['derecho', 'legal', 'normativa'],
              confidence: 'high',
              reasoning: 'Test'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractMetadataWithAI('Test content');

      expect(Array.isArray(result.suggestions.keywords)).toBe(true);
      expect(result.suggestions.keywords).toHaveLength(3);
      expect(result.suggestions.keywords).toContain('derecho');
    });

    it('should handle non-retryable errors gracefully', async () => {
      const nonRetryableError = new Error('Bad request');
      (nonRetryableError as any).status = 400;

      mockOpenAI.chat.completions.create.mockRejectedValue(nonRetryableError);

      const result = await service.extractMetadataWithAI('Test content');

      expect(result.confidence).toBe('low');
      expect(result.reasoning).toContain('Error');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Performance Tests', () => {
    it('should complete extraction within acceptable time', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              normType: 'ORDINARY_LAW',
              normTitle: 'Test Law',
              legalHierarchy: 'LEYES_ORDINARIAS',
              confidence: 'high',
              reasoning: 'Test'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const start = Date.now();
      await service.extractMetadataWithAI('Test content');
      const duration = Date.now() - start;

      // Should complete in less than 1 second (mocked)
      expect(duration).toBeLessThan(1000);
    });
  });
});
