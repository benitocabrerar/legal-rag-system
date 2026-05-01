/**
 * KeyPointsList Component
 * Professional component for displaying structured key points with importance indicators
 *
 * Features:
 * - Numbered/bulleted lists with importance badges
 * - Category grouping support
 * - Collapsible sections for long lists
 * - Dark mode support
 * - Loading skeleton state
 * - Full TypeScript typing
 * - WCAG accessibility compliance
 */

'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ListChecks,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2
} from 'lucide-react';

// Types
export interface KeyPoint {
  id: string;
  text: string;
  category?: string;
  importance: 'high' | 'medium' | 'low';
  references?: string[];
}

export interface KeyPointsListProps {
  keyPoints: KeyPoint[];
  isLoading?: boolean;
  groupByCategory?: boolean;
  maxVisible?: number;
  title?: string;
  className?: string;
}

interface GroupedKeyPoints {
  [category: string]: KeyPoint[];
}

// Importance configuration
const importanceConfig = {
  high: {
    variant: 'destructive' as const,
    label: 'High',
    icon: AlertCircle,
    className: 'border-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-500',
  },
  medium: {
    variant: 'warning' as const,
    label: 'Medium',
    icon: AlertCircle,
    className: 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-500',
  },
  low: {
    variant: 'secondary' as const,
    label: 'Low',
    icon: Circle,
    className: 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600',
  },
};

/**
 * Loading skeleton for key points list
 */
const KeyPointsListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-4" role="status" aria-label="Loading key points">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width="100px" height="20px" />
        </div>
        <Skeleton variant="text" width="100%" height="16px" />
        <Skeleton variant="text" width="85%" height="16px" />
      </div>
    ))}
  </div>
);

/**
 * Individual key point item component
 */
interface KeyPointItemProps {
  keyPoint: KeyPoint;
  index: number;
  showReferences?: boolean;
}

