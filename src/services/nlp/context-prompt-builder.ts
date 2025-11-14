/**
 * Context Prompt Builder
 * Builds LLM prompts with Ecuadorian legal context
 *
 * @module context-prompt-builder
 * @author Legal RAG System
 * @version 2.0.0
 */

import { Logger } from '../../utils/logger';

import type {
  PromptOptions,
  EntityType,
  QueryIntent
} from '../../types/query-transformation.types';

/**
 * Example for prompt engineering
 */
interface PromptExample {
  input: string;
  output: string;
  explanation?: string;
}

/**
 * Builds optimized prompts for LLM with Ecuadorian legal context
 *
 * @example
 * ```typescript
 * const builder = new ContextPromptBuilder();
 * const prompt = builder.buildTransformationPrompt(
 *   "buscar decretos sobre educación"
 * );
 * ```
 */
export class ContextPromptBuilder {
  private readonly logger = new Logger('ContextPromptBuilder');

  /**
   * Ecuadorian legal system context
   */
  private readonly LEGAL_CONTEXT = `
El sistema legal ecuatoriano se basa en:

1. JERARQUÍA NORMATIVA (de mayor a menor):
  - Constitución de la República (2008)
  - Tratados y Convenios Internacionales
  - Leyes Orgánicas
  - Leyes Ordinarias
  - Normas Regionales y Ordenanzas Distritales
  - Decretos y Reglamentos
  - Ordenanzas
  - Acuerdos y Resoluciones
  - Demás actos normativos

2. JURISDICCIONES:
  - Nacional: Normas de la República del Ecuador
  - Provincial: Gobiernos provinciales
  - Municipal\\Cantonal: Gobiernos municipales
  - Institucional: Entidades gubernamentales específicas

3. TIPOS DE NORMAS:
  - Constitución: Carta Magna del Ecuador
  - Código: Compilación sistemática (Civil, Penal, Trabajo, etc.)
  - Ley Orgánica: Regulan derechos y garantías constitucionales
  - Ley Ordinaria: Normativa general
  - Decreto: Disposición del ejecutivo
  - Reglamento: Desarrollo de leyes
  - Resolución: Decisión administrativa
  - Ordenanza: Normas municipales
  - Acuerdo: Decisión de órganos colegiados

4. FUENTES OFICIALES:
  - Registro Oficial: Publicación oficial del Estado
  - Gacetas: Publicaciones provinciales/municipales
`.trim();

  /**
   * Transformation examples for few-shot learning
   */
  private readonly TRANSFORMATION_EXAMPLES: PromptExample[] = [
    {
      input: 'buscar leyes laborales vigentes del último año',
      output: JSON.stringify({
        normType: ['ley'],
        topics: ['laboral', 'trabajo'],
        documentState: 'vigente',
        dateRange: {
          from: '2024-01-01',
          to: '2025-01-13',
          dateType: 'publication'
        }
      }),
      explanation: 'Identifica tipo de norma (ley), tema (laboral), estado (vigente) y período'
    },
    {
      input: 'decretos presidenciales sobre educación',
      output: JSON.stringify({
        normType: ['decreto'],
        topics: ['educación'],
        jurisdiction: ['nacional'],
        issuingEntities: ['presidencia']
      }),
      explanation: 'Reconoce decretos como normas nacionales del ejecutivo'
    },
    {
      input: 'ordenanzas municipales de Quito sobre tránsito',
      output: JSON.stringify({
        normType: ['ordenanza'],
        jurisdiction: ['municipal'],
        geographicScope: ['Quito'],
        topics: ['tránsito', 'movilidad']
      }),
      explanation: 'Identifica jurisdicción municipal y ámbito geográfico específico'
    },
    {
      input: 'Código Orgánico Integral Penal artículos sobre homicidio',
      output: JSON.stringify({
        normType: ['codigo'],
        keywords: ['COIP', 'Código Orgánico Integral Penal', 'homicidio'],
        topics: ['penal', 'delitos']
      }),
      explanation: 'Reconoce código específico y tema penal'
    },
    {
      input: 'resoluciones del SRI sobre impuestos 2023',
      output: JSON.stringify({
        normType: ['resolucion'],
        issuingEntities: ['SRI', 'Servicio de Rentas Internas'],
        topics: ['tributario', 'impuestos'],
        dateRange: {
          from: '2023-01-01',
          to: '2023-12-31',
          dateType: 'publication'
        }
      }),
      explanation: 'Identifica entidad emisora (SRI) y año específico'
    }
  ];

