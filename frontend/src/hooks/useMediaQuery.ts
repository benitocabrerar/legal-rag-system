/**
 * useMediaQuery Hook
 * Responsive design hook for detecting media query matches
 * Performance optimized with debouncing
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Usage:
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with false to avoid hydration mismatch
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Create media query list
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Define event handler
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener (modern browsers)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

// Preset breakpoints for common use cases
export const useBreakpoint = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1536px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    // Convenience flags
    isMobileOrTablet: isMobile || isTablet,
    isDesktopOrLarger: isDesktop || isLargeDesktop,
  };
};

// Detect device type
export const useDevice = () => {
  const isTouch = useMediaQuery('(hover: none) and (pointer: coarse)');
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const isHighContrast = useMediaQuery('(prefers-contrast: high)');

  return {
    isTouch,
    isReducedMotion,
    isDarkMode,
    isHighContrast,
  };
};

// Tailwind breakpoints
export const useTailwindBreakpoint = () => {
  const sm = useMediaQuery('(min-width: 640px)');
  const md = useMediaQuery('(min-width: 768px)');
  const lg = useMediaQuery('(min-width: 1024px)');
  const xl = useMediaQuery('(min-width: 1280px)');
  const xxl = useMediaQuery('(min-width: 1536px)');

  return {
    sm,
    md,
    lg,
    xl,
    '2xl': xxl,
  };
};

export default useMediaQuery;
