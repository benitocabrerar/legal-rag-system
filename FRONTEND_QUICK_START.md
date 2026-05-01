# Legal RAG System - Frontend Quick Start Guide

## Critical Issues Found

**BUILD STATUS**: FAILING due to missing shadcn/ui components

**Current Score**: 76.9% / Target: 100%

### Critical Gaps:
1. Missing 25+ shadcn/ui components (button, card, dialog, form, etc.)
2. react-hook-form not installed
3. framer-motion missing for animations
4. React Query partially integrated (only 16/29 backend routes)
5. 7 missing pages (analytics, ai-assistant, diagnostics, etc.)

---

## Immediate Action Plan (Priority Order)

### STEP 1: Fix Build Failures (2 hours) - CRITICAL

```bash
cd C:/Users/benito/poweria/legal/frontend

# Install required dependencies
npm install -D tailwindcss-animate
npm install react-hook-form @hookform/resolvers zod

# Initialize shadcn/ui
npx shadcn-ui@latest init

# When prompted, use these settings:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - React Server Components: Yes
# - Path aliases: @/* (default)

# Install critical components (used in existing code)
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add table

# Test build
npm run build
```

**Expected Result**: Build should complete without "Module not found" errors

---

### STEP 2: Complete Component Library (2 hours)

```bash
# Install remaining shadcn/ui components
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add command
npx shadcn-ui@latest add context-menu
npx shadcn-ui@latest add hover-card
npx shadcn-ui@latest add label
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add tooltip
```

---

### STEP 3: Install Animation Library (30 min)

```bash
npm install framer-motion
```

---

### STEP 4: Enhance React Query (4 hours)

```bash
# Install DevTools
npm install @tanstack/react-query-devtools
```

Then create API hooks in `src/hooks/api/`:
- `use-cases.ts`
- `use-legal-documents.ts`
- `use-analytics.ts`
- `use-advanced-search.ts`
- `use-ai-assistant.ts`
- `use-feedback.ts`
- `use-calendar.ts`
- `use-tasks.ts`

**See detailed hook examples in FRONTEND_IMPROVEMENT_PLAN.json**

---

### STEP 5: Create Missing Pages (12-16 hours)

Create these 7 missing pages:

1. **C:/Users/benito/poweria/legal/frontend/src/app/dashboard/analytics/page.tsx**
   - Usage statistics and charts
   - Install: `npm install recharts date-fns`

2. **C:/Users/benito/poweria/legal/frontend/src/app/dashboard/ai-assistant/page.tsx**
   - AI chat interface
   - Install: `npm install react-markdown`

3. **C:/Users/benito/poweria/legal/frontend/src/app/dashboard/unified-search/page.tsx**
   - Advanced search with filters

4. **C:/Users/benito/poweria/legal/frontend/src/app/dashboard/feedback/page.tsx**
   - Feedback management

5. **C:/Users/benito/poweria/legal/frontend/src/app/dashboard/notifications/page.tsx**
   - Notification center

6. **C:/Users/benito/poweria/legal/frontend/src/app/dashboard/usage/page.tsx**
   - Usage tracking and quotas

7. **C:/Users/benito/poweria/legal/frontend/src/app/dashboard/diagnostics/page.tsx**
   - System diagnostics (admin only)

---

## Components Configuration Files

### 1. components.json (Create this file)

