/**
 * TrendChart Component
 * Displays trend data with comparison and percentage change indicators
 */

'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnalyticsChart, AnalyticsDataPoint } from './AnalyticsChart';

export interface TrendChartProps {
  /** Chart data points */
  data: AnalyticsDataPoint[];
  /** Chart title */
  title: string;
  /** Current value */
  currentValue: number;
  /** Previous period value for comparison */
  previousValue: number;
  /** Period label (e.g., "vs last week") */
  periodLabel?: string;
  /** Chart type */
  chartType?: 'line' | 'bar' | 'area';
  /** Primary color */
  color?: string;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
}

/**
 * Usage:
 * <TrendChart
 *   data={weeklyData}
 *   title="Weekly Queries"
 *   currentValue={1250}
 *   previousValue={980}
 *   periodLabel="vs last week"
 * />
 */
export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  currentValue,
  previousValue,
  periodLabel = 'vs previous period',
  chartType = 'area',
  color = '#3b82f6',
  loading = false,
  error,
}) => {
  // Calculate percentage change
  const percentageChange =
    previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  const isPositive = percentageChange > 0;
  const isNegative = percentageChange < 0;
  const isNeutral = percentageChange === 0;

  // Format percentage
  const formattedPercentage = Math.abs(percentageChange).toFixed(1);

  // Trend icon and color
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColor = isPositive
    ? 'text-green-600 dark:text-green-400'
    : isNegative
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-600 dark:text-gray-400';

  const trendBgColor = isPositive
    ? 'bg-green-50 dark:bg-green-900/20'
    : isNegative
    ? 'bg-red-50 dark:bg-red-900/20'
    : 'bg-gray-50 dark:bg-gray-800';

  return (
    <div className="w-full space-y-4">
      {/* Header with trend indicator */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {currentValue.toLocaleString()}
          </p>
        </div>

        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${trendBgColor}`}
          role="status"
          aria-label={`${isPositive ? 'Increase' : isNegative ? 'Decrease' : 'No change'} of ${formattedPercentage}% ${periodLabel}`}
        >
          <TrendIcon className={`w-4 h-4 ${trendColor}`} aria-hidden="true" />
          <span className={`text-sm font-semibold ${trendColor}`}>
            {isPositive && '+'}
            {formattedPercentage}%
          </span>
        </div>
      </div>

      {/* Period comparison */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">{previousValue.toLocaleString()}</span>{' '}
        {periodLabel}
      </p>

      {/* Chart */}
      <AnalyticsChart
        data={data}
        type={chartType}
        title={title}
        color={color}
        height={250}
        showGrid={true}
        showLegend={false}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default TrendChart;
