import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryOptions as SummaryOptionsComponent, type SummaryOptions } from './SummaryOptions';

describe('SummaryOptions', () => {
  const defaultOptions: SummaryOptions = {
    level: 'standard',
    language: 'es',
    includeKeyPoints: true,
    includeReferences: false,
  };

  const mockOnOptionsChange = jest.fn();

  beforeEach(() => {
    mockOnOptionsChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render all main sections', () => {
      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      expect(screen.getByText('Opciones de Resumen')).toBeInTheDocument();
      expect(screen.getByLabelText(/nivel de detalle/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/idioma/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/incluir puntos clave/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/incluir referencias/i)).toBeInTheDocument();
    });

    it('should render with correct initial values', () => {
      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const keyPointsCheckbox = screen.getByLabelText(/incluir puntos clave/i);
      const referencesCheckbox = screen.getByLabelText(/incluir referencias/i);

      expect(keyPointsCheckbox).toBeChecked();
      expect(referencesCheckbox).not.toBeChecked();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
          className="custom-class"
        />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Level Selection', () => {
    it('should call onOptionsChange when level changes', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const levelSelect = screen.getByLabelText(/nivel de detalle/i);
      await user.click(levelSelect);

      const detailedOption = await screen.findByText(/Detallado - Análisis completo/i);
      await user.click(detailedOption);

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        level: 'detailed',
      });
    });
  });

  describe('Language Selection', () => {
    it('should call onOptionsChange when language changes', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const languageSelect = screen.getByLabelText(/idioma/i);
      await user.click(languageSelect);

      const englishOption = await screen.findByText('English');
      await user.click(englishOption);

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        language: 'en',
      });
    });
  });

  describe('Checkbox Toggles', () => {
    it('should toggle includeKeyPoints checkbox', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const checkbox = screen.getByLabelText(/incluir puntos clave/i);
      await user.click(checkbox);

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        includeKeyPoints: false,
      });
    });

    it('should toggle includeReferences checkbox', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const checkbox = screen.getByLabelText(/incluir referencias/i);
      await user.click(checkbox);

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        includeReferences: true,
      });
    });
  });

  describe('Max Length Input', () => {
    it('should accept valid max length values', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByLabelText(/longitud máxima/i);
      await user.clear(input);
      await user.type(input, '1500');

      await waitFor(() => {
        expect(mockOnOptionsChange).toHaveBeenCalledWith({
          ...defaultOptions,
          maxLength: 1500,
        });
      });
    });

    it('should show error for values below minimum', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByLabelText(/longitud máxima/i);
      await user.clear(input);
      await user.type(input, '50');

      await waitFor(() => {
        expect(screen.getByText(/debe estar entre 100 y 5000/i)).toBeInTheDocument();
      });
    });

    it('should show error for values above maximum', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByLabelText(/longitud máxima/i);
      await user.clear(input);
      await user.type(input, '6000');

      await waitFor(() => {
        expect(screen.getByText(/debe estar entre 100 y 5000/i)).toBeInTheDocument();
      });
    });

    it('should clear maxLength when input is empty', async () => {
      const user = userEvent.setup();
      const optionsWithMaxLength = { ...defaultOptions, maxLength: 1000 };

      render(
        <SummaryOptionsComponent
          options={optionsWithMaxLength}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByLabelText(/longitud máxima/i);
      await user.clear(input);

      await waitFor(() => {
        expect(mockOnOptionsChange).toHaveBeenCalledWith({
          ...defaultOptions,
          maxLength: undefined,
        });
      });
    });
  });

  describe('Focus Areas', () => {
    it('should toggle predefined focus areas', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const badge = screen.getByText('Aspectos Legales');
      await user.click(badge);

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        focusAreas: ['Aspectos Legales'],
      });
    });

    it('should add custom focus area', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByPlaceholderText(/agregar área personalizada/i);
      await user.type(input, 'Custom Area');

      const addButton = screen.getByRole('button', { name: /agregar área de enfoque personalizada/i });
      await user.click(addButton);

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        focusAreas: ['Custom Area'],
      });
    });

    it('should add custom focus area on Enter key', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByPlaceholderText(/agregar área personalizada/i);
      await user.type(input, 'Custom Area{Enter}');

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        focusAreas: ['Custom Area'],
      });
    });

    it('should remove custom focus area', async () => {
      const user = userEvent.setup();
      const optionsWithFocusAreas = {
        ...defaultOptions,
        focusAreas: ['Custom Area'],
      };

      render(
        <SummaryOptionsComponent
          options={optionsWithFocusAreas}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const removeButton = screen.getByLabelText(/eliminar custom area/i);
      await user.click(removeButton);

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        focusAreas: undefined,
      });
    });

    it('should not add duplicate focus areas', async () => {
      const user = userEvent.setup();
      const optionsWithFocusArea = {
        ...defaultOptions,
        focusAreas: ['Custom Area'],
      };

      render(
        <SummaryOptionsComponent
          options={optionsWithFocusArea}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByPlaceholderText(/agregar área personalizada/i);
      await user.type(input, 'Custom Area');

      const addButton = screen.getByRole('button', { name: /agregar área de enfoque personalizada/i });
      await user.click(addButton);

      expect(mockOnOptionsChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable all interactive elements when disabled prop is true', () => {
      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
          disabled={true}
        />
      );

      const levelSelect = screen.getByLabelText(/nivel de detalle/i);
      const languageSelect = screen.getByLabelText(/idioma/i);
      const keyPointsCheckbox = screen.getByLabelText(/incluir puntos clave/i);
      const referencesCheckbox = screen.getByLabelText(/incluir referencias/i);
      const maxLengthInput = screen.getByLabelText(/longitud máxima/i);

      expect(levelSelect).toBeDisabled();
      expect(languageSelect).toBeDisabled();
      expect(keyPointsCheckbox).toBeDisabled();
      expect(referencesCheckbox).toBeDisabled();
      expect(maxLengthInput).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      expect(screen.getByLabelText(/seleccionar nivel de detalle/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/seleccionar idioma/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/incluir puntos clave en el resumen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/incluir referencias legales en el resumen/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation for focus areas', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const badge = screen.getByText('Aspectos Legales');
      badge.focus();
      await user.keyboard('{Enter}');

      expect(mockOnOptionsChange).toHaveBeenCalledWith({
        ...defaultOptions,
        focusAreas: ['Aspectos Legales'],
      });
    });

    it('should have proper aria-invalid on max length error', async () => {
      const user = userEvent.setup();

      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      const input = screen.getByLabelText(/longitud máxima/i);
      await user.clear(input);
      await user.type(input, '50');

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Configuration Summary', () => {
    it('should show configuration summary when options are set', () => {
      const optionsWithAll: SummaryOptions = {
        level: 'detailed',
        language: 'en',
        includeKeyPoints: true,
        includeReferences: true,
        maxLength: 2000,
        focusAreas: ['Aspectos Legales', 'Obligaciones'],
      };

      render(
        <SummaryOptionsComponent
          options={optionsWithAll}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      expect(screen.getByText(/configuración actual/i)).toBeInTheDocument();
      expect(screen.getByText(/detallado/i)).toBeInTheDocument();
      expect(screen.getByText(/english/i)).toBeInTheDocument();
      expect(screen.getByText(/2000 palabras/i)).toBeInTheDocument();
      expect(screen.getByText(/áreas de enfoque: 2/i)).toBeInTheDocument();
    });

    it('should not show summary when no optional fields are set', () => {
      render(
        <SummaryOptionsComponent
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      expect(screen.queryByText(/configuración actual/i)).not.toBeInTheDocument();
    });
  });
});