**File**: `C:/Users/benito/poweria/legal/frontend/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### 2. Update tailwind.config.ts

**File**: `C:/Users/benito/poweria/legal/frontend/tailwind.config.ts`

Add to plugins array:
```typescript
plugins: [require("tailwindcss-animate")],
```

Add to theme.extend.colors:
```typescript
destructive: {
  DEFAULT: "hsl(var(--destructive))",
  foreground: "hsl(var(--destructive-foreground))",
},
muted: {
  DEFAULT: "hsl(var(--muted))",
  foreground: "hsl(var(--muted-foreground))",
},
accent: {
  DEFAULT: "hsl(var(--accent))",
  foreground: "hsl(var(--accent-foreground))",
},
popover: {
  DEFAULT: "hsl(var(--popover))",
  foreground: "hsl(var(--popover-foreground))",
},
card: {
  DEFAULT: "hsl(var(--card))",
  foreground: "hsl(var(--card-foreground))",
},
```

### 3. Update globals.css

**File**: `C:/Users/benito/poweria/legal/frontend/src/app/globals.css`

Add these CSS variables to `:root`:
```css
--destructive: 0 84.2% 60.2%;
--destructive-foreground: 210 40% 98%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;
--popover: 0 0% 100%;
--popover-foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;
--radius: 0.5rem;
```

---

## Current vs Backend API Mapping

### Backend Routes (29 total)
1. admin (multiple routes)
2. advanced-search.ts
3. ai-assistant.ts
4. analytics.ts
5. auth.ts
6. backup.ts
7. backup-sse.ts
8. billing.ts
9. calendar.ts
10. cases.ts
11. diagnostics.ts
12. documents.ts
13. feedback.ts
14. finance.ts
15. legal-documents.ts
16. legal-documents-v2.ts
17. nlp.ts
18. notifications-enhanced.ts
19. oauth.ts
20. observability (folder)
21. payments.ts
22. query.ts
23. settings.ts
24. subscription.ts
25. tasks.ts
26. two-factor.ts
27. unified-search.ts
28. usage.ts
29. user.ts

### Frontend Pages (31 existing)
- Home & Auth: login, register, pricing, payment
- Dashboard: dashboard, cases, calendar, tasks, finance, settings
- Admin: analytics, audit, backups, bulk-upload, database, embeddings, legal-library, payments, plans, quotas, specialties, users
- Account: profile, billing, settings, usage

### Missing Frontend Pages (7)
1. /dashboard/analytics - Maps to backend: analytics.ts
2. /dashboard/ai-assistant - Maps to backend: ai-assistant.ts
3. /dashboard/unified-search - Maps to backend: advanced-search.ts, unified-search.ts
4. /dashboard/feedback - Maps to backend: feedback.ts
5. /dashboard/notifications - Maps to backend: notifications-enhanced.ts
6. /dashboard/usage - Maps to backend: usage.ts
7. /dashboard/diagnostics - Maps to backend: diagnostics.ts

---

## File Structure After Completion

```
frontend/src/
├── app/
│   ├── dashboard/
│   │   ├── analytics/page.tsx (NEW)
│   │   ├── ai-assistant/page.tsx (NEW)
│   │   ├── unified-search/page.tsx (NEW)
│   │   ├── feedback/page.tsx (NEW)
│   │   ├── notifications/page.tsx (NEW)
│   │   ├── usage/page.tsx (NEW)
│   │   └── diagnostics/page.tsx (NEW)
│   └── ...existing pages
├── components/
│   ├── ui/ (30+ shadcn components)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── ...all shadcn components
│   │   ├── data-table.tsx (NEW - composite)
│   │   ├── loading-button.tsx (NEW - composite)
│   │   ├── empty-state.tsx (NEW - composite)
│   │   └── search-combobox.tsx (NEW - composite)
│   └── ...existing components
├── hooks/
│   ├── api/ (NEW)
│   │   ├── use-cases.ts
│   │   ├── use-legal-documents.ts
│   │   ├── use-analytics.ts
│   │   ├── use-advanced-search.ts
│   │   ├── use-ai-assistant.ts
│   │   ├── use-feedback.ts
│   │   ├── use-calendar.ts
│   │   └── use-tasks.ts
│   └── useBackupSSE.ts (existing)
├── lib/
│   ├── api-client.ts (NEW - typed axios client)
│   ├── animations.ts (NEW - framer motion variants)
│   └── ...existing
├── stores/ (NEW)
│   ├── useUIStore.ts
│   ├── useSearchStore.ts
│   └── useFilterStore.ts
└── types/
    └── api.types.ts (NEW - TypeScript types)
```

---

## Testing Checklist

After each phase, verify:

### Phase 1 (Build Fix)
- [ ] `npm run build` completes successfully
- [ ] No "Module not found" errors
- [ ] Existing pages render correctly
- [ ] No console errors on page load

### Phase 2 (Components)
- [ ] All shadcn components imported successfully
- [ ] Toast notifications work
- [ ] Forms validate correctly
- [ ] All dialogs open/close properly

### Phase 4 (React Query)
- [ ] API calls work from frontend to backend
- [ ] Loading states display correctly
- [ ] Error handling shows user-friendly messages
- [ ] Mutations invalidate cache properly

### Phase 5 (Pages)
- [ ] All 7 new pages accessible via navigation
- [ ] Each page fetches data correctly
- [ ] Responsive layout on mobile/tablet/desktop
- [ ] No TypeScript errors

---

## Estimated Timeline

| Phase | Task | Hours | Days |
|-------|------|-------|------|
| 1 | Fix build failures | 4-6 | 1 |
| 2 | Complete component library | 6-8 | 1-2 |
| 3 | Add animations | 4-6 | 2 |
| 4 | React Query integration | 8-10 | 2-3 |
| 5 | Implement missing pages | 12-16 | 3-4 |
| 6 | State management | 6-8 | 5 |
| 7 | Testing | 8-10 | 5-6 |
| 8 | Optimization | 6-8 | 6 |
| 9 | Accessibility | 4-6 | 7 |
| **Total** | | **58-78** | **7-10** |

---

## Score Progression

- **Current**: 76.9%
- **After Phase 1**: 82% (Build working)
- **After Phase 2**: 88% (Complete components)
- **After Phase 4**: 95% (Full API integration)
- **After Phase 5**: 100% (All pages implemented)
- **After Phase 6-9**: 100%+ (Enhanced, tested, optimized)

---

## Quick Commands Reference

### Start Development Server
```bash
cd C:/Users/benito/poweria/legal/frontend
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Install All Dependencies at Once
```bash
# Critical dependencies
npm install -D tailwindcss-animate
npm install react-hook-form @hookform/resolvers zod framer-motion
npm install @tanstack/react-query-devtools recharts date-fns react-markdown

# Testing (Phase 7)
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom
```

---

## Need Help?

Refer to:
1. **FRONTEND_IMPROVEMENT_PLAN.json** - Complete detailed plan with code examples
2. **API_DOCUMENTATION.md** - Backend API reference
3. **shadcn/ui docs** - https://ui.shadcn.com/
4. **React Query docs** - https://tanstack.com/query/latest

---

## Next Steps

1. Start with Phase 1 (CRITICAL) to fix build
2. Move to Phase 4 for API integration
3. Complete Phase 5 for missing pages
4. Continue with remaining phases based on priority

**Target Completion**: 7-10 working days to reach 100% compliance
