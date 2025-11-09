import React from 'react';
import { legalTypeConfig, LegalType } from '@/lib/design-tokens';

interface LegalTypeBadgeProps {
  legalType: LegalType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function LegalTypeBadge({ legalType, size = 'md', showIcon = true }: LegalTypeBadgeProps) {
  const config = legalTypeConfig[legalType];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide ${sizeClasses[size]}`}
      style={{ backgroundColor: config.bgLight, color: config.color }}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}
