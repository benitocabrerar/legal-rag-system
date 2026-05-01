# Frontend Priority Roadmap - Path to 100% Compliance
## Legal RAG System

**Current Completion:** 72%
**Target:** 100%
**Timeline:** 8-10 weeks (2 developers)

---

## CRITICAL PATH (Must Do First)

### Week 1: Fix Foundation Issues

#### Day 1-2: Backend API Fixes (BLOCKING)
**Status:** ❌ CRITICAL - Frontend features calling disabled APIs

**Tasks:**
1. Fix Prisma schema mismatches
   ```bash
   # Issues in prisma/schema.prisma
   - LegalDocument model conflicts
   - QueryHistory schema mismatch
   - Trend analysis tables missing
   ```

2. Re-enable disabled routes in `src/server.ts`:
   ```typescript
   // Currently disabled - MUST RE-ENABLE:
   await app.register(legalDocumentRoutes, { prefix: '/api/v1' });
   await app.register(unifiedSearchRoutes, { prefix: '/api/v1/unified-search' });
   await app.register(aiPredictionsRoutes, { prefix: '/api/v1' });
   await app.register(trendsRoutes, { prefix: '/api/v1/trends' });
   ```

3. Update frontend API client
   ```typescript
   // File: frontend/src/lib/api-client.ts
   // Verify all endpoints are reachable
   ```

**Deliverables:**
- [ ] All backend routes enabled
- [ ] API client updated
- [ ] Integration tests passing

**Effort:** 16 hours

---

#### Day 3-5: Error Handling & Resilience

**Tasks:**
1. Wrap all pages in ErrorBoundary
   ```typescript
   // Update each page:
   export default function Page() {
     return (
       <ErrorBoundary fallback={<ErrorFallback />}>
         <PageContent />
       </ErrorBoundary>
     );
   }
   ```

2. Create consistent error components
   ```typescript
   // frontend/src/components/ui/ErrorFallback.tsx
   // frontend/src/components/ui/PageLoader.tsx
   // frontend/src/components/ui/ContentLoader.tsx
   ```

3. Add retry logic to API hooks
   ```typescript
   // Update frontend/src/hooks/useApiQueries.ts
   retry: 3,
   retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
   ```

**Deliverables:**
- [ ] 39 pages wrapped in ErrorBoundary
- [ ] 3 new error/loading components
- [ ] Retry logic added to all queries

**Effort:** 24 hours

---

### Week 2: Real-time Features

#### Day 1-3: WebSocket Notification System

**Files to create:**
```typescript
// 1. WebSocket hook
frontend/src/hooks/useNotificationWebSocket.ts

// 2. Toast component (shadcn/ui)
frontend/src/components/ui/toast.tsx
frontend/src/components/ui/toaster.tsx

// 3. Notification bell
frontend/src/components/layout/NotificationBell.tsx

// 4. Toast notification
frontend/src/components/NotificationToast.tsx
```

**Implementation:**
```typescript
// useNotificationWebSocket.ts
export const useNotificationWebSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/notifications`);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);

      // Update cache
      queryClient.setQueryData(['notifications'], (old: any[]) =>
        [notification, ...(old || [])]
      );

      // Show toast
      toast({
        title: notification.title,
        description: notification.message,
      });

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
        });
      }
    };

    return () => ws.close();
  }, [queryClient]);
};
```

**Deliverables:**
- [ ] Real-time notification updates
- [ ] Toast notifications working
- [ ] Browser notifications enabled
- [ ] Unread count badge in navbar

**Effort:** 24 hours

---

#### Day 4-5: Mobile Responsive Fixes

**Priority pages to fix:**
1. `/analytics` - Charts overflow
2. `/ai-assistant` - Context panel covers chat
3. `/search` - Filter panel not collapsible
4. Admin tables - Not scrollable

**Tasks:**
```typescript
// 1. Create MobileNav component
frontend/src/components/layout/MobileNav.tsx

// 2. Fix chart responsiveness
// Update all chart components with:
<ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>

// 3. Make tables responsive
<div className="overflow-x-auto">
  <table className="min-w-full">
```

**Deliverables:**
- [ ] MobileNav component
- [ ] All pages tested on mobile (375px, 768px, 1024px)
- [ ] Charts responsive
- [ ] Tables scrollable

**Effort:** 16 hours

---

## HIGH PRIORITY FEATURES (Weeks 3-4)

### Week 3: Document & Visualization Features

#### Document Comparison Viewer

**Files to create:**
```
frontend/src/components/documents/DocumentComparison.tsx
frontend/src/components/documents/DiffViewer.tsx
frontend/src/hooks/useDocumentComparison.ts
frontend/src/app/documents/compare/page.tsx
```

**Dependencies:**
```bash
npm install react-diff-viewer diff-match-patch
npm install --save-dev @types/diff-match-patch
```

**Implementation:**
```typescript
import ReactDiffViewer from 'react-diff-viewer';

