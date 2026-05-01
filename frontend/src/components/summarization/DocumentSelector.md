# DocumentSelector Component

A powerful, searchable document selector component for legal document selection with support for both single and multi-select modes.

## Features

- **Searchable Dropdown**: Filter documents by title, type, jurisdiction, or number
- **Single & Multi-Select Modes**: Support for selecting one or multiple documents
- **Visual Feedback**: Color-coded badges for document types and jurisdiction labels
- **Loading States**: Built-in loading indicator for async data fetching
- **Empty States**: User-friendly messages when no documents are found
- **Keyboard Navigation**: Full keyboard accessibility with arrow keys and Enter
- **Max Selection Limit**: Optional limit on number of selections in multi-select mode
- **Clear Selection**: Quick clear button to reset selections
- **Dark Mode Support**: Fully styled for both light and dark themes
- **Responsive Design**: Works seamlessly on all screen sizes

## Installation

The component requires the following dependencies:

```bash
npm install @radix-ui/react-popover @radix-ui/react-scroll-area cmdk lucide-react
```

## Props

```typescript
interface DocumentSelectorProps {
  value: string | string[];              // Current selection (ID or array of IDs)
  onChange: (value: string | string[]) => void;  // Selection change handler
  multiple?: boolean;                    // Enable multi-select mode (default: false)
  placeholder?: string;                  // Placeholder text (default: 'Seleccionar documento...')
  disabled?: boolean;                    // Disable the selector (default: false)
  className?: string;                    // Additional CSS classes
  maxSelections?: number;                // Max selections in multi-select mode
}
```

## Document Type

```typescript
interface LegalDocument {
  id: string;                   // Unique identifier
  title: string;                // Document title
  type: DocumentType;           // Document type (LEY, CODIGO, etc.)
  jurisdiction: JurisdictionType; // Jurisdiction level
  number?: string;              // Document number (optional)
  year?: number;                // Publication year (optional)
}

type DocumentType =
  | 'CONSTITUCION'
  | 'CODIGO'
  | 'LEY_ORGANICA'
  | 'LEY_ORDINARIA'
  | 'DECRETO'
  | 'RESOLUCION'
  | 'ACUERDO'
  | 'ORDENANZA'
  | 'REGLAMENTO';

type JurisdictionType =
  | 'NACIONAL'
  | 'PROVINCIAL'
  | 'MUNICIPAL'
  | 'REGIONAL';
```

## Usage Examples

### Basic Single Selection

```tsx
import { DocumentSelector } from '@/components/summarization';
import { useState } from 'react';

function MyComponent() {
  const [documentId, setDocumentId] = useState<string>('');

  return (
    <DocumentSelector
      value={documentId}
      onChange={setDocumentId}
      placeholder="Select a legal document..."
    />
  );
}
```

### Multiple Selection

```tsx
import { DocumentSelector } from '@/components/summarization';
import { useState } from 'react';

function MyComponent() {
  const [documentIds, setDocumentIds] = useState<string[]>([]);

  return (
    <DocumentSelector
      value={documentIds}
      onChange={setDocumentIds}
      multiple
      placeholder="Select multiple documents..."
    />
  );
}
```

### Limited Multiple Selection

```tsx
import { DocumentSelector } from '@/components/summarization';
import { useState } from 'react';

function MyComponent() {
  const [documentIds, setDocumentIds] = useState<string[]>([]);

  return (
    <DocumentSelector
      value={documentIds}
      onChange={setDocumentIds}
      multiple
      maxSelections={3}
      placeholder="Select up to 3 documents..."
    />
  );
}
```

### With API Integration (Future)

```tsx
import { DocumentSelector } from '@/components/summarization';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

function MyComponent() {
  const [documentId, setDocumentId] = useState<string>('');

  // Future API integration
  const { data: documents, isLoading } = useQuery({
    queryKey: ['legal-documents'],
    queryFn: async () => {
      const response = await fetch('/api/legal-documents');
      return response.json();
    },
  });

  return (
    <DocumentSelector
      value={documentId}
      onChange={setDocumentId}
      placeholder="Select a document..."
    />
  );
}
```

