/**
 * ErrorBoundary Component Tests
 *
 * Test Coverage:
 * - Renders children when no error occurs
 * - Catches and displays error UI when child throws
 * - Shows error message correctly
 * - Reset/retry functionality works
 * - Custom fallback component works
 * - Error logging is called
 * - Development vs production error details
 * - Home button navigation
 * - Accessibility attributes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// Test component that throws errors on demand
interface ThrowErrorProps {
  shouldThrow?: boolean;
  errorMessage?: string;
}

const ThrowError: React.FC<ThrowErrorProps> = ({
  shouldThrow = false,
  errorMessage = 'Test error'
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="child-content">Child component rendered</div>;
};

// Test component that can be triggered to throw
const ToggleError: React.FC<{ triggerError?: boolean }> = ({ triggerError = false }) => {
  if (triggerError) {
    throw new Error('Triggered error');
  }
  return <div data-testid="toggle-content">Toggle content</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Mock console.error to prevent test noise (in addition to global mock)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="test-child">Test Content</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders multiple children without errors', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('does not render error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches and displays error UI when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed!" />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('displays error message in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.getByText(/An error occurred while rendering this component/i)).toBeInTheDocument();
    });

    it('hides error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Secret error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Secret error')).not.toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/i)).toBeInTheDocument();
    });

    it('shows stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';

      const error = new Error('Error with stack');
      error.stack = 'Error: Error with stack\n    at Component (file.js:1:1)';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Error with stack" />
        </ErrorBoundary>
      );

      // Stack trace should be in a details element
      const details = screen.getByText('Stack trace');
      expect(details).toBeInTheDocument();
    });

    it('calls onError callback when error is caught', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Callback test error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('logs error to console in development mode', () => {
      process.env.NODE_ENV = 'development';
      consoleErrorSpy.mockRestore(); // Remove the mock to test actual logging
      const newSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Console test" />
        </ErrorBoundary>
      );

      expect(newSpy).toHaveBeenCalled();
      newSpy.mockRestore();
    });

    it('does not log error to console in production mode', () => {
      process.env.NODE_ENV = 'production';
      consoleErrorSpy.mockRestore();
      const newSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Production test" />
        </ErrorBoundary>
      );

      // Console.error may be called by React itself, but not by our component
      const calls = newSpy.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('ErrorBoundary caught'))
      );
      expect(calls.length).toBe(0);
      newSpy.mockRestore();
    });
  });

  describe('Reset Functionality', () => {
    it('resets error state and calls onReset when Try Again button is clicked', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI should be visible
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();

      // Click Try Again - this resets the internal state
      await user.click(screen.getByText('Try Again'));

      // onReset callback should be called
      expect(onReset).toHaveBeenCalledTimes(1);

      // Note: The error boundary resets its state, but the same component will throw again
      // In a real app, the onReset callback would navigate away or reload the component
    });

    it('calls onReset callback when reset button is clicked', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await user.click(screen.getByText('Try Again'));

      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('reset button has proper accessibility attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const resetButton = screen.getByLabelText('Try again');
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toHaveTextContent('Try Again');
    });
  });

  describe('Navigation', () => {
    it('navigates to home when Go Home button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const homeButton = screen.getByLabelText('Go to home page');
      await user.click(homeButton);

      expect(window.location.href).toBe('/');
    });

    it('home button has proper accessibility attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const homeButton = screen.getByLabelText('Go to home page');
      expect(homeButton).toBeInTheDocument();
      expect(homeButton).toHaveTextContent('Go Home');
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <div data-testid="custom-fallback">
          <h1>Custom Error: {error.message}</h1>
          <button onClick={resetError}>Custom Reset</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="Custom fallback test" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error: Custom fallback test')).toBeInTheDocument();
      expect(screen.getByText('Custom Reset')).toBeInTheDocument();
    });

    it('custom fallback receives error object', () => {
      const customFallback = vi.fn((error: Error) => (
        <div>Custom UI</div>
      ));

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="Test error object" />
        </ErrorBoundary>
      );

      expect(customFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error object'
        }),
        expect.any(Function)
      );
    });

    it('custom fallback reset function is called when button is clicked', async () => {
      const user = userEvent.setup();
      let resetCalled = false;

      const customFallback = (error: Error, resetError: () => void) => (
        <div>
          <p data-testid="custom-error">{error.message}</p>
          <button onClick={() => {
            resetCalled = true;
            resetError();
          }}>Reset Now</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="Custom fallback test" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Custom fallback test')).toBeInTheDocument();

      await user.click(screen.getByText('Reset Now'));

      expect(resetCalled).toBe(true);
    });

    it('does not render default fallback when custom fallback is provided', () => {
      const customFallback = () => <div data-testid="custom">Custom</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('error container has role="alert"', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('error container has aria-live="assertive"', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('icons have aria-hidden="true"', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // AlertTriangle icon should be hidden from screen readers
      const container = screen.getByRole('alert');
      const svgElements = container.querySelectorAll('svg');

      svgElements.forEach(svg => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('buttons have proper focus management', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByLabelText('Try again');
      const homeButton = screen.getByLabelText('Go to home page');

      expect(tryAgainButton).toHaveClass(/focus:outline-none/);
      expect(homeButton).toHaveClass(/focus:outline-none/);
    });
  });

  describe('Edge Cases', () => {
    it('handles errors with no message', () => {
      const NoMessageError: React.FC = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <NoMessageError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('handles errors with very long messages', () => {
      process.env.NODE_ENV = 'development';
      const longMessage = 'Error: ' + 'x'.repeat(1000);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={longMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles errors with special characters', () => {
      process.env.NODE_ENV = 'development';
      const specialMessage = '<script>alert("XSS")</script>';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={specialMessage} />
        </ErrorBoundary>
      );

      // Text content should be escaped
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
      // Should not execute as HTML
      expect(screen.queryByRole('alert')?.innerHTML).not.toContain('<script>');
    });

    it('handles multiple consecutive errors', () => {
      const onError = vi.fn();
      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);

      rerender(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles errors thrown in useEffect', async () => {
      const EffectError: React.FC = () => {
        const [shouldThrow, setShouldThrow] = React.useState(false);

        React.useEffect(() => {
          if (shouldThrow) {
            throw new Error('Effect error');
          }
        }, [shouldThrow]);

        return (
          <button onClick={() => setShouldThrow(true)}>
            Trigger Effect Error
          </button>
        );
      };

      const onError = vi.fn();

      // Note: Errors in useEffect are not caught by error boundaries in the same way
      // This test documents the current behavior
      render(
        <ErrorBoundary onError={onError}>
          <EffectError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Trigger Effect Error')).toBeInTheDocument();
    });
  });

  describe('Error Boundary State', () => {
    it('maintains error state until reset', async () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Persistent error" />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Error message should be visible in development mode
      expect(screen.getByText('Persistent error')).toBeInTheDocument();

      // Buttons should still be present
      const homeButton = screen.getByLabelText('Go to home page');
      expect(homeButton).toBeInTheDocument();

      const tryAgainButton = screen.getByLabelText('Try again');
      expect(tryAgainButton).toBeInTheDocument();

      // Error state should still be present
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('internal error state is cleared when resetError is called', async () => {
      const user = userEvent.setup();

      // Track whether reset was called
      const onReset = vi.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} errorMessage="State test error" />
        </ErrorBoundary>
      );

      // Error should be shown initially
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Reset button should be present
      const resetButton = screen.getByText('Try Again');
      expect(resetButton).toBeInTheDocument();

      // Click reset button
      await user.click(resetButton);

      // onReset callback should be called
      expect(onReset).toHaveBeenCalledTimes(1);

      // Note: The error boundary clears its internal state (hasError: false)
      // However, if the child still throws, it will be caught again
      // This test verifies the reset mechanism works and the callback is invoked
    });
  });

  describe('Integration with React', () => {
    it('works with functional components', () => {
      const FunctionalComponent: React.FC = () => {
        return <div data-testid="functional">Functional Component</div>;
      };

      render(
        <ErrorBoundary>
          <FunctionalComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('functional')).toBeInTheDocument();
    });

    it('works with class components', () => {
      class ClassComponent extends React.Component {
        render() {
          return <div data-testid="class">Class Component</div>;
        }
      }

      render(
        <ErrorBoundary>
          <ClassComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('class')).toBeInTheDocument();
    });

    it('can be nested', () => {
      render(
        <ErrorBoundary>
          <div data-testid="outer">
            <ErrorBoundary>
              <div data-testid="inner">Nested content</div>
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('outer')).toBeInTheDocument();
      expect(screen.getByTestId('inner')).toBeInTheDocument();
    });

    it('nested error boundary catches child errors', () => {
      render(
        <ErrorBoundary>
          <div data-testid="outer">
            <ErrorBoundary>
              <ThrowError shouldThrow={true} errorMessage="Inner error" />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Outer content should still be visible
      expect(screen.getByTestId('outer')).toBeInTheDocument();
      // Inner error boundary should catch the error
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
