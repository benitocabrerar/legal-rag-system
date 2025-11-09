# Revolutionary Legal AI Dashboard Design Specification

## Executive Summary

This specification defines a comprehensive redesign of the Legal RAG system dashboard, transforming it from a basic case management interface into a powerful, AI-first legal intelligence platform that rivals premium legal tech solutions.

**Design Philosophy**: Professional sophistication meets modern AI capabilities. Every interaction should make lawyers feel like they have a senior legal AI assistant at their fingertips.

---

## 1. Information Architecture

### 1.1 Component Hierarchy

```
Dashboard Layout
├── Navigation Bar (Persistent)
│   ├── Logo & Brand
│   ├── Primary Navigation
│   ├── Global Search
│   ├── Notifications Center
│   └── User Profile Menu
│
├── Main Dashboard Page
│   ├── Command Center (Top Section)
│   │   ├── Quick Stats Cards
│   │   ├── AI Insights Panel
│   │   └── Quick Actions Hub
│   │
│   ├── Case Organization Grid
│   │   ├── Filter & Sort Controls
│   │   ├── Legal Type Tabs
│   │   └── Case Cards Grid
│   │
│   └── Activity Timeline (Sidebar)
│       ├── Recent Actions
│       ├── Upcoming Deadlines
│       └── System Notifications
│
└── Individual Case Page
    ├── Case Header Module
    │   ├── Title & Classification
    │   ├── Status Pipeline Visualization
    │   ├── Quick Stats
    │   └── Action Toolbar
    │
    ├── Main Content Area (3-Column Layout)
    │   ├── Left Sidebar: Navigation & Context
    │   │   ├── Document Tree
    │   │   ├── Timeline View
    │   │   └── Related Cases
    │   │
    │   ├── Center Panel: AI Assistant & Work Area
    │   │   ├── Tabbed Interface
    │   │   │   ├── AI Assistant
    │   │   │   ├── Document Editor
    │   │   │   ├── Legal Analysis
    │   │   │   └── Case Timeline
    │   │   │
    │   │   └── Context-Aware Toolbar
    │   │
    │   └── Right Sidebar: Tools & Insights
    │       ├── Quick Actions Panel
    │       ├── Legal References
    │       ├── Citation Finder
    │       └── Process Checklist
    │
    └── Bottom Panel: Smart Recommendations
        ├── Next Steps AI Suggestions
        ├── Similar Cases
        └── Legal Precedents
```

---

## 2. Main Dashboard Page Design

### 2.1 Command Center Section

**Layout**: Full-width container with gradient background (professional legal blue gradient)

#### 2.1.1 Quick Stats Cards (Top Row)
Four metric cards in a responsive grid:

```tsx
Stats Card Structure:
┌─────────────────────────────┐
│ ICON    METRIC VALUE        │
│         Metric Label        │
│         Trend Indicator     │
└─────────────────────────────┘

Cards:
1. Total Cases
   - Icon: Briefcase
   - Value: Count with color coding
   - Trend: Week over week change
   - Click: Filter to all cases

2. Active Matters
   - Icon: Pulse/Activity
   - Value: Active case count
   - Trend: Cases requiring attention
   - Click: Filter to active cases

3. Pending Actions
   - Icon: Clock with notification badge
   - Value: Action count
   - Trend: Urgency indicator (red/yellow/green)
   - Click: Open actions list

4. Deadlines This Week
   - Icon: Calendar with alert
   - Value: Upcoming deadline count
   - Trend: Next deadline date
   - Click: Open deadline calendar
```

**Visual Design**:
- Card background: White with subtle shadow
- Border: 1px solid with legal type color accent on left edge
- Hover effect: Lift shadow, scale 1.02
- Icon: Large (32px), colored by category
- Metric value: Bold, 2.5rem
- Trend: Small badge with icon (up/down arrow)

#### 2.1.2 AI Insights Panel (Center)

**Purpose**: Dynamic AI-powered recommendations based on user's case portfolio

```tsx
AI Insights Panel Layout:
┌──────────────────────────────────────────┐
│ AI INSIGHTS                    [Settings]│
│ ──────────────────────────────────────── │
│                                           │
│ Primary Insight (Rotating Carousel):      │
│ ┌───────────────────────────────────────┐│
│ │ 💡 [AI-Generated Insight]             ││
│ │                                       ││
│ │ "You have 3 civil cases approaching   ││
│ │  discovery deadlines in the next 2    ││
│ │  weeks. Consider preparing document   ││
│ │  disclosure lists."                   ││
│ │                                       ││
│ │ [Action Button: Create Checklist]     ││
│ └───────────────────────────────────────┘│
│                                           │
│ Quick Insights (3 pills):                 │
│ • 2 cases need status updates            │
│ • Document analysis ready for Case #1820 │
│ • New jurisprudence available (Laboral)  │
└──────────────────────────────────────────┘
```

**AI Insight Types**:
1. Deadline Alerts: Cases approaching critical dates
2. Document Status: Missing or incomplete documents
3. Legal Updates: New regulations affecting cases
4. Pattern Recognition: Similar case precedents
5. Workflow Optimization: Process improvement suggestions
6. Budget Tracking: Cost analysis and forecasting

**Visual Design**:
- Background: Gradient from indigo-50 to purple-50
- Primary insight: White card with shadow
- Icon: Animated AI sparkle effect
- Typography: Professional serif for insights
- Action buttons: High-contrast CTA

#### 2.1.3 Quick Actions Hub

**Layout**: Horizontal icon grid with hover expansion

```tsx
Quick Actions Layout:
┌─────────────────────────────────────────────────┐
│ [+ Nuevo Caso] [📄 Generar Doc] [🔍 Buscar]    │
│                [📊 Reportes] [⚙️ Más...]        │
└─────────────────────────────────────────────────┘

Expanded "+ Nuevo Caso" Modal:
┌────────────────────────────────────┐
│ Crear Nuevo Caso                   │
│ ─────────────────────────────────  │
│                                     │
│ Seleccionar Tipo de Caso:          │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ ⚖️    │ │ 🏛️   │ │ 🚗   │        │
│ │ Penal│ │ Civil│ │Tráns.│        │
│ └──────┘ └──────┘ └──────┘        │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ 📜    │ │ 💼   │ │ 🏢   │        │
│ │Const.│ │Labor.│ │Admin.│        │
│ └──────┘ └──────┘ └──────┘        │
│                                     │
│ [Continuar →]                      │
└────────────────────────────────────┘
```

