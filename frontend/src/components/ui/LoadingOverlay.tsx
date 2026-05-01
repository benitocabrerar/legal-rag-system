/**
 * LoadingOverlay Component
 * Full-screen or inline loading overlay with spinner and optional message
 */

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingOverlayProps {
  /** Show/hide overlay */
  visible: boolean;
  /** Loading message */
  message?: string;
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Overlay type */
  type?: 'fullscreen' | 'inline';
  /** Blur backdrop */
  blur?: boolean;
  /** z-index value */
  zIndex?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Usage:
 * <LoadingOverlay visible={isLoading} message="Processing..." />
 * <div className="relative">
 *   <LoadingOverlay visible={isLoading} type="inline" />
 *   <YourContent />
 * </div>
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  size = 'md',
  type = 'fullscreen',
  blur = true,
  zIndex = 50,
  className,
}) => {
  if (!visible) return null;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const isFullscreen = type === 'fullscreen';

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        isFullscreen && 'fixed inset-0',
        !isFullscreen && 'absolute inset-0 rounded-lg',
        blur && 'backdrop-blur-sm',
        'bg-white/80 dark:bg-gray-900/80',
        className
      )}
      style={{ zIndex }}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      <div className="flex flex-col items-center gap-4 p-6">
        {/* Spinner */}
        <Loader2
          className={cn(
            'animate-spin text-blue-600 dark:text-blue-400',
            sizeClasses[size]
          )}
          aria-hidden="true"
        />

        {/* Message */}
        {message && (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center max-w-xs">
            {message}
          </p>
        )}

        {/* Screen reader text */}
        <span className="sr-only">{message || 'Loading, please wait...'}</span>
      </div>
    </div>
  );
};

// Spinner component (can be used standalone)
export interface SpinnerProps {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom color class */
  color?: string;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'text-blue-600 dark:text-blue-400',
  className,
  label = 'Loading',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div role="status" aria-label={label}>
      <Loader2
        className={cn('animate-spin', sizeClasses[size], color, className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

// Inline loading component
export interface InlineLoadingProps {
  /** Loading message */
  message?: string;
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message,
  size = 'sm',
  className,
}) => {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="status"
      aria-live="polite"
    >
      <Spinner size={size} label={message || 'Loading'} />
      {message && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
      )}
    </div>
  );
};

// Skeleton loading with overlay (combines both patterns)
export interface SkeletonOverlayProps {
  /** Show/hide overlay */
  visible: boolean;
  /** Number of skeleton lines */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
}

export const SkeletonOverlay: React.FC<SkeletonOverlayProps> = ({
  visible,
  lines = 3,
  className,
}) => {
  if (!visible) return null;

  return (
    <div className={cn('space-y-3 animate-pulse', className)} role="status" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
          style={{ width: i === lines - 1 ? '70%' : '100%' }}
        />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
};

export default LoadingOverlay;
