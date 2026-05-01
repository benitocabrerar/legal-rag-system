/**
 * MetricCard Component
 * Displays a key metric with optional trend indicator and icon
 */

'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  /** Metric title */
  title: string;
  /** Current metric value */
  value: string | number;
  /** Optional description */
  description?: string;
  /** Icon component */
  icon?: LucideIcon;
  /** Icon color */
  iconColor?: string;
  /** Icon background color */
  iconBgColor?: string;
  /** Trend percentage (positive or negative) */
  trend?: number;
  /** Trend label */
  trendLabel?: string;
  /** Loading state */
  loading?: boolean;
  /** Card variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Usage:
 * <MetricCard
 *   title="Total Queries"
 *   value={1234}
 *   icon={Search}
 *   trend={12.5}
 *   trendLabel="vs last month"
 * />
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/20',
  trend,
  trendLabel,
  loading = false,
  variant = 'default',
  onClick,
  className,
}) => {
  const isClickable = !!onClick;
  const isPositiveTrend = trend !== undefined && trend > 0;
  const isNegativeTrend = trend !== undefined && trend < 0;

  // Variant styles
  const variantStyles = {
    default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    primary: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-6 transition-all duration-200',
        variantStyles[variant],
        isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        loading && 'animate-pulse',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={`${title}: ${value}${trend !== undefined ? `, ${isPositiveTrend ? 'up' : 'down'} ${Math.abs(trend)}%` : ''}`}
    >
      <div className="flex items-start justify-between">
        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>

          {loading ? (
            <div className="mt-2 space-y-2">
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              {description && (
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              )}
            </div>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>

              {description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}

              {/* Trend indicator */}
              {trend !== undefined && (
                <div className="mt-2 flex items-center gap-1">
                  {isPositiveTrend ? (
                    <TrendingUp
                      className="w-4 h-4 text-green-600 dark:text-green-400"
                      aria-hidden="true"
                    />
                  ) : isNegativeTrend ? (
                    <TrendingDown
                      className="w-4 h-4 text-red-600 dark:text-red-400"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isPositiveTrend && 'text-green-600 dark:text-green-400',
                      isNegativeTrend && 'text-red-600 dark:text-red-400',
                      !isPositiveTrend && !isNegativeTrend && 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {isPositiveTrend && '+'}
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                  {trendLabel && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {trendLabel}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg',
              iconBgColor
            )}
            aria-hidden="true"
          >
            <Icon className={cn('w-6 h-6', iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
