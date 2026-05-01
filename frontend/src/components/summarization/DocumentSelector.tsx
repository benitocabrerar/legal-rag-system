'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

// Document type definitions
export type DocumentType =
  | 'CONSTITUCION'
  | 'CODIGO'
  | 'LEY_ORGANICA'
  | 'LEY_ORDINARIA'
  | 'DECRETO'
  | 'RESOLUCION'
  | 'ACUERDO'
  | 'ORDENANZA'
  | 'REGLAMENTO';

export type JurisdictionType =
  | 'NACIONAL'
  | 'PROVINCIAL'
  | 'MUNICIPAL'
  | 'REGIONAL';

export interface LegalDocument {
  id: string;
  title: string;
  type: DocumentType;
  jurisdiction: JurisdictionType;
  number?: string;
  year?: number;
}

// Mock data - will be replaced with API call
const mockDocuments: LegalDocument[] = [
  {
    id: '1',
    title: 'Constitución del Ecuador 2008',
    type: 'CONSTITUCION',
    jurisdiction: 'NACIONAL',
    year: 2008,
  },
  {
    id: '2',
    title: 'Código Civil Ecuatoriano',
    type: 'CODIGO',
    jurisdiction: 'NACIONAL',
    year: 2005,
  },
  {
    id: '3',
    title: 'Ley Orgánica de Garantías Jurisdiccionales y Control Constitucional',
    type: 'LEY_ORGANICA',
    jurisdiction: 'NACIONAL',
    year: 2009,
  },
  {
    id: '4',
    title: 'Código Orgánico Integral Penal',
    type: 'CODIGO',
    jurisdiction: 'NACIONAL',
    number: 'COIP',
    year: 2014,
  },
  {
    id: '5',
    title: 'Ley Orgánica de Servicio Público',
    type: 'LEY_ORGANICA',
    jurisdiction: 'NACIONAL',
    year: 2010,
  },
  {
    id: '6',
    title: 'Código de Trabajo',
    type: 'CODIGO',
    jurisdiction: 'NACIONAL',
    year: 2005,
  },
  {
    id: '7',
    title: 'Ley Orgánica de Educación Intercultural',
    type: 'LEY_ORGANICA',
    jurisdiction: 'NACIONAL',
    year: 2011,
  },
  {
    id: '8',
    title: 'Decreto Ejecutivo 1234 - Reglamento de Seguridad',
    type: 'DECRETO',
    jurisdiction: 'NACIONAL',
    number: '1234',
    year: 2023,
  },
  {
    id: '9',
    title: 'Resolución 456 - Ministerio de Salud',
    type: 'RESOLUCION',
    jurisdiction: 'NACIONAL',
    number: '456',
    year: 2023,
  },
  {
    id: '10',
    title: 'Ordenanza Municipal de Quito - Uso de Suelo',
    type: 'ORDENANZA',
    jurisdiction: 'MUNICIPAL',
    year: 2022,
  },
];

// Document type badge color mapping
const documentTypeColors: Record<DocumentType, string> = {
  CONSTITUCION: 'bg-purple-600 text-white border-purple-700',
  CODIGO: 'bg-blue-600 text-white border-blue-700',
  LEY_ORGANICA: 'bg-green-600 text-white border-green-700',
  LEY_ORDINARIA: 'bg-teal-600 text-white border-teal-700',
  DECRETO: 'bg-orange-600 text-white border-orange-700',
  RESOLUCION: 'bg-yellow-600 text-white border-yellow-700',
  ACUERDO: 'bg-pink-600 text-white border-pink-700',
  ORDENANZA: 'bg-indigo-600 text-white border-indigo-700',
  REGLAMENTO: 'bg-red-600 text-white border-red-700',
};

// Document type labels
const documentTypeLabels: Record<DocumentType, string> = {
  CONSTITUCION: 'Constitución',
  CODIGO: 'Código',
  LEY_ORGANICA: 'Ley Orgánica',
  LEY_ORDINARIA: 'Ley Ordinaria',
  DECRETO: 'Decreto',
  RESOLUCION: 'Resolución',
  ACUERDO: 'Acuerdo',
  ORDENANZA: 'Ordenanza',
  REGLAMENTO: 'Reglamento',
};

// Jurisdiction labels
const jurisdictionLabels: Record<JurisdictionType, string> = {
  NACIONAL: 'Nacional',
  PROVINCIAL: 'Provincial',
  MUNICIPAL: 'Municipal',
  REGIONAL: 'Regional',
};

