/**
 * Abstracción de proveedores de embeddings + rerank.
 *
 * Permite cambiar entre OpenAI, Voyage, Cohere, etc. mediante variable
 * de entorno EMBEDDING_PROVIDER sin tocar el código del RAG.
 *
 * Decisión de diseño: NO construimos una UI selector. El cambio de
 * provider es semi-permanente (requiere re-vectorizar todo el corpus),
 * por eso queda como variable de entorno (decisión de devops, no de
 * usuario admin). Cuando aparezca evidencia real de necesitar
 * multi-tenant o cambios frecuentes, se agrega la UI.
 */

export interface EmbeddingProvider {
  /** Nombre canónico (ej. 'voyage-law-2', 'openai-3-small'). */
  readonly name: string;
  /** Dimensiones del vector de salida. */
  readonly dimensions: number;
  /** Columna pgvector donde se guarda el embedding. */
  readonly dbColumn: 'embedding_v' | 'embedding_voyage';
  /** Tipo de input por defecto. */
  readonly defaultInputType: 'document' | 'query';

  /**
   * Genera el embedding de un texto.
   * Para queries, pasar inputType='query' (algunos providers usan prompts distintos).
   */
  generateEmbedding(text: string, inputType?: 'document' | 'query'): Promise<number[]>;

  /**
   * Procesamiento batch. Más eficiente para re-vectorización masiva.
   * Devuelve embeddings en el mismo orden que texts.
   */
  generateBatch(
    texts: string[],
    inputType?: 'document' | 'query'
  ): Promise<number[][]>;
}

export interface RerankerProvider {
  readonly name: string;
  /**
   * Recibe una query + N documentos candidatos, devuelve scores y los
   * top-K reordenados. Crítico para mejorar precisión del RAG sin
   * re-vectorizar.
   */
  rerank(
    query: string,
    documents: string[],
    options?: { topK?: number }
  ): Promise<Array<{ index: number; relevanceScore: number }>>;
}

/** Resuelve el provider activo desde EMBEDDING_PROVIDER. */
export function getEmbeddingProviderName(): string {
  return (process.env.EMBEDDING_PROVIDER || 'voyage-law-2').trim();
}

export function getRerankerProviderName(): string | null {
  const v = (process.env.RERANK_PROVIDER || 'voyage-rerank-2').trim();
  return v && v !== 'none' ? v : null;
}