  /**
   * Entity extraction examples
   */
  private readonly ENTITY_EXAMPLES: PromptExample[] = [
    {
      input: 'Ley Orgánica de Servicio Público',
      output: JSON.stringify({
        entities: [
          {
            type: 'ORGANIC_LAW',
            text: 'Ley Orgánica de Servicio Público',
            normalizedText: 'LEY ORGÁNICA DE SERVICIO PÚBLICO'
          }
        ]
      }),
      explanation: 'Reconoce ley orgánica específica'
    },
    {
      input: 'decretos del Ministerio de Salud sobre COVID',
      output: JSON.stringify({
        entities: [
          {
            type: 'DECREE',
            text: 'decretos'
          },
          {
            type: 'MINISTRY',
            text: 'Ministerio de Salud'
          },
          {
            type: 'LEGAL_TOPIC',
            text: 'COVID'
          }
        ]
      }),
      explanation: 'Extrae tipo de norma, entidad emisora y tema'
    }
  ];

  /**
   * Build prompt for query transformation
   *
   * @param query - Natural language query
   * @param options - Prompt options
   * @returns Formatted prompt for LLM
   *
   * @example
   * ```typescript
   * const prompt = builder.buildTransformationPrompt(
   *   "buscar leyes sobre medio ambiente",
   *   { includeExamples: true, includeContext: true }
   * );
   * ```
   */
  buildTransformationPrompt(
    query: string,
    options: PromptOptions = {}
  ): string {
    const {
      includeExamples = true,
      exampleCount = 3,
      includeContext = true,
      includeChainOfThought = true
    } = options;

    let prompt = '';

    // System role and task description
    prompt += `Eres un experto en el sistema legal ecuatoriano. Tu tarea es transformar consultas en lenguaje natural en filtros estructurados de búsqueda.

`;

    // Add legal context
    if (includeContext) {
      prompt += `# CONTEXTO LEGAL ECUATORIANO\n\n${this.LEGAL_CONTEXT}\n\n`;
    }

    // Add examples
    if (includeExamples) {
      prompt += `# EJEMPLOS DE TRANSFORMACIÓN\n\n`;

      const examples = this.TRANSFORMATION_EXAMPLES.slice(0, exampleCount);
      for (const example of examples) {
        prompt += `Consulta: "${example.input}"\n`;
        prompt += `Filtros: ${example.output}\n`;
        if (example.explanation) {
          prompt += `Explicación: ${example.explanation}\n`;
        }
        prompt += `\n`;
      }
    }

    // Add chain of thought reasoning
    if (includeChainOfThought) {
      prompt += `# PROCESO DE ANÁLISIS\n\n`;
      prompt += `1. Identificar el tipo de norma buscada (ley, decreto, etc.)\n`;
      prompt += `2. Determinar la jurisdicción (nacional, provincial, municipal)\n`;
      prompt += `3. Extraer temas y palabras clave relevantes\n`;
      prompt += `4. Identificar restricciones temporales\n`;
      prompt += `5. Reconocer entidades emisoras\n`;
      prompt += `6. Construir filtros estructurados\n\n`;
    }

    // Add task specification
    prompt += `# TAREA\n\n`;
    prompt += `Transforma la siguiente consulta en filtros de búsqueda estructurados:\n\n`;
    prompt += `Consulta: "${query}"\n\n`;
    prompt += `Responde SOLO con un objeto JSON válido con los siguientes campos posibles:\n`;
    prompt += `- normType: array de tipos de norma\n`;
    prompt += `- jurisdiction: array de jurisdicciones\n`;
    prompt += `- topics: array de temas legales\n`;
    prompt += `- keywords: array de palabras clave\n`;
    prompt += `- dateRange: objeto con from, to, dateType\n`;
    prompt += `- documentState: estado del documento (vigente, derogado, etc.)\n`;
    prompt += `- geographicScope: array de ámbitos geográficos\n`;
    prompt += `- issuingEntities: array de entidades emisoras\n\n`;
    prompt += `JSON:\n`;

    return this.optimizePromptLength(prompt, options.maxTokens);
  }

