# DocumentSelector - Visual Reference Guide

## Component Anatomy

```
┌─────────────────────────────────────────────────────────┐
│  [Seleccionar documento...] [🔽]                        │  ← Trigger Button
└─────────────────────────────────────────────────────────┘
                     │
                     ▼ (when clicked)
┌─────────────────────────────────────────────────────────┐
│  🔍 [Buscar documentos..............................]   │  ← Search Input
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │ ☐ [CONSTITUCIÓN] Nacional                         │ │
│  │   Constitución del Ecuador 2008                   │ │  ← Document Item
│  │   Año 2008                                         │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ ☐ [CÓDIGO] Nacional                               │ │
│  │   Código Civil Ecuatoriano                        │ │
│  │   Año 2005                                         │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ ☑ [LEY ORGÁNICA] Nacional                         │ │  ← Selected Item
│  │   Ley Orgánica de Garantías Jurisdiccionales...  │ │
│  │   Año 2009                                         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Single Selection Mode

### Closed State

```
┌─────────────────────────────────────────────┐
│  Seleccionar documento...          [🔽]    │
└─────────────────────────────────────────────┘
```

### With Selection

```
┌─────────────────────────────────────────────┐
│  Constitución del Ecuador 2008   [✕] [🔽]  │
└─────────────────────────────────────────────┘
        │                              │
        └─ Selected document title     └─ Clear button
```

### Open State

```
┌─────────────────────────────────────────────┐
│  Constitución del Ecuador 2008   [✕] [🔽]  │
└─────────────────────────────────────────────┘
                 │
                 ▼
    ┌───────────────────────────────────────┐
    │  🔍 Buscar documentos...              │
    ├───────────────────────────────────────┤
    │  ☑ [CONSTITUCIÓN] Nacional            │
    │    Constitución del Ecuador 2008      │
    │    Año 2008                            │
    ├───────────────────────────────────────┤
    │  ☐ [CÓDIGO] Nacional                  │
    │    Código Civil Ecuatoriano           │
    ├───────────────────────────────────────┤
    │  ☐ [LEY ORGÁNICA] Nacional            │
    │    Ley Orgánica de Garantías...       │
    └───────────────────────────────────────┘
```

## Multiple Selection Mode

### Closed State (No Selection)

```
┌─────────────────────────────────────────────┐
│  Seleccionar documentos...         [🔽]    │
└─────────────────────────────────────────────┘
```

### Closed State (With Selections)

```
┌─────────────────────────────────────────────┐
│  3 documentos seleccionados     [✕] [🔽]   │
└─────────────────────────────────────────────┘

[Constitución del Ecuador 2008 ✕]  [Código Civil... ✕]  [Ley Orgánica... ✕]
        │                                │                         │
        └─ Selected document badges ─────┴─────────────────────────┘
```

### Open State (Multi-Select)

```
┌─────────────────────────────────────────────┐
│  3 documentos seleccionados     [✕] [🔽]   │
└─────────────────────────────────────────────┘
                 │
                 ▼
    ┌───────────────────────────────────────┐
    │  🔍 Buscar documentos...              │
    ├───────────────────────────────────────┤
    │  ☑ [CONSTITUCIÓN] Nacional            │ ← Selected
    │    Constitución del Ecuador 2008      │
    │    Año 2008                            │
    ├───────────────────────────────────────┤
    │  ☑ [CÓDIGO] Nacional                  │ ← Selected
    │    Código Civil Ecuatoriano           │
    ├───────────────────────────────────────┤
    │  ☑ [LEY ORGÁNICA] Nacional            │ ← Selected
    │    Ley Orgánica de Garantías...       │
    ├───────────────────────────────────────┤
    │  ☐ [DECRETO] Nacional                 │ ← Available
    │    Decreto Ejecutivo 1234...          │
    └───────────────────────────────────────┘
