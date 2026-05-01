/**
 * Document Summarization Page
 * Main interface for AI-powered document summarization
 *
 * Features:
 * - Document selection and summarization
 * - Configurable summary options (level, language, focus areas)
 * - Key points extraction and display
 * - Multi-document comparison
 * - Summary history tracking
 * - Dark mode support
 * - Responsive layout
 * - Error handling and loading states
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BackToDashboard } from '@/components/BackToDashboard';
import {
  FileText,
  Sparkles,
  History,
  GitCompare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Download,
  FileSearch,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Custom hooks
import {
  useSummarizeDocument,
  useDocumentSummaries,
  useCompareDocuments,
  type SummarizeOptions,
  type DocumentSummary,
  type ComparisonResponse,
} from '@/hooks/useSummarization';
import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';

// Components
import { SummaryCard } from '@/components/summarization/SummaryCard';
import { KeyPointsList } from '@/components/summarization/KeyPointsList';
import { SummaryOptions } from '@/components/summarization/SummaryOptions';
import { StreamingText } from '@/components/StreamingText';

// Error handling utility
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Ocurrió un error. Por favor intenta nuevamente.';
}

// Mock documents for demonstration (replace with actual API call)
const MOCK_DOCUMENTS = [
  { id: 'doc-1', title: 'Contrato de Arrendamiento 2025', type: 'Contrato' },
  { id: 'doc-2', title: 'Código Civil Ecuatoriano - Artículo 1234', type: 'Ley' },
  { id: 'doc-3', title: 'Sentencia Caso López vs. García', type: 'Sentencia' },
  { id: 'doc-4', title: 'Reglamento de Seguridad Laboral', type: 'Reglamento' },
];

/**
 * Main Summarization Page Component
 */
