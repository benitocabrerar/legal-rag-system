/**
 * Voyage AI embedding + rerank provider.
 *
 * Voyage AI fue adquirido por Anthropic en julio 2024 y es el stack
 * recomendado oficialmente para retrieval con Claude. voyage-law-2
 * está entrenado específicamente en corpus legal (statutes, contracts,
 * case law) y supera a OpenAI 3-small por ~10-15 puntos MTEB en
 * benchmarks legales.
 *
 * - voyage-law-2: 1024 dims, $0.12/1M tokens
 * - voyage-rerank-2: cross-encoder, $0.05/1K queries
 *
 * Rate limits (free tier inicial):
 *   · 200K tokens/min embeddings
 *   · 100K tokens/min rerank
 */

import type { EmbeddingProvider, RerankerProvider } from './types.js';

const VOYAGE_BASE = 'https://api.voyageai.com/v1';

interface VoyageEmbedResponse {
  object: 'list';
  data: Array<{ object: 'embedding'; embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

interface VoyageRerankResponse {
  object: 'list';
  data: Array<{ relevance_score: number; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'voyage-law-2';
  readonly dimensions = 1024;
  readonly dbColumn = 'embedding_voyage' as const;
  readonly defaultInputType = 'document' as const;

  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const key = opts?.apiKey || process.env.VOYAGE_API_KEY;
    if (!key) throw new Error('VOYAGE_API_KEY no está definido');
    this.apiKey = key;
    this.model = opts?.model || 'voyage-law-2';
  }

  async generateEmbedding(text: string, inputType: 'document' | 'query' = 'document'): Promise<number[]> {
    const r = await this.generateBatch([text], inputType);
    return r[0];
  }

  async generateBatch(texts: string[], inputType: 'document' | 'query' = 'document'): Promise<number[][]> {
    // Voyage permite hasta 128 textos por request, 320K tokens total.
    // Truncar cada texto a un margen seguro (4000 chars ≈ 1000 tokens).
    const safeTexts = texts.map((t) => (t || '').slice(0, 16000));

    const r = await this.callWithRetry({
      input: safeTexts,
      model: this.model,
      input_type: inputType,
      truncation: true,
    }, '/embeddings');

    const data = r as VoyageEmbedResponse;
    if (!data.data || data.data.length !== safeTexts.length) {
      throw new Error(`Voyage: expected ${safeTexts.length} embeddings, got ${data.data?.length}`);
    }
    // Ordenar por index para asegurar correspondencia 1:1
    return data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }

  private async callWithRetry(body: any, path: string, attempt = 0): Promise<any> {
    const r = await fetch(`${VOYAGE_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (r.ok) return r.json();

    const err = await r.text();
    // Retry exponencial en rate limits y errores transitorios
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      const waitMs = Math.pow(2, attempt) * 1000;
      await new Promise((res) => setTimeout(res, waitMs));
      return this.callWithRetry(body, path, attempt + 1);
    }
    throw new Error(`Voyage ${path} ${r.status}: ${err.slice(0, 200)}`);
  }
}

export class VoyageRerankerProvider implements RerankerProvider {
  readonly name = 'voyage-rerank-2';

  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const key = opts?.apiKey || process.env.VOYAGE_API_KEY;
    if (!key) throw new Error('VOYAGE_API_KEY no está definido');
    this.apiKey = key;
    this.model = opts?.model || 'rerank-2';
  }

  async rerank(
    query: string,
    documents: string[],
    options?: { topK?: number }
  ): Promise<Array<{ index: number; relevanceScore: number }>> {
    if (documents.length === 0) return [];

    const truncatedDocs = documents.map((d) => (d || '').slice(0, 16000));
    const truncatedQuery = (query || '').slice(0, 2000);

    const r = await fetch(`${VOYAGE_BASE}/rerank`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: truncatedQuery,
        documents: truncatedDocs,
        model: this.model,
        top_k: options?.topK ?? Math.min(20, documents.length),
        truncation: true,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Voyage rerank ${r.status}: ${err.slice(0, 200)}`);
    }

    const data = (await r.json()) as VoyageRerankResponse;
    return data.data
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map((d) => ({ index: d.index, relevanceScore: d.relevance_score }));
  }
}