export const DocumentComparison = ({ doc1Id, doc2Id }) => {
  const { data: doc1 } = useDocument(doc1Id);
  const { data: doc2 } = useDocument(doc2Id);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3>{doc1.title}</h3>
        <ReactDiffViewer
          oldValue={doc1.content}
          newValue={doc2.content}
          splitView={true}
        />
      </div>
    </div>
  );
};
```

**Deliverables:**
- [ ] Side-by-side comparison
- [ ] Diff highlighting
- [ ] Metadata comparison
- [ ] Export comparison report

**Effort:** 32 hours

---

#### Advanced Chart Components

**Files to create:**
```
frontend/src/components/charts/HeatmapChart.tsx
frontend/src/components/charts/NetworkGraph.tsx
frontend/src/components/charts/PredictionChart.tsx
frontend/src/components/charts/SunburstChart.tsx
```

**Dependencies:**
```bash
npm install d3 react-force-graph @nivo/heatmap
npm install --save-dev @types/d3
```

**Implementation:**
```typescript
// HeatmapChart for document activity
import { ResponsiveHeatMap } from '@nivo/heatmap';

export const HeatmapChart = ({ data }) => (
  <ResponsiveHeatMap
    data={data}
    margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
    valueFormat=">-.2s"
    axisTop={{
      tickSize: 5,
      tickPadding: 5,
      legend: '',
      legendOffset: 46
    }}
  />
);

// NetworkGraph for cross-references
import { ForceGraph2D } from 'react-force-graph';

export const NetworkGraph = ({ nodes, links }) => (
  <ForceGraph2D
    graphData={{ nodes, links }}
    nodeLabel="name"
    nodeAutoColorBy="group"
    linkDirectionalParticles={2}
  />
);
```

**Deliverables:**
- [ ] HeatmapChart component
- [ ] NetworkGraph component
- [ ] PredictionChart with confidence intervals
- [ ] SunburstChart for hierarchical data
- [ ] Chart export functionality

**Effort:** 40 hours

---

### Week 4: Cross-Reference & NLP Visualization

#### Cross-Reference Graph Page

**Files to create:**
```
frontend/src/components/graphs/CrossReferenceGraph.tsx
frontend/src/app/analytics/cross-reference/page.tsx
frontend/src/hooks/useCrossReferenceGraph.ts
```

**API Hook:**
```typescript
// Add to useApiQueries.ts
export const useCrossReferenceGraph = (
  documentId: string,
  options?: UseQueryOptions<any, Error>
) => {
  return useQuery<any, Error>({
    queryKey: ['cross-reference-graph', documentId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/cross-reference/graph/${documentId}`
      );
      return data;
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};
```

**Deliverables:**
- [ ] Interactive graph visualization
- [ ] Node selection/filtering
- [ ] Zoom/pan controls
- [ ] Graph export as image

**Effort:** 32 hours

---

#### NLP Query Transformation Debug UI

**Files to create:**
```
frontend/src/components/nlp/QueryTransformationPipeline.tsx
frontend/src/components/nlp/EntityExtractionView.tsx
frontend/src/app/admin/nlp-debug/page.tsx
```

**Implementation:**
```typescript
export const QueryTransformationPipeline = ({ query }) => {
  const { data } = useQueryTransformation(query);

  return (
    <div className="space-y-4">
      <Step number={1} title="Original Query">
        {query}
      </Step>

      <Step number={2} title="Entity Extraction">
        <EntityExtractionView entities={data.entities} />
      </Step>

      <Step number={3} title="Query Expansion">
        <QueryExpansionView expansions={data.expansions} />
      </Step>

      <Step number={4} title="Legal Context">
        <pre>{JSON.stringify(data.context, null, 2)}</pre>
      </Step>

      <Step number={5} title="Final Query">
        <code>{data.finalQuery}</code>
      </Step>
    </div>
  );
};
```

**Deliverables:**
- [ ] Visual pipeline component
- [ ] Entity extraction view
- [ ] Query expansion display
- [ ] Debug page for admins

**Effort:** 24 hours

---

## MEDIUM PRIORITY (Weeks 5-6)

### Week 5: UX Enhancements

#### Dark Mode Implementation

**Dependencies:**
```bash
npm install next-themes
```

**Files to create:**
```
frontend/src/components/ThemeProvider.tsx
frontend/src/components/ThemeToggle.tsx
frontend/src/app/layout.tsx (update)
```

**Implementation:**
```typescript
// ThemeProvider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}

// ThemeToggle.tsx
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '🌞' : '🌙'}
    </button>
  );
}
```

**CSS Variables:**
```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

**Deliverables:**
- [ ] Theme provider setup
- [ ] Dark mode toggle in navbar
- [ ] All pages tested in dark mode
- [ ] Theme persistence

**Effort:** 24 hours

---

#### Keyboard Shortcuts System

**Files to create:**
```
frontend/src/hooks/useGlobalKeyboardShortcuts.ts
frontend/src/components/KeyboardShortcutsModal.tsx
```

**Implementation:**
```typescript
export const useGlobalKeyboardShortcuts = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K: Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }

      // Ctrl+N: New case
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        router.push('/dashboard/cases/new');
      }

      // G then D: Go to dashboard
      if (e.key === 'g' && lastKey === null) {
        setLastKey('g');
      } else if (e.key === 'd' && lastKey === 'g') {
        router.push('/dashboard');
        setLastKey(null);
      }

      // Ctrl+/: Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lastKey]);
};
```

**Shortcuts to implement:**
```
Ctrl+K: Quick search / Command palette
Ctrl+N: New case
Ctrl+/: Show shortcuts help
G then D: Go to dashboard
G then C: Go to cases
G then A: Go to analytics
/: Focus search
Esc: Close modals
```

**Deliverables:**
- [ ] Global shortcuts system
- [ ] Shortcuts help modal
- [ ] Documentation page
- [ ] Customization settings

**Effort:** 20 hours

---

### Week 6: Export & PWA

#### Export Functionality

**Dependencies:**
```bash
npm install xlsx jspdf jspdf-autotable
npm install --save-dev @types/xlsx
```

**Files to create:**
```
frontend/src/lib/export-utils.ts
frontend/src/components/ExportButton.tsx
frontend/src/components/ExcelExportDialog.tsx
frontend/src/components/PDFExportDialog.tsx
```

**Implementation:**
```typescript
// export-utils.ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (data: any[], columns: string[], filename: string) => {
  const doc = new jsPDF();
  doc.autoTable({
    head: [columns],
    body: data.map(row => columns.map(col => row[col])),
  });
  doc.save(`${filename}.pdf`);
};

