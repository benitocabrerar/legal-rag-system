'use client';

import { useEffect, useState, useRef } from 'react';

export interface StreamingTextProps {
  /**
   * The text content to display with streaming effect
   */
  content: string;

  /**
   * Whether the text is currently streaming
   */
  isStreaming: boolean;

  /**
   * Optional CSS classes for the container
   */
  className?: string;

  /**
   * Optional CSS classes for the cursor
   */
  cursorClassName?: string;

  /**
   * Callback fired when streaming completes
   */
  onComplete?: () => void;

  /**
   * Speed of typing effect in milliseconds per character
   * @default 30
   */
  typingSpeed?: number;

  /**
   * Whether to show error state
   */
  error?: boolean;

  /**
   * Error message to display
   */
  errorMessage?: string;

  /**
   * Whether to show loading state before content arrives
   */
  isLoading?: boolean;
}

export function StreamingText({
  content,
  isStreaming,
  className = '',
  cursorClassName = '',
  onComplete,
  typingSpeed = 30,
  error = false,
  errorMessage = 'An error occurred while streaming content',
  isLoading = false,
}: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const contentRef = useRef(content);
  const displayedRef = useRef('');
  const isCompletedRef = useRef(false);

  // Update content reference when it changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Typing effect
  useEffect(() => {
    if (error || isLoading) {
      return;
    }

    // If content is shorter than displayed (e.g., cleared), reset immediately
    if (content.length < displayedRef.current.length) {
      setDisplayedContent(content);
      displayedRef.current = content;
      isCompletedRef.current = false;
      return;
    }

    // If we're already showing all content, no need to animate
    if (displayedRef.current === content) {
      return;
    }

    // Typing animation
    const timer = setInterval(() => {
      const currentContent = contentRef.current;
      const currentDisplayed = displayedRef.current;

      if (currentDisplayed.length < currentContent.length) {
        const nextChar = currentContent[currentDisplayed.length];
        const newDisplayed = currentDisplayed + nextChar;

        displayedRef.current = newDisplayed;
        setDisplayedContent(newDisplayed);
      } else {
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [content, typingSpeed, error, isLoading]);

  // Handle completion
  useEffect(() => {
    const isComplete =
      !isStreaming &&
      displayedContent === content &&
      content.length > 0 &&
      !isCompletedRef.current;

    if (isComplete) {
      isCompletedRef.current = true;
      onComplete?.();
    }

    // Reset completion flag when streaming starts again
    if (isStreaming && isCompletedRef.current) {
      isCompletedRef.current = false;
    }
  }, [isStreaming, displayedContent, content, onComplete]);

  // Cursor blinking effect (only when streaming or typing)
  useEffect(() => {
    const shouldBlink = isStreaming || displayedContent !== content;

    if (!shouldBlink) {
      setShowCursor(false);
      return;
    }

    setShowCursor(true);
    const blinkInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530); // Cursor blink speed

    return () => clearInterval(blinkInterval);
  }, [isStreaming, displayedContent, content]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Loading...
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Error
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  // Main streaming text display
  return (
    <div className={`relative ${className}`}>
      <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
        {displayedContent}
        <span
          className={`inline-block w-0.5 h-5 ml-0.5 bg-blue-600 dark:bg-blue-400 align-middle transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          } ${cursorClassName}`}
          aria-hidden="true"
        />
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="false">
        {isStreaming ? 'Content is streaming' : 'Content loaded'}
      </div>
    </div>
  );
}

export default StreamingText;
