'use client';

import { useState } from 'react';
import { BackToDashboard } from '@/components/BackToDashboard';
import { useUnifiedSearch } from '@/hooks/useApiQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  X,
  FileText,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'Todos',
  'Constitución',
  'Ley',
  'Código',
  'Reglamento',
  'Jurisprudencia',
];

const JURISDICTIONS = [
  'Todas',
  'Nacional',
  'Provincial',
  'Municipal',
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    documentType: 'Todos',
    jurisdiction: 'Todas',
    dateFrom: '',
    dateTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const searchMutation = useUnifiedSearch();

  const handleSearch = () => {
    if (!query.trim()) return;

    const searchFilters: any = {};
    if (filters.documentType !== 'Todos') {
      searchFilters.documentType = filters.documentType.toLowerCase();
    }
    if (filters.jurisdiction !== 'Todas') {
      searchFilters.jurisdiction = filters.jurisdiction;
    }
    if (filters.dateFrom) {
      searchFilters.dateFrom = filters.dateFrom;
    }
    if (filters.dateTo) {
      searchFilters.dateTo = filters.dateTo;
    }

    searchMutation.mutate({ query, filters: searchFilters });
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({
      documentType: 'Todos',
      jurisdiction: 'Todas',
      dateFrom: '',
      dateTo: '',
    });
  };

  const results = searchMutation.data?.results || [];
  const totalResults = searchMutation.data?.total || 0;
  const resultsPerPage = 10;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const paginatedResults = results.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-8">
        <BackToDashboard />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Búsqueda Unificada</h1>
          <p className="mt-2 text-gray-600">
            Busca en documentos legales, casos y jurisprudencia
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Buscar documentos, leyes, jurisprudencia..."
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                {searchMutation.isPending ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tipo de Documento
                    </label>
                    <Select
                      value={filters.documentType}
                      onValueChange={(value) =>
                        setFilters({ ...filters, documentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Jurisdicción
                    </label>
                    <Select
                      value={filters.jurisdiction}
                      onValueChange={(value) =>
                        setFilters({ ...filters, jurisdiction: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar jurisdicción" />
                      </SelectTrigger>
                      <SelectContent>
                        {JURISDICTIONS.map((jurisdiction) => (
                          <SelectItem key={jurisdiction} value={jurisdiction}>
                            {jurisdiction}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Fecha Desde
                    </label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters({ ...filters, dateFrom: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Fecha Hasta
                    </label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters({ ...filters, dateTo: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Results List */}
          <div className="lg:col-span-2">
            {searchMutation.isPending ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="mb-2 h-6 w-3/4" />
                      <Skeleton className="mb-3 h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchMutation.isSuccess ? (
              <>
                {/* Results Count */}
                <div className="mb-4 text-sm text-gray-600">
                  {totalResults > 0 ? (
                    <>
                      Mostrando {(currentPage - 1) * resultsPerPage + 1}-
                      {Math.min(currentPage * resultsPerPage, totalResults)} de {totalResults}{' '}
                      resultados
                    </>
                  ) : (
                    'No se encontraron resultados'
                  )}
                </div>

                {/* Results */}
                <div className="space-y-4">
                  {paginatedResults.map((result: any, index: number) => (
                    <Card
                      key={index}
                      className="cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => setSelectedResult(result)}
                    >
                      <CardContent className="p-6">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="mb-1 text-lg font-semibold text-gray-900">
                              {result.title}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {result.category && (
                                <Badge variant="secondary">
                                  <FileText className="mr-1 h-3 w-3" />
                                  {result.category}
                                </Badge>
                              )}
                              {result.jurisdiction && (
                                <Badge variant="outline">
                                  <Tag className="mr-1 h-3 w-3" />
                                  {result.jurisdiction}
                                </Badge>
                              )}
                              {result.date && (
                                <Badge variant="outline">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {new Date(result.date).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">
                              {(result.relevanceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        <p className="mb-3 text-sm text-gray-600 line-clamp-3">
                          {result.excerpt || result.content}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{result.documentType || 'Documento'}</span>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="h-3 w-3" />
                            Ver detalles
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    Comienza una búsqueda
                  </h3>
                  <p className="text-sm text-gray-600">
                    Ingresa términos de búsqueda para encontrar documentos legales relevantes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-base">Vista Previa</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedResult ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 font-semibold text-gray-900">
                        {selectedResult.title}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedResult.category && (
                          <Badge variant="secondary">{selectedResult.category}</Badge>
                        )}
                        {selectedResult.jurisdiction && (
                          <Badge variant="outline">{selectedResult.jurisdiction}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-600">
                        {selectedResult.content || selectedResult.excerpt}
                      </p>
                    </div>

                    {selectedResult.metadata && (
                      <div className="border-t border-gray-200 pt-4">
                        <h5 className="mb-2 text-sm font-semibold text-gray-900">Metadatos</h5>
                        <dl className="space-y-1 text-sm">
                          {Object.entries(selectedResult.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <dt className="text-gray-600">{key}:</dt>
                              <dd className="font-medium text-gray-900">{String(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    <Button className="w-full">Abrir Documento Completo</Button>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      Selecciona un resultado para ver la vista previa
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
