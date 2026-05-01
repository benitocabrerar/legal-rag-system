/**
 * useOnScreen Hook
 * Detects when an element is visible on screen
 * Useful for lazy loading and infinite scroll
 */

'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseOnScreenOptions extends IntersectionObserverInit {
  /** Fire callback only once */
  once?: boolean;
}

/**
 * Usage:
 * const ref = useRef<HTMLDivElement>(null);
 * const isVisible = useOnScreen(ref);
 *
 * <div ref={ref}>
 *   {isVisible && <LazyComponent />}
 * </div>
 */
export function useOnScreen<T extends Element>(
  ref: RefObject<T>,
  options: UseOnScreenOptions = {}
): boolean {
  const [isIntersecting, setIntersecting] = useState(false);
  const { once = false, threshold = 0, root = null, rootMargin = '0px' } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIntersecting(isElementIntersecting);

        // If once is true, unobserve after first intersection
        if (isElementIntersecting && once) {
          observer.unobserve(element);
        }
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, root, rootMargin, once]);

  return isIntersecting;
}

export default useOnScreen;