export default function SummarizationPage() {
  // State management
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [summaryOptions, setSummaryOptions] = useState<SummarizeOptions>({
    level: 'standard',
    language: 'es',
    includeKeyPoints: true,
    maxLength: undefined,
    focusAreas: undefined,
  });
  const [currentSummary, setCurrentSummary] = useState<DocumentSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'compare' | 'history'>('generate');
  const [compareDocumentIds, setCompareDocumentIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);
  const [isStreamingMode, setIsStreamingMode] = useState<boolean>(false);

  // React Query hooks
  const summarizeMutation = useSummarizeDocument();
  const { data: documentSummaries, isLoading: isLoadingHistory } = useDocumentSummaries(
    selectedDocumentId || undefined,
    { enabled: !!selectedDocumentId && activeTab === 'history' }
  );
  const compareMutation = useCompareDocuments();

  // Streaming hook
  const {
    content: streamingContent,
    status: streamingStatus,
    error: streamingError,
    metadata: streamingMetadata,
    startStreaming,
    stopStreaming,
    resetState: resetStreamingState,
    isActive: isStreamingActive,
  } = useSummarizationStreaming();

  // Handle document selection
  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setCurrentSummary(null);
    resetStreamingState();
  };

  // Handle summary generation
  const handleGenerateSummary = async () => {
    if (!selectedDocumentId) return;

    // Use streaming mode if enabled
    if (isStreamingMode) {
      resetStreamingState();
      setCurrentSummary(null);
      startStreaming({
        documentId: selectedDocumentId,
        level: summaryOptions.level || 'standard',
        language: summaryOptions.language,
        includeKeyPoints: summaryOptions.includeKeyPoints,
        maxLength: summaryOptions.maxLength,
      });
    } else {
      // Use regular API call
      try {
        const result = await summarizeMutation.mutateAsync({
          documentId: selectedDocumentId,
          options: summaryOptions,
        });
        setCurrentSummary(result);
      } catch (error) {
        console.error('Failed to generate summary:', error);
      }
    }
  };

  // Handle cancel streaming
  const handleCancelStreaming = () => {
    stopStreaming();
  };

  // Toggle streaming mode
  const handleToggleStreamingMode = (checked: boolean) => {
    setIsStreamingMode(checked);
    // Reset states when switching modes
    if (checked) {
      setCurrentSummary(null);
    } else {
      resetStreamingState();
    }
  };

  // Handle document comparison
  const handleCompareDocuments = async () => {
    if (compareDocumentIds.length < 2) return;

    try {
      const result = await compareMutation.mutateAsync({
        documentIds: compareDocumentIds,
        options: {
          language: summaryOptions.language,
          includeRecommendations: true,
        },
      });
      setComparisonResult(result);
    } catch (error) {
      console.error('Failed to compare documents:', error);
    }
  };

  // Handle compare document selection
  const handleToggleCompareDocument = (documentId: string) => {
    setCompareDocumentIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  // Handle download summary
  const handleDownloadSummary = () => {
    if (!currentSummary) return;

    const selectedDoc = MOCK_DOCUMENTS.find((d) => d.id === selectedDocumentId);
    const content = `
RESUMEN DE DOCUMENTO
=====================

Documento: ${selectedDoc?.title || 'Sin título'}
Nivel: ${currentSummary.level}
Idioma: ${currentSummary.language}
Generado: ${new Date(currentSummary.createdAt).toLocaleString('es-EC')}

RESUMEN
-------
${currentSummary.summary}

${currentSummary.keyPoints ? `
PUNTOS CLAVE
------------
${currentSummary.keyPoints.map((kp, idx) => `${idx + 1}. ${kp.text}`).join('\n')}
` : ''}

Estadísticas:
- Palabras: ${currentSummary.wordCount}
- Confianza: ${Math.round((currentSummary.metadata?.confidence || 0) * 100)}%
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resumen-${selectedDoc?.title.replace(/\s+/g, '-').toLowerCase() || 'documento'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get selected document info
  const selectedDocument = MOCK_DOCUMENTS.find((d) => d.id === selectedDocumentId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BackToDashboard />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Resumidor de Documentos
                </h1>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Genera resúmenes inteligentes de documentos legales usando IA avanzada
              </p>
            </div>
            <Badge variant="default" className="dark:bg-blue-600">
              Powered by AI
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px space-x-8" aria-label="Tabs">
              {[
                { id: 'generate', label: 'Generar Resumen', icon: FileText },
                { id: 'compare', label: 'Comparar Documentos', icon: GitCompare },
                { id: 'history', label: 'Historial', icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={cn(
                      'group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
                      isActive
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Generate Tab */}
          {activeTab === 'generate' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Document Selection & Options */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Document Selector */}
                  <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg dark:text-gray-100 flex items-center gap-2">
                        <FileSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Seleccionar Documento
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        Elige el documento que deseas resumir
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {MOCK_DOCUMENTS.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleDocumentSelect(doc.id)}
                          className={cn(
                            'w-full text-left p-4 rounded-lg border-2 transition-all',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                            'dark:focus:ring-offset-gray-800',
                            selectedDocumentId === doc.id
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                {doc.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {doc.type}
                              </p>
                            </div>
                            {selectedDocumentId === doc.id && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Summary Options */}
                  <SummaryOptions
                    options={{
                      level: summaryOptions.level || 'standard',
                      language: summaryOptions.language || 'es',
                      includeKeyPoints: summaryOptions.includeKeyPoints ?? true,
                      includeReferences: false,
                      maxLength: summaryOptions.maxLength,
                      focusAreas: summaryOptions.focusAreas,
                    }}
                    onOptionsChange={(newOptions) => {
                      setSummaryOptions({
                        level: newOptions.level,
                        language: newOptions.language,
                        includeKeyPoints: newOptions.includeKeyPoints,
                        maxLength: newOptions.maxLength,
                        focusAreas: newOptions.focusAreas,
                      });
                    }}
                    disabled={summarizeMutation.isPending || isStreamingActive}
                  />

                  {/* Streaming Mode Toggle */}
                  <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Modo Streaming
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Ver resumen en tiempo real
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={isStreamingMode}
                          onCheckedChange={handleToggleStreamingMode}
                          disabled={summarizeMutation.isPending || isStreamingActive}
                          className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={!selectedDocumentId || summarizeMutation.isPending || isStreamingActive}
                    className="w-full dark:bg-blue-600 dark:hover:bg-blue-700"
                    size="lg"
                  >
                    {(summarizeMutation.isPending || isStreamingActive) ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isStreamingMode ? 'Transmitiendo...' : 'Generando Resumen...'}
                      </>
                    ) : (
                      <>
                        {isStreamingMode ? (
                          <Zap className="mr-2 h-5 w-5" />
                        ) : (
                          <Sparkles className="mr-2 h-5 w-5" />
                        )}
                        {isStreamingMode ? 'Iniciar Streaming' : 'Generar Resumen'}
                      </>
                    )}
                  </Button>

                  {/* Cancel Streaming Button */}
                  {isStreamingActive && (
                    <Button
                      onClick={handleCancelStreaming}
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      size="lg"
                    >
                      <XCircle className="mr-2 h-5 w-5" />
                      Cancelar Streaming
                    </Button>
                  )}

                  {/* Error Display */}
                  {summarizeMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <div className="ml-2">
                        <p className="font-medium">Error al generar resumen</p>
                        <p className="text-sm mt-1">
                          {getErrorMessage(summarizeMutation.error)}
                        </p>
                      </div>
                    </Alert>
                  )}
                </div>

                {/* Right Column - Results */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Streaming Status Alert */}
                  {isStreamingMode && streamingStatus !== 'idle' && (
                    <Alert
                      variant={
                        streamingStatus === 'error'
                          ? 'destructive'
                          : streamingStatus === 'complete'
                          ? 'success'
                          : 'default'
                      }
                      className={cn(
                        streamingStatus === 'connecting' && 'dark:bg-blue-900/20 dark:border-blue-700',
                        streamingStatus === 'streaming' && 'dark:bg-blue-900/20 dark:border-blue-700',
                        streamingStatus === 'complete' && 'dark:bg-green-900/20 dark:border-green-700',
                        streamingStatus === 'error' && 'dark:bg-red-900/20 dark:border-red-700'
                      )}
                    >
                      {streamingStatus === 'connecting' && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                          <div className="ml-2">
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              Conectando al servidor...
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Estableciendo conexión para streaming en tiempo real
                            </p>
                          </div>
                        </>
                      )}
                      {streamingStatus === 'streaming' && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                          <div className="ml-2">
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              Recibiendo resumen en tiempo real...
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              {streamingContent.length > 0
                                ? `${streamingContent.length} caracteres recibidos`
                                : 'Esperando datos del servidor...'}
                            </p>
                          </div>
                        </>
                      )}
                      {streamingStatus === 'complete' && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <div className="ml-2">
                            <p className="font-medium text-green-900 dark:text-green-100">
                              Streaming completado
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              Resumen recibido exitosamente ({streamingContent.length} caracteres)
                            </p>
                          </div>
                        </>
                      )}
                      {streamingStatus === 'error' && (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <div className="ml-2">
                            <p className="font-medium text-red-900 dark:text-red-100">
                              Error en streaming
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              {streamingError || 'Ocurrió un error durante el streaming'}
                            </p>
                          </div>
                        </>
                      )}
                    </Alert>
                  )}

                  {/* Streaming Content Display */}
                  {isStreamingMode && streamingContent && (
                    <Card className="dark:bg-gray-800 dark:border-gray-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg dark:text-gray-100">
                              Resumen en Tiempo Real
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">
                              {selectedDocument?.title}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={streamingStatus === 'streaming' ? 'default' : 'outline'}
                            className={cn(
                              streamingStatus === 'streaming' &&
                                'bg-blue-600 dark:bg-blue-500 animate-pulse'
                            )}
                          >
                            {streamingStatus === 'connecting' && 'Conectando'}
                            {streamingStatus === 'streaming' && 'En vivo'}
                            {streamingStatus === 'complete' && 'Completo'}
                            {streamingStatus === 'error' && 'Error'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <StreamingText
                          content={streamingContent}
                          isStreaming={streamingStatus === 'streaming'}
                          isLoading={streamingStatus === 'connecting'}
                          error={streamingStatus === 'error'}
                          errorMessage={streamingError || undefined}
                          className="min-h-[200px]"
                          typingSpeed={20}
                        />
                        {streamingMetadata && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                              {streamingMetadata.wordCount && (
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  <span>{streamingMetadata.wordCount} palabras</span>
                                </div>
                              )}
                              {streamingMetadata.confidence && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>
                                    {Math.round(streamingMetadata.confidence * 100)}% confianza
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Loading State (Non-streaming) */}
                  {!isStreamingMode && summarizeMutation.isPending && (
                    <Card className="dark:bg-gray-800 dark:border-gray-700">
                      <CardHeader>
                        <Skeleton variant="text" width="60%" height="24px" />
                        <Skeleton variant="text" width="40%" height="16px" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Skeleton variant="text" width="100%" height="16px" />
                        <Skeleton variant="text" width="95%" height="16px" />
                        <Skeleton variant="text" width="88%" height="16px" />
                        <Skeleton variant="text" width="92%" height="16px" />
                      </CardContent>
                    </Card>
                  )}

                  {/* Success State */}
                  {currentSummary && !summarizeMutation.isPending && (
                    <>
                      {/* Success Alert */}
                      <Alert variant="success" className="dark:bg-green-900/20 dark:border-green-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <div className="ml-2">
                          <p className="font-medium text-green-900 dark:text-green-100">
                            Resumen generado exitosamente
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            El resumen se ha creado en {currentSummary.metadata?.processingTime || 0}ms
                          </p>
                        </div>
                      </Alert>

                      {/* Summary Card */}
                      <div className="relative">
                        <SummaryCard
                          summary={{
                            id: currentSummary.id,
                            documentId: currentSummary.documentId,
                            level: currentSummary.level,
                            summary: currentSummary.summary,
                            wordCount: currentSummary.wordCount,
                            originalWordCount: 1500, // Mock value
                            compressionRatio: currentSummary.wordCount / 1500,
                            confidenceScore: currentSummary.metadata?.confidence || 0.85,
                            language: currentSummary.language,
                            generatedAt: currentSummary.createdAt,
                          }}
                          documentName={selectedDocument?.title}
                        />
                        {/* Download Button */}
                        <div className="absolute top-4 right-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownloadSummary}
                            className="dark:hover:bg-gray-700"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </Button>
                        </div>
                      </div>

                      {/* Key Points */}
                      {currentSummary.keyPoints && currentSummary.keyPoints.length > 0 && (
                        <KeyPointsList
                          keyPoints={currentSummary.keyPoints.map((kp) => ({
                            id: kp.id,
                            text: kp.text,
                            category: kp.category,
                            importance: kp.importance > 0.7 ? 'high' : kp.importance > 0.4 ? 'medium' : 'low',
                            references: kp.sourceText ? [kp.sourceText] : undefined,
                          }))}
                          title="Puntos Clave Extraídos"
                          groupByCategory
                          maxVisible={10}
                        />
                      )}
                    </>
                  )}

                  {/* Empty State */}
                  {!currentSummary &&
                    !summarizeMutation.isPending &&
                    !streamingContent &&
                    streamingStatus === 'idle' && (
                      <Card className="dark:bg-gray-800 dark:border-gray-700">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                            {isStreamingMode ? (
                              <Zap className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                            ) : (
                              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No hay resumen generado
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                            Selecciona un documento y configura las opciones para generar un resumen
                            inteligente
                            {isStreamingMode && ' en tiempo real'}
                          </p>
                          {isStreamingMode && (
                            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs text-blue-700 dark:text-blue-300">
                                Modo streaming activado - Ver resumen mientras se genera
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                </div>
              </div>
            </>
          )}

          {/* Compare Tab */}
          {activeTab === 'compare' && (
            <div className="space-y-6">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-gray-100">Comparar Documentos</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    Selecciona 2 o más documentos para comparar (máximo 5)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MOCK_DOCUMENTS.map((doc) => {
                      const isSelected = compareDocumentIds.includes(doc.id);
                      return (
                        <button
                          key={doc.id}
                          onClick={() => handleToggleCompareDocument(doc.id)}
                          disabled={
                            !isSelected && compareDocumentIds.length >= 5
                          }
                          className={cn(
                            'p-4 rounded-lg border-2 text-left transition-all',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            isSelected
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {doc.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {doc.type}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {compareDocumentIds.length} documento(s) seleccionado(s)
                    </div>
                    <Button
                      onClick={handleCompareDocuments}
                      disabled={compareDocumentIds.length < 2 || compareMutation.isPending}
                      className="dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      {compareMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Comparando...
                        </>
                      ) : (
                        <>
                          <GitCompare className="mr-2 h-4 w-4" />
                          Comparar Documentos
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Comparison Results */}
                  {comparisonResult && (
                    <div className="mt-6 space-y-4">
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <div className="ml-2">
                          <p className="font-medium">Comparación completada</p>
                          <p className="text-sm mt-1">
                            Similitud general: {Math.round(comparisonResult.overallSimilarity * 100)}%
                          </p>
                        </div>
                      </Alert>

                      <Card className="dark:bg-gray-800 dark:border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-lg dark:text-gray-100">Resumen de Comparación</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {comparisonResult.summary}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="dark:text-gray-100">Historial de Resúmenes</CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        Resúmenes generados anteriormente
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Refresh history
                      }}
                      className="dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedDocumentId ? (
                    <div className="text-center py-8">
                      <FileSearch className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Selecciona un documento para ver su historial
                      </p>
                    </div>
                  ) : isLoadingHistory ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rectangular" width="100%" height="120px" />
                      ))}
                    </div>
                  ) : documentSummaries && documentSummaries.length > 0 ? (
                    <div className="space-y-4">
                      {documentSummaries.map((summary) => (
                        <button
                          key={summary.id}
                          onClick={() => setCurrentSummary(summary)}
                          className={cn(
                            'w-full text-left p-4 rounded-lg border transition-all',
                            'hover:border-blue-300 dark:hover:border-blue-600',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500',
                            'dark:bg-gray-700 dark:border-gray-600'
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {summary.level}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {summary.language}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                {summary.summary}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {new Date(summary.createdAt).toLocaleString('es-EC')}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No hay resúmenes anteriores para este documento
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
