# Frontend Quick Reference Guide

## Quick Start

### Run Development Server
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

### Environment Variables
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://legal-rag-api-qnew.onrender.com
```

---

## File Locations (Absolute Paths)

### Core Infrastructure
```
C:\Users\benito\poweria\legal\frontend\src\lib\api-client.ts
C:\Users\benito\poweria\legal\frontend\src\hooks\useApiQueries.ts
```

### Pages
```
C:\Users\benito\poweria\legal\frontend\src\app\analytics\page.tsx
C:\Users\benito\poweria\legal\frontend\src\app\ai-assistant\page.tsx
C:\Users\benito\poweria\legal\frontend\src\app\search\page.tsx
C:\Users\benito\poweria\legal\frontend\src\app\notifications\page.tsx
C:\Users\benito\poweria\legal\frontend\src\app\feedback\page.tsx
C:\Users\benito\poweria\legal\frontend\src\app\usage\page.tsx
```

### UI Components
```
C:\Users\benito\poweria\legal\frontend\src\components\ui\button.tsx
C:\Users\benito\poweria\legal\frontend\src\components\ui\card.tsx
C:\Users\benito\poweria\legal\frontend\src\components\ui\input.tsx
C:\Users\benito\poweria\legal\frontend\src\components\ui\select.tsx
C:\Users\benito\poweria\legal\frontend\src\components\ui\badge.tsx
C:\Users\benito\poweria\legal\frontend\src\components\ui\skeleton.tsx
C:\Users\benito\poweria\legal\frontend\src\components\ui\textarea.tsx
```

---

## Common Import Patterns

### API Hooks
```typescript
import {
  useCases,
  useCase,
  useCreateCase,
  useUpdateCase,
  useDeleteCase
} from '@/hooks/useApiQueries';
```

### UI Components
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
```

### Icons (Lucide React)
```typescript
import { Search, FileText, User, Calendar } from 'lucide-react';
```

---

## Hook Usage Patterns

### Query (GET)
```typescript
const { data, isLoading, error } = useCases();

if (isLoading) return <Skeleton />;
if (error) return <div>Error: {error.message}</div>;
return <div>{data.map(...)}</div>;
```

### Mutation (POST/PATCH/DELETE)
```typescript
const mutation = useCreateCase({
  onSuccess: () => alert('Success!'),
  onError: (error) => alert('Error!')
});

mutation.mutate({ title: 'New Case' });
```

---

## Component Variants

### Button
```typescript
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

### Badge
```typescript
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
```

---

## Common Patterns

### Loading State
```typescript
{isLoading ? (
  <Skeleton className="h-20 w-full" />
) : (
  <div>{/* Content */}</div>
)}
```

### Error State
```typescript
{error && (
  <div className="rounded-lg bg-red-50 p-4 text-red-800">
    {error.message}
  </div>
)}
```

### Empty State
```typescript
{data.length === 0 && (
  <Card>
    <CardContent className="p-12 text-center">
      <Icon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
      <h3 className="mb-2 text-lg font-semibold">No items</h3>
      <p className="text-sm text-gray-600">Message</p>
    </CardContent>
  </Card>
)}
```

---

## Styling Quick Reference

### Common Tailwind Classes
```css
/* Spacing */
p-4      /* padding: 1rem */
m-4      /* margin: 1rem */
gap-4    /* gap: 1rem */

/* Flexbox */
flex items-center justify-between
flex-col space-y-4

/* Grid */
grid grid-cols-3 gap-6
md:grid-cols-2 lg:grid-cols-4

/* Text */
text-sm text-gray-600
text-lg font-semibold text-gray-900

/* Colors */
bg-blue-50 text-blue-900
border border-gray-200

/* Rounded */
rounded-lg
rounded-full

/* Width */
w-full
max-w-4xl
```

---

## API Response Format Expected

### Success Response
```json
{
  "cases": [...],
  "documents": [...],
  "total": 100
}
```

### Error Response
```json
{
  "error": "Error message",
  "message": "Detailed error"
}
```

---

## Chart Configuration (Recharts)

### Line Chart
```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#3b82f6" />
  </LineChart>
</ResponsiveContainer>
```

### Bar Chart
```typescript
<BarChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="value" fill="#3b82f6" />
</BarChart>
```

### Pie Chart
```typescript
<PieChart>
  <Pie
    data={data}
    cx="50%"
    cy="50%"
    outerRadius={100}
    fill="#8884d8"
    dataKey="value"
    label
  >
    {data.map((entry, index) => (
      <Cell key={index} fill={COLORS[index]} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

---

## Troubleshooting

### API not responding
1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Verify backend is running
3. Check CORS configuration

### TypeScript errors
```bash
npm run build  # Check for type errors
```

### Styling issues
- Ensure Tailwind is configured in `tailwind.config.ts`
- Check `globals.css` includes Tailwind directives
- Clear `.next` cache: `rm -rf .next`

### React Query not working
- Verify `QueryClientProvider` wraps app
- Check React Query DevTools
- Verify query keys are unique

---

## Testing Commands

```bash
# Type checking
npm run build

# Linting
npm run lint

# Development
npm run dev

# Production build
npm run build
npm start
```

---

## Performance Tips

1. Use `staleTime` to reduce refetches
2. Implement pagination for large lists
3. Use `Skeleton` loaders for better UX
4. Lazy load charts with dynamic imports
5. Optimize images with Next.js Image component

---

## Accessibility Checklist

- [ ] Semantic HTML elements
- [ ] Alt text on images
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] ARIA labels
- [ ] Color contrast (WCAG AA)
- [ ] Screen reader testing

---

## Common Tasks

### Add new API endpoint
1. Add function to `useApiQueries.ts`
2. Define query key
3. Add hook with proper types
4. Use in component

### Add new page
1. Create `page.tsx` in `app/[route]/`
2. Import hooks and components
3. Add navigation link

### Add new UI component
1. Create in `components/ui/`
2. Follow existing patterns
3. Add TypeScript types
4. Export from component

---

## Color Palette

```typescript
// Primary
blue-600: #2563eb
blue-50: #eff6ff

// Success
green-600: #16a34a
green-50: #f0fdf4

// Warning
yellow-600: #ca8a04
yellow-50: #fefce8

// Danger
red-600: #dc2626
red-50: #fef2f2

// Neutral
gray-900: #111827
gray-600: #4b5563
gray-200: #e5e7eb
gray-50: #f9fafb
```

---

## Need Help?

1. Check browser console for errors
2. Use React Query DevTools
3. Verify API endpoint responses
4. Check network tab in DevTools
5. Review component props/state

---

## Production Checklist

- [ ] Environment variables set
- [ ] API endpoints verified
- [ ] Error boundaries added
- [ ] Loading states implemented
- [ ] Responsive design tested
- [ ] Accessibility audit passed
- [ ] Performance optimization
- [ ] SEO meta tags
- [ ] Analytics integration
- [ ] Error tracking (Sentry, etc.)
