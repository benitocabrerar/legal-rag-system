import React from 'react';
import { priorityConfig, Priority } from '@/lib/design-tokens';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wide ${sizeClasses[size]}`}
      style={{ backgroundColor: config.bg, color: config.color, borderColor: config.border }}
    >
      {config.label}
    </span>
  );
}
