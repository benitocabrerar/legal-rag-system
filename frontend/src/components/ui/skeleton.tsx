/**
 * Skeleton Component
 * Provides loading placeholders with WCAG-compliant animations
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of skeleton (CSS value) */
  width?: string | number;
  /** Height of skeleton (CSS value) */
  height?: string | number;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
  /** Accessible label */
  ariaLabel?: string;
}

/**
 * Usage:
 * <Skeleton variant="text" width="200px" height="20px" />
 * <Skeleton variant="circular" width={40} height={40} />
 * <Skeleton variant="rectangular" width="100%" height="300px" />
 */
function Skeleton({
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse',
  className,
  ariaLabel = 'Loading...',
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
      role="status"
      aria-label={ariaLabel}
      {...props}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

// Preset skeleton components for common use cases

const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={cn('space-y-2', className)} role="status" aria-label="Loading text">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '80%' : '100%'}
        height="16px"
      />
    ))}
  </div>
);

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn('border rounded-lg p-4 space-y-4', className)}
    role="status"
    aria-label="Loading card"
  >
    <div className="flex items-start gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height="20px" />
        <Skeleton variant="text" width="40%" height="16px" />
      </div>
    </div>
    <Skeleton variant="rectangular" width="100%" height="200px" />
    <div className="space-y-2">
      <Skeleton variant="text" width="100%" height="16px" />
      <Skeleton variant="text" width="90%" height="16px" />
      <Skeleton variant="text" width="70%" height="16px" />
    </div>
  </div>
);

const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="space-y-2" role="status" aria-label="Loading table">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" width="100%" height="20px" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            variant="text"
            width="100%"
            height="16px"
          />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className,
}) => (
  <div className={cn('space-y-3', className)} role="status" aria-label="Loading list">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" height="16px" />
          <Skeleton variant="text" width="40%" height="14px" />
        </div>
      </div>
    ))}
  </div>
);

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonList };
