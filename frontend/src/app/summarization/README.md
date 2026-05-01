# Document Summarization Page

## Overview
The Document Summarization page provides an AI-powered interface for generating intelligent summaries of legal documents. Built with Next.js 13+ App Router and React Query.

## Location
`C:\Users\benito\poweria\legal\frontend\src\app\summarization\page.tsx`

## Features

### 1. Generate Tab
- **Document Selection**: Choose from available documents with visual feedback
- **Summary Options**: Configure summary level, language, and advanced options
- **AI Generation**: Generate summaries with real-time progress indicators
- **Results Display**: View generated summaries with key metrics
- **Key Points Extraction**: Automatic extraction and display of important points
- **Download**: Export summaries as text files

### 2. Compare Tab
- **Multi-Document Selection**: Select 2-5 documents for comparison
- **Similarity Analysis**: View overall similarity scores
- **Comparison Summary**: AI-generated comparison report
- **Recommendations**: Get insights on document differences

### 3. History Tab
- **Previous Summaries**: View all summaries generated for a document
- **Quick Access**: Click to reload previous summaries
- **Metadata Display**: See summary level, language, and timestamp

## Component Structure

```
/summarization
├── page.tsx (Main page)
└── Components Used:
    ├── SummaryCard (from @/components/summarization)
    ├── KeyPointsList (from @/components/summarization)
    └── SummaryOptions (from @/components/summarization)
```

## State Management

### Local State
- `selectedDocumentId`: Currently selected document
- `summaryOptions`: Configuration for summary generation
- `currentSummary`: Most recent summary result
- `activeTab`: Current tab view
- `compareDocumentIds`: Documents selected for comparison
- `comparisonResult`: Comparison analysis result

### React Query Hooks
- `useSummarizeDocument()`: Generate summary mutation
- `useDocumentSummaries()`: Fetch summary history
- `useCompareDocuments()`: Compare documents mutation

## Summary Options Interface

```typescript
interface SummarizeOptions {
  level: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  language: 'es' | 'en';
  includeKeyPoints?: boolean;
  maxLength?: number;
  focusAreas?: string[];
}
```

### Summary Levels
- **Brief**: 50-100 words, concise overview
- **Standard**: 150-300 words, balanced detail
- **Detailed**: 400-600 words, comprehensive analysis
- **Comprehensive**: 800-1200 words, exhaustive coverage

## API Integration

### Endpoints Used
- `POST /api/v1/summarization/document/{id}` - Generate summary
- `GET /api/v1/summarization/document/{id}/summaries` - Get history
- `POST /api/v1/summarization/compare` - Compare documents

### Request Example
```typescript
await summarizeMutation.mutateAsync({
  documentId: 'doc-123',
  options: {
    level: 'standard',
    language: 'es',
    includeKeyPoints: true,
    maxLength: 500,
    focusAreas: ['Cláusulas contractuales', 'Plazos']
  }
});
```

## UI/UX Features

### Dark Mode Support
- Full dark mode compatibility
- Optimized color schemes for readability
- Smooth transitions between themes

### Responsive Design
- Mobile-first approach
- Tablet optimization (grid layouts adapt)
- Desktop experience (multi-column layouts)

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation support
- ARIA labels and roles
- Screen reader friendly
- Focus indicators

### Loading States
- Skeleton loaders during API calls
- Button loading indicators
- Progress feedback

### Error Handling
- User-friendly error messages
- Retry mechanisms
- Network error detection
- Validation feedback

## User Flow

1. **Select Document**: Click on a document from the list
2. **Configure Options**: Set summary level, language, and preferences
3. **Generate**: Click "Generar Resumen" button
4. **Review**: View summary, key points, and metrics
5. **Download** (optional): Export summary as text file
6. **Compare** (optional): Switch to Compare tab to analyze multiple documents
7. **History**: View previous summaries for reference

## Mock Data

Currently uses mock documents for demonstration:
```typescript
const MOCK_DOCUMENTS = [
  { id: 'doc-1', title: 'Contrato de Arrendamiento 2025', type: 'Contrato' },
  { id: 'doc-2', title: 'Código Civil Ecuatoriano - Artículo 1234', type: 'Ley' },
  { id: 'doc-3', title: 'Sentencia Caso López vs. García', type: 'Sentencia' },
  { id: 'doc-4', title: 'Reglamento de Seguridad Laboral', type: 'Reglamento' },
];
```

**TODO**: Replace with actual API call to fetch documents.

## Performance Optimizations

- React Query caching for API responses
- Conditional data fetching (only when needed)
- Optimistic UI updates
- Debounced input handlers
- Lazy loading of history tab data

## Future Enhancements

- [ ] Real-time document fetching from API
- [ ] Batch summarization
- [ ] Export to multiple formats (PDF, DOCX)
- [ ] Summary customization templates
- [ ] Collaborative annotations
- [ ] Summary quality rating
- [ ] Advanced filtering in history
- [ ] Comparison visualization charts

## Related Files

### Components
- `C:\Users\benito\poweria\legal\frontend\src\components\summarization\SummaryCard.tsx`
- `C:\Users\benito\poweria\legal\frontend\src\components\summarization\KeyPointsList.tsx`
- `C:\Users\benito\poweria\legal\frontend\src\components\summarization\SummaryOptions.tsx`

### Hooks
- `C:\Users\benito\poweria\legal\frontend\src\hooks\useSummarization.ts`

### UI Components
- `C:\Users\benito\poweria\legal\frontend\src\components\ui\card.tsx`
- `C:\Users\benito\poweria\legal\frontend\src\components\ui\button.tsx`
- `C:\Users\benito\poweria\legal\frontend\src\components\ui\badge.tsx`
- `C:\Users\benito\poweria\legal\frontend\src\components\ui\skeleton.tsx`
- `C:\Users\benito\poweria\legal\frontend\src\components\ui\alert.tsx`

## Testing

### Manual Testing Checklist
- [ ] Document selection works correctly
- [ ] Summary options update state
- [ ] Generate button triggers API call
- [ ] Loading states display properly
- [ ] Error messages appear on failure
- [ ] Summary displays with correct formatting
- [ ] Key points render correctly
- [ ] Download functionality works
- [ ] Tab navigation functions
- [ ] Compare feature selects multiple docs
- [ ] History loads previous summaries
- [ ] Dark mode renders correctly
- [ ] Mobile responsive layout works

### Unit Tests Needed
- Component rendering
- State management
- API integration
- User interactions
- Error scenarios

## Troubleshooting

### Summary not generating
1. Check API endpoint configuration
2. Verify authentication token
3. Check network connectivity
4. Review browser console for errors

### History not loading
1. Ensure document is selected
2. Check if API returns data
3. Verify React Query cache

### Dark mode issues
1. Check Tailwind dark: classes
2. Verify theme provider setup
3. Test color contrast

## Support

For issues or questions:
- Check API documentation
- Review component source code
- Consult React Query documentation
- Contact development team
