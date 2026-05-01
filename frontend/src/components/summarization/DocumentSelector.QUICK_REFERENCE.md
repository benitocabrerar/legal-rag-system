# DocumentSelector - Quick Reference

## Quick Start

```bash
# Install dependencies
npm install @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-icons cmdk
```

```tsx
import { DocumentSelector } from '@/components/summarization';

// Single selection
const [doc, setDoc] = useState<string>('');
<DocumentSelector value={doc} onChange={setDoc} />

// Multiple selection
const [docs, setDocs] = useState<string[]>([]);
<DocumentSelector value={docs} onChange={setDocs} multiple maxSelections={5} />
```

## Props Quick Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| string[]` | Required | Selected document ID(s) |
| `onChange` | `(value) => void` | Required | Selection change handler |
| `multiple` | `boolean` | `false` | Enable multi-select |
| `placeholder` | `string` | `'Seleccionar documento...'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable selector |
| `className` | `string` | - | Custom CSS classes |
| `maxSelections` | `number` | - | Max selections (multi-select) |

## Common Patterns

### Basic Usage

```tsx
const [documentId, setDocumentId] = useState('');

<DocumentSelector
  value={documentId}
  onChange={setDocumentId}
/>
```

### Multi-Select with Limit

```tsx
const [documentIds, setDocumentIds] = useState<string[]>([]);

<DocumentSelector
  value={documentIds}
  onChange={setDocumentIds}
  multiple
  maxSelections={3}
/>
```

### With React Hook Form

```tsx
import { Controller } from 'react-hook-form';

<Controller
  name="documents"
  control={control}
  render={({ field }) => (
    <DocumentSelector
      value={field.value}
      onChange={field.onChange}
      multiple
    />
  )}
/>
```

### Custom Styling

```tsx
<DocumentSelector
  value={documentId}
  onChange={setDocumentId}
  className="max-w-md"
/>
```

## Document Types & Colors

| Type | Label | Color |
|------|-------|-------|
| `CONSTITUCION` | Constitución | Purple |
| `CODIGO` | Código | Blue |
| `LEY_ORGANICA` | Ley Orgánica | Green |
| `LEY_ORDINARIA` | Ley Ordinaria | Teal |
| `DECRETO` | Decreto | Orange |
| `RESOLUCION` | Resolución | Yellow |
| `ACUERDO` | Acuerdo | Pink |
| `ORDENANZA` | Ordenanza | Indigo |
| `REGLAMENTO` | Reglamento | Red |

## Keyboard Shortcuts

- **Arrow Up/Down**: Navigate list
- **Enter**: Select/deselect
- **Escape**: Close dropdown
- **Tab**: Next element

## TypeScript Types

```typescript
interface LegalDocument {
  id: string;
  title: string;
  type: DocumentType;
  jurisdiction: JurisdictionType;
  number?: string;
  year?: number;
}

type DocumentType =
  | 'CONSTITUCION' | 'CODIGO' | 'LEY_ORGANICA'
  | 'LEY_ORDINARIA' | 'DECRETO' | 'RESOLUCION'
  | 'ACUERDO' | 'ORDENANZA' | 'REGLAMENTO';

type JurisdictionType =
  | 'NACIONAL' | 'PROVINCIAL' | 'MUNICIPAL' | 'REGIONAL';
```

## State Management Examples

### Clear Selection

```tsx
// Single
setDocumentId('');

// Multiple
setDocumentIds([]);
```

### Add Document (Multi-Select)

```tsx
setDocumentIds([...documentIds, newId]);
```

### Remove Document (Multi-Select)

```tsx
setDocumentIds(documentIds.filter(id => id !== idToRemove));
```

### Check if Selected

```tsx
const isSelected = documentIds.includes(documentId);
```

### Get Selected Count

```tsx
const count = documentIds.length;
```

## API Integration (Future)

```tsx
import { useQuery } from '@tanstack/react-query';

const { data: documents, isLoading } = useQuery({
  queryKey: ['legal-documents'],
  queryFn: fetchDocuments,
});

// Component will be updated to accept documents prop
```

## Features Checklist

- [x] Searchable dropdown
- [x] Single/multi-select modes
- [x] Document type badges
- [x] Jurisdiction labels
- [x] Max selection limit
- [x] Clear selection button
- [x] Keyboard navigation
- [x] Dark mode support
- [x] Loading state
- [x] Empty state
- [x] Accessibility (ARIA)
- [ ] API integration (coming soon)
- [ ] Infinite scroll (coming soon)

## Troubleshooting

**Not showing documents?**
- Check mock data is imported correctly
- Verify component is rendered

**Selection not updating?**
- Ensure `onChange` updates state
- Check `value` prop is connected to state

**Styling issues?**
- Verify Tailwind CSS is configured
- Check all UI components are installed

**TypeScript errors?**
- Install: `npm install --save-dev @types/react`
- Restart TypeScript server

## File Locations

```
frontend/src/components/
├── summarization/
│   ├── DocumentSelector.tsx           # Main component
│   ├── DocumentSelector.example.tsx   # Examples
│   ├── DocumentSelector.test.tsx      # Tests
│   ├── DocumentSelector.md            # Full docs
│   └── index.ts                       # Exports
└── ui/
    ├── popover.tsx                    # Dropdown UI
    ├── command.tsx                    # Search UI
    ├── scroll-area.tsx                # Scroll UI
    ├── badge.tsx                      # Badge UI
    └── button.tsx                     # Button UI
```

## Related Components

- `SummaryCard` - Display summaries
- `SummaryOptions` - Summary config
- `PDFViewer` - View documents

## Support

See full documentation in `DocumentSelector.md`
