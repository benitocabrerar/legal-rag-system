/**
 * SummaryCard Component
 * Professional card for displaying document summarization results
 * Features: Dark mode, loading states, copy-to-clipboard, confidence visualization
 */

'use client';

import React, { useState } from 'react';
import { FileText, Copy, Clock, BarChart2, CheckCircle2, Eye, Loader2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StreamingText } from '@/components/StreamingText';
import { cn, formatDateTime } from '@/lib/utils';

export interface SummaryCardProps {
  summary: {
    id: string;
    documentId: string;
    level: 'brief' | 'standard' | 'detailed';
    summary: string;
    wordCount: number;
    originalWordCount: number;
    compressionRatio: number;
    confidenceScore: number;
    language: string;
    generatedAt: string;
  };
  documentName?: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  onViewDocument?: () => void;
  onStreamingComplete?: () => void;
}

/**
 * Usage:
 * <SummaryCard
 *   summary={{
 *     id: '123',
 *     documentId: 'doc-456',
 *     level: 'standard',
 *     summary: 'This document discusses...',
 *     wordCount: 150,
 *     originalWordCount: 1500,
 *     compressionRatio: 0.1,
 *     confidenceScore: 0.92,
 *     language: 'ES',
 *     generatedAt: '2025-12-12T10:30:00Z'
 *   }}
 *   documentName="Contract Agreement 2025"
 *   onViewDocument={() => console.log('View document')}
 * />
 *
 * Streaming mode usage:
 * <SummaryCard
 *   summary={summary}
 *   documentName="Contract Agreement 2025"
 *   isStreaming={true}
 *   streamingContent={partialContent}
 *   onStreamingComplete={() => console.log('Streaming complete')}
 * />
 */