  /**
   * Build prompt for entity extraction
   *
   * @param text - Text to extract entities from
   * @param options - Prompt options
   * @returns Formatted prompt for LLM
   *
   * @example
   * ```typescript
   * const prompt = builder.buildEntityExtractionPrompt(
   *   "Ley de Educación Superior",
   *   { includeContext: true }
   * );
   * ```
   */
  buildEntityExtractionPrompt(
    text: string,
    options: PromptOptions = {}
  ): string {
    const {
      includeExamples = true,
      exampleCount = 2,
      includeContext = true
    } = options;

    let prompt = '';

    // System role
    prompt += `Eres un experto en identificar entidades legales del sistema ecuatoriano.\n\n`;

    // Add context
    if (includeContext) {
      prompt += `# TIPOS DE ENTIDADES LEGALES\n\n`;
      prompt += `- NORMATIVAS: constitución, ley, decreto, resolución, ordenanza, etc.\n`;
      prompt += `- JURISDICCIONES: nacional, provincial, municipal, institucional\n`;
      prompt += `- ENTIDADES: ministerios, secretarías, agencias gubernamentales\n`;
      prompt += `- TEMAS: áreas del derecho (civil, penal, laboral, etc.)\n`;
      prompt += `- GEOGRAFÍA: provincias, cantones, municipios\n`;
      prompt += `- TEMPORALES: fechas, rangos de tiempo\n\n`;
    }

    // Add examples
    if (includeExamples) {
      prompt += `# EJEMPLOS\n\n`;

      const examples = this.ENTITY_EXAMPLES.slice(0, exampleCount);
      for (const example of examples) {
        prompt += `Texto: "${example.input}"\n`;
        prompt += `Entidades: ${example.output}\n\n`;
      }
    }

    // Task specification
    prompt += `# TAREA\n\n`;
    prompt += `Extrae todas las entidades legales del siguiente texto:\n\n`;
    prompt += `"${text}"\n\n`;
    prompt += `Responde con un array JSON de entidades, cada una con:\n`;
    prompt += `- type: tipo de entidad\n`;
    prompt += `- text: texto original\n`;
    prompt += `- normalizedText: forma normalizada\n\n`;
    prompt += `JSON:\n`;

    return this.optimizePromptLength(prompt, options.maxTokens);
  }

  /**
   * Add Ecuadorian legal context to existing prompt
   *
   * @param prompt - Base prompt
   * @returns Prompt with added context
   *
   * @example
   * ```typescript
   * const enhanced = builder.addEcuadorianContext(basePrompt);
   * ```
   */
  addEcuadorianContext(prompt: string): string {
    // Check if context already added
    if (prompt.includes('sistema legal ecuatoriano')) {
      return prompt;
    }

    const contextSection = `\n\n# CONTEXTO LEGAL ECUATORIANO\n\n${this.LEGAL_CONTEXT}\n\n`;

    // Add context after system message
    const lines = prompt.split('\n');
    const insertIndex = Math.max(
      lines.findIndex(line => line.includes('# EJEMPLOS')),
      lines.findIndex(line => line.includes('# TAREA')),
      3
    );

    lines.splice(insertIndex, 0, contextSection);

    return lines.join('\n');
  }