export const exportToCSV = (data: any[], filename: string) => {
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
};
```

**Deliverables:**
- [ ] Excel export for analytics
- [ ] PDF export for reports
- [ ] CSV export for data
- [ ] Bulk document download

**Effort:** 24 hours

---

#### PWA Completion

**Dependencies:**
```bash
npm install workbox-webpack-plugin
```

**Files to update/create:**
```
frontend/public/sw.js (complete implementation)
frontend/src/app/offline/page.tsx
frontend/next.config.js (add PWA plugin)
```

**Service Worker:**
```javascript
// sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          return response.status === 200 ? response : null;
        },
      },
    ],
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      {
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
    ],
  })
);

// Offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline');
      })
    );
  }
});
```

**Deliverables:**
- [ ] Service worker fully implemented
- [ ] Offline fallback page
- [ ] Cache strategies configured
- [ ] Background sync for mutations

**Effort:** 24 hours

---

## LOWER PRIORITY (Weeks 7-8)

### Week 7: Internationalization

**Dependencies:**
```bash
npm install next-intl
```

**Files to create:**
```
frontend/src/lib/i18n/config.ts
frontend/src/lib/i18n/translations/es.json
frontend/src/lib/i18n/translations/en.json
middleware.ts (root)
```

**Implementation:**
```typescript
// config.ts
export const locales = ['es', 'en'];
export const defaultLocale = 'es';

// es.json
{
  "common": {
    "search": "Buscar",
    "save": "Guardar",
    "cancel": "Cancelar"
  },
  "dashboard": {
    "title": "Panel de Control",
    "cases": "Casos",
    "analytics": "Análisis"
  }
}

// Usage
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('dashboard');
  return <h1>{t('title')}</h1>;
}
```

**Effort:** 32 hours

---

### Week 8: Testing & Performance

#### Testing Setup

**Dependencies:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event jest jest-environment-jsdom
npm install --save-dev @playwright/test
```

**Files to create:**
```
jest.config.js
vitest.config.ts
playwright.config.ts
frontend/__tests__/hooks/useApiQueries.test.ts
frontend/__tests__/components/NotificationBell.test.tsx
frontend/__tests__/e2e/search-flow.spec.ts
```

**Target coverage:**
- Unit tests: 80%
- Integration tests: 60%
- E2E tests: Critical flows

**Effort:** 40 hours

---

#### Performance Optimizations

**Tasks:**
1. Code splitting
   ```typescript
   // Use React.lazy for heavy components
   const PDFViewer = lazy(() => import('@/components/PDFViewer'));
   const NetworkGraph = lazy(() => import('@/components/charts/NetworkGraph'));
   ```