export function SummaryCard({
  summary,
  documentName,
  isLoading = false,
  isStreaming = false,
  streamingContent = '',
  onViewDocument,
  onStreamingComplete,
}: SummaryCardProps) {
  const [copied, setCopied] = useState(false);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      // When streaming, copy the streaming content, otherwise use the summary
      const textToCopy = isStreaming ? streamingContent : summary.summary;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Get badge variant for summary level
  const getLevelBadge = (level: 'brief' | 'standard' | 'detailed') => {
    const configs = {
      brief: { label: 'Brief', variant: 'secondary' as const },
      standard: { label: 'Standard', variant: 'default' as const },
      detailed: { label: 'Detailed', variant: 'success' as const },
    };
    return configs[level];
  };

  // Get language badge variant
  const getLanguageBadge = (lang: string): { label: string; variant: 'outline' | 'secondary' } => {
    const upperLang = lang.toUpperCase();
    return {
      label: upperLang,
      variant: upperLang === 'ES' ? 'outline' : 'secondary',
    };
  };

  // Get confidence score color and label
  const getConfidenceDisplay = (score: number) => {
    if (score >= 0.9) return { color: 'text-green-600 dark:text-green-400', label: 'High' };
    if (score >= 0.7) return { color: 'text-yellow-600 dark:text-yellow-400', label: 'Medium' };
    return { color: 'text-red-600 dark:text-red-400', label: 'Low' };
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="w-full dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton variant="text" width="70%" height="24px" />
              <div className="flex gap-2">
                <Skeleton variant="rectangular" width="80px" height="22px" />
                <Skeleton variant="rectangular" width="50px" height="22px" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton variant="text" width="100%" height="16px" />
            <Skeleton variant="text" width="95%" height="16px" />
            <Skeleton variant="text" width="88%" height="16px" />
            <Skeleton variant="text" width="92%" height="16px" />
            <Skeleton variant="text" width="75%" height="16px" />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <div className="flex justify-between">
            <Skeleton variant="text" width="120px" height="16px" />
            <Skeleton variant="text" width="100px" height="16px" />
          </div>
        </CardFooter>
      </Card>
    );
  }

  const levelBadge = getLevelBadge(summary.level);
  const langBadge = getLanguageBadge(summary.language);
  const confidenceDisplay = getConfidenceDisplay(summary.confidenceScore);
  const compressionPercentage = Math.round((1 - summary.compressionRatio) * 100);

  return (
    <Card className="w-full dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Header with title and badges */}
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">
                  {documentName || `Document ${summary.documentId}`}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={levelBadge.variant} className="dark:bg-opacity-80">
                    {levelBadge.label}
                  </Badge>
                  <Badge variant={langBadge.variant} className="dark:bg-opacity-80">
                    {langBadge.label}
                  </Badge>
                  {isStreaming && (
                    <Badge
                      variant="default"
                      className="bg-green-500 dark:bg-green-600 text-white animate-pulse"
                    >
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Streaming...
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Summary content */}
      <CardContent className="space-y-4">
        {/* Summary text */}
        <div className="relative">
          {isStreaming ? (
            <StreamingText
              content={streamingContent}
              isStreaming={true}
              className="text-sm leading-relaxed"
              onComplete={onStreamingComplete}
              typingSpeed={20}
            />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
              {summary.summary}
            </p>
          )}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Word count */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Word Count</span>
            </div>
            {isStreaming ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {streamingContent.split(/\s+/).filter(Boolean).length.toLocaleString()}
                </p>
                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {summary.wordCount.toLocaleString()}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  / {summary.originalWordCount.toLocaleString()}
                </span>
              </p>
            )}
          </div>

          {/* Compression ratio */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Compression</span>
            </div>
            {isStreaming ? (
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Calculating...
              </p>
            ) : (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {compressionPercentage}%
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  reduction
                </span>
              </p>
            )}
          </div>

          {/* Confidence score */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Confidence</span>
            </div>
            {isStreaming ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"
                    style={{ width: '60%' }}
                    role="progressbar"
                    aria-label="Confidence score: calculating"
                  />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  ...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      summary.confidenceScore >= 0.9 && 'bg-green-500 dark:bg-green-400',
                      summary.confidenceScore >= 0.7 && summary.confidenceScore < 0.9 && 'bg-yellow-500 dark:bg-yellow-400',
                      summary.confidenceScore < 0.7 && 'bg-red-500 dark:bg-red-400'
                    )}
                    style={{ width: `${summary.confidenceScore * 100}%` }}
                    role="progressbar"
                    aria-valuenow={summary.confidenceScore * 100}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Confidence score: ${Math.round(summary.confidenceScore * 100)}%`}
                  />
                </div>
                <span className={cn('text-sm font-medium', confidenceDisplay.color)}>
                  {Math.round(summary.confidenceScore * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Generated timestamp */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{isStreaming ? 'Started' : 'Generated'}</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {isStreaming ? 'In progress...' : formatDateTime(summary.generatedAt)}
            </p>
          </div>
        </div>

        {/* Streaming progress indicator */}
        {isStreaming && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-pulse">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" />
            </div>
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Generating summary in real-time...
            </span>
          </div>
        )}
      </CardContent>

      {/* Footer with actions */}
      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex-1 dark:border-gray-600 dark:hover:bg-gray-700"
          aria-label="Copy summary to clipboard"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Summary
            </>
          )}
        </Button>

        {onViewDocument && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDocument}
            className="flex-1 dark:hover:bg-gray-700"
            aria-label="View source document"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Document
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Export loading skeleton as separate component for flexibility
export function SummaryCardSkeleton() {
  // Create a minimal valid summary object for loading state
  const skeletonSummary: SummaryCardProps['summary'] = {
    id: '',
    documentId: '',
    level: 'standard',
    summary: '',
    wordCount: 0,
    originalWordCount: 0,
    compressionRatio: 0,
    confidenceScore: 0,
    language: '',
    generatedAt: new Date().toISOString(),
  };

  return <SummaryCard summary={skeletonSummary} isLoading={true} />;
}
