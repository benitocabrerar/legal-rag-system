/**
 * Providers Component Unit Tests
 * Tests for ThemeProvider functionality, context values, and provider integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { Providers } from './providers';
import { useTheme } from '@/components/theme';

// Mock modules
vi.mock('@/lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock('@/lib/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/pwa/register-sw', () => ({
  registerServiceWorker: vi.fn(),
}));

vi.mock('@/components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

describe('Providers Component', () => {
  let localStorageMock: Record<string, string>;
  let matchMediaMock: any;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock = {};

    // Create spies that delegate to the mock object
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageMock[key] || null;
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete localStorageMock[key];
    });

    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      localStorageMock = {};
    });

    // Reset matchMedia mock
    matchMediaMock = vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    // Reset document classes
    document.documentElement.classList.remove('light', 'dark');
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('light', 'dark');
  });

  describe('Provider Hierarchy', () => {
    it('renders all providers in correct order', () => {
      render(
        <Providers>
          <div data-testid="child-content">Test Content</div>
        </Providers>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <Providers>
          <div data-testid="test-child">Child Component</div>
        </Providers>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });
  });

  describe('ThemeProvider - Default Theme', () => {
    it('applies system theme by default', async () => {
      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('uses light theme when system preference is light', async () => {
      matchMediaMock = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      });

      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('uses dark theme when system preference is dark', async () => {
      matchMediaMock = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      });

      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });

  describe('ThemeProvider - Theme Persistence', () => {
    it('saves theme to localStorage when changed', async () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('dark')} data-testid="set-dark">
            Set Dark
          </button>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      const button = screen.getByTestId('set-dark');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('legal-rag-theme', 'dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('persists theme changes to localStorage', async () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('dark')} data-testid="theme-toggle">
            Toggle Theme
          </button>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      const button = screen.getByTestId('theme-toggle');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('legal-rag-theme', 'dark');
      });
    });

    it('falls back to default theme when localStorage is unavailable', async () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('ThemeProvider - Theme Toggle', () => {
    it('toggles from light to dark theme', async () => {
      const TestComponent = () => {
        const { theme, setTheme } = useTheme();
        return (
          <>
            <div data-testid="current-theme">{theme}</div>
            <button onClick={() => setTheme('dark')} data-testid="set-dark">
              Set Dark
            </button>
          </>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toBeInTheDocument();
      });

      const button = screen.getByTestId('set-dark');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('toggles from dark to light theme', async () => {
      const TestComponent = () => {
        const { theme, setTheme } = useTheme();
        return (
          <>
            <div data-testid="current-theme">{theme}</div>
            <button onClick={() => setTheme('dark')} data-testid="set-dark">
              Set Dark
            </button>
            <button onClick={() => setTheme('light')} data-testid="set-light">
              Set Light
            </button>
          </>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      // First set to dark
      const darkButton = screen.getByTestId('set-dark');
      await act(async () => {
        darkButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      // Then toggle to light
      const lightButton = screen.getByTestId('set-light');
      await act(async () => {
        lightButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('switches to system theme', async () => {
      const TestComponent = () => {
        const { theme, setTheme } = useTheme();
        return (
          <>
            <div data-testid="current-theme">{theme}</div>
            <button onClick={() => setTheme('dark')} data-testid="set-dark">
              Set Dark
            </button>
            <button onClick={() => setTheme('system')} data-testid="set-system">
              Set System
            </button>
          </>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      // First set to dark
      const darkButton = screen.getByTestId('set-dark');
      await act(async () => {
        darkButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });

      // Then switch to system
      const systemButton = screen.getByTestId('set-system');
      await act(async () => {
        systemButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
      });
    });
  });

  describe('ThemeProvider - System Theme Preference', () => {
    it('responds to system theme changes when theme is system', async () => {
      const listeners: Array<(e: MediaQueryListEvent) => void> = [];

      matchMediaMock = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, listener: any) => {
          if (event === 'change') {
            listeners.push(listener);
          }
        }),
        removeEventListener: vi.fn((event: string, listener: any) => {
          if (event === 'change') {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      });

      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      // Simulate system theme change to dark
      await act(async () => {
        listeners.forEach(listener => {
          listener({ matches: true, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
        });
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('theme setting overrides system preference', async () => {
      // Start with dark system preference
      matchMediaMock = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      });

      const TestComponent = () => {
        const { theme, setTheme, resolvedTheme } = useTheme();
        return (
          <>
            <div data-testid="current-theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
            <button onClick={() => setTheme('light')} data-testid="set-light">
              Set Light
            </button>
          </>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      // Initially should use system (dark)
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      });

      // Explicitly set theme to light (overriding dark system preference)
      const button = screen.getByTestId('set-light');
      await act(async () => {
        button.click();
      });

      // Should now be light despite system being dark
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
        expect(document.documentElement.classList.contains('light')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });
  });

  describe('ThemeProvider - Context Values', () => {
    it('provides theme context values to children', async () => {
      const TestComponent = () => {
        const { theme, setTheme, resolvedTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
            <button onClick={() => setTheme('dark')} data-testid="set-theme">
              Set Theme
            </button>
          </div>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
        expect(screen.getByTestId('resolved-theme')).toBeInTheDocument();
      });
    });

    it('exposes setTheme function', async () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('dark')} data-testid="theme-button">
            Set Dark Theme
          </button>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      const button = screen.getByTestId('theme-button');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('resolvedTheme reflects effective theme', async () => {
      matchMediaMock = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      });

      const TestComponent = () => {
        const { theme, resolvedTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
          </div>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      });
    });
  });

  describe('ThemeProvider - Storage Key', () => {
    it('uses custom storage key from props', async () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('dark')} data-testid="set-dark">
            Set Dark
          </button>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      const button = screen.getByTestId('set-dark');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('legal-rag-theme', 'dark');
      });
    });
  });

  describe('ThemeProvider - Transitions', () => {
    it('applies class-based theme by default', async () => {
      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('handles theme transitions correctly', async () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('dark')} data-testid="toggle">
            Toggle
          </button>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      const button = screen.getByTestId('toggle');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });
  });

  describe('ThemeProvider - Error Handling', () => {
    it('handles localStorage errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage error');
      });

      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      consoleErrorSpy.mockRestore();
    });

    it('continues working when setItem fails', async () => {
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('quota exceeded');
      });

      const TestComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('dark')} data-testid="set-theme">
            Set Theme
          </button>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      const button = screen.getByTestId('set-theme');

      await act(async () => {
        button.click();
      });

      // Theme should still change in DOM even if localStorage fails
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });

  describe('ThemeProvider - Multiple Renders', () => {
    it('maintains theme state during re-renders', async () => {
      const TestComponent = ({ content }: { content: string }) => {
        const { theme, setTheme } = useTheme();
        return (
          <>
            <div data-testid="content">{content}</div>
            <div data-testid="theme">{theme}</div>
            <button onClick={() => setTheme('dark')} data-testid="set-dark">
              Set Dark
            </button>
          </>
        );
      };

      const { rerender } = render(
        <Providers>
          <TestComponent content="Content 1" />
        </Providers>
      );

      // Set theme to dark
      const button = screen.getByTestId('set-dark');
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      // Rerender with different content
      rerender(
        <Providers>
          <TestComponent content="Content 2" />
        </Providers>
      );

      // Theme should still be dark
      await waitFor(() => {
        expect(screen.getByTestId('content')).toHaveTextContent('Content 2');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('persists theme state when children change', async () => {
      const TestComponent = ({ showExtra }: { showExtra: boolean }) => {
        const { theme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            {showExtra && <div data-testid="extra">Extra content</div>}
          </div>
        );
      };

      const { rerender } = render(
        <Providers>
          <TestComponent showExtra={false} />
        </Providers>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
      });

      rerender(
        <Providers>
          <TestComponent showExtra={true} />
        </Providers>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
        expect(screen.getByTestId('extra')).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('integrates ThemeProvider with other providers', async () => {
      const TestComponent = () => {
        const { theme, setTheme } = useTheme();
        return (
          <div data-testid="integrated-component">
            <div data-testid="theme-value">{theme}</div>
            <button onClick={() => setTheme('dark')} data-testid="theme-btn">
              Change Theme
            </button>
          </div>
        );
      };

      render(
        <Providers>
          <TestComponent />
        </Providers>
      );

      expect(screen.getByTestId('integrated-component')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();

      const button = screen.getByTestId('theme-btn');

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
      });
    });
  });
});
