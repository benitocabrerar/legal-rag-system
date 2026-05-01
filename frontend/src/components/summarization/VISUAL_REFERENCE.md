# SummaryCard Visual Reference

## Component Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌────┐  Contract Agreement 2025                            │
│  │ 📄 │  ┌──────────┐ ┌────┐                                │
│  └────┘  │ Standard │ │ ES │                                │
│          └──────────┘ └────┘                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Este contrato establece los términos y condiciones para    │
│  la prestación de servicios legales entre las partes        │
│  mencionadas. Se incluyen cláusulas sobre confidencialidad, │
│  pagos, y resolución de disputas.                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  📊 Word Count          📊 Compression                       │
│  150 / 1,500            90% reduction                        │
│                                                              │
│  📊 Confidence          🕐 Generated                         │
│  ███████████░░ 92%      12 de diciembre de 2025, 10:30      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  📋 Copy Summary │  │  👁  View Document │                │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Light Mode Colors

### Header
- Background: White (#FFFFFF)
- Title: Gray-900 (#111827)
- Badges:
  - Standard: Blue-600 (#2563EB) on white text
  - ES/EN: Gray-200 (#E5E7EB) with gray-900 text
  - Brief: Gray-200 (#E5E7EB)
  - Detailed: Green-600 (#16A34A)

### Content
- Text: Gray-700 (#374151)
- Borders: Gray-200 (#E5E7EB)
- Icons: Blue-600 (#2563EB)
- Labels: Gray-500 (#6B7280)

### Confidence Bar
- High (≥90%): Green-500 (#22C55E)
- Medium (70-89%): Yellow-500 (#EAB308)
- Low (<70%): Red-500 (#EF4444)
- Background: Gray-200 (#E5E7EB)

### Buttons
- Copy: White with gray-300 border
  - Hover: Gray-100 background
- View: Transparent
  - Hover: Gray-100 background

## Dark Mode Colors

### Header
- Background: Gray-800 (#1F2937)
- Title: Gray-100 (#F3F4F6)
- Badges:
  - Standard: Blue-600 (#2563EB) with 80% opacity
  - ES/EN: Gray-700 (#374151) with 80% opacity
  - Text: White

### Content
- Text: Gray-300 (#D1D5DB)
- Borders: Gray-700 (#374151)
- Icons: Blue-400 (#60A5FA)
- Labels: Gray-400 (#9CA3AF)

### Confidence Bar
- High: Green-400 (#4ADE80)
- Medium: Yellow-400 (#FACC15)
- Low: Red-400 (#F87171)
- Background: Gray-700 (#374151)

### Buttons
- Copy: Gray-800 with gray-600 border
  - Hover: Gray-700 background
- View: Transparent
  - Hover: Gray-700 background

## Responsive Breakpoints

### Mobile (< 768px)
```
┌─────────────────────────┐
│  ┌─┐  Contract          │
│  │📄│  ┌────┐ ┌──┐       │
│  └─┘  │Std │ │ES│       │
│       └────┘ └──┘       │
├─────────────────────────┤
│  Summary text wraps     │
│  naturally on mobile... │
├─────────────────────────┤
│  📊 150 / 1,500         │
│  📊 90% reduction       │
│  📊 ███░ 92%            │
│  🕐 12 dic 2025         │
├─────────────────────────┤
│  ┌───────────────────┐ │
│  │  📋 Copy Summary   │ │
│  └───────────────────┘ │
│  ┌───────────────────┐ │
│  │  👁  View Document │ │
│  └───────────────────┘ │
└─────────────────────────┘
```

### Tablet (768px - 1024px)
- Metrics in 2x2 grid
- Buttons in row (flex)
- Balanced spacing

### Desktop (> 1024px)
- Full layout as shown in main diagram
- Optimal spacing
- Side-by-side buttons

## State Variations

### Loading Skeleton
```
┌─────────────────────────────────────────────────────────────┐
│  ████████████████████                                        │
│  ████████ █████                                              │
├─────────────────────────────────────────────────────────────┤
│  ████████████████████████████████████                        │
│  ████████████████████████████████                            │
│  ███████████████████████████                                 │
│  ██████████████████████████████                              │
│  ██████████████████                                          │
├─────────────────────────────────────────────────────────────┤
│  ████████  ████████                                          │
└─────────────────────────────────────────────────────────────┘
```

### Copy Success State
```
┌─────────────────────────────────────────────────────────────┐
│  Footer buttons:                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  ✅ Copied!      │  │  👁  View Document │                │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Without View Button
```
┌─────────────────────────────────────────────────────────────┐
│  Footer buttons:                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              📋 Copy Summary                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Icon Reference

### Used Icons (lucide-react)
- `FileText` - Document icon in header
- `Copy` - Copy button icon
- `CheckCircle2` - Success icon after copying
- `Clock` - Timestamp icon
- `BarChart2` - Metrics icons
- `Eye` - View document icon

### Icon Sizes
- Header icon: 20px (h-5 w-5)
- Button icons: 16px (h-4 w-4)
- Metric icons: 14px (h-3.5 w-3.5)

## Typography Scale

```
Document Name:   18px / 1.125rem - Font Semibold
Summary Text:    14px / 0.875rem - Font Normal
Metric Values:   14px / 0.875rem - Font Medium
Metric Labels:   12px / 0.75rem - Font Normal
Badge Text:      12px / 0.75rem - Font Semibold
Button Text:     14px / 0.875rem - Font Medium
Timestamp:       12px / 0.75rem - Font Normal
```

## Spacing Scale

```
Card Padding:     24px (p-6)
Header Spacing:   6px (space-y-1.5)
Content Padding:  24px horizontal, 0 top (p-6 pt-0)
Footer Padding:   24px horizontal, 0 top (p-6 pt-0)
Badge Gap:        8px (gap-2)
Button Gap:       8px (gap-2)
Metrics Grid Gap: 16px (gap-4)
```

## Accessibility Visual Indicators

### Keyboard Focus
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋 Copy Summary    ← Blue ring on focus            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Confidence Score ARIA
```
<div role="progressbar"
     aria-valuenow="92"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Confidence score: 92%">
  [Visual progress bar]
</div>
```

## Example Configurations

### Brief Summary (Small Card)
- ~5-10 lines of text
- High compression (95%+)
- Quick read badge

### Standard Summary (Medium Card)
- ~15-25 lines of text
- Medium compression (85-95%)
- Balanced detail

### Detailed Summary (Large Card)
- ~30-50 lines of text
- Lower compression (70-85%)
- Comprehensive badge

## Performance Indicators

### Load Time
```
0ms ─────────────────────────────── 100ms
     ↑
    45ms (typical first render)
```

### Copy Action
```
0ms ───────────────── 50ms
         ↑
        12ms (typical)
```

### Skeleton Render
```
0ms ───────────────── 50ms
          ↑
         18ms (typical)
```

## CSS Classes Reference

### Main Container
```css
/* Light mode */
.card {
  @apply rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm;
}

/* Dark mode */
.dark .card {
  @apply border-gray-700 bg-gray-800;
}

/* Hover effect */
.card:hover {
  @apply shadow-md;
}
```

### Confidence Bar Colors
```css
/* High confidence (≥90%) */
.confidence-high {
  @apply bg-green-500 dark:bg-green-400;
}

/* Medium confidence (70-89%) */
.confidence-medium {
  @apply bg-yellow-500 dark:bg-yellow-400;
}

/* Low confidence (<70%) */
.confidence-low {
  @apply bg-red-500 dark:bg-red-400;
}
```

## Component Dimensions

### Card
- Min Width: 320px (mobile)
- Max Width: None (container controlled)
- Min Height: ~400px (with content)
- Padding: 24px all sides

### Header
- Height: Auto (based on content)
- Icon: 20x20px
- Title: Auto-height with line breaks

### Content
- Summary text: Full width with 16px line height
- Metrics grid: 2 columns, auto rows

### Footer
- Height: Auto (48px typical)
- Buttons: 36px height (size-sm)

## Animation Timings

```css
/* Hover transition */
transition: shadow 200ms ease-in-out;

/* Progress bar width */
transition: width 300ms ease-out;

/* Copy feedback */
setTimeout: 2000ms

/* Skeleton pulse */
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
```

## Print Styles (Future Enhancement)

```css
@media print {
  .summary-card {
    break-inside: avoid;
    border: 1px solid #000;
    box-shadow: none;
  }

  .copy-button,
  .view-button {
    display: none;
  }
}
```

---

This visual reference helps designers and developers understand the component's appearance and behavior across different states and viewports.
