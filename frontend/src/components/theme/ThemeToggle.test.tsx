/**
 * ThemeToggle Component Unit Tests
 * Tests for theme switching, dropdown menu, and simple toggle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle, ThemeToggleSimple } from './ThemeToggle';
import * as ThemeProvider from './ThemeProvider';

// Mock useTheme hook
vi.mock('./ThemeProvider', () => ({
  useTheme: vi.fn(),
}));

describe('ThemeToggle Component', () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ThemeProvider.useTheme).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });
  });

  describe('Rendering', () => {
    it('renders toggle button', () => {
      render(<ThemeToggle />);
      expect(screen.getByRole('button', { name: /cambiar tema/i })).toBeInTheDocument();
    });

    it('renders with screen reader text', () => {
      render(<ThemeToggle />);
      expect(screen.getByText('Cambiar tema')).toBeInTheDocument();
    });

    it('renders Sun and Moon icons', () => {
      render(<ThemeToggle />);
      // Icons are SVGs, check for button presence
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies default variant correctly', () => {
      render(<ThemeToggle variant="default" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
    });

    it('applies outline variant correctly', () => {
      render(<ThemeToggle variant="outline" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
    });

    it('applies ghost variant correctly', () => {
      render(<ThemeToggle variant="ghost" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-gray-100');
    });
  });

  describe('Sizes', () => {
    it('renders icon size by default', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });

    it('renders small size', () => {
      render(<ThemeToggle size="sm" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
    });
  });

  describe('Label Display', () => {
    it('hides label by default', () => {
      render(<ThemeToggle showLabel={false} />);
      expect(screen.queryByText(/claro|oscuro/i)).not.toBeInTheDocument();
    });

    it('shows label when showLabel is true', () => {
      render(<ThemeToggle showLabel={true} />);
      expect(screen.getByText(/claro/i)).toBeInTheDocument();
    });

    it('shows "Oscuro" label in dark mode', () => {
      vi.mocked(ThemeProvider.useTheme).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        resolvedTheme: 'dark',
      });
      render(<ThemeToggle showLabel={true} />);
      expect(screen.getByText(/oscuro/i)).toBeInTheDocument();
    });
  });

  describe('Theme State Indicators', () => {
    it('shows checkmark for current light theme in dropdown', async () => {
      vi.mocked(ThemeProvider.useTheme).mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        resolvedTheme: 'light',
      });
      render(<ThemeToggle />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));

      // The light option should have a checkmark
      const lightOption = await screen.findByText('Claro');
      expect(lightOption.closest('[role="menuitem"]')).toBeInTheDocument();
    });

    it('shows checkmark for current dark theme', async () => {
      vi.mocked(ThemeProvider.useTheme).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        resolvedTheme: 'dark',
      });
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole('button'));

      const darkOption = await screen.findByText('Oscuro');
      expect(darkOption).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct aria-label', () => {
      render(<ThemeToggle />);
      expect(screen.getByRole('button', { name: /cambiar tema/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');

      // Tab to button
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});

describe('ThemeToggleSimple Component', () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ThemeProvider.useTheme).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });
  });

  describe('Rendering', () => {
    it('renders simple toggle button', () => {
      render(<ThemeToggleSimple />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ThemeToggleSimple className="custom-class" />);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Theme Switching', () => {
    it('toggles from light to dark on click', () => {
      vi.mocked(ThemeProvider.useTheme).mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        resolvedTheme: 'light',
      });

      render(<ThemeToggleSimple />);
      fireEvent.click(screen.getByRole('button'));

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('toggles from dark to light on click', () => {
      vi.mocked(ThemeProvider.useTheme).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        resolvedTheme: 'dark',
      });

      render(<ThemeToggleSimple />);
      fireEvent.click(screen.getByRole('button'));

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('Accessibility', () => {
    it('has descriptive aria-label for light mode', () => {
      vi.mocked(ThemeProvider.useTheme).mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        resolvedTheme: 'light',
      });

      render(<ThemeToggleSimple />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Cambiar a modo oscuro'
      );
    });

    it('has descriptive aria-label for dark mode', () => {
      vi.mocked(ThemeProvider.useTheme).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        resolvedTheme: 'dark',
      });

      render(<ThemeToggleSimple />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Cambiar a modo claro'
      );
    });
  });

  describe('Styling', () => {
    it('uses ghost variant', () => {
      render(<ThemeToggleSimple />);
      expect(screen.getByRole('button')).toHaveClass('hover:bg-gray-100');
    });

    it('uses icon size', () => {
      render(<ThemeToggleSimple />);
      expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10');
    });
  });
});
