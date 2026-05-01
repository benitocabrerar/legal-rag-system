/**
 * SummaryCard Component Tests
 * Unit tests for SummaryCard functionality and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SummaryCard, SummaryCardSkeleton } from './SummaryCard';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const mockSummary = {
  id: 'sum-123',
  documentId: 'doc-456',
  level: 'standard' as const,
  summary: 'This is a test summary of a legal document.',
  wordCount: 150,
  originalWordCount: 1500,
  compressionRatio: 0.1,
  confidenceScore: 0.92,
  language: 'ES',
  generatedAt: '2025-12-12T10:30:00Z',
};

describe('SummaryCard', () => {
  describe('Rendering', () => {
    it('renders summary content correctly', () => {
      render(<SummaryCard summary={mockSummary} />);

      expect(screen.getByText(/test summary/i)).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText(/1,500/i)).toBeInTheDocument();
    });

    it('renders document name when provided', () => {
      const documentName = 'Test Contract 2025';
      render(<SummaryCard summary={mockSummary} documentName={documentName} />);

      expect(screen.getByText(documentName)).toBeInTheDocument();
    });

    it('renders default document name when not provided', () => {
      render(<SummaryCard summary={mockSummary} />);

      expect(screen.getByText(/Document doc-456/i)).toBeInTheDocument();
    });

    it('displays correct summary level badge', () => {
      render(<SummaryCard summary={mockSummary} />);

      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('displays correct language badge', () => {
      render(<SummaryCard summary={mockSummary} />);

      expect(screen.getByText('ES')).toBeInTheDocument();
    });

    it('shows confidence score percentage', () => {
      render(<SummaryCard summary={mockSummary} />);

      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('calculates compression percentage correctly', () => {
      render(<SummaryCard summary={mockSummary} />);

      // 1 - 0.1 = 0.9 = 90% compression
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<SummaryCard summary={mockSummary} isLoading={true} />);

      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders SummaryCardSkeleton component', () => {
      render(<SummaryCardSkeleton />);

      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Badge Variants', () => {
    it('renders brief level with correct badge', () => {
      const briefSummary = { ...mockSummary, level: 'brief' as const };
      render(<SummaryCard summary={briefSummary} />);

      expect(screen.getByText('Brief')).toBeInTheDocument();
    });

    it('renders detailed level with correct badge', () => {
      const detailedSummary = { ...mockSummary, level: 'detailed' as const };
      render(<SummaryCard summary={detailedSummary} />);

      expect(screen.getByText('Detailed')).toBeInTheDocument();
    });

    it('renders English language badge', () => {
      const enSummary = { ...mockSummary, language: 'EN' };
      render(<SummaryCard summary={enSummary} />);

      expect(screen.getByText('EN')).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('copies summary text to clipboard', async () => {
      render(<SummaryCard summary={mockSummary} />);

      const copyButton = screen.getByRole('button', { name: /copy summary/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          mockSummary.summary
        );
      });
    });

    it('shows success feedback after copying', async () => {
      render(<SummaryCard summary={mockSummary} />);

      const copyButton = screen.getByRole('button', { name: /copy summary/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('resets copy feedback after 2 seconds', async () => {
      jest.useFakeTimers();
      render(<SummaryCard summary={mockSummary} />);

      const copyButton = screen.getByRole('button', { name: /copy summary/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('View Document Button', () => {
    it('renders view document button when callback provided', () => {
      const onViewDocument = jest.fn();
      render(<SummaryCard summary={mockSummary} onViewDocument={onViewDocument} />);

      expect(screen.getByRole('button', { name: /view document/i })).toBeInTheDocument();
    });

    it('does not render view document button when callback not provided', () => {
      render(<SummaryCard summary={mockSummary} />);

      expect(screen.queryByRole('button', { name: /view document/i })).not.toBeInTheDocument();
    });

    it('calls callback when view document button clicked', () => {
      const onViewDocument = jest.fn();
      render(<SummaryCard summary={mockSummary} onViewDocument={onViewDocument} />);

      const viewButton = screen.getByRole('button', { name: /view document/i });
      fireEvent.click(viewButton);

      expect(onViewDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('Confidence Score Visualization', () => {
    it('shows high confidence color for score >= 0.9', () => {
      const highConfidenceSummary = { ...mockSummary, confidenceScore: 0.95 };
      render(<SummaryCard summary={highConfidenceSummary} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '95');
    });

    it('shows medium confidence color for score 0.7-0.89', () => {
      const mediumConfidenceSummary = { ...mockSummary, confidenceScore: 0.75 };
      render(<SummaryCard summary={mediumConfidenceSummary} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('shows low confidence color for score < 0.7', () => {
      const lowConfidenceSummary = { ...mockSummary, confidenceScore: 0.65 };
      render(<SummaryCard summary={lowConfidenceSummary} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on buttons', () => {
      const onViewDocument = jest.fn();
      render(<SummaryCard summary={mockSummary} onViewDocument={onViewDocument} />);

      expect(screen.getByRole('button', { name: /copy summary to clipboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view source document/i })).toBeInTheDocument();
    });

    it('has proper ARIA attributes on progress bar', () => {
      render(<SummaryCard summary={mockSummary} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '92');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label');
    });

    it('renders semantic HTML structure', () => {
      render(<SummaryCard summary={mockSummary} documentName="Test Document" />);

      // Should have proper heading
      expect(screen.getByRole('heading', { name: /test document/i })).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats generated timestamp correctly', () => {
      render(<SummaryCard summary={mockSummary} />);

      // Should display formatted date (format depends on locale)
      const dateElements = screen.getAllByText(/12|diciembre|December/i);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles very long summary text', () => {
      const longSummary = {
        ...mockSummary,
        summary: 'A'.repeat(5000),
      };
      render(<SummaryCard summary={longSummary} />);

      expect(screen.getByText(/A+/)).toBeInTheDocument();
    });

    it('handles zero compression ratio', () => {
      const noCompressionSummary = {
        ...mockSummary,
        compressionRatio: 0,
      };
      render(<SummaryCard summary={noCompressionSummary} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles 100% compression ratio', () => {
      const fullCompressionSummary = {
        ...mockSummary,
        compressionRatio: 1,
      };
      render(<SummaryCard summary={fullCompressionSummary} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles missing document name gracefully', () => {
      render(<SummaryCard summary={mockSummary} documentName={undefined} />);

      expect(screen.getByText(/Document doc-456/i)).toBeInTheDocument();
    });
  });
});
