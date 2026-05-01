/**
 * SkipLink Component
 * WCAG 2.1 AA compliant skip navigation link
 * Allows keyboard users to skip repetitive navigation
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string;
  /** Link text */
  text?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Usage:
 * <SkipLink targetId="main-content" text="Skip to main content" />
 *
 * Then in your layout:
 * <main id="main-content" tabIndex={-1}>
 *   {children}
 * </main>
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  text = 'Skip to main content',
  className,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);

    if (target) {
      // Set focus to target element
      target.focus();

      // Scroll to target with smooth behavior
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Hidden by default, visible on focus (keyboard navigation)
        'sr-only focus:not-sr-only',
        // Positioning
        'fixed top-4 left-4 z-[9999]',
        // Styling
        'px-4 py-2 rounded-lg',
        'bg-blue-600 text-white font-medium',
        'shadow-lg',
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        // Transitions
        'transition-all duration-200',
        className
      )}
    >
      {text}
    </a>
  );
};

// Multiple skip links for complex layouts
export interface SkipLinksProps {
  /** Array of skip link configurations */
  links: Array<{
    targetId: string;
    text: string;
  }>;
  /** Additional CSS classes */
  className?: string;
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ links, className }) => {
  return (
    <nav
      aria-label="Skip links"
      className={cn('sr-only focus-within:not-sr-only', className)}
    >
      <ul className="fixed top-4 left-4 z-[9999] flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.targetId}>
            <SkipLink targetId={link.targetId} text={link.text} />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SkipLink;
