/**
 * useDebounce Hook
 * Delays updating a value until after a specified delay
 * Essential for performance optimization in search inputs
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Usage:
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     performSearch(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to cancel timeout if value changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Alternative: useDebounceCallback for debouncing functions
/**
 * Usage:
 * const debouncedSearch = useDebounceCallback((term: string) => {
 *   performSearch(term);
 * }, 500);
 *
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}

// Throttle hook (alternative to debounce for different use cases)
/**
 * Usage:
 * const throttledScroll = useThrottle(() => {
 *   console.log('Scroll event');
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [lastRun, setLastRun] = useState<number>(Date.now());

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastRun >= delay) {
      callback(...args);
      setLastRun(now);
    }
  };
}

export default useDebounce;