**Quick Actions**:
1. **Nuevo Caso**: Modal with legal type selection
2. **Generar Documento**: Template library browser
3. **Búsqueda Semántica**: Cross-case search interface
4. **Exportar Reportes**: Multi-case reporting
5. **Más...**: Dropdown with additional tools

### 2.2 Case Organization Grid

#### 2.2.1 Filter & Sort Controls

```tsx
Filter Bar Layout:
┌───────────────────────────────────────────────────────┐
│ Tipo Legal: [Todos v] | Estado: [Todos v] |          │
│ Ordenar: [Más reciente v] | Vista: [■ Grid] [≡ List] │
└───────────────────────────────────────────────────────┘
```

**Filter Options**:
- **Tipo Legal**: All, Penal, Civil, Constitucional, Tránsito, Administrativo, Laboral
- **Estado**: All, Active, Pending, Closed, Archived
- **Prioridad**: All, High, Medium, Low
- **Cliente**: Search/autocomplete

**Sort Options**:
- Most Recent (default)
- By Client Name
- By Case Number
- By Priority
- By Next Deadline

#### 2.2.2 Legal Type Tabs

**Visual Design**: Horizontal tab bar with icons and count badges

```tsx
Tab Bar:
┌─────────────────────────────────────────────────────┐
│ [Todos (24)] [⚖️ Penal (8)] [🏛️ Civil (12)] ...   │
└─────────────────────────────────────────────────────┘
```

**Tab Styling**:
- Active tab: Bold text, colored underline (3px), legal type color
- Inactive tab: Gray text, hover effect
- Badge: Circle with count, matching tab color
- Smooth slide transition on tab change

#### 2.2.3 Case Cards Grid

**Layout**: Responsive grid (3 cols desktop, 2 cols tablet, 1 col mobile)

```tsx
Enhanced Case Card:
┌────────────────────────────────────────┐
│ ┌──┐                          [⋮ Menu]│
│ │🏛️│ Case Title                        │
│ └──┘ [CIVIL] [HIGH PRIORITY]           │
│ ────────────────────────────────────── │
│                                         │
│ Cliente: Juan Pérez                    │
│ Caso Nº: 2025-001                      │
│ Estado: En proceso                     │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Next Action: Presentar escrito  │   │
│ │ Due: Jan 15, 2025 (3 días)      │   │
│ └─────────────────────────────────┘   │
│                                         │
│ Progress: ████████░░░░ 65%             │
│                                         │
│ 📄 12 docs | 💬 24 queries | 📅 Jan 10 │
└────────────────────────────────────────┘
```

**Card Elements**:
1. **Legal Type Icon**: Large, colored by category
2. **Badges**: Legal type, priority level
3. **Client & Case Info**: Clear hierarchy
4. **Next Action Panel**: Highlighted upcoming task
5. **Progress Bar**: Visual completion indicator
6. **Footer Stats**: Document count, query count, date

**Hover Effects**:
- Border color changes to legal type color
- Shadow elevation increases
- Quick action buttons appear (Edit, Archive, Share)