const KeyPointItem: React.FC<KeyPointItemProps> = ({
  keyPoint,
  index,
  showReferences = true
}) => {
  const config = importanceConfig[keyPoint.importance];
  const Icon = config.icon;

  return (
    <li
      className={cn(
        "relative pl-8 pb-4 border-l-2 transition-colors",
        config.className
      )}
    >
      {/* Number/Icon indicator */}
      <div className="absolute -left-3 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-current">
        <span className="text-xs font-bold">{index + 1}</span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Importance badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={config.variant} className="text-xs">
            <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
            {config.label}
          </Badge>
          {keyPoint.category && (
            <Badge variant="outline" className="text-xs dark:text-gray-300 dark:border-gray-600">
              {keyPoint.category}
            </Badge>
          )}
        </div>

        {/* Key point text */}
        <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">
          {keyPoint.text}
        </p>

        {/* References */}
        {showReferences && keyPoint.references && keyPoint.references.length > 0 && (
          <div className="mt-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              References:
            </p>
            <ul className="space-y-1">
              {keyPoint.references.map((ref, idx) => (
                <li
                  key={idx}
                  className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" aria-hidden="true" />
                  <span>{ref}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
};

/**
 * Category section component with collapse functionality
 */
interface CategorySectionProps {
  category: string;
  keyPoints: KeyPoint[];
  isExpanded: boolean;
  onToggle: () => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  keyPoints,
  isExpanded,
  onToggle,
}) => {
  // Count by importance
  const counts = useMemo(() => {
    return keyPoints.reduce((acc, kp) => {
      acc[kp.importance] = (acc[kp.importance] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [keyPoints]);

  return (
    <div className="space-y-3">
      {/* Category header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-lg",
          "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
          "transition-colors border border-gray-200 dark:border-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        )}
        aria-expanded={isExpanded}
        aria-controls={`category-${category}`}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {category}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {keyPoints.length} {keyPoints.length === 1 ? 'point' : 'points'}
            </span>
            {counts.high > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                {counts.high}
              </Badge>
            )}
            {counts.medium > 0 && (
              <Badge variant="warning" className="text-xs px-1.5 py-0">
                {counts.medium}
              </Badge>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
        )}
      </button>

      {/* Category content */}
      {isExpanded && (
        <ul
          id={`category-${category}`}
          className="space-y-4 pt-2"
          role="list"
        >
          {keyPoints.map((kp, idx) => (
            <KeyPointItem key={kp.id} keyPoint={kp} index={idx} />
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Main KeyPointsList component
 *
 * Usage:
 * ```tsx
 * <KeyPointsList
 *   keyPoints={points}
 *   title="Key Findings"
 *   groupByCategory
 *   maxVisible={10}
 * />
 * ```
 */
export const KeyPointsList: React.FC<KeyPointsListProps> = ({
  keyPoints,
  isLoading = false,
  groupByCategory = false,
  maxVisible,
  title = 'Key Points',
  className,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Group key points by category if requested
  const groupedPoints = useMemo<GroupedKeyPoints>(() => {
    if (!groupByCategory) {
      return { 'All Points': keyPoints };
    }

    return keyPoints.reduce((acc, kp) => {
      const category = kp.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(kp);
      return acc;
    }, {} as GroupedKeyPoints);
  }, [keyPoints, groupByCategory]);

  // Sort categories: prioritize by highest importance points
  const sortedCategories = useMemo(() => {
    return Object.keys(groupedPoints).sort((a, b) => {
      const aHighCount = groupedPoints[a].filter(kp => kp.importance === 'high').length;
      const bHighCount = groupedPoints[b].filter(kp => kp.importance === 'high').length;
      return bHighCount - aHighCount;
    });
  }, [groupedPoints]);

  // Expand all categories by default if not grouping or if < 3 categories
  React.useEffect(() => {
    if (!groupByCategory || sortedCategories.length <= 3) {
      setExpandedCategories(new Set(sortedCategories));
    } else {
      // Expand first category by default
      setExpandedCategories(new Set([sortedCategories[0]]));
    }
  }, [groupByCategory, sortedCategories]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Calculate visible points
  const visiblePoints = useMemo(() => {
    if (!maxVisible || showAll) return keyPoints;
    return keyPoints.slice(0, maxVisible);
  }, [keyPoints, maxVisible, showAll]);

  const hasMore = maxVisible && keyPoints.length > maxVisible;

  // Statistics
  const stats = useMemo(() => {
    return {
      total: keyPoints.length,
      high: keyPoints.filter(kp => kp.importance === 'high').length,
      medium: keyPoints.filter(kp => kp.importance === 'medium').length,
      low: keyPoints.filter(kp => kp.importance === 'low').length,
    };
  }, [keyPoints]);

  return (
    <Card className={cn("dark:bg-gray-900 dark:border-gray-700", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <CardTitle className="text-lg dark:text-gray-100">{title}</CardTitle>
          </div>
          {!isLoading && keyPoints.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs dark:text-gray-300 dark:border-gray-600">
                {stats.total} total
              </Badge>
              {stats.high > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.high} high
                </Badge>
              )}
              {stats.medium > 0 && (
                <Badge variant="warning" className="text-xs">
                  {stats.medium} medium
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading state */}
        {isLoading && <KeyPointsListSkeleton count={5} />}

        {/* Empty state */}
        {!isLoading && keyPoints.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No key points available
            </p>
          </div>
        )}

        {/* Content - Grouped by category */}
        {!isLoading && keyPoints.length > 0 && groupByCategory && (
          <div className="space-y-4">
            {sortedCategories.map(category => (
              <CategorySection
                key={category}
                category={category}
                keyPoints={groupedPoints[category]}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
              />
            ))}
          </div>
        )}

        {/* Content - Simple list */}
        {!isLoading && keyPoints.length > 0 && !groupByCategory && (
          <ul className="space-y-4" role="list">
            {visiblePoints.map((kp, idx) => (
              <KeyPointItem key={kp.id} keyPoint={kp} index={idx} />
            ))}
          </ul>
        )}

        {/* Show more/less button */}
        {!isLoading && hasMore && !groupByCategory && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg",
                "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                "hover:bg-gray-200 dark:hover:bg-gray-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                "transition-colors border border-gray-200 dark:border-gray-700"
              )}
              aria-expanded={showAll}
            >
              {showAll ? (
                <>
                  <ChevronUp className="inline w-4 h-4 mr-1" aria-hidden="true" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="inline w-4 h-4 mr-1" aria-hidden="true" />
                  Show {keyPoints.length - maxVisible!} More
                </>
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Export for easy use
export default KeyPointsList;

/**
 * Accessibility Checklist:
 * - ARIA labels on interactive elements
 * - Keyboard navigation support (Tab, Enter, Space)
 * - Focus indicators with ring-2
 * - Screen reader announcements for loading states
 * - Semantic HTML (ul, li, button)
 * - Color is not the only indicator (icons + text)
 * - Sufficient color contrast (WCAG AA compliant)
 *
 * Performance Considerations:
 * - useMemo for expensive calculations (grouping, sorting, stats)
 * - Lazy rendering with maxVisible prop
 * - Efficient re-renders with proper state management
 * - No unnecessary re-renders in child components
 *
 * Usage Example:
 * ```tsx
 * const keyPoints: KeyPoint[] = [
 *   {
 *     id: '1',
 *     text: 'Critical security vulnerability found in authentication system',
 *     category: 'Security',
 *     importance: 'high',
 *     references: ['CVE-2024-1234', 'Section 5.2']
 *   },
 *   {
 *     id: '2',
 *     text: 'Performance improvements in database queries',
 *     category: 'Performance',
 *     importance: 'medium',
 *     references: ['Benchmark Report Q4']
 *   }
 * ];
 *
 * <KeyPointsList
 *   keyPoints={keyPoints}
 *   title="Document Analysis Results"
 *   groupByCategory
 *   maxVisible={5}
 * />
 * ```
 */