// Component props
export interface DocumentSelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;
}

export function DocumentSelector({
  value,
  onChange,
  multiple = false,
  placeholder = 'Seleccionar documento...',
  disabled = false,
  className,
  maxSelections,
}: DocumentSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // Normalize value to array for easier handling
  const selectedValues = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }, [value]);

  // Filter documents based on search
  const filteredDocuments = React.useMemo(() => {
    if (!search) return mockDocuments;

    const searchLower = search.toLowerCase();
    return mockDocuments.filter((doc) =>
      doc.title.toLowerCase().includes(searchLower) ||
      doc.type.toLowerCase().includes(searchLower) ||
      doc.jurisdiction.toLowerCase().includes(searchLower) ||
      (doc.number && doc.number.toLowerCase().includes(searchLower))
    );
  }, [search]);

  // Get selected documents
  const selectedDocuments = React.useMemo(() => {
    return mockDocuments.filter((doc) => selectedValues.includes(doc.id));
  }, [selectedValues]);

  // Handle document selection
  const handleSelect = (documentId: string) => {
    if (multiple) {
      const newSelection = selectedValues.includes(documentId)
        ? selectedValues.filter((id) => id !== documentId)
        : [...selectedValues, documentId];

      // Check max selections limit
      if (maxSelections && newSelection.length > maxSelections) {
        return;
      }

      onChange(newSelection);
    } else {
      onChange(documentId);
      setOpen(false);
    }
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
  };

  // Handle remove single item in multi-select
  const handleRemoveItem = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedValues.filter((id) => id !== documentId));
    }
  };

  // Get display text for button
  const getDisplayText = () => {
    if (selectedDocuments.length === 0) {
      return placeholder;
    }

    if (multiple) {
      return `${selectedDocuments.length} documento${selectedDocuments.length > 1 ? 's' : ''} seleccionado${selectedDocuments.length > 1 ? 's' : ''}`;
    }

    return selectedDocuments[0]?.title || placeholder;
  };

  // Check if max selections reached
  const isMaxSelectionsReached = React.useMemo(() => {
    return multiple && maxSelections ? selectedValues.length >= maxSelections : false;
  }, [multiple, maxSelections, selectedValues.length]);

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Seleccionar documentos"
            disabled={disabled}
            className={cn(
              'w-full justify-between',
              !selectedDocuments.length && 'text-gray-500 dark:text-gray-400'
            )}
          >
            <span className="truncate">{getDisplayText()}</span>
            <div className="flex items-center gap-2 ml-2">
              {selectedDocuments.length > 0 && !disabled && (
                <X
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar documentos..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Cargando documentos...
                </div>
              ) : filteredDocuments.length === 0 ? (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      No se encontraron documentos
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Intenta con otros términos de búsqueda
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  <ScrollArea className="h-[300px]">
                    {filteredDocuments.map((document) => {
                      const isSelected = selectedValues.includes(document.id);
                      const isDisabled = !isSelected && isMaxSelectionsReached;

                      return (
                        <CommandItem
                          key={document.id}
                          value={document.id}
                          onSelect={() => !isDisabled && handleSelect(document.id)}
                          disabled={isDisabled}
                          className={cn(
                            'cursor-pointer',
                            isDisabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center w-full gap-2">
                            <div
                              className={cn(
                                'flex h-4 w-4 items-center justify-center rounded-sm border border-gray-300',
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'opacity-50 [&_svg]:invisible'
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  className={cn(
                                    'text-xs px-2 py-0',
                                    documentTypeColors[document.type]
                                  )}
                                >
                                  {documentTypeLabels[document.type]}
                                </Badge>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {jurisdictionLabels[document.jurisdiction]}
                                </span>
                              </div>
                              <p className="text-sm font-medium truncate">
                                {document.title}
                              </p>
                              {(document.number || document.year) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {document.number && `No. ${document.number}`}
                                  {document.number && document.year && ' - '}
                                  {document.year && `Año ${document.year}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </ScrollArea>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          {isMaxSelectionsReached && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-2">
              <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                Límite máximo de {maxSelections ?? 0} documento{(maxSelections ?? 0) > 1 ? 's' : ''} alcanzado
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Display selected documents in multi-select mode */}
      {multiple && selectedDocuments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedDocuments.map((document) => (
            <Badge
              key={document.id}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-3"
            >
              <span className="text-xs font-medium truncate max-w-[200px]">
                {document.title}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(document.id, e)}
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                  aria-label={`Eliminar ${document.title}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
