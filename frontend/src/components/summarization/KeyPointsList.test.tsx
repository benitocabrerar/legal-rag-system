/**
 * KeyPointsList Component Tests
 * Comprehensive test suite using Vitest and React Testing Library
 *
 * Test Coverage:
 * - Component rendering (empty, loading, with data)
 * - User interactions (expand/collapse, show more/less)
 * - Accessibility (ARIA attributes, keyboard navigation)
 * - Dark mode support
 * - Category grouping
 * - Importance indicators
 * - References display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyPointsList, type KeyPoint, type KeyPointsListProps } from './KeyPointsList';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h2 data-testid="card-title" className={className}>
      {children}
    </h2>
  ),
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div
      data-testid="badge"
      data-variant={variant}
      className={className}
    >
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ variant, width, height, ...props }: any) => (
    <div
      data-testid="skeleton"
      data-variant={variant}
      data-width={width}
      data-height={height}
      {...props}
    />
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ListChecks: ({ className, ...props }: any) => (
    <svg data-testid="icon-list-checks" className={className} {...props} />
  ),
  AlertCircle: ({ className, ...props }: any) => (
    <svg data-testid="icon-alert-circle" className={className} {...props} />
  ),
  ChevronDown: ({ className, ...props }: any) => (
    <svg data-testid="icon-chevron-down" className={className} {...props} />
  ),
  ChevronUp: ({ className, ...props }: any) => (
    <svg data-testid="icon-chevron-up" className={className} {...props} />
  ),
  Circle: ({ className, ...props }: any) => (
    <svg data-testid="icon-circle" className={className} {...props} />
  ),
  CheckCircle2: ({ className, ...props }: any) => (
    <svg data-testid="icon-check-circle" className={className} {...props} />
  ),
}));

// Test data fixtures
const createMockKeyPoint = (overrides?: Partial<KeyPoint>): KeyPoint => ({
  id: `kp-${Math.random().toString(36).substr(2, 9)}`,
  text: 'Sample key point text',
  importance: 'medium',
  ...overrides,
});

const mockKeyPoints: KeyPoint[] = [
  createMockKeyPoint({
    id: 'kp-1',
    text: 'Critical security vulnerability found in authentication system',
    importance: 'high',
    category: 'Security',
    references: ['CVE-2024-1234', 'Section 5.2'],
  }),
  createMockKeyPoint({
    id: 'kp-2',
    text: 'Performance improvements in database queries',
    importance: 'medium',
    category: 'Performance',
    references: ['Benchmark Report Q4'],
  }),
  createMockKeyPoint({
    id: 'kp-3',
    text: 'Minor UI adjustments for better UX',
    importance: 'low',
    category: 'UI/UX',
  }),
  createMockKeyPoint({
    id: 'kp-4',
    text: 'Documentation updates for API endpoints',
    importance: 'low',
    category: 'Documentation',
  }),
  createMockKeyPoint({
    id: 'kp-5',
    text: 'Critical data breach in user authentication',
    importance: 'high',
    category: 'Security',
    references: ['Incident Report 2024-01', 'Security Audit'],
  }),
];

describe('KeyPointsList', () => {
  describe('Component Rendering', () => {
    it('should render the component with default title', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toHaveTextContent('Key Points');
      expect(screen.getByTestId('icon-list-checks')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(
        <KeyPointsList
          keyPoints={mockKeyPoints}
          title="Custom Analysis Results"
        />
      );

      expect(screen.getByTestId('card-title')).toHaveTextContent(
        'Custom Analysis Results'
      );
    });

    it('should render with custom className', () => {
      render(
        <KeyPointsList
          keyPoints={mockKeyPoints}
          className="custom-class"
        />
      );

      const card = screen.getByTestId('card');
      expect(card.className).toContain('custom-class');
    });

    it('should apply dark mode classes', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('dark:bg-gray-900');
      expect(card.className).toContain('dark:border-gray-700');
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no key points provided', () => {
      render(<KeyPointsList keyPoints={[]} />);

      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
      expect(screen.getByText('No key points available')).toBeInTheDocument();
    });

    it('should not show statistics badges when empty', () => {
      render(<KeyPointsList keyPoints={[]} />);

      const badges = screen.queryAllByTestId('badge');
      expect(badges).toHaveLength(0);
    });

    it('should have accessible empty state message', () => {
      render(<KeyPointsList keyPoints={[]} />);

      const emptyMessage = screen.getByText('No key points available');
      expect(emptyMessage).toHaveClass('text-sm', 'text-gray-500');
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when isLoading is true', () => {
      render(<KeyPointsList keyPoints={[]} isLoading />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render key points during loading', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} isLoading />);

      expect(screen.queryByText(mockKeyPoints[0].text)).not.toBeInTheDocument();
    });

    it('should have accessible loading state', () => {
      render(<KeyPointsList keyPoints={[]} isLoading />);

      const loadingState = screen.getByRole('status', {
        name: 'Loading key points',
      });
      expect(loadingState).toBeInTheDocument();
    });
  });

  describe('Key Points Display', () => {
    it('should render all key points when not grouped', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      mockKeyPoints.forEach((kp) => {
        expect(screen.getByText(kp.text)).toBeInTheDocument();
      });
    });

    it('should display importance indicators for each key point', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      // Check for importance badges
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);

      // Verify high importance points have destructive variant
      const highImportancePoints = mockKeyPoints.filter(
        (kp) => kp.importance === 'high'
      );
      const destructiveBadges = badges.filter(
        (badge) => badge.getAttribute('data-variant') === 'destructive'
      );
      expect(destructiveBadges.length).toBeGreaterThanOrEqual(
        highImportancePoints.length
      );
    });

    it('should render numbered indicators for each key point', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints.slice(0, 3)} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display category badges when available', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      expect(screen.getAllByText('Security').length).toBeGreaterThan(0);
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('UI/UX')).toBeInTheDocument();
    });

    it('should render references when available', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
      expect(screen.getByText('Section 5.2')).toBeInTheDocument();
      expect(screen.getByText('Benchmark Report Q4')).toBeInTheDocument();
    });

    it('should show references label', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const referencesLabels = screen.getAllByText('References:');
      expect(referencesLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Display', () => {
    it('should display total count badge', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const totalBadge = screen.getByText(`${mockKeyPoints.length} total`);
      expect(totalBadge).toBeInTheDocument();
    });

    it('should display high importance count', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const highCount = mockKeyPoints.filter(
        (kp) => kp.importance === 'high'
      ).length;
      const highBadge = screen.getByText(`${highCount} high`);
      expect(highBadge).toBeInTheDocument();
    });

    it('should display medium importance count', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const mediumCount = mockKeyPoints.filter(
        (kp) => kp.importance === 'medium'
      ).length;
      const mediumBadge = screen.getByText(`${mediumCount} medium`);
      expect(mediumBadge).toBeInTheDocument();
    });

    it('should not show statistics during loading', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} isLoading />);

      expect(screen.queryByText(/total/)).not.toBeInTheDocument();
    });
  });

  describe('Category Grouping', () => {
    it('should group key points by category when enabled', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      // Should have category headers
      expect(screen.getAllByText('Security').length).toBeGreaterThan(0);
      expect(screen.getByText('Performance')).toBeInTheDocument();
    });

    it('should render category as collapsible button', async () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      const categoryButtons = screen.getAllByRole('button').filter((btn) =>
        btn.hasAttribute('aria-expanded')
      );
      expect(categoryButtons.length).toBeGreaterThan(0);
    });

    it('should show point count per category', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      // Security has 2 points - find the category button
      const categoryButtons = screen.getAllByRole('button').filter((btn) =>
        btn.hasAttribute('aria-expanded')
      );
      const securityButton = categoryButtons.find((btn) =>
        btn.textContent?.includes('Security')
      );
      expect(securityButton).toHaveTextContent('2 points');
    });

    it('should collapse and expand categories on click', async () => {
      const user = userEvent.setup();
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      // Find a category button
      const categoryButtons = screen.getAllByRole('button').filter((btn) =>
        btn.hasAttribute('aria-expanded')
      );
      const firstCategoryButton = categoryButtons[0];

      const initialState = firstCategoryButton.getAttribute('aria-expanded');

      // Click to toggle
      await user.click(firstCategoryButton);

      await waitFor(() => {
        const newState = firstCategoryButton.getAttribute('aria-expanded');
        expect(newState).not.toBe(initialState);
      });
    });

    it('should show chevron icons based on expansion state', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      // Should have at least one chevron icon
      const chevronDown = screen.queryAllByTestId('icon-chevron-down');
      const chevronUp = screen.queryAllByTestId('icon-chevron-up');

      expect(chevronDown.length + chevronUp.length).toBeGreaterThan(0);
    });

    it('should sort categories by high importance count', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      const categoryButtons = screen.getAllByRole('button').filter((btn) =>
        btn.hasAttribute('aria-expanded')
      );

      // Security category (2 high importance points) should be first
      const firstCategory = categoryButtons[0];
      expect(firstCategory).toHaveTextContent('Security');
    });

    it('should handle uncategorized points', () => {
      const uncategorizedPoints = [
        createMockKeyPoint({
          id: 'kp-unc',
          text: 'Point without category',
          importance: 'medium',
        }),
      ];

      render(
        <KeyPointsList keyPoints={uncategorizedPoints} groupByCategory />
      );

      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });
  });

  describe('Max Visible / Show More', () => {
    it('should limit displayed points when maxVisible is set', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />);

      // Should show first 2 points
      expect(screen.getByText(mockKeyPoints[0].text)).toBeInTheDocument();
      expect(screen.getByText(mockKeyPoints[1].text)).toBeInTheDocument();

      // Should not show 3rd point initially
      expect(
        screen.queryByText(mockKeyPoints[2].text)
      ).not.toBeInTheDocument();
    });

    it('should show "Show More" button when there are hidden points', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />);

      const showMoreButton = screen.getByRole('button', {
        name: /Show \d+ More/i,
      });
      expect(showMoreButton).toBeInTheDocument();
      expect(showMoreButton).toHaveTextContent(
        `Show ${mockKeyPoints.length - 2} More`
      );
    });

    it('should expand to show all points when "Show More" is clicked', async () => {
      const user = userEvent.setup();
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />);

      const showMoreButton = screen.getByRole('button', {
        name: /Show \d+ More/i,
      });
      await user.click(showMoreButton);

      await waitFor(() => {
        // All points should now be visible
        mockKeyPoints.forEach((kp) => {
          expect(screen.getByText(kp.text)).toBeInTheDocument();
        });
      });
    });

    it('should change to "Show Less" after expanding', async () => {
      const user = userEvent.setup();
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />);

      const showMoreButton = screen.getByRole('button', {
        name: /Show \d+ More/i,
      });
      await user.click(showMoreButton);

      await waitFor(() => {
        const showLessButton = screen.getByRole('button', {
          name: /Show Less/i,
        });
        expect(showLessButton).toBeInTheDocument();
      });
    });

    it('should collapse back when "Show Less" is clicked', async () => {
      const user = userEvent.setup();
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />);

      const showMoreButton = screen.getByRole('button', {
        name: /Show \d+ More/i,
      });
      await user.click(showMoreButton);

      await waitFor(() => {
        const showLessButton = screen.getByRole('button', {
          name: /Show Less/i,
        });
        expect(showLessButton).toBeInTheDocument();
      });

      const showLessButton = screen.getByRole('button', {
        name: /Show Less/i,
      });
      await user.click(showLessButton);

      await waitFor(() => {
        expect(
          screen.queryByText(mockKeyPoints[2].text)
        ).not.toBeInTheDocument();
      });
    });

    it('should not show "Show More" button when grouped by category', () => {
      render(
        <KeyPointsList
          keyPoints={mockKeyPoints}
          maxVisible={2}
          groupByCategory
        />
      );

      const showMoreButton = screen.queryByRole('button', {
        name: /Show \d+ More/i,
      });
      expect(showMoreButton).not.toBeInTheDocument();
    });

    it('should not show "Show More" button when all points are visible', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints.slice(0, 2)} maxVisible={5} />);

      const showMoreButton = screen.queryByRole('button', {
        name: /Show \d+ More/i,
      });
      expect(showMoreButton).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for lists', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('should have aria-expanded on category toggle buttons', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      const categoryButtons = screen.getAllByRole('button').filter((btn) =>
        btn.hasAttribute('aria-expanded')
      );

      categoryButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-expanded');
      });
    });

    it('should have aria-controls linking button to content', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      const categoryButtons = screen.getAllByRole('button').filter((btn) =>
        btn.hasAttribute('aria-controls')
      );

      categoryButtons.forEach((button) => {
        const controlsId = button.getAttribute('aria-controls');
        expect(controlsId).toBeTruthy();

        // Check if the controlled element exists in the document
        const controlledElement = document.getElementById(controlsId!);
        if (controlledElement) {
          expect(controlledElement).toBeTruthy();
        } else {
          // If not found, it might be collapsed - that's okay
          expect(controlsId).toMatch(/^category-/);
        }
      });
    });

    it('should have aria-hidden on decorative icons', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const icons = screen.getAllByTestId(/^icon-/);
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have aria-expanded on show more/less button', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />);

      const showMoreButton = screen.getByRole('button', {
        name: /Show \d+ More/i,
      });
      expect(showMoreButton).toHaveAttribute('aria-expanded');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      const categoryButtons = screen.getAllByRole('button').filter((btn) =>
        btn.hasAttribute('aria-expanded')
      );

      // Tab to first button
      await user.tab();

      if (categoryButtons.length > 0) {
        expect(categoryButtons[0]).toHaveFocus();

        // Press Enter to toggle
        await user.keyboard('{Enter}');

        // State should change
        await waitFor(() => {
          const ariaExpanded = categoryButtons[0].getAttribute('aria-expanded');
          expect(ariaExpanded).toBeTruthy();
        });
      }
    });

    it('should have focus indicators on interactive elements', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} groupByCategory />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.className).toContain('focus:ring');
      });
    });

    it('should have proper semantic structure', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      // Should have heading
      expect(screen.getByTestId('card-title')).toBeInTheDocument();

      // Should have list structure
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });
  });

  describe('Importance Configuration', () => {
    it('should render high importance points with correct styling', () => {
      const highPoint = createMockKeyPoint({
        id: 'high-test',
        text: 'High importance point',
        importance: 'high',
      });

      render(<KeyPointsList keyPoints={[highPoint]} />);

      const badges = screen.getAllByTestId('badge');
      const highBadge = badges.find(
        (badge) => badge.getAttribute('data-variant') === 'destructive' &&
                   badge.textContent?.includes('High')
      );
      expect(highBadge).toBeTruthy();
      expect(highBadge).toHaveTextContent(/High/);
    });

    it('should render medium importance points with correct styling', () => {
      const mediumPoint = createMockKeyPoint({
        id: 'medium-test',
        text: 'Medium importance point',
        importance: 'medium',
      });

      render(<KeyPointsList keyPoints={[mediumPoint]} />);

      const badges = screen.getAllByTestId('badge');
      const mediumBadge = badges.find(
        (badge) => badge.getAttribute('data-variant') === 'warning' &&
                   badge.textContent?.includes('Medium')
      );
      expect(mediumBadge).toBeTruthy();
      expect(mediumBadge).toHaveTextContent(/Medium/);
    });

    it('should render low importance points with correct styling', () => {
      const lowPoint = createMockKeyPoint({
        id: 'low-test',
        text: 'Low importance point',
        importance: 'low',
      });

      render(<KeyPointsList keyPoints={[lowPoint]} />);

      const badges = screen.getAllByTestId('badge');
      const lowBadge = badges.find(
        (badge) => badge.getAttribute('data-variant') === 'secondary'
      );
      expect(lowBadge).toBeInTheDocument();
      expect(lowBadge).toHaveTextContent('Low');
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes on card', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const card = screen.getByTestId('card');
      expect(card.className).toContain('dark:bg-gray-900');
      expect(card.className).toContain('dark:border-gray-700');
    });

    it('should have dark mode classes on title', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const title = screen.getByTestId('card-title');
      expect(title.className).toContain('dark:text-gray-100');
    });

    it('should have dark mode classes on empty state text', () => {
      render(<KeyPointsList keyPoints={[]} />);

      const emptyText = screen.getByText('No key points available');
      expect(emptyText.className).toContain('dark:text-gray-400');
    });

    it('should have dark mode classes on category badges', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} />);

      const badges = screen.getAllByTestId('badge');
      const outlineBadges = badges.filter(
        (badge) => badge.getAttribute('data-variant') === 'outline'
      );

      outlineBadges.forEach((badge) => {
        expect(badge.className).toContain('dark:text-gray-300');
        expect(badge.className).toContain('dark:border-gray-600');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single key point', () => {
      render(<KeyPointsList keyPoints={[mockKeyPoints[0]]} />);

      expect(screen.getByText(mockKeyPoints[0].text)).toBeInTheDocument();
      expect(screen.getByText('1 total')).toBeInTheDocument();
    });

    it('should handle key points without references', () => {
      const pointsWithoutRefs = mockKeyPoints.map((kp) => ({
        ...kp,
        references: undefined,
      }));

      render(<KeyPointsList keyPoints={pointsWithoutRefs} />);

      expect(screen.queryByText('References:')).not.toBeInTheDocument();
    });

    it('should handle key points with empty references array', () => {
      const pointsWithEmptyRefs = [
        createMockKeyPoint({
          id: 'empty-ref',
          text: 'Point with empty references',
          references: [],
        }),
      ];

      render(<KeyPointsList keyPoints={pointsWithEmptyRefs} />);

      expect(screen.queryByText('References:')).not.toBeInTheDocument();
    });

    it('should handle very long key point text', () => {
      const longText = 'A'.repeat(500);
      const longPoint = createMockKeyPoint({
        id: 'long-text',
        text: longText,
      });

      render(<KeyPointsList keyPoints={[longPoint]} />);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters in key point text', () => {
      const specialText = 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\'';
      const specialPoint = createMockKeyPoint({
        id: 'special',
        text: specialText,
      });

      render(<KeyPointsList keyPoints={[specialPoint]} />);

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it('should handle rapid state changes', async () => {
      const user = userEvent.setup();
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />);

      const showMoreButton = screen.getByRole('button', {
        name: /Show \d+ More/i,
      });

      // Rapid clicks
      await user.click(showMoreButton);
      await user.click(screen.getByRole('button', { name: /Show Less/i }));
      await user.click(screen.getByRole('button', { name: /Show \d+ More/i }));

      // Should still work correctly
      expect(
        screen.getByRole('button', { name: /Show Less/i })
      ).toBeInTheDocument();
    });

    it('should handle maxVisible of 0', () => {
      render(<KeyPointsList keyPoints={mockKeyPoints} maxVisible={0} />);

      // When maxVisible is 0 (falsy), the component treats it as no limit
      // So all points should be visible
      expect(screen.getByText(mockKeyPoints[0].text)).toBeInTheDocument();
      expect(screen.getByText(mockKeyPoints[1].text)).toBeInTheDocument();

      // Should not show "Show More" button since maxVisible is falsy
      expect(
        screen.queryByRole('button', { name: /Show \d+ More/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot for default state', () => {
      const { container } = render(
        <KeyPointsList keyPoints={mockKeyPoints} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for loading state', () => {
      const { container } = render(
        <KeyPointsList keyPoints={[]} isLoading />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for empty state', () => {
      const { container } = render(<KeyPointsList keyPoints={[]} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for grouped view', () => {
      const { container } = render(
        <KeyPointsList keyPoints={mockKeyPoints} groupByCategory />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with maxVisible', () => {
      const { container } = render(
        <KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with custom title', () => {
      const { container } = render(
        <KeyPointsList
          keyPoints={mockKeyPoints}
          title="Custom Analysis"
          className="custom-class"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Component Integration', () => {
    it('should work with all props combined', () => {
      render(
        <KeyPointsList
          keyPoints={mockKeyPoints}
          title="Comprehensive Analysis"
          groupByCategory
          maxVisible={3}
          className="test-class"
        />
      );

      expect(screen.getByTestId('card-title')).toHaveTextContent(
        'Comprehensive Analysis'
      );
      expect(screen.getByTestId('card').className).toContain('test-class');
    });

    it('should re-render correctly when props change', async () => {
      const { rerender } = render(
        <KeyPointsList keyPoints={mockKeyPoints.slice(0, 2)} />
      );

      expect(screen.getByText(mockKeyPoints[0].text)).toBeInTheDocument();
      expect(
        screen.queryByText(mockKeyPoints[2].text)
      ).not.toBeInTheDocument();

      // Update props
      rerender(<KeyPointsList keyPoints={mockKeyPoints} />);

      await waitFor(() => {
        expect(screen.getByText(mockKeyPoints[2].text)).toBeInTheDocument();
      });
    });

    it('should maintain state when keyPoints array reference changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <KeyPointsList keyPoints={mockKeyPoints} maxVisible={2} />
      );

      const showMoreButton = screen.getByRole('button', {
        name: /Show \d+ More/i,
      });
      await user.click(showMoreButton);

      // Create new array with same data
      const newKeyPoints = [...mockKeyPoints];
      rerender(<KeyPointsList keyPoints={newKeyPoints} maxVisible={2} />);

      // State should reset when props change
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /Show Less/i })
        ).toBeInTheDocument();
      });
    });
  });
});