### In a Form with React Hook Form

```tsx
import { DocumentSelector } from '@/components/summarization';
import { useForm, Controller } from 'react-hook-form';

interface FormData {
  documents: string[];
}

function MyForm() {
  const { control, handleSubmit } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log('Selected documents:', data.documents);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="documents"
        control={control}
        defaultValue={[]}
        render={({ field }) => (
          <DocumentSelector
            value={field.value}
            onChange={field.onChange}
            multiple
            maxSelections={5}
            placeholder="Select documents for comparison..."
          />
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Document Type Colors

The component uses color-coded badges for different document types:

| Document Type | Color |
|--------------|-------|
| CONSTITUCION | Purple |
| CODIGO | Blue |
| LEY_ORGANICA | Green |
| LEY_ORDINARIA | Teal |
| DECRETO | Orange |
| RESOLUCION | Yellow |
| ACUERDO | Pink |
| ORDENANZA | Indigo |
| REGLAMENTO | Red |

## Accessibility

The component follows WAI-ARIA best practices:

- Proper ARIA labels and roles
- Keyboard navigation support (Arrow keys, Enter, Escape)
- Focus management
- Screen reader announcements
- Clear focus indicators

### Keyboard Shortcuts

- `Arrow Up/Down`: Navigate through document list
- `Enter`: Select/deselect document
- `Escape`: Close dropdown
- `Tab`: Navigate to next element

## Styling

The component uses Tailwind CSS and supports dark mode out of the box:

```tsx
<DocumentSelector
  value={documentId}
  onChange={setDocumentId}
  className="max-w-md" // Custom width
/>
```

### Theme Customization

The component automatically adapts to your application's theme:

- Light mode: Clean white background with subtle borders
- Dark mode: Dark background with appropriate contrast

## State Management

### Single Selection

```tsx
const [documentId, setDocumentId] = useState<string>('');

// Clear selection
setDocumentId('');
```

### Multiple Selection

```tsx
const [documentIds, setDocumentIds] = useState<string[]>([]);

// Add document
setDocumentIds([...documentIds, newDocumentId]);

// Remove document
setDocumentIds(documentIds.filter(id => id !== documentIdToRemove));

// Clear all
setDocumentIds([]);
```

## Mock Data

Currently, the component uses mock data defined internally. This will be replaced with API integration in future updates:

```typescript
const mockDocuments: LegalDocument[] = [
  {
    id: '1',
    title: 'Constitución del Ecuador 2008',
    type: 'CONSTITUCION',
    jurisdiction: 'NACIONAL',
    year: 2008,
  },
  // ... more documents
];
```

## Future Enhancements

- [ ] API integration with React Query
- [ ] Infinite scroll for large document sets
- [ ] Custom filtering options (by type, jurisdiction, year)
- [ ] Document preview on hover
- [ ] Recent selections history
- [ ] Favorites/bookmarks functionality
- [ ] Bulk selection actions
- [ ] Export selected documents
- [ ] Advanced sorting options

## Performance Considerations

- Uses `React.useMemo` for expensive filtering operations
- Implements virtual scrolling for large document lists (via ScrollArea)
- Debounced search input to prevent excessive re-renders
- Lazy loading support ready for API integration

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Related Components

- `SummaryCard`: Display document summaries
- `SummaryOptions`: Configure summary generation options
- `PDFViewer`: View document content

## Troubleshooting

### Documents not showing

Ensure the mock data is properly imported or API is configured.

### Selection not updating

Check that the `onChange` handler is properly updating the state:

```tsx
// Correct
<DocumentSelector
  value={documentId}
  onChange={(value) => setDocumentId(value as string)}
/>

// Incorrect (missing state update)
<DocumentSelector
  value={documentId}
  onChange={() => {}} // No-op handler
/>
```

### Styling issues

Make sure Tailwind CSS is properly configured in your project and all required UI components are installed.

## Support

For issues or questions, please refer to the project documentation or contact the development team.
