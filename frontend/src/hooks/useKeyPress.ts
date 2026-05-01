/**
 * useKeyPress Hook
 * Detects keyboard key presses with modifiers support
 * Essential for keyboard shortcuts and accessibility
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface KeyPressOptions {
  /** Require Ctrl/Cmd key */
  ctrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Callback when key is pressed */
  onKeyPress?: (event: KeyboardEvent) => void;
  /** Prevent default behavior */
  preventDefault?: boolean;
}

/**
 * Usage:
 * const enterPressed = useKeyPress('Enter');
 * const ctrlS = useKeyPress('s', { ctrl: true, preventDefault: true });
 */
export function useKeyPress(
  targetKey: string,
  options: KeyPressOptions = {}
): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  const {
    ctrl = false,
    shift = false,
    alt = false,
    onKeyPress,
    preventDefault = false,
  } = options;

  const downHandler = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;

      // Check if the pressed key matches
      if (key.toLowerCase() === targetKey.toLowerCase()) {
        // Check modifiers
        const ctrlMatch = !ctrl || ctrlKey || metaKey;
        const shiftMatch = !shift || shiftKey;
        const altMatch = !alt || altKey;

        if (ctrlMatch && shiftMatch && altMatch) {
          if (preventDefault) {
            event.preventDefault();
          }

          setKeyPressed(true);
          onKeyPress?.(event);
        }
      }
    },
    [targetKey, ctrl, shift, alt, onKeyPress, preventDefault]
  );

  const upHandler = useCallback(
    (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === targetKey.toLowerCase()) {
        setKeyPressed(false);
      }
    },
    [targetKey]
  );

  useEffect(() => {
    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [downHandler, upHandler]);

  return keyPressed;
}

// Hook for keyboard shortcuts with multiple keys
export function useKeyboardShortcut(
  keys: string[],
  callback: (event: KeyboardEvent) => void,
  options: Omit<KeyPressOptions, 'onKeyPress'> = {}
) {
  const { ctrl = false, shift = false, alt = false, preventDefault = false } = options;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;

      // Check if pressed key is in the keys array
      if (keys.some((k) => k.toLowerCase() === key.toLowerCase())) {
        // Check modifiers
        const ctrlMatch = !ctrl || ctrlKey || metaKey;
        const shiftMatch = !shift || shiftKey;
        const altMatch = !alt || altKey;

        if (ctrlMatch && shiftMatch && altMatch) {
          if (preventDefault) {
            event.preventDefault();
          }

          callback(event);
        }
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [keys, callback, ctrl, shift, alt, preventDefault]);
}

// Common keyboard shortcuts
export const useCommonShortcuts = (shortcuts: {
  onSave?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
}) => {
  // Ctrl/Cmd + S for save
  useKeyboardShortcut(['s'], () => shortcuts.onSave?.(), {
    ctrl: true,
    preventDefault: true,
  });

  // Ctrl/Cmd + K for search
  useKeyboardShortcut(['k'], () => shortcuts.onSearch?.(), {
    ctrl: true,
    preventDefault: true,
  });

  // Escape key
  useKeyboardShortcut(['Escape'], () => shortcuts.onEscape?.(), {
    preventDefault: false,
  });

  // F1 for help
  useKeyboardShortcut(['F1'], () => shortcuts.onHelp?.(), {
    preventDefault: true,
  });
};

export default useKeyPress;
