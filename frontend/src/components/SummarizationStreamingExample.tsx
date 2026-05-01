'use client';

import React, { useState } from 'react';
import { useSummarizationStreaming } from '@/hooks/useSummarizationStreaming';
import type { SummaryLanguage } from '@/types/summarization.types';

/**
 * Example component demonstrating useSummarizationStreaming hook
 *
 * Features:
 * - Real-time streaming display
 * - Progress indicators
 * - Error handling
 * - Cancellation support
 * - Metadata display
 * - Accessibility support
 */
export function SummarizationStreamingExample() {
  const [documentId, setDocumentId] = useState('');
  const [level, setLevel] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [language, setLanguage] = useState<SummaryLanguage>('es');

  const {
    content,
    status,
    error,
    metadata,
    startStreaming,
    stopStreaming,
    resetState,
    isActive,
  } = useSummarizationStreaming();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentId.trim()) {
      alert('Please enter a document ID');
      return;
    }

    startStreaming({
      documentId: documentId.trim(),
      level,
      language,
      includeKeyPoints: true,
    });
  };

  const handleCancel = () => {
    stopStreaming();
  };

  const handleReset = () => {
    resetState();
    setDocumentId('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Document Summarization Streaming
        </h1>
        <p className="text-gray-600">
          Real-time AI-powered document summarization using Server-Sent Events (SSE)
        </p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
        <div className="space-y-2">
          <label
            htmlFor="documentId"
            className="block text-sm font-medium text-gray-700"
          >
            Document ID
          </label>
          <input
            id="documentId"
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="Enter document ID (e.g., doc_123)"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isActive}
            aria-describedby="documentId-help"
          />
          <p id="documentId-help" className="text-xs text-gray-500">
            Enter the unique identifier of the document you want to summarize
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="level"
              className="block text-sm font-medium text-gray-700"
            >
              Summary Level
            </label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as 'brief' | 'standard' | 'detailed')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isActive}
            >
              <option value="brief">Brief (1-2 paragraphs)</option>
              <option value="standard">Standard (3-5 paragraphs)</option>
              <option value="detailed">Detailed (Comprehensive)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700"
            >
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SummaryLanguage)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isActive}
            >
              <option value="es">Spanish (Español)</option>
              <option value="en">English</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isActive || !documentId.trim()}
            className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            aria-label="Start streaming summarization"
          >
            {isActive ? 'Streaming...' : 'Start Summarization'}
          </button>

          {isActive && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              aria-label="Cancel streaming"
            >
              Cancel
            </button>
          )}

          {(content || error) && !isActive && (
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
              aria-label="Reset form"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Status Indicator */}
      {status !== 'idle' && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                status === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : status === 'streaming'
                  ? 'bg-green-500 animate-pulse'
                  : status === 'complete'
                  ? 'bg-blue-500'
                  : 'bg-red-500'
              }`}
              role="status"
              aria-label={`Status: ${status}`}
            />
            <span className="font-medium text-gray-700 capitalize">
              {status === 'connecting' && 'Connecting to stream...'}
              {status === 'streaming' && 'Receiving summary...'}
              {status === 'complete' && 'Summary complete'}
              {status === 'error' && 'Error occurred'}
            </span>

            {metadata && (
              <div className="ml-auto flex gap-4 text-sm text-gray-600">
                <span>
                  Words: <strong>{metadata.wordCount}</strong>
                </span>
                <span>
                  Compression: <strong>{(metadata.compressionRatio * 100).toFixed(1)}%</strong>
                </span>
                {metadata.processingTime && (
                  <span>
                    Time: <strong>{(metadata.processingTime / 1000).toFixed(2)}s</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <strong className="font-medium">Error:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Content Display */}
      {content && (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-xl font-semibold text-gray-900">Summary</h2>

            {status === 'streaming' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Streaming...</span>
              </div>
            )}

            {status === 'complete' && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(content)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  aria-label="Copy summary to clipboard"
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `summary_${documentId}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  aria-label="Download summary as text file"
                >
                  Download
                </button>
              </div>
            )}
          </div>

          <div
            className="prose max-w-none text-gray-700 leading-relaxed"
            role="region"
            aria-label="Summary content"
            aria-live="polite"
            aria-atomic="false"
          >
            {content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-3">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Streaming indicator at the end */}
          {status === 'streaming' && (
            <div className="flex items-center gap-2 text-gray-500 text-sm pt-2 border-t">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Generating summary...</span>
            </div>
          )}
        </div>
      )}

      {/* Metadata Display (when complete) */}
      {status === 'complete' && metadata && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Word Count</div>
              <div className="text-2xl font-bold text-gray-900">{metadata.wordCount}</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Compression</div>
              <div className="text-2xl font-bold text-gray-900">
                {(metadata.compressionRatio * 100).toFixed(1)}%
              </div>
            </div>
            {metadata.processingTime && (
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Processing Time</div>
                <div className="text-2xl font-bold text-gray-900">
                  {(metadata.processingTime / 1000).toFixed(2)}s
                </div>
              </div>
            )}
            {metadata.model && (
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="text-xs text-gray-500 mb-1">AI Model</div>
                <div className="text-sm font-semibold text-gray-900">{metadata.model}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SummarizationStreamingExample;
