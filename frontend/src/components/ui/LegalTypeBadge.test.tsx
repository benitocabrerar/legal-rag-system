/**
 * LegalTypeBadge Component Unit Tests
 * Tests for legal type rendering, sizes, icons, and styling
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalTypeBadge } from './LegalTypeBadge';
import { legalTypeConfig, LegalType } from '@/lib/design-tokens';

describe('LegalTypeBadge Component', () => {
  const legalTypes: LegalType[] = ['penal', 'civil', 'constitucional', 'transito', 'administrativo', 'laboral'];

  describe('Rendering', () => {
    it('renders badge with legal type label', () => {
      render(<LegalTypeBadge legalType="penal" />);
      expect(screen.getByText('Penal')).toBeInTheDocument();
    });

    it('renders all legal types correctly', () => {
      legalTypes.forEach((legalType) => {
        const { unmount } = render(<LegalTypeBadge legalType={legalType} />);
        expect(screen.getByText(legalTypeConfig[legalType].label)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Icons', () => {
    it('shows icon by default', () => {
      render(<LegalTypeBadge legalType="penal" />);
      // Icon is rendered as text emoji
      expect(screen.getByText('⚖️')).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      render(<LegalTypeBadge legalType="penal" showIcon={false} />);
      expect(screen.queryByText('⚖️')).not.toBeInTheDocument();
    });

    it('renders correct icons for each legal type', () => {
      const expectedIcons: Record<LegalType, string> = {
        penal: '⚖️',
        civil: '🏛️',
        constitucional: '📜',
        transito: '🚗',
        administrativo: '🏢',
        laboral: '💼',
      };

      legalTypes.forEach((legalType) => {
        const { unmount } = render(<LegalTypeBadge legalType={legalType} showIcon />);
        expect(screen.getByText(expectedIcons[legalType])).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Sizes', () => {
    it('renders small size with correct classes', () => {
      render(<LegalTypeBadge legalType="civil" size="sm" />);
      const badge = screen.getByText('Civil').closest('span');
      expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5');
    });

    it('renders medium size (default) with correct classes', () => {
      render(<LegalTypeBadge legalType="civil" size="md" />);
      const badge = screen.getByText('Civil').closest('span');
      expect(badge).toHaveClass('text-xs', 'px-2.5', 'py-0.5');
    });

    it('renders large size with correct classes', () => {
      render(<LegalTypeBadge legalType="civil" size="lg" />);
      const badge = screen.getByText('Civil').closest('span');
      expect(badge).toHaveClass('text-sm', 'px-3', 'py-1');
    });

    it('defaults to medium size when size prop not provided', () => {
      render(<LegalTypeBadge legalType="civil" />);
      const badge = screen.getByText('Civil').closest('span');
      expect(badge).toHaveClass('px-2.5');
    });
  });

  describe('Styling', () => {
    it('applies correct color styling for penal type', () => {
      render(<LegalTypeBadge legalType="penal" />);
      const badge = screen.getByText('Penal').closest('span');
      expect(badge).toHaveStyle({
        backgroundColor: legalTypeConfig.penal.bgLight,
        color: legalTypeConfig.penal.color,
      });
    });

    it('applies correct color styling for civil type', () => {
      render(<LegalTypeBadge legalType="civil" />);
      const badge = screen.getByText('Civil').closest('span');
      expect(badge).toHaveStyle({
        backgroundColor: legalTypeConfig.civil.bgLight,
        color: legalTypeConfig.civil.color,
      });
    });

    it('has rounded-full class for pill shape', () => {
      render(<LegalTypeBadge legalType="laboral" />);
      const badge = screen.getByText('Laboral').closest('span');
      expect(badge).toHaveClass('rounded-full');
    });

    it('has font-semibold for text weight', () => {
      render(<LegalTypeBadge legalType="transito" />);
      const badge = screen.getByText('Tránsito').closest('span');
      expect(badge).toHaveClass('font-semibold');
    });

    it('has uppercase text transform', () => {
      render(<LegalTypeBadge legalType="administrativo" />);
      const badge = screen.getByText('Administrativo').closest('span');
      expect(badge).toHaveClass('uppercase');
    });

    it('has tracking-wide for letter spacing', () => {
      render(<LegalTypeBadge legalType="constitucional" />);
      const badge = screen.getByText('Constitucional').closest('span');
      expect(badge).toHaveClass('tracking-wide');
    });
  });

  describe('Layout', () => {
    it('uses inline-flex layout', () => {
      render(<LegalTypeBadge legalType="penal" />);
      const badge = screen.getByText('Penal').closest('span');
      expect(badge).toHaveClass('inline-flex');
    });

    it('centers items with gap', () => {
      render(<LegalTypeBadge legalType="penal" />);
      const badge = screen.getByText('Penal').closest('span');
      expect(badge).toHaveClass('items-center', 'gap-1');
    });
  });
});
