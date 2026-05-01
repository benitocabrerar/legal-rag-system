/**
 * Card Component Unit Tests
 * Tests for card rendering, composition, and styling
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card Component', () => {
  describe('Card', () => {
    it('renders card with children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('applies default styling classes', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-white', 'shadow-sm');
    });

    it('accepts custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('forwards ref to div element', () => {
      const ref = { current: null };
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader', () => {
    it('renders header with children', () => {
      render(
        <Card>
          <CardHeader>Header Content</CardHeader>
        </Card>
      );
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('applies flex column layout', () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header</CardHeader>
        </Card>
      );
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });
  });

  describe('CardTitle', () => {
    it('renders title text', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>My Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('applies heading styling', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="title">Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });
  });

  describe('CardDescription', () => {
    it('renders description text', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>This is a description</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });

    it('applies muted text styling', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="desc">Description</CardDescription>
          </CardHeader>
        </Card>
      );
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('renders content children', () => {
      render(
        <Card>
          <CardContent>
            <p>Content paragraph</p>
          </CardContent>
        </Card>
      );
      expect(screen.getByText('Content paragraph')).toBeInTheDocument();
    });

    it('applies padding classes', () => {
      render(
        <Card>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });
  });

  describe('CardFooter', () => {
    it('renders footer children', () => {
      render(
        <Card>
          <CardFooter>Footer Content</CardFooter>
        </Card>
      );
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('applies flex layout', () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      );
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });
  });

  describe('Composition', () => {
    it('renders complete card with all subcomponents', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });

    it('allows nested components within card', () => {
      render(
        <Card>
          <CardContent>
            <div data-testid="nested">
              <span>Nested content</span>
            </div>
          </CardContent>
        </Card>
      );

      expect(screen.getByTestId('nested')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports aria attributes', () => {
      render(
        <Card aria-labelledby="card-title" data-testid="card">
          <CardHeader>
            <CardTitle id="card-title">Accessible Title</CardTitle>
          </CardHeader>
        </Card>
      );

      expect(screen.getByTestId('card')).toHaveAttribute('aria-labelledby', 'card-title');
    });

    it('supports role attribute', () => {
      render(
        <Card role="article" data-testid="card">
          Content
        </Card>
      );

      expect(screen.getByTestId('card')).toHaveAttribute('role', 'article');
    });
  });
});