```

## Document Badge Colors

Visual representation of document type badges:

```
[CONSTITUCIÓN]  → Purple background, white text
[CÓDIGO]        → Blue background, white text
[LEY ORGÁNICA]  → Green background, white text
[LEY ORDINARIA] → Teal background, white text
[DECRETO]       → Orange background, white text
[RESOLUCIÓN]    → Yellow background, white text
[ACUERDO]       → Pink background, white text
[ORDENANZA]     → Indigo background, white text
[REGLAMENTO]    → Red background, white text
```

## States

### Loading State

```
┌─────────────────────────────────────────────┐
│  Seleccionar documento...          [🔽]    │
└─────────────────────────────────────────────┘
                 │
                 ▼
    ┌───────────────────────────────────────┐
    │  🔍 Buscar documentos...              │
    ├───────────────────────────────────────┤
    │                                        │
    │       Cargando documentos...          │
    │                                        │
    └───────────────────────────────────────┘
```

### Empty State (No Results)

```
┌─────────────────────────────────────────────┐
│  Seleccionar documento...          [🔽]    │
└─────────────────────────────────────────────┘
                 │
                 ▼
    ┌───────────────────────────────────────┐
    │  🔍 xyz123...                         │
    ├───────────────────────────────────────┤
    │                                        │
    │   No se encontraron documentos        │
    │   Intenta con otros términos          │
    │                                        │
    └───────────────────────────────────────┘
```

### Disabled State

```
┌─────────────────────────────────────────────┐
│  Constitución del Ecuador 2008      [🔽]   │  ← Grayed out
└─────────────────────────────────────────────┘
           (not clickable)
```

### Max Selections Reached

```
┌─────────────────────────────────────────────┐
│  3 documentos seleccionados     [✕] [🔽]   │
└─────────────────────────────────────────────┘
                 │
                 ▼
    ┌───────────────────────────────────────┐
    │  🔍 Buscar documentos...              │
    ├───────────────────────────────────────┤
    │  ☑ [CONSTITUCIÓN] Nacional            │
    │    Constitución del Ecuador 2008      │
    ├───────────────────────────────────────┤
    │  ☑ [CÓDIGO] Nacional                  │
    │    Código Civil Ecuatoriano           │
    ├───────────────────────────────────────┤
    │  ☑ [LEY ORGÁNICA] Nacional            │
    │    Ley Orgánica de Garantías...       │
    ├───────────────────────────────────────┤
    │  ☐ [DECRETO] Nacional                 │ ← Disabled
    │    Decreto Ejecutivo 1234...          │ ← (grayed out)
    ├───────────────────────────────────────┤
    │  ⚠ Límite máximo de 3 documentos     │
    │     alcanzado                          │
    └───────────────────────────────────────┘
```

## Interaction Flow

### Single Selection Flow

```
1. User clicks trigger button
   └→ Dropdown opens

2. User types in search box
   └→ List filters in real-time

3. User clicks a document
   └→ Document is selected
   └→ Dropdown closes
   └→ onChange callback fires

4. User clicks clear (✕) button
   └→ Selection is cleared
   └→ onChange callback fires with empty value
```

### Multi-Selection Flow

```
1. User clicks trigger button
   └→ Dropdown opens

2. User clicks multiple documents
   └→ Documents are selected
   └→ Checkboxes appear checked
   └→ Dropdown stays open
   └→ onChange callback fires after each selection

3. User sees selected badges below
   └→ Can click ✕ on badge to remove
   └→ onChange callback fires

4. User reaches max selections
   └→ Remaining documents become disabled
   └→ Warning message appears

5. User clicks outside or presses Escape
   └→ Dropdown closes
```

## Responsive Behavior

### Desktop (≥768px)

```
┌───────────────────────────────────────────────────────┐
│  [Seleccionar documento.....................] [🔽]   │
└───────────────────────────────────────────────────────┘
                        │
                        ▼
       ┌────────────────────────────────────────┐
       │  🔍 Buscar documentos...               │
       ├────────────────────────────────────────┤
       │  Full document titles visible          │
       │  Metadata displayed on separate lines  │
       └────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌─────────────────────────────────┐
│  [Seleccionar...........] [🔽] │
└─────────────────────────────────┘
              │
              ▼
    ┌─────────────────────────┐
    │  🔍 Buscar...           │
    ├─────────────────────────┤
    │  Truncated titles...    │
    │  Compact layout         │
    └─────────────────────────┘
