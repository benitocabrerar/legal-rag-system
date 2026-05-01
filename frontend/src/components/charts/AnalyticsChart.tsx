/**
 * AnalyticsChart Component
 * Displays analytics data using Recharts with full accessibility
 */

'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useTranslation } from '@/lib/i18n';

export type ChartType = 'line' | 'bar' | 'area';

export interface AnalyticsDataPoint {
  date: string;
  value: number;
  label?: string;
  secondaryValue?: number;
}

export interface AnalyticsChartProps {
  /** Chart data points */
  data: AnalyticsDataPoint[];
  /** Type of chart to display */
  type?: ChartType;
  /** Primary data key */
  dataKey?: string;
  /** Secondary data key (for comparison) */
  secondaryDataKey?: string;
  /** Chart title for accessibility */
  title?: string;
  /** Primary color */
  color?: string;
  /** Secondary color */
  secondaryColor?: string;
  /** Chart height in pixels */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Custom X-axis label */
  xAxisLabel?: string;
  /** Custom Y-axis label */
  yAxisLabel?: string;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
}

/**
 * Usage:
 * <AnalyticsChart
 *   data={queryVolumeData}
 *   type="line"
 *   title="Query volume over time"
 *   color="#3b82f6"
 * />
 */
export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data,
  type = 'line',
  dataKey = 'value',
  secondaryDataKey,
  title = 'Analytics Chart',
  color = '#3b82f6',
  secondaryColor = '#10b981',
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  loading = false,
  error,
}) => {
  const { t } = useTranslation();

  // Format data for accessibility
  const accessibleData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      'aria-label': `${point.date}: ${point.value}`,
    }));
  }, [data]);

  // Custom tooltip for better UX
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          role="tooltip"
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm text-gray-600 dark:text-gray-400"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div
        className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
        style={{ height }}
        role="status"
        aria-label={t('accessibility.loading')}
      >
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="w-full rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 text-sm p-4"
        style={{ height }}
        role="alert"
      >
        {error}
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
        style={{ height }}
        role="status"
      >
        {t('search.noResults')}
      </div>
    );
  }

  const commonProps = {
    data: accessibleData,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
  };

  const commonAxisProps = {
    stroke: '#9ca3af',
    style: { fontSize: '12px' },
  };

  return (
    <div
      className="w-full"
      role="img"
      aria-label={title}
      aria-describedby="chart-description"
    >
      <span id="chart-description" className="sr-only">
        {title} showing {data.length} data points from {data[0]?.date} to{' '}
        {data[data.length - 1]?.date}
      </span>

      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            )}
            <XAxis
              dataKey="date"
              {...commonAxisProps}
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom' } : undefined}
            />
            <YAxis
              {...commonAxisProps}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
              name={dataKey}
            />
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={secondaryColor}
                strokeWidth={2}
                dot={{ fill: secondaryColor, r: 4 }}
                activeDot={{ r: 6 }}
                name={secondaryDataKey}
              />
            )}
          </LineChart>
        ) : type === 'bar' ? (
          <BarChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            )}
            <XAxis dataKey="date" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={color} name={dataKey} radius={[8, 8, 0, 0]} />
            {secondaryDataKey && (
              <Bar
                dataKey={secondaryDataKey}
                fill={secondaryColor}
                name={secondaryDataKey}
                radius={[8, 8, 0, 0]}
              />
            )}
          </BarChart>
        ) : (
          <AreaChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            )}
            <XAxis dataKey="date" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              name={dataKey}
            />
            {secondaryDataKey && (
              <Area
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={secondaryColor}
                fill={secondaryColor}
                fillOpacity={0.3}
                name={secondaryDataKey}
              />
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsChart;