**Card Colors by Legal Type**:
- Penal: Red-700 (#b91c1c)
- Civil: Blue-600 (#2563eb)
- Constitucional: Purple-600 (#9333ea)
- Tránsito: Yellow-600 (#ca8a04)
- Administrativo: Gray-600 (#4b5563)
- Laboral: Green-600 (#16a34a)

### 2.3 Activity Timeline Sidebar

**Layout**: Fixed right sidebar (300px width)

```tsx
Timeline Sidebar:
┌──────────────────────────┐
│ ACTIVIDAD RECIENTE       │
│ ─────────────────────── │
│                          │
│ ○ Hoy 10:30 AM          │
│   Documento subido       │
│   Case #1820            │
│                          │
│ ○ Ayer 3:15 PM          │
│   Consulta AI realizada │
│   Case #1823            │
│                          │
│ ────────────────────── │
│ PRÓXIMOS PLAZOS         │
│ ─────────────────────── │
│                          │
│ ! 15 Ene (3 días)       │
│   Presentar escrito     │
│   Case #1820            │
│                          │
│ ⚠ 20 Ene (8 días)       │
│   Audiencia preliminar  │
│   Case #1815            │
└──────────────────────────┘
```

**Activity Types**:
- Document uploaded
- AI query performed
- Case created/updated
- Document generated
- Status changed
- Deadline added/completed

**Visual Design**:
- Timeline dots: Color-coded by activity type
- Connecting lines: Subtle gray
- Deadline icons: Color-coded by urgency (red/yellow/green)
- Scrollable with infinite scroll

---

## 3. Individual Case Page Design

### 3.1 Case Header Module

```tsx
Case Header Layout:
┌────────────────────────────────────────────────────────┐
│ ┌──┐                                                   │
│ │🏛️│ Demanda Civil contra Empresa XYZ      [⋮ Acciones]│
│ └──┘ [CIVIL] [ALTA PRIORIDAD] [EN PROCESO]            │
│                                                         │
│ Cliente: Juan Pérez | Caso: 2025-001 | Creado: 10 Ene │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Pipeline de Proceso:                                ││
│ │ ●━━━●━━━●━━━○━━━○━━━○                              ││
│ │ Inicial Documentación Audiencia Resolución Archivo ││
│ │         [ACTUAL: Documentación - 65%]               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                          │
│ │ 12 │ │ 24 │ │ 3  │ │ 15 │                          │
│ │Docs│ │Q&A │ │Acts│ │Days│                          │
│ └────┘ └────┘ └────┘ └────┘                          │
└────────────────────────────────────────────────────────┘
```

**Elements**:
1. **Title & Badges**: Legal type, priority, status
2. **Metadata Row**: Client, case number, creation date
3. **Pipeline Visualization**:
   - Visual progress through legal process stages
   - Current stage highlighted
   - Percentage completion
4. **Quick Stats**: Documents, queries, activities, days to next deadline
5. **Action Menu**: Edit, Share, Archive, Export, Delete

**Pipeline Stages by Legal Type**:

**Penal**:
1. Denuncia/Querella
2. Investigación Fiscal
3. Instrucción Fiscal
4. Juicio
5. Sentencia
6. Recursos

**Civil**:
1. Inicial (Demanda)
2. Documentación
3. Audiencia Preliminar
4. Pruebas
5. Sentencia
6. Ejecución

**Laboral**:
1. Demanda
2. Mediación
3. Audiencia
4. Pruebas
5. Resolución
6. Recursos

### 3.2 Main Content Area - AI Assistant Panel

**Layout**: Center panel with tabbed interface

```tsx
AI Assistant Tab:
┌──────────────────────────────────────────────────────┐
│ [🤖 Asistente] [📝 Editor] [📊 Análisis] [📅 Línea] │
│ ──────────────────────────────────────────────────── │
│                                                       │
│ Consultas Especializadas:                            │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │Búsqueda│ │Análisis│ │Generar │ │Citar   │        │
│ │Semántic│ │Jurídico│ │Documen.│ │Legal   │        │
│ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                       │
│ ┌──────────────────────────────────────────────────┐│
│ │ Chat Area (Messages)                             ││
│ │                                                  ││
│ │ [Previous conversations...]                      ││
│ │                                                  ││
│ │ USER: ¿Qué argumentos jurídicos puedo usar?     ││
│ │                                                  ││
│ │ AI: Basándome en los documentos del caso...     ││
│ │     [Legal references with citations]           ││
│ │     [Similarity scores and sources]             ││
│ │                                                  ││
│ └──────────────────────────────────────────────────┘│
│                                                       │
│ ┌──────────────────────────────────────────────────┐│
│ │ [Prompt Templates v] Tu consulta...         [⚙️] ││
│ │                                        [Enviar →] ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

#### 3.2.1 Specialized Legal Prompts (Quick Actions)

**Búsqueda Semántica**:
- Cross-reference search across case documents
- Search constitutional articles, laws, codes, regulations
- Jurisprudence finder with similarity scores
- Citation extraction and validation

**Análisis Jurídico**:
- Legal argument strength analysis
- Precedent comparison
- Risk assessment
- Counter-argument identification

**Generar Documento**:
- Demandas (by legal type)
- Escritos procesales
- Informes periciales
- Pedidos de impulso
- Recursos (apelación, casación, etc.)

**Citar Legal**:
- Article citation finder
- Jurisprudence reference builder
- Legal doctrine citations
- International law references

#### 3.2.2 Prompt Templates Dropdown

**Pre-configured Prompts by Case Type**:

**Civil**:
- "Analiza los fundamentos jurídicos para mi demanda"
- "Encuentra jurisprudencia sobre [tema específico]"
- "Genera un escrito de contestación a la demanda"
- "¿Qué artículos del Código Civil aplican a este caso?"

**Penal**:
- "Analiza los elementos del tipo penal"
- "Encuentra atenuantes aplicables"
- "Genera un escrito de defensa"
- "¿Qué dice el COIP sobre [delito]?"

**Laboral**:
- "Calcula indemnizaciones según el Código de Trabajo"
- "Analiza el despido intempestivo"
- "Genera demanda de cobro de utilidades"
- "Encuentra jurisprudencia sobre acoso laboral"

#### 3.2.3 AI Response Features

**Enhanced Response Display**:
```tsx
AI Response Card:
┌──────────────────────────────────────────────────────┐
│ 🤖 Asistente Legal                                   │
│ ──────────────────────────────────────────────────── │
│                                                       │
│ [Main response text with legal references]           │
│                                                       │
│ 📚 REFERENCIAS LEGALES:                              │
│ • Constitución Art. 76, numeral 7, literal a)       │
│   Relevancia: 94% [Ver texto completo →]            │
│                                                       │
│ • COIP Art. 234 - Cohecho                            │
│   Relevancia: 89% [Ver texto completo →]            │
│                                                       │
│ • Sentencia 1234-2023-EP (Corte Constitucional)     │
│   Relevancia: 87% [Ver sentencia →]                 │
│                                                       │
│ 📄 FUENTES DEL CASO:                                 │
│ • documento_1.pdf (página 3-5) - Relevancia: 92%    │
│ • evidencia_pericial.pdf (página 12) - 88%          │
│                                                       │
│ ⚡ ACCIONES SUGERIDAS:                               │
│ [Generar escrito con estos argumentos]              │
│ [Buscar más jurisprudencia similar]                 │
│ [Exportar referencias a PDF]                         │
└──────────────────────────────────────────────────────┘
```

**Key Features**:
1. **Legal Reference Cards**: Expandable citation cards
2. **Relevance Scores**: Semantic similarity percentages
3. **Source Attribution**: Document pages and highlights
4. **Action Buttons**: Convert insights to documents
5. **Export Options**: PDF, DOCX, citation manager

### 3.3 Document Generation Center Tab

```tsx
Document Generation Tab:
┌──────────────────────────────────────────────────────┐
│ [🤖 Asistente] [📝 Editor] [📊 Análisis] [📅 Línea] │
│ ──────────────────────────────────────────────────── │
│                                                       │
│ Generador de Documentos Legales                      │
│                                                       │
│ Tipo de Caso: [CIVIL v]                             │
│                                                       │
│ Seleccionar Plantilla:                               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ 📄 DEMANDA   │ │ 📋 ESCRITO   │ │ 📊 INFORME   │ │
│ │              │ │              │ │              │ │
│ │ Demanda      │ │ Contestación │ │ Informe      │ │
│ │ Inicial      │ │ Recursos     │ │ Pericial     │ │
│ │              │ │ Impulso      │ │              │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                       │
│ Plantilla Seleccionada: Demanda Inicial Civil        │
│ ──────────────────────────────────────────────────── │
│                                                       │
│ Configuración de Generación:                         │
│                                                       │
│ ☑ Incluir fundamentos jurídicos automáticos          │
│ ☑ Agregar citas legales relevantes                   │
│ ☑ Generar petitorio según caso                       │
│ ☐ Incluir jurisprudencia relacionada                 │
│                                                       │
│ Tono del documento: [Formal Profesional v]           │
│                                                       │
│ Instrucciones adicionales:                            │
│ ┌────────────────────────────────────────────────┐  │
│ │ Describe detalles específicos que deseas       │  │
│ │ incluir en el documento...                     │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ [Vista Previa]  [Generar Documento con AI →]        │
└──────────────────────────────────────────────────────┘
```

**Document Templates by Legal Type**:

**Civil**:
- Demanda inicial
- Contestación a la demanda
- Recursos (reposición, apelación, casación)
- Pedido de medidas cautelares
- Escrito de pruebas
- Alegatos

**Penal**:
- Escrito de defensa
- Petición de libertad
- Solicitud de medidas alternativas
- Recursos de apelación
- Escrito de acusación particular

**Laboral**:
- Demanda laboral
- Reclamo administrativo
- Solicitud de visto bueno
- Escrito de conciliación

**Constitucional**:
- Acción de protección
- Acción de hábeas corpus
- Acción de acceso a información
- Acción extraordinaria de protección

**AI Generation Features**:
1. **Context-Aware**: Uses case documents and details
2. **Legal Citation**: Auto-inserts relevant articles
3. **Jurisprudence**: Adds supporting case law
4. **Customizable Tone**: Formal, technical, persuasive
5. **Iterative Refinement**: Edit and regenerate sections
6. **Export Formats**: PDF (formatted), DOCX (editable), TXT

### 3.4 Legal Analysis Tools Tab

```tsx
Legal Analysis Tab:
┌──────────────────────────────────────────────────────┐
│ [🤖 Asistente] [📝 Editor] [📊 Análisis] [📅 Línea] │
│ ──────────────────────────────────────────────────── │
│                                                       │
│ Herramientas de Análisis Legal                       │
│                                                       │
│ ┌──────────────────────────────────────────────────┐│
│ │ 📊 ANÁLISIS VECTORIAL                            ││
│ │                                                  ││
│ │ Visualización de similitud semántica:           ││
│ │                                                  ││
│ │ [Interactive vector space visualization]        ││
│ │ • Document clusters by topic                    ││
│ │ • Similarity heatmap                            ││
│ │ • Key concept extraction                        ││
│ │                                                  ││
│ │ [Ejecutar Análisis]                             ││
│ └──────────────────────────────────────────────────┘│
│                                                       │
│ ┌──────────────────────────────────────────────────┐│
│ │ 🔍 BUSCADOR DE CASOS RELACIONADOS               ││
│ │                                                  ││
│ │ Encontrar casos similares basados en:           ││
│ │ ☑ Tipo legal                                    ││
│ │ ☑ Hechos del caso                               ││
│ │ ☑ Argumentos jurídicos                          ││
│ │ ☐ Cliente                                       ││
│ │                                                  ││
│ │ Resultados (3 casos encontrados):               ││
│ │ • Caso #1815 - Similitud: 87%                   ││
│ │ • Caso #1792 - Similitud: 82%                   ││
│ │ • Caso #1756 - Similitud: 78%                   ││
│ │                                                  ││
│ │ [Ver Detalles]                                  ││
│ └──────────────────────────────────────────────────┘│
│                                                       │
│ ┌──────────────────────────────────────────────────┐│
│ │ ⚖️ BÚSQUEDA DE PRECEDENTES LEGALES              ││
│ │                                                  ││
│ │ Buscar en:                                       ││
│ │ ☑ Constitución de Ecuador                       ││
│ │ ☑ Leyes orgánicas                               ││
│ │ ☑ Códigos (Civil, Penal, Trabajo, etc.)        ││
│ │ ☑ Jurisprudencia de Corte Constitucional       ││
│ │ ☑ Jurisprudencia de Corte Nacional             ││
│ │                                                  ││
│ │ Consulta: [Buscar artículos relevantes...]     ││
│ │                                                  ││
│ │ [Buscar Precedentes]                            ││
│ └──────────────────────────────────────────────────┘│
│                                                       │
│ ┌──────────────────────────────────────────────────┐│
│ │ 🧪 RECOMENDACIONES DE EVIDENCIA/PERICIA         ││
│ │                                                  ││
│ │ Basado en el análisis del caso, se recomienda: ││
│ │                                                  ││
│ │ 📋 Evidencia sugerida:                          ││
│ │ • Peritaje contable (relevancia alta)          ││
│ │ • Testimonio de testigo presencial             ││
│ │ • Informe técnico de avalúo                     ││
│ │                                                  ││
│ │ 👥 Peritos recomendados:                        ││
│ │ • Contador público autorizado                   ││
│ │ • Perito calígrafo                              ││
│ │                                                  ││
│ │ [Generar Lista de Pericia]                      ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**Analysis Tools**:

1. **Vector Analysis Visualization**:
   - 2D/3D scatter plot of document embeddings
   - Clustering by legal concepts
   - Topic modeling visualization
   - Similarity heatmap

2. **Related Case Finder**:
   - Semantic search across user's cases
   - Multi-factor similarity scoring
   - Case comparison view
   - Strategy mining from similar cases

3. **Legal Precedent Search**:
   - Cross-reference with legal document database
   - Constitutional article finder
   - Code article search (Civil, Penal, Trabajo, etc.)
   - Jurisprudence search with relevance ranking

4. **Evidence/Pericia Recommendations**:
   - AI-suggested evidence types
   - Expert witness recommendations
   - Document checklist generator
   - Chain of custody templates

### 3.5 Right Sidebar - Tools & Insights

```tsx
Right Sidebar Layout:
┌───────────────────────────────┐
│ ACCIONES RÁPIDAS              │
│ ────────────────────────────  │
│                                │
│ [+ Subir Documento]           │
│ [🤖 Nueva Consulta AI]        │
│ [📝 Generar Escrito]          │
│ [📊 Exportar Caso]            │
│                                │
│ ────────────────────────────  │
│ REFERENCIAS LEGALES           │
│ ────────────────────────────  │
│                                │
│ Más Citadas:                  │
│ • COIP Art. 234 (12x)         │
│ • Constitución Art. 76 (8x)   │
│ • Código Civil Art. 1453 (5x) │
│                                │
│ [Ver Todas →]                 │
│                                │
│ ────────────────────────────  │
│ BUSCADOR DE CITAS             │
│ ────────────────────────────  │
│                                │
│ Buscar artículo o tema:       │
│ [_____________________] [🔍]  │
│                                │
│ Atajos:                        │
│ • Constitución                 │
│ • COIP                         │
│ • Código Civil                 │
│ • Código de Trabajo           │
│ • Jurisprudencia              │
│                                │
│ ────────────────────────────  │
│ CHECKLIST DE PROCESO          │
│ ────────────────────────────  │
│                                │
│ Etapa: Documentación (65%)    │
│                                │
│ ☑ Demanda presentada          │
│ ☑ Citación realizada          │
│ ☐ Contestación recibida       │
│ ☐ Pruebas presentadas         │
│ ☐ Audiencia programada        │
│                                │
│ [Actualizar Checklist]        │
│                                │
│ ────────────────────────────  │
│ PRÓXIMOS PASOS                │
│ ────────────────────────────  │
│                                │
│ ! Presentar escrito           │
│   Vence: 15 Ene (3 días)      │
│                                │
│ ⚠ Preparar documentos         │
│   Vence: 20 Ene (8 días)      │
│                                │
│ [+ Agregar Tarea]             │
└───────────────────────────────┘
```

**Sidebar Components**:

1. **Quick Actions**:
   - Upload document (drag & drop)
   - New AI query (quick input)
   - Generate document (template picker)
   - Export case (PDF/ZIP options)

2. **Legal References**:
   - Most cited articles in case
   - Frequency counter
   - Quick link to full text
   - Export citations to bibliography

3. **Citation Finder**:
   - Search legal articles by number or keyword
   - Quick access to common codes
   - Recent searches
   - Citation formatting options

4. **Process Checklist**:
   - Dynamic checklist by legal type
   - Progress tracking
   - Customizable tasks
   - Auto-updates based on pipeline stage

5. **Next Steps**:
   - AI-recommended actions
   - Deadline-based task list
   - Priority indicators
   - Quick task creation

---

## 4. Design System Specification

### 4.1 Color Palette

#### 4.1.1 Primary Legal Type Colors

```css
/* Penal - Red Authority */
--legal-penal-primary: #b91c1c;      /* red-700 */
--legal-penal-light: #fecaca;        /* red-200 */
--legal-penal-dark: #7f1d1d;         /* red-900 */

/* Civil - Blue Trust */
--legal-civil-primary: #2563eb;      /* blue-600 */
--legal-civil-light: #bfdbfe;        /* blue-200 */
--legal-civil-dark: #1e3a8a;         /* blue-900 */

/* Constitucional - Purple Prestige */
--legal-const-primary: #9333ea;      /* purple-600 */
--legal-const-light: #e9d5ff;        /* purple-200 */
--legal-const-dark: #581c87;         /* purple-900 */

/* Tránsito - Yellow Caution */
--legal-transito-primary: #ca8a04;   /* yellow-600 */
--legal-transito-light: #fef08a;     /* yellow-200 */
--legal-transito-dark: #713f12;      /* yellow-900 */

/* Administrativo - Gray Professional */
--legal-admin-primary: #4b5563;      /* gray-600 */
--legal-admin-light: #d1d5db;        /* gray-300 */
--legal-admin-dark: #1f2937;         /* gray-800 */

/* Laboral - Green Growth */
--legal-laboral-primary: #16a34a;    /* green-600 */
--legal-laboral-light: #bbf7d0;      /* green-200 */
--legal-laboral-dark: #14532d;       /* green-900 */
```

#### 4.1.2 Neutral & Semantic Colors

```css
/* Neutrals */
--color-white: #ffffff;
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;
--color-black: #000000;

/* Brand Primary (AI Assistant) */
--color-primary-50: #eef2ff;
--color-primary-100: #e0e7ff;
--color-primary-500: #6366f1;   /* indigo-500 */
--color-primary-600: #4f46e5;   /* indigo-600 */
--color-primary-700: #4338ca;   /* indigo-700 */

/* Semantic */
--color-success: #10b981;       /* green-500 */
--color-warning: #f59e0b;       /* amber-500 */
--color-error: #ef4444;         /* red-500 */
--color-info: #3b82f6;          /* blue-500 */
```

#### 4.1.3 Gradients

```css
/* Brand Gradient (Headers, CTAs) */
--gradient-brand: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);

/* Legal Type Gradients (Backgrounds) */
--gradient-penal: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%);
--gradient-civil: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
--gradient-const: linear-gradient(135deg, #9333ea 0%, #c084fc 100%);
--gradient-transito: linear-gradient(135deg, #ca8a04 0%, #facc15 100%);
--gradient-admin: linear-gradient(135deg, #4b5563 0%, #9ca3af 100%);
--gradient-laboral: linear-gradient(135deg, #16a34a 0%, #4ade80 100%);

/* Subtle Backgrounds */
--gradient-light: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
--gradient-paper: linear-gradient(180deg, #fefefe 0%, #f8f9fa 100%);
```

### 4.2 Typography System

#### 4.2.1 Font Families

```css
/* Primary Font (UI) */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Secondary Font (Headings) */
--font-display: 'Lexend', 'Inter', sans-serif;

/* Legal Documents (Formal) */
--font-serif: 'Merriweather', 'Georgia', serif;

/* Monospace (Code, Numbers) */
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

#### 4.2.2 Type Scale

```css
/* Font Sizes (Responsive) */
--text-xs: 0.75rem;      /* 12px - Labels, captions */
--text-sm: 0.875rem;     /* 14px - Body small, metadata */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.125rem;     /* 18px - Emphasized body */
--text-xl: 1.25rem;      /* 20px - H5, card titles */
--text-2xl: 1.5rem;      /* 24px - H4, section headers */
--text-3xl: 1.875rem;    /* 30px - H3, page titles */
--text-4xl: 2.25rem;     /* 36px - H2, hero sections */
--text-5xl: 3rem;        /* 48px - H1, landing pages */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-black: 900;

/* Line Heights */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

/* Letter Spacing */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
```

#### 4.2.3 Typography Components

```css
/* Heading Styles */
.heading-1 {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.heading-2 {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

.heading-3 {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

/* Body Styles */
.body-large {
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
}

.body-normal {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

.body-small {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

/* Legal Text */
.legal-text {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-gray-800);
}

/* Labels & Metadata */
.label {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.metadata {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}
```

### 4.3 Spacing System

```css
/* Spacing Scale (4px base) */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */

/* Component Spacing */
--spacing-card-padding: var(--space-6);
--spacing-section-gap: var(--space-8);
--spacing-element-gap: var(--space-4);
```

### 4.4 Border & Shadow System

```css
/* Border Radius */
--radius-sm: 0.25rem;   /* 4px - Tags, badges */
--radius-md: 0.5rem;    /* 8px - Buttons, inputs */
--radius-lg: 0.75rem;   /* 12px - Cards */
--radius-xl: 1rem;      /* 16px - Modals */
--radius-2xl: 1.5rem;   /* 24px - Hero sections */
--radius-full: 9999px;  /* Circular */

/* Border Width */
--border-thin: 1px;
--border-medium: 2px;
--border-thick: 3px;

/* Shadows */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);

/* Colored Shadows (for legal type cards) */
--shadow-penal: 0 10px 20px -5px rgb(185 28 28 / 0.2);
--shadow-civil: 0 10px 20px -5px rgb(37 99 235 / 0.2);
--shadow-const: 0 10px 20px -5px rgb(147 51 234 / 0.2);
```

### 4.5 Component Patterns

#### 4.5.1 Button Variants

```css
/* Primary Button (CTA) */
.btn-primary {
  background: var(--gradient-brand);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: white;
  color: var(--color-primary-600);
  border: 2px solid var(--color-primary-600);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-primary-50);
}

/* Legal Type Buttons */
.btn-legal-penal {
  background: var(--legal-penal-primary);
  color: white;
}

.btn-legal-civil {
  background: var(--legal-civil-primary);
  color: white;
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  color: var(--color-gray-700);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background: var(--color-gray-100);
}

/* Icon Button */
.btn-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--color-gray-100);
}
```

#### 4.5.2 Card Variants

```css
/* Base Card */
.card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-card-padding);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* Legal Type Card */
.card-legal {
  position: relative;
  border-left: 4px solid var(--legal-type-color);
}

.card-legal-penal {
  border-left-color: var(--legal-penal-primary);
}

.card-legal-civil {
  border-left-color: var(--legal-civil-primary);
}

/* Stat Card */
.card-stat {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.card-stat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--gradient-brand);
}

/* AI Insight Card */
.card-ai-insight {
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
  border: 2px solid var(--color-primary-200);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  position: relative;
}

.card-ai-insight::before {
  content: '✨';
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-size: 2rem;
  opacity: 0.3;
}
```

#### 4.5.3 Badge Variants

```css
/* Base Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

/* Legal Type Badges */
.badge-penal {
  background: var(--legal-penal-light);
  color: var(--legal-penal-dark);
}

.badge-civil {
  background: var(--legal-civil-light);
  color: var(--legal-civil-dark);
}

.badge-const {
  background: var(--legal-const-light);
  color: var(--legal-const-dark);
}

/* Priority Badges */
.badge-priority-high {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.badge-priority-medium {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.badge-priority-low {
  background: #e0e7ff;
  color: #3730a3;
  border: 1px solid #c7d2fe;
}

/* Status Badges */
.badge-status-active {
  background: #d1fae5;
  color: #065f46;
}

.badge-status-pending {
  background: #fef3c7;
  color: #92400e;
}

.badge-status-closed {
  background: #e5e7eb;
  color: #374151;
}
```

#### 4.5.4 Input Variants

```css
/* Base Input */
.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.input:disabled {
  background: var(--color-gray-100);
  cursor: not-allowed;
}

/* Search Input */
.input-search {
  padding-left: 2.5rem;
  background-image: url("data:image/svg+xml,..."); /* Search icon */
  background-position: 0.75rem center;
  background-repeat: no-repeat;
}

/* Textarea */
.textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s ease;
}

/* Select */
.select {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 2px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* Chevron icon */
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
}
```

### 4.6 Animation & Transitions

```css
/* Transition Durations */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

/* Easing Functions */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* Common Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

/* AI Sparkle Animation */
@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Loading Skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-200) 0%,
    var(--color-gray-300) 50%,
    var(--color-gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 5. Interaction Patterns

### 5.1 User Flows

#### 5.1.1 Create New Case Flow

```
User Journey: Create New Case

1. Dashboard → Click "Nuevo Caso" button
   ↓
2. Legal Type Selection Modal
   - Visual grid of 6 legal types
   - Large icons, clear labels
   - Hover preview of requirements
   ↓
3. Case Details Form (Multi-step)
   Step 1: Basic Information
   - Case title
   - Client name
   - Case number (optional, auto-generated)
   - Description

   Step 2: Legal Classification
   - Legal type (pre-selected from step 2)
   - Sub-type (if applicable)
   - Jurisdiction
   - Court/Instance

   Step 3: Initial Documents (Optional)
   - Drag & drop document upload
   - Document type selection
   - Bulk upload support

   Step 4: Review & Create
   - Summary of all details
   - Edit any section
   - Create case
   ↓
4. Case Created Confirmation
   - Success message
   - Quick actions:
     - Go to case page
     - Upload more documents
     - Start AI consultation
     - Create another case
   ↓
5. Redirect to Case Page
   - Animated transition
   - Welcome tooltip tour (first-time users)
```

#### 5.1.2 AI Consultation Flow

```
User Journey: AI Legal Consultation

1. Case Page → AI Assistant Tab
   ↓
2. Consultation Type Selection
   - Quick action buttons:
     • Búsqueda Semántica
     • Análisis Jurídico
     • Generar Documento
     • Citar Legal
   ↓
3a. If "Búsqueda Semántica" selected:
    - Search input appears
    - Scope selection: Case docs / Legal library / Both
    - Real-time suggestions as user types
    - Submit query
    ↓
    AI Processing Indicator
    - Animated loading state
    - Progress messages: "Analyzing documents...", "Finding references..."
    ↓
    Results Display
    - Relevance-sorted results
    - Highlighted matching excerpts
    - Expandable source cards
    - Actions: Export, Save, Ask follow-up

3b. If "Generar Documento" selected:
    - Template library browser
    - Filter by legal type
    - Template preview
    - Select template
    ↓
    Configuration Form
    - Document parameters
    - AI generation options
    - Tone selection
    - Additional instructions
    ↓
    AI Generation
    - Progressive generation (streaming)
    - Real-time preview
    ↓
    Document Editor
    - Rich text editor
    - Inline AI suggestions
    - Citation insertion
    - Export options (PDF/DOCX)
```

#### 5.1.3 Document Upload & Processing Flow

```
User Journey: Upload & Process Document

1. Case Page → Documents Section
   ↓
2. Upload Trigger
   Option A: Click "Subir Documento" button
   Option B: Drag & drop file into document area
   ↓
3. File Selection Dialog
   - Multi-file selection supported
   - File type validation (PDF, DOCX, TXT)
   - Size limit check (per plan)
   ↓
4. Upload Progress
   - Individual file progress bars
   - Overall upload progress
   - Cancel option for each file
   ↓
5. Processing Notification
   - "Processing document..." status
   - Document appears in list as "Processing"
   ↓
6. Embedding Generation (Background)
   - Vector embedding creation
   - Chunking strategy
   - Metadata extraction
   ↓
7. Processing Complete
   - Success notification
   - Document status changes to "Ready"
   - Toast message: "Document ready for AI consultation"
   ↓
8. Document Available
   - Appears in document list
   - Searchable via AI
   - Preview available
   - Download/delete options enabled
```

### 5.2 Responsive Design Breakpoints

```css
/* Breakpoint System */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet portrait */
--breakpoint-lg: 1024px;  /* Tablet landscape / Small desktop */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */

/* Layout Adaptations */

/* Mobile (< 640px) */
- Single column layout
- Stacked navigation
- Full-width cards
- Bottom sheet modals
- Collapsed sidebars (off-canvas)
- Touch-optimized tap targets (min 44px)

/* Tablet (640px - 1024px) */
- 2-column case grid
- Side drawer navigation
- Tablet-optimized modals
- Hybrid touch/mouse interactions

/* Desktop (> 1024px) */
- 3-column case grid
- Fixed sidebars
- Centered modals
- Hover-rich interactions
- Keyboard shortcuts enabled
```

### 5.3 Accessibility Requirements

#### 5.3.1 WCAG 2.1 AA Compliance

**Color Contrast**:
- Text on background: Minimum 4.5:1 ratio
- Large text (18pt+): Minimum 3:1 ratio
- UI components: Minimum 3:1 ratio
- Legal type colors tested for accessibility

**Keyboard Navigation**:
- All interactive elements accessible via Tab
- Logical tab order (top to bottom, left to right)
- Skip navigation links
- Focus indicators clearly visible (3px outline)
- Keyboard shortcuts with visual cues

**Screen Reader Support**:
- Semantic HTML elements (header, nav, main, aside, footer)
- ARIA labels for complex components
- ARIA live regions for dynamic updates
- Alternative text for all images and icons
- Form labels properly associated

**Focus Management**:
- Modal focus trap
- Return focus after modal close
- Skip to main content link
- Focus visible indicator: 3px solid ring

#### 5.3.2 Internationalization (i18n)

**Language Support** (Phase 1):
- Spanish (Ecuador) - Primary
- English - Secondary

**Localization Considerations**:
- Date formats: DD/MM/YYYY (Ecuador standard)
- Currency: USD (Ecuador uses US Dollar)
- Legal terminology: Ecuador-specific
- Time zone: ECT (Ecuador Time, UTC-5)

**RTL Support** (Future):
- Prepared CSS structure for RTL languages
- Mirrored layouts for Arabic/Hebrew (if needed)

---

## 6. Technical Implementation Guidelines

### 6.1 Component Architecture

```tsx
// Component Structure Example: Case Card

interface CaseCardProps {
  case: {
    id: string;
    title: string;
    legalType: 'penal' | 'civil' | 'constitucional' | 'transito' | 'administrativo' | 'laboral';
    priority: 'high' | 'medium' | 'low';
    status: string;
    clientName: string;
    caseNumber: string;
    nextAction?: {
      description: string;
      dueDate: Date;
      daysUntilDue: number;
    };
    progress: number;
    documentCount: number;
    queryCount: number;
    createdAt: Date;
  };
  onCardClick: (caseId: string) => void;
  onMenuAction: (action: string, caseId: string) => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ case, onCardClick, onMenuAction }) => {
  const legalTypeConfig = getLegalTypeConfig(case.legalType);

  return (
    <article
      className="case-card"
      style={{ '--legal-color': legalTypeConfig.color } as React.CSSProperties}
      onClick={() => onCardClick(case.id)}
      role="button"
      tabIndex={0}
      aria-label={`Case: ${case.title}`}
    >
      {/* Card implementation */}
    </article>
  );
};

// Legal Type Configuration
const legalTypeConfigs = {
  penal: {
    color: '#b91c1c',
    icon: '⚖️',
    label: 'Penal',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
  },
  civil: {
    color: '#2563eb',
    icon: '🏛️',
    label: 'Civil',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
  },
  // ... other types
};
```

### 6.2 State Management

```tsx
// State Management Structure (React Context + Zustand)

// Dashboard State
interface DashboardState {
  // Cases
  cases: Case[];
  selectedLegalType: LegalType | 'all';
  selectedStatus: CaseStatus | 'all';
  sortBy: SortOption;
  viewMode: 'grid' | 'list';

  // Filters
  filters: CaseFilters;
  searchQuery: string;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCases: () => Promise<void>;
  filterByLegalType: (type: LegalType | 'all') => void;
  filterByStatus: (status: CaseStatus | 'all') => void;
  setSortBy: (option: SortOption) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  searchCases: (query: string) => void;
}

// Case Page State
interface CasePageState {
  // Case Data
  caseData: CaseDetail | null;
  documents: Document[];

  // AI Assistant
  messages: Message[];
  isQuerying: boolean;
  selectedPromptTemplate: PromptTemplate | null;

  // Document Generation
  selectedTemplate: DocumentTemplate | null;
  generatedDocument: GeneratedDocument | null;
  isGenerating: boolean;

  // Legal Analysis
  analysisResults: AnalysisResult | null;
  relatedCases: Case[];
  legalReferences: LegalReference[];

  // Actions
  loadCaseData: (caseId: string) => Promise<void>;
  sendAIQuery: (query: string) => Promise<void>;
  generateDocument: (config: DocumentConfig) => Promise<void>;
  runAnalysis: (type: AnalysisType) => Promise<void>;
}
```

### 6.3 Performance Optimizations

**Code Splitting**:
```tsx
// Lazy load heavy components
const AIAssistant = lazy(() => import('@/components/AIAssistant'));
const DocumentEditor = lazy(() => import('@/components/DocumentEditor'));
const LegalAnalysis = lazy(() => import('@/components/LegalAnalysis'));

// Route-based code splitting
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('@/pages/Dashboard')),
  },
  {
    path: '/dashboard/cases/:id',
    component: lazy(() => import('@/pages/CaseDetail')),
  },
];
```

**Data Fetching**:
```tsx
// React Query for caching and optimistic updates
const useCases = () => {
  return useQuery({
    queryKey: ['cases'],
    queryFn: casesAPI.list,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Prefetch on hover
const prefetchCase = (caseId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesAPI.get(caseId),
  });
};
```

**Virtualization**:
```tsx
// Virtual scrolling for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

const CaseList = ({ cases }: { cases: Case[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: cases.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated card height
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <CaseCard key={virtualRow.index} case={cases[virtualRow.index]} />
        ))}
      </div>
    </div>
  );
};
```

**Image Optimization**:
```tsx
// Next.js Image component for optimized loading
import Image from 'next/image';

<Image
  src="/legal-type-icons/civil.svg"
  alt="Civil law icon"
  width={64}
  height={64}
  priority={false}
  loading="lazy"
/>
```

### 6.4 API Integration Patterns

```tsx
// API Client with error handling and retries
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry on network errors
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true;
      return api(originalRequest);
    }

    // Handle 401 (unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// AI Query with streaming support
const streamAIQuery = async (
  query: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) => {
  try {
    const response = await fetch('/api/v1/query/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ query }),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onComplete();
        break;
      }

      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  } catch (error) {
    onError(error as Error);
  }
};
```

---

## 7. Mobile & Tablet Considerations

### 7.1 Mobile-First Design

**Navigation**:
- Bottom tab bar for primary navigation
- Hamburger menu for secondary options
- Swipe gestures for navigation (left/right between cases)

**Case Cards (Mobile)**:
```
┌────────────────────────────┐
│ [CIVIL] Juan Pérez         │
│ Demanda Civil...           │
│                             │
│ Due: 15 Ene (3 días)       │
│ Progress: ████░ 65%        │
│                             │
│ 📄 12 | 💬 24 | 📅 Jan 10  │
└────────────────────────────┘
```
- Vertical stack layout
- Larger touch targets (min 44px)
- Simplified information hierarchy
- Swipe actions (left: archive, right: quick view)

**AI Assistant (Mobile)**:
- Full-screen chat interface
- Bottom input bar (fixed)
- Quick action chips above input
- Collapsible prompt template selector
- Voice input support

### 7.2 Tablet Optimization

**Case Page (Tablet)**:
- 2-column layout (documents left, AI right)
- Slide-over panel for legal references
- Picture-in-picture for video calls with clients
- Split-screen document comparison

**Gestures**:
- Pinch to zoom on documents
- Two-finger swipe for navigation
- Long-press for context menu
- Pull to refresh on lists

---

## 8. Conclusion & Next Steps

### 8.1 Implementation Phases

**Phase 1: Foundation (Weeks 1-2)**
- Design system setup (tokens, components)
- Main dashboard page redesign
- Case cards with legal type colors
- Basic filtering and sorting

**Phase 2: AI Integration (Weeks 3-4)**
- AI Assistant panel redesign
- Prompt templates by legal type
- Enhanced response display with citations
- Legal reference sidebar

**Phase 3: Document Generation (Weeks 5-6)**
- Document template library
- AI-powered generation interface
- Rich text editor integration
- Export functionality

**Phase 4: Advanced Analytics (Weeks 7-8)**
- Legal analysis tools
- Vector visualization
- Related case finder
- Precedent search

**Phase 5: Polish & Optimization (Weeks 9-10)**
- Mobile/tablet optimization
- Performance tuning
- Accessibility audit
- User testing and refinement

### 8.2 Success Metrics

**User Engagement**:
- Time spent in AI Assistant: Target 10+ min/session
- Document generation rate: Target 3+ docs/case
- Case creation rate: Target 2+ cases/week/user

**AI Performance**:
- Query response time: < 3 seconds
- Citation relevance: > 85% accuracy
- User satisfaction with AI: > 4.5/5 stars

**Business Impact**:
- User retention: > 80% monthly
- Feature adoption: > 60% use AI features weekly
- Upgrade conversion: > 20% free to paid

### 8.3 Design Deliverables Summary

This specification provides:

1. **Component Hierarchy**: Complete layout structure for dashboard and case pages
2. **Color System**: Legal type colors, gradients, semantic colors
3. **Typography System**: Font families, scales, and styles
4. **Interaction Patterns**: User flows for key features
5. **Responsive Design**: Mobile, tablet, desktop breakpoints
6. **Accessibility Guidelines**: WCAG 2.1 AA compliance
7. **Technical Implementation**: React components, state management, API patterns
8. **Performance Optimization**: Code splitting, caching, virtualization

**Files to Generate**:
- `components/ui/Button.tsx` - Button component variants
- `components/ui/Card.tsx` - Card component variants
- `components/ui/Badge.tsx` - Badge component variants
- `components/ui/Input.tsx` - Form input components
- `components/dashboard/CaseCard.tsx` - Enhanced case card
- `components/dashboard/AIInsightPanel.tsx` - AI insights panel
- `components/dashboard/QuickActionsHub.tsx` - Quick actions
- `components/case/AIAssistant.tsx` - AI assistant interface
- `components/case/DocumentGenerator.tsx` - Document generation
- `components/case/LegalAnalysis.tsx` - Analysis tools
- `styles/design-tokens.css` - CSS custom properties
- `styles/globals.css` - Global styles and utilities

---

**Design Philosophy**: Every pixel should communicate professionalism, intelligence, and power. The interface should make lawyers feel confident that they have cutting-edge AI technology working for them, while maintaining the gravitas and precision expected in the legal profession.