```

## Dark Mode

### Light Mode

```
Background: White
Text: Black/Gray-900
Border: Gray-300
Hover: Gray-100
Selected: Blue-600
```

### Dark Mode

```
Background: Gray-950
Text: White/Gray-50
Border: Gray-800
Hover: Gray-800
Selected: Blue-600
```

## Accessibility Indicators

### Keyboard Focus

```
┌─────────────────────────────────────────────┐
│  ▓▓ Seleccionar documento...      [🔽] ▓▓  │ ← Blue outline
└─────────────────────────────────────────────┘
```

### Selected Item Indicator

```
☑ [CONSTITUCIÓN] Nacional          ← Checkmark + blue background
  Constitución del Ecuador 2008
```

### Disabled Item Indicator

```
☐ [DECRETO] Nacional               ← Grayed out, 50% opacity
  Decreto Ejecutivo 1234...           (cursor: not-allowed)
```

## Size Variants

### Default

```
┌──────────────────────────────────────────┐
│  Seleccionar documento...       [🔽]    │  Height: 40px (h-10)
└──────────────────────────────────────────┘
```

### With Custom Width

```
┌────────────────────────┐
│  Seleccionar... [🔽]  │  max-w-md (28rem)
└────────────────────────┘
```

## Animation States

### Opening

```
Frame 1: ┌─────────┐     Opacity: 0, Scale: 95%
         │         │
         └─────────┘

Frame 2: ┌─────────┐     Opacity: 50%, Scale: 97%
         │  ...    │
         └─────────┘

Frame 3: ┌─────────┐     Opacity: 100%, Scale: 100%
         │  Full   │
         └─────────┘
```

### Closing

```
Frame 1: ┌─────────┐     Opacity: 100%, Scale: 100%
         │  Full   │
         └─────────┘

Frame 2: ┌─────────┐     Opacity: 50%, Scale: 97%
         │  ...    │
         └─────────┘

Frame 3: ┌─────────┐     Opacity: 0, Scale: 95%
         │         │
         └─────────┘
```

## Component Hierarchy

```
DocumentSelector
│
├─ Popover
│  ├─ PopoverTrigger
│  │  └─ Button
│  │     ├─ Display Text
│  │     └─ Icons (Clear + Chevron)
│  │
│  └─ PopoverContent
│     └─ Command
│        ├─ CommandInput (Search)
│        ├─ CommandList
│        │  └─ CommandGroup
│        │     └─ ScrollArea
│        │        └─ CommandItem[] (Documents)
│        │           ├─ Checkbox
│        │           ├─ Badge (Type)
│        │           ├─ Text (Title)
│        │           └─ Metadata
│        │
│        └─ Max Limit Warning
│
└─ Selected Badges (Multi-Select)
   └─ Badge[]
      ├─ Document Title
      └─ Remove Button
```

## Color Palette Reference

### Document Type Colors (Hex)

```
CONSTITUCION:   #9333EA (Purple-600)
CODIGO:         #2563EB (Blue-600)
LEY_ORGANICA:   #16A34A (Green-600)
LEY_ORDINARIA:  #0D9488 (Teal-600)
DECRETO:        #EA580C (Orange-600)
RESOLUCION:     #CA8A04 (Yellow-600)
ACUERDO:        #DB2777 (Pink-600)
ORDENANZA:      #4F46E5 (Indigo-600)
REGLAMENTO:     #DC2626 (Red-600)
```

### UI Colors

```
Background (Light):     #FFFFFF (White)
Background (Dark):      #030712 (Gray-950)
Border (Light):         #D1D5DB (Gray-300)
Border (Dark):          #1F2937 (Gray-800)
Text (Light):          #111827 (Gray-900)
Text (Dark):           #F9FAFB (Gray-50)
Hover (Light):         #F3F4F6 (Gray-100)
Hover (Dark):          #1F2937 (Gray-800)
Selected:              #2563EB (Blue-600)
```

## Print Reference

For development and design handoff, here are the key measurements:

- **Trigger Button**: h-10 (40px), w-full
- **Dropdown Width**: w-[400px]
- **Dropdown Max Height**: max-h-[300px]
- **Document Item**: py-1.5 px-2 (6px 8px)
- **Badge**: px-2.5 py-0.5 (10px 2px)
- **Icon Size**: h-4 w-4 (16px)
- **Border Radius**: rounded-md (6px)
- **Gap Between Items**: gap-2 (8px)
