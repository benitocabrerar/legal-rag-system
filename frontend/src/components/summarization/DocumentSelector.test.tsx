import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DocumentSelector, type LegalDocument } from './DocumentSelector';

describe('DocumentSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Single Selection Mode', () => {
    it('renders with placeholder text', () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
          placeholder="Select a document"
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select a document')).toBeInTheDocument();
    });

    it('opens dropdown when clicked', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar documentos...')).toBeInTheDocument();
      });
    });

    it('displays document list when opened', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Constitución del Ecuador/i)).toBeInTheDocument();
        expect(screen.getByText(/Código Civil Ecuatoriano/i)).toBeInTheDocument();
      });
    });

    it('selects a document when clicked', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        const document = screen.getByText(/Constitución del Ecuador/i);
        fireEvent.click(document);
      });

      expect(mockOnChange).toHaveBeenCalledWith('1');
    });

    it('displays selected document title', () => {
      render(
        <DocumentSelector
          value="1"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Constitución del Ecuador/i)).toBeInTheDocument();
    });

    it('clears selection when clear button clicked', async () => {
      render(
        <DocumentSelector
          value="1"
          onChange={mockOnChange}
        />
      );

      const clearButton = screen.getByRole('button');
      const xIcon = clearButton.querySelector('svg');

      if (xIcon) {
        await userEvent.click(xIcon);
        expect(mockOnChange).toHaveBeenCalledWith('');
      }
    });

    it('filters documents based on search input', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Buscar documentos...');
        fireEvent.change(searchInput, { target: { value: 'constitución' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Constitución del Ecuador/i)).toBeInTheDocument();
        expect(screen.queryByText(/Código Civil/i)).not.toBeInTheDocument();
      });
    });

    it('shows empty state when no results found', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Buscar documentos...');
        fireEvent.change(searchInput, { target: { value: 'nonexistent document' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/No se encontraron documentos/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Selection Mode', () => {
    it('allows multiple document selection', async () => {
      render(
        <DocumentSelector
          value={[]}
          onChange={mockOnChange}
          multiple
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(async () => {
        const doc1 = screen.getByText(/Constitución del Ecuador/i);
        await userEvent.click(doc1);
      });

      expect(mockOnChange).toHaveBeenCalledWith(['1']);

      await waitFor(async () => {
        const doc2 = screen.getByText(/Código Civil Ecuatoriano/i);
        await userEvent.click(doc2);
      });

      expect(mockOnChange).toHaveBeenCalledWith(['2']);
    });

    it('displays selected count in button text', () => {
      render(
        <DocumentSelector
          value={['1', '2']}
          onChange={mockOnChange}
          multiple
        />
      );

      expect(screen.getByText('2 documentos seleccionados')).toBeInTheDocument();
    });

    it('shows selected documents as badges', () => {
      render(
        <DocumentSelector
          value={['1', '2']}
          onChange={mockOnChange}
          multiple
        />
      );

      expect(screen.getByText(/Constitución del Ecuador/i)).toBeInTheDocument();
      expect(screen.getByText(/Código Civil Ecuatoriano/i)).toBeInTheDocument();
    });

    it('removes document when badge close button clicked', async () => {
      render(
        <DocumentSelector
          value={['1', '2']}
          onChange={mockOnChange}
          multiple
        />
      );

      const badges = screen.getAllByRole('button');
      const removeButton = badges.find(button =>
        button.getAttribute('aria-label')?.includes('Eliminar')
      );

      if (removeButton) {
        await userEvent.click(removeButton);
        expect(mockOnChange).toHaveBeenCalled();
      }
    });

    it('respects maxSelections limit', async () => {
      render(
        <DocumentSelector
          value={['1', '2']}
          onChange={mockOnChange}
          multiple
          maxSelections={2}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Límite máximo de 2 documentos alcanzado/i)).toBeInTheDocument();
      });
    });

    it('disables additional selections when max reached', async () => {
      render(
        <DocumentSelector
          value={['1', '2']}
          onChange={mockOnChange}
          multiple
          maxSelections={2}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        const doc3 = screen.getByText(/Ley Orgánica de Garantías/i);
        const commandItem = doc3.closest('[data-disabled]');
        expect(commandItem).toHaveAttribute('data-disabled');
      });
    });

    it('clears all selections when clear button clicked', async () => {
      render(
        <DocumentSelector
          value={['1', '2']}
          onChange={mockOnChange}
          multiple
        />
      );

      const clearButton = screen.getByRole('button');
      const xIcon = clearButton.querySelector('svg');

      if (xIcon) {
        await userEvent.click(xIcon);
        expect(mockOnChange).toHaveBeenCalledWith([]);
      }
    });
  });

  describe('Disabled State', () => {
    it('disables the selector when disabled prop is true', () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
          disabled
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });

    it('does not show clear button when disabled', () => {
      render(
        <DocumentSelector
          value="1"
          onChange={mockOnChange}
          disabled
        />
      );

      const button = screen.getByRole('combobox');
      const xIcon = button.querySelector('svg[class*="X"]');
      expect(xIcon).not.toBeInTheDocument();
    });

    it('does not show remove buttons on badges when disabled', () => {
      render(
        <DocumentSelector
          value={['1', '2']}
          onChange={mockOnChange}
          multiple
          disabled
        />
      );

      const removeButtons = screen.queryAllByLabelText(/Eliminar/i);
      expect(removeButtons).toHaveLength(0);
    });
  });

  describe('Document Metadata Display', () => {
    it('displays document type badge', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Constitución')).toBeInTheDocument();
        expect(screen.getByText('Código')).toBeInTheDocument();
      });
    });

    it('displays jurisdiction information', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        const nacionalElements = screen.getAllByText('Nacional');
        expect(nacionalElements.length).toBeGreaterThan(0);
      });
    });

    it('displays document number and year when available', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Año 2008/i)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-label', 'Seleccionar documentos');
    });

    it('supports keyboard navigation', async () => {
      render(
        <DocumentSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      trigger.focus();

      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar documentos...')).toBeInTheDocument();
      });
    });
  });
});
