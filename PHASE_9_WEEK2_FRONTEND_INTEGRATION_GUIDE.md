# Frontend Integration Guide: NLP API Routes

**For:** React/Next.js Frontend Developers
**Purpose:** Quick reference for integrating NLP-powered search into the UI

## Table of Contents
1. [TypeScript Types](#typescript-types)
2. [API Client Functions](#api-client-functions)
3. [React Hooks](#react-hooks)
4. [Component Examples](#component-examples)
5. [Error Handling](#error-handling)

---

## TypeScript Types

Add these types to your frontend `types/nlp.types.ts`:

```typescript
/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Search filters from transformation
 */
export interface SearchFilters {
  normType?: string[];
  jurisdiction?: string[];
  legalHierarchy?: string[];
  publicationType?: string[];
  keywords?: string[];
  dateRange?: {
    from: Date;
    to: Date;
    dateType: 'publication' | 'effective' | 'lastModified';
  };
  documentState?: string;
  geographicScope?: string[];
  issuingEntities?: string[];
  topics?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Entity types
 */
export enum EntityType {
  CONSTITUTION = 'CONSTITUTION',
  LAW = 'LAW',
  DECREE = 'DECREE',
  RESOLUTION = 'RESOLUTION',
  ORDINANCE = 'ORDINANCE',
  // ... add others as needed
}

/**
 * Extracted entity
 */
export interface Entity {
  id: string;
  type: EntityType;
  text: string;
  normalizedText: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  source: 'pattern' | 'dictionary' | 'llm' | 'hybrid';
}

/**
 * Transformation result
 */
export interface TransformationResult {
  filters: SearchFilters;
  confidence: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  entities: Entity[];
  intent: {
    primary: string;
    confidence: number;
    secondary: string[];
    suggestions: string[];
  };
  processingTimeMs: number;
  validation: {
    isValid: boolean;
    errors: Array<{
      field: string;
      message: string;
      code: string;
    }>;
    warnings: Array<{
      field: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  refinementSuggestions: string[];
}

/**
 * Search result document
 */
export interface LegalDocument {
  id: string;
  normTitle: string;
  title: string;
  legalHierarchy: string;
  publicationDate: string;
  content: string;
  relevanceScore?: number;
  semanticSimilarity?: number;
}

/**
 * NLP Search result
 */
export interface NLPSearchResult {
  transformation: TransformationResult;
  searchResults: {
    documents: LegalDocument[];
    totalCount: number;
    query: {
      original: string;
      corrected?: string;
      expanded?: string[];
      suggestions?: string;
    };
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    processingTimeMs: number;
  };
  combinedProcessingTimeMs: number;
  recommendations?: string[];
}

/**
 * Legal entity
 */
export interface LegalEntity {
  id: string;
  type: EntityType;
  name: string;
  normalizedName: string;
  synonyms: string[];
  metadata?: {
    officialName: string;
    hierarchyLevel: number;
    status: 'active' | 'repealed' | 'amended' | 'suspended';
  };
}
```

---

## API Client Functions

Create `lib/nlp-api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Transform natural language query to filters
 */
export async function transformQuery(
  query: string
): Promise<ApiResponse<TransformationResult>> {
  const response = await fetch(`${API_BASE}/api/v1/nlp/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  return response.json();
}

/**
 * Execute NLP-powered search (PRIMARY FUNCTION)
 */
export async function nlpSearch(params: {
  query: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';
}): Promise<ApiResponse<NLPSearchResult>> {
  const response = await fetch(`${API_BASE}/api/v1/nlp/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      sortBy: params.sortBy ?? 'relevance',
      enableSpellCheck: true,
      enableQueryExpansion: true,
      enableReranking: true
    })
  });

  return response.json();
}

/**
 * Search entity dictionary for autocomplete
 */
export async function searchEntities(
  query: string,
  limit: number = 10
): Promise<ApiResponse<{ entities: LegalEntity[]; totalCount: number }>> {
  const response = await fetch(
    `${API_BASE}/api/v1/nlp/entities/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );

  return response.json();
}

/**
 * Get entity by ID
 */
export async function getEntity(
  id: string
): Promise<ApiResponse<{ entity: LegalEntity }>> {
  const response = await fetch(`${API_BASE}/api/v1/nlp/entities/${id}`);
  return response.json();
}

/**
 * Validate search filters
 */
export async function validateFilters(
  filters: SearchFilters
): Promise<ApiResponse<{ validation: TransformationResult['validation'] }>> {
  const response = await fetch(`${API_BASE}/api/v1/nlp/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters })
  });

  return response.json();
}
```

---

## React Hooks

Create `hooks/useNLPSearch.ts`:

```typescript
import { useState, useCallback } from 'react';
import { nlpSearch, type NLPSearchResult, type ApiResponse } from '@/lib/nlp-api';

export interface UseNLPSearchOptions {
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'authority';
}

export function useNLPSearch(options: UseNLPSearchOptions = {}) {
  const [data, setData] = useState<NLPSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: string, offset: number = 0) => {
      if (!query.trim()) {
        setError('Query cannot be empty');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await nlpSearch({
          query,
          offset,
          limit: options.limit,
          sortBy: options.sortBy
        });

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Search failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    },
    [options.limit, options.sortBy]
  );

  const loadMore = useCallback(() => {
    if (data && data.searchResults.pagination.hasMore) {
      const nextOffset = data.searchResults.pagination.offset +
                        data.searchResults.pagination.limit;
      search(data.searchResults.query.original, nextOffset);
    }
  }, [data, search]);

  return {
    data,
    loading,
    error,
    search,
    loadMore,
    hasMore: data?.searchResults.pagination.hasMore ?? false
  };
}
```

Create `hooks/useEntitySearch.ts`:

```typescript
import { useState, useEffect } from 'react';
import { searchEntities, type LegalEntity } from '@/lib/nlp-api';

export function useEntitySearch(query: string, enabled: boolean = true) {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || query.length < 2) {
      setEntities([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchEntities(query, 5);
        if (response.success && response.data) {
          setEntities(response.data.entities);
        }
      } catch (error) {
        console.error('Entity search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchTimer);
  }, [query, enabled]);

  return { entities, loading };
}
```

---

## Component Examples

### 1. Basic Search Component

```tsx
'use client';

import { useState } from 'react';
import { useNLPSearch } from '@/hooks/useNLPSearch';

export function LegalSearchBar() {
  const [query, setQuery] = useState('');
  const { data, loading, error, search } = useNLPSearch({ limit: 20 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué norma legal buscas? (ej: leyes laborales vigentes)"
            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Transformation Confidence */}
      {data && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              Confianza de búsqueda:
              <span className={`ml-2 font-semibold ${
                data.transformation.confidence >= 0.8 ? 'text-green-600' :
                data.transformation.confidence >= 0.5 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {(data.transformation.confidence * 100).toFixed(0)}%
              </span>
            </span>
            <span className="text-gray-500">
              {data.searchResults.totalCount} resultados
            </span>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data?.recommendations && data.recommendations.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Sugerencias:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            {data.recommendations.map((rec, i) => (
              <li key={i}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Search Results */}
      {data && (
        <div className="space-y-4">
          {data.searchResults.documents.map((doc) => (
            <div key={doc.id} className="p-4 border rounded-lg hover:shadow-md transition">
              <h3 className="font-semibold text-lg mb-2">{doc.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{doc.legalHierarchy}</p>
              <p className="text-sm text-gray-700 line-clamp-3">{doc.content}</p>
              {doc.relevanceScore && (
                <div className="mt-2 text-xs text-gray-500">
                  Relevancia: {(doc.relevanceScore * 100).toFixed(0)}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Entity Autocomplete Component

```tsx
'use client';

import { useState } from 'react';
import { useEntitySearch } from '@/hooks/useEntitySearch';

export function EntityAutocomplete() {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { entities, loading } = useEntitySearch(query, showSuggestions);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Buscar entidad legal..."
        className="w-full px-4 py-2 border rounded-lg"
      />

      {showSuggestions && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">Buscando...</div>
          ) : entities.length > 0 ? (
            entities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => {
                  setQuery(entity.name);
                  setShowSuggestions(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="font-medium">{entity.name}</div>
                <div className="text-xs text-gray-500">{entity.type}</div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-gray-500">No se encontraron entidades</div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3. Advanced Search with Filters

```tsx
'use client';

import { useState } from 'react';
import { useNLPSearch } from '@/hooks/useNLPSearch';
import type { SearchFilters } from '@/types/nlp.types';

export function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');
  const { data, loading, error, search } = useNLPSearch({ limit: 20, sortBy });

  const handleSearch = () => {
    search(query);
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Describe lo que buscas en lenguaje natural..."
          className="w-full px-4 py-3 border rounded-lg"
        />
      </div>

      {/* Search Options */}
      <div className="flex gap-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date')}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="relevance">Más relevante</option>
          <option value="date">Más reciente</option>
        </select>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Buscar
        </button>
      </div>

      {/* Applied Filters Display */}
      {data?.transformation.filters && (
        <div className="flex flex-wrap gap-2">
          {data.transformation.filters.normType?.map((type) => (
            <span key={type} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {type}
            </span>
          ))}
          {data.transformation.filters.jurisdiction?.map((j) => (
            <span key={j} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {j}
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {data && (
        <div>
          <p className="text-gray-600 mb-4">
            {data.searchResults.totalCount} resultados encontrados
          </p>
          {/* Render documents here */}
        </div>
      )}
    </div>
  );
}
```

---

## Error Handling

```typescript
function handleNLPError(error: string | undefined, statusCode?: number) {
  switch (statusCode) {
    case 400:
      return 'Consulta inválida. Por favor verifica tu búsqueda.';
    case 408:
      return 'La búsqueda está tardando demasiado. Intenta con una consulta más simple.';
    case 422:
      return 'No pudimos entender tu consulta. Intenta reformularla.';
    case 500:
      return 'Error del servidor. Por favor intenta más tarde.';
    default:
      return error || 'Error desconocido';
  }
}

// Usage in component
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
    {handleNLPError(error)}
  </div>
)}
```

---

## Best Practices

1. **Debounce Entity Search:** Prevent excessive API calls during typing
2. **Cache Results:** Use React Query or SWR for result caching
3. **Loading States:** Show skeletons during transformation
4. **Error Boundaries:** Wrap search components in error boundaries
5. **Confidence Indicators:** Show visual confidence levels to users
6. **Recommendations:** Always display refinement suggestions
7. **Analytics:** Track query patterns and transformation success rates

---

## Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

**Ready to build amazing NLP-powered legal search UIs!** 🚀