  /**
   * Optimize prompt length to fit token limit
   *
   * @param prompt - Prompt to optimize
   * @param maxTokens - Maximum tokens (approximate)
   * @returns Optimized prompt
   *
   * @example
   * ```typescript
   * const optimized = builder.optimizePromptLength(prompt, 1000);
   * ```
   */
  optimizePromptLength(prompt: string, maxTokens?: number): string {
    if (!maxTokens) {
      return prompt;
    }

    try {
      // Rough estimate: 1 token ≈ 4 characters
      const estimatedTokens = prompt.length / 4;

      if (estimatedTokens <= maxTokens) {
        return prompt;
      }

      this.logger.warn('Prompt exceeds token limit, optimizing', {
        estimated: estimatedTokens,
        limit: maxTokens
      });

      // Remove examples first
      let optimized = prompt.replace(/# EJEMPLOS[^#]*/g, '');

      // Check again
      if (optimized.length / 4 <= maxTokens) {
        return optimized;
      }

      // Remove context
      optimized = optimized.replace(/# CONTEXTO[^#]*/g, '');

      // Check again
      if (optimized.length / 4 <= maxTokens) {
        return optimized;
      }

      // Truncate to limit
      const targetLength = maxTokens * 4;
      optimized = optimized.substring(0, targetLength);

      this.logger.warn('Prompt severely truncated', {
        original: prompt.length,
        optimized: optimized.length
      });

      return optimized;

    } catch (error) {
      this.logger.error('Prompt optimization failed', { error });
      return prompt;
    }
  }

  /**
   * Build intent classification prompt
   *
   * @param query - Query to classify
   * @param options - Prompt options
   * @returns Formatted prompt
   */
  buildIntentClassificationPrompt(
    query: string,
    options: PromptOptions = {}
  ): string {
    let prompt = `Clasifica la intención de la siguiente consulta legal:\n\n`;
    prompt += `Consulta: "${query}"\n\n`;
    prompt += `Intenciones posibles:\n`;
    prompt += `- FIND_DOCUMENT: Buscar un documento específico\n`;
    prompt += `- FIND_PROVISION: Buscar artículos o disposiciones\n`;
    prompt += `- COMPARE_NORMS: Comparar diferentes normas\n`;
    prompt += `- CHECK_VALIDITY: Verificar vigencia\n`;
    prompt += `- FIND_PRECEDENT: Buscar precedentes\n`;
    prompt += `- UNDERSTAND_PROCEDURE: Entender procedimientos\n`;
    prompt += `- FIND_AUTHORITY: Identificar autoridad competente\n`;
    prompt += `- GENERAL_SEARCH: Búsqueda general\n\n`;
    prompt += `Responde con un JSON: { "intent": "...", "confidence": 0.9 }\n`;

    return this.optimizePromptLength(prompt, options.maxTokens);
  }

  /**
   * Get example transformations
   *
   * @returns Array of transformation examples
   */
  getTransformationExamples(): PromptExample[] {
    return [...this.TRANSFORMATION_EXAMPLES];
  }

  /**
   * Get example entity extractions
   *
   * @returns Array of entity extraction examples
   */
  getEntityExamples(): PromptExample[] {
    return [...this.ENTITY_EXAMPLES];
  }

  /**
   * Add custom example
   *
   * @param example - Custom example
   * @param type - Example type
   */
  addCustomExample(
    example: PromptExample,
    type: 'transformation' | 'entity' = 'transformation'
  ): void {
    if (type === 'transformation') {
      this.TRANSFORMATION_EXAMPLES.push(example);
    } else {
      this.ENTITY_EXAMPLES.push(example);
    }

    this.logger.info('Custom example added', { type, example });
  }
}