2. Virtualization
   ```bash
   npm install react-virtual
   ```

3. Bundle analysis
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

4. Image optimization
   ```typescript
   import Image from 'next/image';
   // Replace all <img> with <Image>
   ```

**Deliverables:**
- [ ] Bundle size reduced 30%
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3.5s
- [ ] Lighthouse score > 90

**Effort:** 32 hours

---

## SUMMARY

### Total Effort Breakdown

| Phase | Duration | Hours | Priority |
|-------|----------|-------|----------|
| Week 1: Foundation Fixes | 1 week | 40h | CRITICAL |
| Week 2: Real-time & Mobile | 1 week | 40h | CRITICAL |
| Week 3: Document Features | 1 week | 72h | HIGH |
| Week 4: Graph & NLP | 1 week | 56h | HIGH |
| Week 5: Dark Mode & Shortcuts | 1 week | 44h | MEDIUM |
| Week 6: Export & PWA | 1 week | 48h | MEDIUM |
| Week 7: i18n | 1 week | 32h | LOW |
| Week 8: Testing & Performance | 1 week | 72h | MEDIUM |
| **Total** | **8 weeks** | **404h** | - |

### Resource Requirements

**Team:**
- 2 Senior Frontend Developers (React/Next.js experts)
- 0.5 QA Engineer (testing support)

**Skills needed:**
- React 18+ with hooks
- Next.js 15 App Router
- TypeScript
- TailwindCSS
- React Query
- WebSocket/SSE
- Chart libraries (Recharts, D3)
- Testing (Jest, Playwright)

---

## SUCCESS METRICS

### Week 1-2 Targets
- [ ] 0 disabled backend routes
- [ ] 100% pages with error boundaries
- [ ] Real-time notifications working
- [ ] Mobile score > 80 (Lighthouse)

### Week 3-4 Targets
- [ ] Document comparison feature complete
- [ ] 4 advanced chart types implemented
- [ ] Cross-reference graph functional
- [ ] NLP debug UI for admins

### Week 5-6 Targets
- [ ] Dark mode on all pages
- [ ] 10+ keyboard shortcuts
- [ ] Export to Excel/PDF/CSV working
- [ ] PWA installable

### Week 7-8 Targets
- [ ] 2 languages supported (ES, EN)
- [ ] 80% test coverage
- [ ] Performance score > 90
- [ ] Bundle size < 500KB

### Final (100% Compliance)
- [ ] 45/45 pages implemented
- [ ] 78/78 components implemented
- [ ] 37/37 API endpoints connected
- [ ] 100% WCAG AA compliance
- [ ] 0 critical bugs
- [ ] 0 disabled features

---

## RISKS & MITIGATION

### Risk 1: Backend API Issues Block Frontend
**Probability:** High
**Impact:** Critical
**Mitigation:**
- Fix Prisma schema FIRST (Week 1, Day 1-2)
- Create mock API responses as fallback
- Use MSW (Mock Service Worker) for testing

### Risk 2: Chart Libraries Performance Issues
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Virtualize chart data (max 1000 points)
- Use WebGL-based libraries for large datasets
- Add "Export data" option instead of rendering

### Risk 3: Real-time Features Scalability
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Use Redis for pub/sub
- Implement connection pooling
- Add rate limiting on client side

### Risk 4: Testing Takes Longer Than Expected
**Probability:** High
**Impact:** Low
**Mitigation:**
- Start testing early (Week 3)
- Focus on critical paths first
- Use snapshot testing for UI

---

## NEXT ACTIONS (Start Today)

### Immediate (This Week)

1. **Backend Fix** (2 days)
   ```bash
   cd /c/Users/benito/poweria/legal
   # Fix Prisma schema
   npx prisma db push
   # Re-enable routes in src/server.ts
   ```

2. **Error Boundaries** (1 day)
   ```bash
   cd frontend/src/app
   # Add ErrorBoundary to each page.tsx
   ```

3. **Mobile Responsive** (2 days)
   ```bash
   # Test on Chrome DevTools mobile view
   # Fix overflow issues
   ```

### This Month (Week 1-4)

1. Complete Week 1-2 roadmap (Critical path)
2. Implement Document Comparison (Week 3)
3. Build advanced charts (Week 3-4)
4. Deploy to staging for testing

### Next Month (Week 5-8)

1. UX enhancements (Dark mode, shortcuts)
2. Export & PWA features
3. Testing & performance optimization
4. Final QA and bug fixes

---

**Document Generated:** December 11, 2025
**Last Updated:** December 11, 2025
**Next Review:** December 18, 2025
