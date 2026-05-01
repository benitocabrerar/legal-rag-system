/**
 * FocusTrap Component
 * Traps keyboard focus within a container (essential for modals/dialogs)
 * WCAG 2.1 AA compliant focus management
 */

'use client';

import React, { useEffect, useRef, ReactNode } from 'react';

export interface FocusTrapProps {
  /** Child elements */
  children: ReactNode;
  /** Enable/disable focus trap */
  active?: boolean;
  /** Initial element to focus (by ID) */
  initialFocusId?: string;
  /** Return focus to trigger element on unmount */
  returnFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Usage:
 * <FocusTrap active={isModalOpen}>
 *   <Modal>
 *     <button id="close-btn">Close</button>
 *     <input type="text" />
 *   </Modal>
 * </FocusTrap>
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  initialFocusId,
  returnFocus = true,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within container
  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    );
  };

  // Handle tab key navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!active || e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift + Tab: focus last element if on first
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
      return;
    }

    // Tab: focus first element if on last
    if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
      return;
    }
  };

  useEffect(() => {
    if (!active) return;

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Set initial focus
    if (initialFocusId) {
      const initialElement = document.getElementById(initialFocusId);
      initialElement?.focus();
    } else {
      // Focus first focusable element
      const focusableElements = getFocusableElements();
      focusableElements[0]?.focus();
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Return focus to previous element
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, initialFocusId, returnFocus]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// Hook version for more flexibility
export const useFocusTrap = (active: boolean = true) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    previousActiveElement.current = document.activeElement as HTMLElement;

    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    focusableElements[0]?.focus();

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [active]);

  return containerRef;
};

export default FocusTrap;
