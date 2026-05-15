/**
 * OpenAI embedding provider (legacy, mantenido para compatibilidad
 * y para fallback si Voyage tiene un outage).
 *
 * text-embedding-3-small: 1536 dims, $0.020/1M tokens.
 * Es el modelo que usó Poweria Legal antes de la migración a Voyage.
 */
import type { EmbeddingProvider } from './types.js';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai-3-small';
  readonly dimensions = 1536;
  readonly dbColumn = 'embedding_v' as const;
  readonly defaultInputType = 'document' as const;

  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const key = opts?.apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY no está definido');
    this.apiKey = key;
    this.model = opts?.model || 'text-embedding-3-small';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const r = await this.generateBatch([text]);
    return r[0];
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const safeTexts = texts.map((t) => (t || '').slice(0, 32000));

    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: safeTexts,
        dimensions: this.dimensions,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`OpenAI ${r.status}: ${err.slice(0, 200)}`);
    }

    const data: any = await r.json();
    return data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((d: any) => d.embedding);
  }
}
