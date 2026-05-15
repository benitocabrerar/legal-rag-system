/**
 * Factory para resolver el embedding/rerank provider activo.
 *
 * Uso:
 *   const provider = getEmbeddingProvider();
 *   const reranker = getRerankerProvider();   // null si está deshabilitado
 *
 * Selección por env vars:
 *   EMBEDDING_PROVIDER=voyage-law-2  (default)
 *   EMBEDDING_PROVIDER=openai-3-small
 *   RERANK_PROVIDER=voyage-rerank-2  (default)
 *   RERANK_PROVIDER=none
 */
import type { EmbeddingProvider, RerankerProvider } from './types.js';
import { VoyageEmbeddingProvider, VoyageRerankerProvider } from './voyage.provider.js';
import { OpenAIEmbeddingProvider } from './openai.provider.js';

let cachedProvider: EmbeddingProvider | null = null;
let cachedReranker: RerankerProvider | null | undefined = undefined;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (cachedProvider) return cachedProvider;
  const name = (process.env.EMBEDDING_PROVIDER || 'voyage-law-2').trim();
  switch (name) {
    case 'voyage-law-2':
    case 'voyage':
      cachedProvider = new VoyageEmbeddingProvider({ model: 'voyage-law-2' });
      break;
    case 'voyage-3':
      cachedProvider = new VoyageEmbeddingProvider({ model: 'voyage-3' });
      break;
    case 'openai-3-small':
    case 'openai':
      cachedProvider = new OpenAIEmbeddingProvider({ model: 'text-embedding-3-small' });
      break;
    case 'openai-3-large':
      cachedProvider = new OpenAIEmbeddingProvider({ model: 'text-embedding-3-large' });
      break;
    default:
      throw new Error(`EMBEDDING_PROVIDER desconocido: ${name}`);
  }
  return cachedProvider;
}

export function getRerankerProvider(): RerankerProvider | null {
  if (cachedReranker !== undefined) return cachedReranker;
  const name = (process.env.RERANK_PROVIDER || 'voyage-rerank-2').trim();
  if (!name || name === 'none') {
    cachedReranker = null;
    return null;
  }
  switch (name) {
    case 'voyage-rerank-2':
    case 'voyage-rerank':
      cachedReranker = new VoyageRerankerProvider({ model: 'rerank-2' });
      break;
    default:
      throw new Error(`RERANK_PROVIDER desconocido: ${name}`);
  }
  return cachedReranker;
}

/** Reset cache — útil para tests y para tomar cambios de env en runtime. */
export function resetProviderCache(): void {
  cachedProvider = null;
  cachedReranker = undefined;
}
