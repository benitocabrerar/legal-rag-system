"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Configuration options for document summarization
 */
export interface SummaryOptions {
  level: 'brief' | 'standard' | 'detailed';
  language: 'es' | 'en';
  includeKeyPoints: boolean;
  includeReferences: boolean;
  maxLength?: number;
  focusAreas?: string[];
}

/**
 * Props for the SummaryOptions component
 */
export interface SummaryOptionsProps {
  options: SummaryOptions;
  onOptionsChange: (options: SummaryOptions) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Predefined focus areas available for selection
 */
const PREDEFINED_FOCUS_AREAS = [
  'Aspectos Legales',
  'Obligaciones',
  'Derechos',
  'Plazos',
  'Sanciones',
  'Procedimientos',
  'Excepciones',
  'Definiciones',
];

/**
 * SummaryOptions Component
 *
 * Provides UI controls for configuring document summarization options.
 * Includes level selection, language toggle, feature checkboxes, max length input,
 * and multi-select focus areas.
 *
 * @example
 * ```tsx
 * const [options, setOptions] = useState<SummaryOptions>({
 *   level: 'standard',
 *   language: 'es',
 *   includeKeyPoints: true,
 *   includeReferences: false,
 * });
 *
 * <SummaryOptions
 *   options={options}
 *   onOptionsChange={setOptions}
 * />
 * ```
 */
export function SummaryOptions({
  options,
  onOptionsChange,
  disabled = false,
  className,
}: SummaryOptionsProps) {
  const [customFocusArea, setCustomFocusArea] = React.useState('');
  const [maxLengthInput, setMaxLengthInput] = React.useState(
    options.maxLength?.toString() || ''
  );
  const [showMaxLengthError, setShowMaxLengthError] = React.useState(false);

  const handleLevelChange = (value: string) => {
    onOptionsChange({
      ...options,
      level: value as SummaryOptions['level'],
    });
  };

  const handleLanguageChange = (value: string) => {
    onOptionsChange({
      ...options,
      language: value as SummaryOptions['language'],
    });
  };

  const handleCheckboxChange = (
    field: 'includeKeyPoints' | 'includeReferences',
    checked: boolean
  ) => {
    onOptionsChange({
      ...options,
      [field]: checked,
    });
  };

  const handleMaxLengthChange = (value: string) => {
    setMaxLengthInput(value);

    if (value === '') {
      setShowMaxLengthError(false);
      onOptionsChange({
        ...options,
        maxLength: undefined,
      });
      return;
    }

    const numValue = parseInt(value, 10);

    if (isNaN(numValue) || numValue < 100 || numValue > 5000) {
      setShowMaxLengthError(true);
      return;
    }

    setShowMaxLengthError(false);
    onOptionsChange({
      ...options,
      maxLength: numValue,
    });
  };

  const handleFocusAreaToggle = (area: string) => {
    const currentAreas = options.focusAreas || [];
    const newAreas = currentAreas.includes(area)
      ? currentAreas.filter((a) => a !== area)
      : [...currentAreas, area];

    onOptionsChange({
      ...options,
      focusAreas: newAreas.length > 0 ? newAreas : undefined,
    });
  };

  const handleAddCustomFocusArea = () => {
    if (!customFocusArea.trim()) return;

    const currentAreas = options.focusAreas || [];

    if (!currentAreas.includes(customFocusArea.trim())) {
      onOptionsChange({
        ...options,
        focusAreas: [...currentAreas, customFocusArea.trim()],
      });
    }

    setCustomFocusArea('');
  };

  const handleRemoveFocusArea = (area: string) => {
    const currentAreas = options.focusAreas || [];
    const newAreas = currentAreas.filter((a) => a !== area);

    onOptionsChange({
      ...options,
      focusAreas: newAreas.length > 0 ? newAreas : undefined,
    });
  };

  const selectedFocusAreas = options.focusAreas || [];

  return (
    <Card className={cn("w-full dark:bg-gray-800 dark:border-gray-700", className)}>
      <CardHeader>
        <CardTitle className="text-lg dark:text-gray-100">
          Opciones de Resumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Level */}
        <div className="space-y-2">
          <Label
            htmlFor="summary-level"
            className="dark:text-gray-200"
          >
            Nivel de Detalle
          </Label>
          <Select
            value={options.level}
            onValueChange={handleLevelChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="summary-level"
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              aria-label="Seleccionar nivel de detalle del resumen"
            >
              <SelectValue placeholder="Seleccione un nivel" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem
                value="brief"
                className="dark:text-gray-100 dark:focus:bg-gray-700"
              >
                Breve - Resumen conciso
              </SelectItem>
              <SelectItem
                value="standard"
                className="dark:text-gray-100 dark:focus:bg-gray-700"
              >
                Estándar - Balance detalle/brevedad
              </SelectItem>
              <SelectItem
                value="detailed"
                className="dark:text-gray-100 dark:focus:bg-gray-700"
              >
                Detallado - Análisis completo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label
            htmlFor="summary-language"
            className="dark:text-gray-200"
          >
            Idioma
          </Label>
          <Select
            value={options.language}
            onValueChange={handleLanguageChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="summary-language"
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              aria-label="Seleccionar idioma del resumen"
            >
              <SelectValue placeholder="Seleccione un idioma" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem
                value="es"
                className="dark:text-gray-100 dark:focus:bg-gray-700"
              >
                Español
              </SelectItem>
              <SelectItem
                value="en"
                className="dark:text-gray-100 dark:focus:bg-gray-700"
              >
                English
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-key-points"
              checked={options.includeKeyPoints}
              onCheckedChange={(checked) =>
                handleCheckboxChange('includeKeyPoints', checked as boolean)
              }
              disabled={disabled}
              aria-label="Incluir puntos clave en el resumen"
              className="dark:border-gray-600"
            />
            <Label
              htmlFor="include-key-points"
              className="text-sm font-normal cursor-pointer dark:text-gray-200"
            >
              Incluir puntos clave destacados
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-references"
              checked={options.includeReferences}
              onCheckedChange={(checked) =>
                handleCheckboxChange('includeReferences', checked as boolean)
              }
              disabled={disabled}
              aria-label="Incluir referencias legales en el resumen"
              className="dark:border-gray-600"
            />
            <Label
              htmlFor="include-references"
              className="text-sm font-normal cursor-pointer dark:text-gray-200"
            >
              Incluir referencias y citas legales
            </Label>
          </div>
        </div>

        {/* Max Length Input */}
        <div className="space-y-2">
          <Label
            htmlFor="max-length"
            className="dark:text-gray-200"
          >
            Longitud Máxima (opcional)
          </Label>
          <Input
            id="max-length"
            type="number"
            min={100}
            max={5000}
            step={50}
            placeholder="Ej: 1000"
            value={maxLengthInput}
            onChange={(e) => handleMaxLengthChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500",
              showMaxLengthError && "border-red-500 dark:border-red-500"
            )}
            aria-label="Longitud máxima del resumen en palabras"
            aria-describedby="max-length-hint"
            aria-invalid={showMaxLengthError}
          />
          <p
            id="max-length-hint"
            className={cn(
              "text-xs",
              showMaxLengthError
                ? "text-red-500 dark:text-red-400"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            {showMaxLengthError
              ? "Debe estar entre 100 y 5000 palabras"
              : "Número aproximado de palabras (100-5000)"}
          </p>
        </div>

        {/* Focus Areas */}
        <div className="space-y-3">
          <Label className="dark:text-gray-200">
            Áreas de Enfoque (opcional)
          </Label>

          {/* Predefined Focus Areas */}
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_FOCUS_AREAS.map((area) => (
              <Badge
                key={area}
                variant={selectedFocusAreas.includes(area) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  disabled && "opacity-50 cursor-not-allowed",
                  selectedFocusAreas.includes(area)
                    ? "dark:bg-blue-600 dark:text-white"
                    : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
                onClick={() => !disabled && handleFocusAreaToggle(area)}
                role="checkbox"
                aria-checked={selectedFocusAreas.includes(area)}
                aria-label={`Enfocar en ${area}`}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                    e.preventDefault();
                    handleFocusAreaToggle(area);
                  }
                }}
              >
                {area}
              </Badge>
            ))}
          </div>

          {/* Selected Focus Areas (including custom ones) */}
          {selectedFocusAreas.some(
            (area) => !PREDEFINED_FOCUS_AREAS.includes(area)
          ) && (
            <div className="pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Áreas personalizadas:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedFocusAreas
                  .filter((area) => !PREDEFINED_FOCUS_AREAS.includes(area))
                  .map((area) => (
                    <Badge
                      key={area}
                      variant="secondary"
                      className="dark:bg-gray-700 dark:text-gray-100"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => handleRemoveFocusArea(area)}
                        disabled={disabled}
                        className={cn(
                          "ml-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600",
                          disabled && "cursor-not-allowed opacity-50"
                        )}
                        aria-label={`Eliminar ${area}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Custom Focus Area Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Agregar área personalizada..."
              value={customFocusArea}
              onChange={(e) => setCustomFocusArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomFocusArea();
                }
              }}
              disabled={disabled}
              className="flex-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
              aria-label="Agregar área de enfoque personalizada"
            />
            <button
              type="button"
              onClick={handleAddCustomFocusArea}
              disabled={disabled || !customFocusArea.trim()}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700",
                "dark:bg-blue-700 dark:hover:bg-blue-600",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              )}
              aria-label="Agregar área de enfoque personalizada"
            >
              Agregar
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Seleccione o agregue áreas específicas para enfocar el resumen
          </p>
        </div>

        {/* Summary of Selected Options */}
        {(options.maxLength || selectedFocusAreas.length > 0) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Configuración actual:
            </p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>
                Nivel: <span className="font-medium">
                  {options.level === 'brief' && 'Breve'}
                  {options.level === 'standard' && 'Estándar'}
                  {options.level === 'detailed' && 'Detallado'}
                </span>
              </p>
              <p>
                Idioma: <span className="font-medium">
                  {options.language === 'es' ? 'Español' : 'English'}
                </span>
              </p>
              {options.maxLength && (
                <p>
                  Longitud máxima: <span className="font-medium">{options.maxLength} palabras</span>
                </p>
              )}
              {selectedFocusAreas.length > 0 && (
                <p>
                  Áreas de enfoque: <span className="font-medium">{selectedFocusAreas.length}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SummaryOptions;
