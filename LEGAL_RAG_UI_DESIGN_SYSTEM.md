# Legal RAG System - UI/UX Design Specification
## New Modules: Calendar, Tasks, Notifications & Financial Dashboard

---

## Executive Summary

Este documento define el diseño completo de las nuevas interfaces para el Legal RAG System, incluyendo:
- Vista de Calendario con eventos por caso
- Sistema de Gestión de Tareas con Kanban
- Centro de Notificaciones
- Dashboard Financiero multi-nivel
- Panel de Reportes

**Filosofía de Diseño**: Simple pero poderoso. Interfaces limpias, flujos intuitivos, información accesible.

---

## 1. Design System Foundation

### 1.1 Color Palette

```css
/* Brand Colors - Expandidas */
--legal-primary: #2563eb;        /* Blue - Acciones principales */
--legal-primary-hover: #1d4ed8;
--legal-primary-light: #dbeafe;
--legal-primary-dark: #1e40af;

--legal-secondary: #7c3aed;      /* Purple - Casos Enterprise */
--legal-secondary-light: #ede9fe;

--legal-accent: #06b6d4;         /* Cyan - Destacados */
--legal-accent-light: #cffafe;

/* Semantic Colors */
--legal-success: #10b981;        /* Green - Completado, Pagado */
--legal-success-light: #d1fae5;

--legal-warning: #f59e0b;        /* Amber - Pendiente, Próximo */
--legal-warning-light: #fef3c7;

--legal-error: #ef4444;          /* Red - Vencido, Error */
--legal-error-light: #fee2e2;

--legal-info: #3b82f6;           /* Blue - Info */
--legal-info-light: #dbeafe;

/* Status Colors - Tareas y Eventos */
--status-pending: #f59e0b;       /* Amber */
--status-progress: #3b82f6;      /* Blue */
--status-completed: #10b981;     /* Green */
--status-blocked: #ef4444;       /* Red */

/* Priority Colors */
--priority-urgent: #dc2626;      /* Red-600 */
--priority-high: #ea580c;        /* Orange-600 */
--priority-medium: #f59e0b;      /* Amber-500 */
--priority-low: #6b7280;         /* Gray-500 */

/* Financial Status Colors */
--financial-paid: #10b981;       /* Green */
--financial-pending: #f59e0b;    /* Amber */
--financial-overdue: #ef4444;    /* Red */
--financial-partial: #3b82f6;    /* Blue */

/* Calendar Event Types */
--event-hearing: #8b5cf6;        /* Purple - Audiencias */
--event-deadline: #ef4444;       /* Red - Plazos legales */
--event-meeting: #3b82f6;        /* Blue - Reuniones */
--event-task: #10b981;           /* Green - Tareas */
--event-other: #6b7280;          /* Gray - Otros */

/* Neutral Grays */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* Dark Mode Colors */
--dark-bg-primary: #0f172a;      /* Slate-900 */
--dark-bg-secondary: #1e293b;    /* Slate-800 */
--dark-bg-tertiary: #334155;     /* Slate-700 */
--dark-text-primary: #f1f5f9;    /* Slate-100 */
--dark-text-secondary: #cbd5e1;  /* Slate-300 */
```

### 1.2 Typography

```css
/* Font Family */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

/* Type Scale */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### 1.3 Spacing System

```css
/* 8px Base Grid */
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
```

### 1.4 Border Radius

```css
--radius-sm: 0.375rem;   /* 6px - Badges, small buttons */
--radius-md: 0.5rem;     /* 8px - Cards, inputs */
--radius-lg: 0.75rem;    /* 12px - Large cards */
--radius-xl: 1rem;       /* 16px - Modals */
--radius-2xl: 1.5rem;    /* 24px - Hero sections */
--radius-full: 9999px;   /* Pills, avatars */
```

### 1.5 Shadows

```css
/* Elevation System */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

/* Special Shadows */
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
--shadow-focus: 0 0 0 3px var(--legal-primary-light);
--shadow-error: 0 0 0 3px var(--legal-error-light);
```

### 1.6 Iconography

**Icon Library**: Lucide React (lucide-react)

**Icon Sizes**:
```css
--icon-xs: 14px;
--icon-sm: 16px;
--icon-md: 20px;
--icon-lg: 24px;
--icon-xl: 32px;
```

**Key Icons por Módulo**:

**Calendar**:
- Calendar (calendar)
- CalendarDays (calendar-days)
- CalendarClock (calendar-clock)
- Clock (clock)
- Bell (bell)

**Tasks**:
- CheckCircle2 (check-circle-2)
- Circle (circle)
- ListTodo (list-todo)
- KanbanSquare (kanban-square)
- Flag (flag)
- Users (users)

**Notifications**:
- Bell (bell)
- Mail (mail)
- MessageSquare (message-square)
- AlertCircle (alert-circle)
- Info (info)

**Financial**:
- DollarSign (dollar-sign)
- TrendingUp (trending-up)
- CreditCard (credit-card)
- Receipt (receipt)
- PieChart (pie-chart)
- BarChart3 (bar-chart-3)

---

## 2. Vista de Calendario

### 2.1 Wireframe Conceptual

```
┌─────────────────────────────────────────────────────────────────┐
│ Legal RAG System                                    [Usuario] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📅 Calendario de Eventos                  [+ Nuevo Evento] │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │ Tabs: [ Todo | Mi Calendario | Por Caso ]         │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  │                                                              │ │
│  │  Filtros: [Tipo ▾] [Caso ▾] [Fecha ▾] [Limpiar]           │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │         Octubre 2025          [< Hoy >]            │    │ │
│  │  ├────────────────────────────────────────────────────┤    │ │
│  │  │ Lun  Mar  Mie  Jue  Vie  Sab  Dom                 │    │ │
│  │  ├────────────────────────────────────────────────────┤    │ │
│  │  │  29   30   1    2    3    4    5                  │    │ │
│  │  │                🔵  🟣                               │    │ │
│  │  │  6    7    8    9    10   11   12                 │    │ │
│  │  │  🔴  🟢                                             │    │ │
│  │  │  13   14   15   16   17   18   19                 │    │ │
│  │  │            🔵  🔵🟣                                 │    │ │
│  │  │  20   21   22   23   24   25   26                 │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  │                                                              │ │
│  │  Próximos Eventos (5)                        [Ver todos]   │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │ 🔴 Hoy, 10:00 AM                                   │    │ │
│  │  │ Audiencia Preliminar - Caso #1234                 │    │ │
│  │  │ Juzgado Civil - Sala 3                            │    │ │
│  │  │ [Ver] [Editar]                                    │    │ │
│  │  ├────────────────────────────────────────────────────┤    │ │
│  │  │ 🔵 Mañana, 3:00 PM                                 │    │ │
│  │  │ Reunión con Cliente - Caso #5678                  │    │ │
│  │  │ [Ver] [Editar]                                    │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────────────────── │ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Componentes

```typescript
// Jerarquía de Componentes
CalendarView/
├── CalendarHeader
│   ├── CalendarTabs
│   ├── NewEventButton
│   └── CalendarFilters
├── CalendarMain
│   ├── CalendarGrid (Vista Mensual)
│   │   ├── MonthSelector
│   │   ├── DayHeaders
│   │   └── DayCell[] (con EventDot[])
│   ├── CalendarList (Vista Lista - alternativa)
│   └── CalendarWeek (Vista Semanal - opcional)
└── UpcomingEvents
    ├── EventCard[]
    └── ViewAllLink
```

### 2.3 Componentes Detallados

#### CalendarGrid Component

```typescript
interface CalendarGridProps {
  currentMonth: Date;
  events: CalendarEvent[];
  selectedCase?: string;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: 'hearing' | 'deadline' | 'meeting' | 'task' | 'other';
  startDate: Date;
  endDate?: Date;
  location?: string;
  caseId?: string;
  caseName?: string;
  attendees?: string[];
  reminders?: Reminder[];
  allDay?: boolean;
}

// Visual Design
const CalendarGrid: React.FC<CalendarGridProps> = () => {
  return (
    <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md">
      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold">
          {formatMonth(currentMonth)}
        </h2>

        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-legal-primary text-white rounded-lg">
            Hoy
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => (
            <DayCell
              key={day.date}
              day={day}
              events={getEventsForDay(day)}
              isToday={isToday(day)}
              isSelected={isSelected(day)}
              onClick={() => onDateClick(day)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### DayCell Component

```typescript
interface DayCellProps {
  day: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  events,
  isToday,
  isSelected,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "aspect-square p-2 rounded-lg border transition-all",
        "hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary",
        isToday && "border-legal-primary border-2 bg-legal-primary-light",
        isSelected && "bg-legal-primary text-white",
        !isCurrentMonth(day) && "text-gray-400"
      )}
    >
      {/* Day Number */}
      <div className="text-sm font-medium mb-1">
        {format(day, 'd')}
      </div>

      {/* Event Dots */}
      <div className="flex gap-1 flex-wrap justify-center">
        {events.slice(0, 3).map(event => (
          <EventDot key={event.id} type={event.type} />
        ))}
        {events.length > 3 && (
          <span className="text-xs text-gray-500">+{events.length - 3}</span>
        )}
      </div>
    </button>
  );
};
```

#### EventDot Component

```typescript
const EventDot: React.FC<{ type: EventType }> = ({ type }) => {
  const colors = {
    hearing: 'bg-event-hearing',
    deadline: 'bg-event-deadline',
    meeting: 'bg-event-meeting',
    task: 'bg-event-task',
    other: 'bg-event-other'
  };

  return (
    <div className={cn(
      "w-2 h-2 rounded-full",
      colors[type]
    )} />
  );
};
```

#### NewEventModal Component

```typescript
interface EventFormData {
  title: string;
  description: string;
  type: EventType;
  startDate: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  location?: string;
  caseId?: string;
  attendees?: string[];
  reminders: ReminderConfig[];
}

const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultCase
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-legal-primary" />
            Crear Nuevo Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Título del Evento *</Label>
            <Input
              id="title"
              placeholder="ej. Audiencia Preliminar"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <Label>Tipo de Evento *</Label>
            <RadioGroup defaultValue="meeting">
              <div className="grid grid-cols-2 gap-3 mt-2">
                <EventTypeOption
                  value="hearing"
                  icon={Scale}
                  label="Audiencia"
                  color="event-hearing"
                />
                <EventTypeOption
                  value="deadline"
                  icon={AlertCircle}
                  label="Plazo Legal"
                  color="event-deadline"
                />
                <EventTypeOption
                  value="meeting"
                  icon={Users}
                  label="Reunión"
                  color="event-meeting"
                />
                <EventTypeOption
                  value="task"
                  icon="CheckSquare}
                  label="Tarea"
                  color="event-task"
                />
              </div>
            </RadioGroup>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha Inicio *</Label>
              <Input type="date" id="startDate" required />
            </div>
            <div>
              <Label htmlFor="startTime">Hora Inicio</Label>
              <Input type="time" id="startTime" />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <Switch id="allDay" />
            <Label htmlFor="allDay">Evento de todo el día</Label>
          </div>

          {/* Case Selection */}
          <div>
            <Label htmlFor="case">Caso Asociado (opcional)</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar caso..." />
              </SelectTrigger>
              <SelectContent>
                {cases.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.number} - {c.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              placeholder="ej. Juzgado Civil - Sala 3"
              leftIcon={MapPin}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Detalles adicionales del evento..."
            />
          </div>

          {/* Reminders */}
          <div>
            <Label>Recordatorios</Label>
            <div className="space-y-2 mt-2">
              <ReminderSelector />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReminder}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Recordatorio
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-legal-primary hover:bg-legal-primary-hover"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Evento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

### 2.4 Estados y Props

```typescript
// Calendar View State
interface CalendarViewState {
  currentMonth: Date;
  selectedDate?: Date;
  viewMode: 'month' | 'week' | 'list';
  filters: {
    caseId?: string;
    eventTypes: EventType[];
    dateRange?: { start: Date; end: Date };
  };
  events: CalendarEvent[];
  isLoading: boolean;
}

// Calendar Filters
interface CalendarFilters {
  caseId?: string;
  types: EventType[];
  startDate?: Date;
  endDate?: Date;
  search?: string;
}
```

### 2.5 User Flows

**Flow 1: Crear Evento Desde Calendario**
1. Usuario hace clic en fecha del calendario
2. Se abre modal de nuevo evento con fecha pre-seleccionada
3. Usuario completa formulario
4. Sistema valida y guarda
5. Evento aparece en calendario
6. Notificación de éxito

**Flow 2: Ver Eventos del Día**
1. Usuario hace clic en día con eventos
2. Se muestra popover con lista de eventos
3. Usuario puede:
   - Ver detalles de evento
   - Editar evento
   - Eliminar evento
   - Crear nuevo evento para ese día

**Flow 3: Filtrar por Caso**
1. Usuario selecciona caso en filtro
2. Calendario muestra solo eventos de ese caso
3. Badge indica filtro activo
4. Usuario puede limpiar filtro

---

## 3. Vista de Tareas

### 3.1 Wireframe Conceptual

```
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Gestión de Tareas                        [+ Nueva Tarea]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Vistas: [ Lista ] [ Kanban ] [ Calendario ]                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Filtros Rápidos:                                        │     │
│  │ [ Todas (24) ] [ Hoy (5) ] [ Esta Semana (12) ]       │     │
│  │ [ Urgentes (3) ] [ Vencidas (2) ] [ Mis Tareas (15) ] │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Filtros: [Prioridad ▾] [Asignado ▾] [Caso ▾] [Estado ▾]      │
│                                                                   │
│  ┌─ VISTA LISTA ─────────────────────────────────────────┐      │
│  │                                                         │      │
│  │  [ ] 🔴 Preparar alegatos para audiencia              │      │
│  │      Caso #1234 | Vence: Mañana | Asignado: Tú        │      │
│  │      [Editar] [Completar] [...]                        │      │
│  │                                                         │      │
│  │  [ ] 🟡 Revisar documentos del cliente                │      │
│  │      Caso #5678 | Vence: 3 días | Asignado: María     │      │
│  │      [Editar] [Completar] [...]                        │      │
│  │                                                         │      │
│  │  [✓] 🟢 Redactar contrato                              │      │
│  │      Caso #9012 | Completado hace 2 días              │      │
│  │                                                         │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─ VISTA KANBAN ────────────────────────────────────────┐      │
│  │                                                         │      │
│  │  Pendiente (8) │ En Progreso (5) │ Completadas (11)  │      │
│  │  ─────────────────────────────────────────────────────│      │
│  │                                                         │      │
│  │  [Tarea 1]    │  [Tarea 4]      │  [Tarea 7]         │      │
│  │  [Tarea 2]    │  [Tarea 5]      │  [Tarea 8]         │      │
│  │  [Tarea 3]    │  [Tarea 6]      │  [Tarea 9]         │      │
│  │                                                         │      │
│  └─────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Estructura de Componentes

```typescript
TasksView/
├── TasksHeader
│   ├── ViewToggle (Lista/Kanban/Calendario)
│   ├── NewTaskButton
│   └── TaskFilters
├── QuickFilters
│   └── FilterChip[]
├── TasksMain
│   ├── TaskListView
│   │   ├── TaskGroup[] (Por fecha/prioridad)
│   │   └── TaskRow[]
│   ├── TaskKanbanView
│   │   └── KanbanColumn[]
│   │       └── TaskCard[]
│   └── TaskCalendarView (integrado con Calendar)
└── TaskStats
    └── StatCard[]
```

### 3.3 Componentes Detallados

#### TaskRow Component (Vista Lista)

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate?: Date;
  assignedTo?: string[];
  caseId?: string;
  caseName?: string;
  tags?: string[];
  attachments?: number;
  comments?: number;
  completedAt?: Date;
  createdAt: Date;
}

const TaskRow: React.FC<{ task: Task }> = ({ task }) => {
  const isOverdue = task.dueDate && isPast(task.dueDate) && task.status !== 'completed';
  const isDueToday = task.dueDate && isToday(task.dueDate);

  return (
    <div className={cn(
      "group flex items-center gap-4 p-4 rounded-lg border",
      "hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-all",
      task.status === 'completed' && "opacity-60",
      isOverdue && "border-l-4 border-l-legal-error"
    )}>
      {/* Checkbox */}
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={() => toggleTaskStatus(task.id)}
        className="shrink-0"
      />

      {/* Priority Indicator */}
      <PriorityFlag priority={task.priority} />

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={cn(
            "font-medium",
            task.status === 'completed' && "line-through text-gray-500"
          )}>
            {task.title}
          </h4>

          {task.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          {/* Case */}
          {task.caseName && (
            <span className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {task.caseName}
            </span>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <span className={cn(
              "flex items-center gap-1",
              isOverdue && "text-legal-error font-medium",
              isDueToday && "text-legal-warning font-medium"
            )}>
              <Clock className="w-3 h-3" />
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {/* Assigned */}
          {task.assignedTo && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assignedTo}
            </span>
          )}

          {/* Attachments */}
          {task.attachments > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachments}
            </span>
          )}

          {/* Comments */}
          {task.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.comments}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editTask(task.id)}
        >
          <Edit2 className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => duplicateTask(task.id)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => moveToCase(task.id)}>
              <FolderInput className="w-4 h-4 mr-2" />
              Mover a caso
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-legal-error"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
```

#### PriorityFlag Component

```typescript
const PriorityFlag: React.FC<{ priority: Priority }> = ({ priority }) => {
  const config = {
    urgent: {
      color: 'text-priority-urgent',
      icon: AlertTriangle,
      label: 'Urgente'
    },
    high: {
      color: 'text-priority-high',
      icon: ArrowUp,
      label: 'Alta'
    },
    medium: {
      color: 'text-priority-medium',
      icon: Minus,
      label: 'Media'
    },
    low: {
      color: 'text-priority-low',
      icon: ArrowDown,
      label: 'Baja'
    }
  };

  const { color, icon: Icon, label } = config[priority];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Icon className={cn("w-5 h-5", color)} />
        </TooltipTrigger>
        <TooltipContent>
          Prioridad: {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

#### KanbanColumn Component

```typescript
const KanbanColumn: React.FC<{
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
}> = ({ title, status, tasks, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { id: string }) => onDrop(item.id, status),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  return (
    <div
      ref={drop}
      className={cn(
        "flex flex-col bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4 min-h-[500px]",
        isOver && "bg-legal-primary-light border-2 border-legal-primary border-dashed"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => openNewTaskModal(status)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Tasks */}
      <div className="space-y-3 flex-1">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <CheckCircle2 className="w-12 h-12 mb-2" />
          <p className="text-sm">No hay tareas aquí</p>
        </div>
      )}
    </div>
  );
};
```

#### TaskCard Component (Kanban)

```typescript
const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  const isOverdue = task.dueDate && isPast(task.dueDate);

  return (
    <div
      ref={drag}
      className={cn(
        "bg-white dark:bg-dark-bg-secondary p-3 rounded-lg border shadow-sm",
        "cursor-move hover:shadow-md transition-all",
        isDragging && "opacity-50",
        isOverdue && "border-l-4 border-l-legal-error"
      )}
      onClick={() => openTaskDetail(task.id)}
    >
      {/* Priority & Title */}
      <div className="flex items-start gap-2 mb-2">
        <PriorityFlag priority={task.priority} />
        <h4 className="font-medium text-sm flex-1">{task.title}</h4>
      </div>

      {/* Description Preview */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{task.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {/* Due Date */}
        {task.dueDate && (
          <span className={cn(
            "flex items-center gap-1",
            isOverdue && "text-legal-error font-medium"
          )}>
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(task.dueDate, { addSuffix: true, locale: es })}
          </span>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2">
          {task.attachments > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachments}
            </span>
          )}
          {task.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.comments}
            </span>
          )}
        </div>
      </div>

      {/* Assigned User Avatar */}
      {task.assignedTo && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {getInitials(task.assignedTo)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600">{task.assignedTo}</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### NewTaskModal Component

```typescript
const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  defaultCase,
  defaultStatus
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-legal-primary" />
            Nueva Tarea
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Título de la Tarea *</Label>
            <Input
              id="title"
              placeholder="¿Qué necesitas hacer?"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridad *</Label>
              <RadioGroup defaultValue="medium" className="mt-2">
                <div className="space-y-2">
                  <PriorityOption value="urgent" label="Urgente" color="priority-urgent" />
                  <PriorityOption value="high" label="Alta" color="priority-high" />
                  <PriorityOption value="medium" label="Media" color="priority-medium" />
                  <PriorityOption value="low" label="Baja" color="priority-low" />
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Estado Inicial</Label>
              <Select defaultValue={defaultStatus || "pending"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
            <Input type="date" id="dueDate" />
          </div>

          {/* Case Assignment */}
          <div>
            <Label htmlFor="case">Caso Asociado</Label>
            <Select defaultValue={defaultCase}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar caso..." />
              </SelectTrigger>
              <SelectContent>
                {cases.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.number} - {c.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign To */}
          <div>
            <Label>Asignar a</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {user.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>Etiquetas</Label>
            <TagInput
              placeholder="Agregar etiquetas..."
              tags={tags}
              onTagsChange={setTags}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-legal-primary hover:bg-legal-primary-hover"
            >
              <Save className="w-4 h-4 mr-2" />
              Crear Tarea
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

### 3.4 Estados y Props

```typescript
// Tasks View State
interface TasksViewState {
  viewMode: 'list' | 'kanban' | 'calendar';
  filters: {
    status?: TaskStatus[];
    priority?: Priority[];
    assignedTo?: string[];
    caseId?: string;
    dateRange?: { start: Date; end: Date };
    search?: string;
  };
  groupBy: 'none' | 'priority' | 'case' | 'date' | 'assignee';
  sortBy: 'dueDate' | 'priority' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}
```

---

## 4. Centro de Notificaciones

### 4.1 Wireframe Conceptual

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                             🔔(3) [User] │
│                                                                   │
│  [Click en campana abre dropdown]                                │
│  ┌────────────────────────────────────────────────┐             │
│  │ Notificaciones                    [⚙️] [✓ Marcar todas]     │
│  ├────────────────────────────────────────────────┤             │
│  │                                                 │             │
│  │ 🔴 NUEVO                                        │             │
│  │ Audiencia mañana a las 10:00 AM                │             │
│  │ Caso #1234 - hace 5 min                        │             │
│  │                                                 │             │
│  │ 🔵 Pago recibido: $500.00                      │             │
│  │ Caso #5678 - hace 2 horas                      │             │
│  │                                                 │             │
│  │ 🟡 Documento pendiente de revisión             │             │
│  │ Caso #9012 - hace 1 día                        │             │
│  │                                                 │             │
│  │ ────────────────────────────────────            │             │
│  │ [Ver todas las notificaciones]                 │             │
│  └────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔔 Centro de Notificaciones                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tabs: [ Todas (24) ] [ No leídas (3) ] [ Archivadas ]         │
│                                                                   │
│  Filtros: [Tipo ▾] [Caso ▾] [Fecha ▾]                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ HOY                                                     │     │
│  │ ───────────────────────────────────────────────────────│     │
│  │                                                         │     │
│  │ 🔴 10:30 AM                                            │     │
│  │ Recordatorio: Audiencia en 30 minutos                 │     │
│  │ Caso #1234 - Sala 3, Juzgado Civil                   │     │
│  │ [Ver Caso] [Marcar leída]                             │     │
│  │                                                         │     │
│  │ 🔵 09:15 AM                                            │     │
│  │ Nuevo pago recibido                                    │     │
│  │ $500.00 - Caso #5678                                   │     │
│  │ [Ver Detalles] [Marcar leída]                         │     │
│  │                                                         │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ AYER                                                    │     │
│  │ ───────────────────────────────────────────────────────│     │
│  │ [Notificaciones anteriores...]                         │     │
│  └─────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Estructura de Componentes

```typescript
NotificationsCenter/
├── NotificationBell (Header Component)
│   ├── BellIcon (con badge contador)
│   └── NotificationDropdown
│       ├── NotificationList (últimas 5)
│       └── ViewAllLink
├── NotificationsPage
│   ├── NotificationTabs
│   ├── NotificationFilters
│   └── NotificationList
│       └── NotificationCard[]
└── NotificationSettings
    ├── EmailPreferences
    └── PushPreferences
```

### 4.3 Componentes Detallados

```typescript
// Notification Types
interface Notification {
  id: string;
  type: 'event_reminder' | 'task_due' | 'payment_received' | 'document_upload' |
        'case_update' | 'system' | 'mention';
  title: string;
  message: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  relatedTo?: {
    type: 'case' | 'task' | 'event' | 'payment';
    id: string;
    name: string;
  };
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
}

// NotificationBell Component
const NotificationBell: React.FC = () => {
  const { notifications, unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-legal-error rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 max-h-[600px] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
            >
              <Check className="w-4 h-4 mr-1" />
              Marcar todas
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={openSettings}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y">
          {notifications.slice(0, 5).map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))}
        </div>

        {/* Footer */}
        {notifications.length > 5 && (
          <div className="p-3 border-t text-center">
            <Link
              href="/notifications"
              className="text-sm text-legal-primary hover:underline"
            >
              Ver todas las notificaciones
            </Link>
          </div>
        )}

        {/* Empty State */}
        {notifications.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No hay notificaciones nuevas</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// NotificationItem Component
const NotificationItem: React.FC<{ notification: Notification }> = ({
  notification
}) => {
  const typeIcons = {
    event_reminder: Calendar,
    task_due: CheckCircle2,
    payment_received: DollarSign,
    document_upload: FileText,
    case_update: Folder,
    system: Info,
    mention: AtSign
  };

  const Icon = typeIcons[notification.type] || Bell;

  const priorityColors = {
    urgent: 'text-legal-error',
    high: 'text-priority-high',
    normal: 'text-legal-info',
    low: 'text-gray-500'
  };

  return (
    <div
      className={cn(
        "p-4 hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary cursor-pointer transition-colors",
        !notification.isRead && "bg-legal-primary-light/20"
      )}
      onClick={() => onClick(notification)}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          notification.isRead ? "bg-gray-100" : "bg-legal-primary-light"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            priorityColors[notification.priority]
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "text-sm font-medium",
              !notification.isRead && "font-semibold"
            )}>
              {notification.title}
            </h4>

            {!notification.isRead && (
              <span className="shrink-0 w-2 h-2 bg-legal-primary rounded-full" />
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.message}
          </p>

          {notification.relatedTo && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {notification.relatedTo.type === 'case' && 'Caso'}
                {notification.relatedTo.type === 'task' && 'Tarea'}
                {notification.relatedTo.type === 'event' && 'Evento'}
                {notification.relatedTo.type === 'payment' && 'Pago'}
                : {notification.relatedTo.name}
              </Badge>
            </div>
          )}

          <span className="text-xs text-gray-500">
            {formatDistanceToNow(notification.createdAt, {
              addSuffix: true,
              locale: es
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
```

### 4.4 Configuración de Notificaciones

```typescript
const NotificationSettings: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuración de Notificaciones
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <h3 className="font-semibold mb-4">Notificaciones por Email</h3>

          <div className="space-y-4">
            <NotificationToggle
              id="email-events"
              label="Recordatorios de Eventos"
              description="Recibe emails antes de audiencias y reuniones"
              defaultChecked
            />

            <NotificationToggle
              id="email-tasks"
              label="Tareas Vencidas"
              description="Alertas cuando una tarea está próxima a vencer"
              defaultChecked
            />

            <NotificationToggle
              id="email-payments"
              label="Pagos Recibidos"
              description="Confirmación cuando se registra un pago"
              defaultChecked
            />

            <NotificationToggle
              id="email-documents"
              label="Nuevos Documentos"
              description="Cuando se sube un documento a un caso"
            />

            <NotificationToggle
              id="email-digest"
              label="Resumen Diario"
              description="Resumen de actividad al final del día"
            />
          </div>
        </div>

        <Separator />

        {/* Push Notifications */}
        <div>
          <h3 className="font-semibold mb-4">Notificaciones Push</h3>

          <div className="space-y-4">
            <NotificationToggle
              id="push-urgent"
              label="Eventos Urgentes"
              description="Notificaciones en tiempo real para eventos urgentes"
              defaultChecked
            />

            <NotificationToggle
              id="push-mentions"
              label="Menciones"
              description="Cuando alguien te menciona en un comentario"
              defaultChecked
            />
          </div>
        </div>

        <Separator />

        {/* Delivery Schedule */}
        <div>
          <h3 className="font-semibold mb-4">Horario de Entrega</h3>

          <div className="space-y-4">
            <div>
              <Label>Horario de Notificaciones</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="quiet-start" className="text-xs text-gray-600">
                    Hora de Inicio
                  </Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    defaultValue="08:00"
                  />
                </div>
                <div>
                  <Label htmlFor="quiet-end" className="text-xs text-gray-600">
                    Hora de Fin
                  </Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    defaultValue="20:00"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                No recibirás notificaciones fuera de este horario, excepto las urgentes
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline">
          Cancelar
        </Button>
        <Button className="bg-legal-primary">
          <Save className="w-4 h-4 mr-2" />
          Guardar Preferencias
        </Button>
      </CardFooter>
    </Card>
  );
};

const NotificationToggle: React.FC<{
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}> = ({ id, label, description, defaultChecked }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  );
};
```

---

## 5. Dashboard Financiero

### 5.1 Wireframe Conceptual

```
┌─────────────────────────────────────────────────────────────────┐
│ 💰 Dashboard Financiero                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Vistas: [ Por Caso ] [ Por Cliente ] [ General ]              │
│                                                                   │
│  ┌─ VISTA POR CASO ─────────────────────────────────────┐       │
│  │ Caso: Caso #1234 - Juan Pérez              [▼]      │       │
│  │                                                       │       │
│  │ ┌─────────────┬─────────────┬─────────────┐         │       │
│  │ │ Total       │ Pagado      │ Pendiente   │         │       │
│  │ │ $5,000.00   │ $3,000.00   │ $2,000.00   │         │       │
│  │ │ ────────────│─────────────│──────────── │         │       │
│  │ │    100%     │     60%     │     40%     │         │       │
│  │ └─────────────┴─────────────┴─────────────┘         │       │
│  │                                                       │       │
│  │ Acuerdo Inicial:                                     │       │
│  │ • Monto Total: $5,000.00                            │       │
│  │ • Fecha: 15/10/2025                                 │       │
│  │ • Términos: 3 pagos de $1,666.67                   │       │
│  │                                                       │       │
│  │ Servicios y Costos:                                  │       │
│  │ ┌─────────────────────────────────────────┐         │       │
│  │ │ Servicio              Cant    Precio    │         │       │
│  │ ├─────────────────────────────────────────┤         │       │
│  │ │ Consulta Inicial       1    $500.00    │         │       │
│  │ │ Redacción Demanda      1    $1,500.00  │         │       │
│  │ │ Honorarios Juicio      1    $3,000.00  │         │       │
│  │ └─────────────────────────────────────────┘         │       │
│  │                                                       │       │
│  │ Historial de Pagos:                                  │       │
│  │ ┌───────────────────────────────────────────────┐   │       │
│  │ │ 🟢 15/11/2025  Pago #1  $2,000.00  Tarjeta   │   │       │
│  │ │ 🟢 20/11/2025  Pago #2  $1,000.00  Efectivo  │   │       │
│  │ │ 🟡 25/11/2025  Pago #3  $2,000.00  Pendiente │   │       │
│  │ └───────────────────────────────────────────────┘   │       │
│  │                                                       │       │
│  │ [Registrar Pago] [Generar Factura] [Descargar]     │       │
│  └───────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌─ VISTA GENERAL ───────────────────────────────────────┐      │
│  │                                                         │      │
│  │ KPIs:                                                  │      │
│  │ ┌──────────────┬───────────────┬─────────────┐       │      │
│  │ │ Ingresos     │ Pendientes    │ Este Mes    │       │      │
│  │ │ Totales      │ de Cobro      │             │       │      │
│  │ │              │               │             │       │      │
│  │ │ $125,500.00  │ $32,450.00    │ $18,200.00  │       │      │
│  │ │ +12.5% ↑     │ 15 casos      │ +8.3% ↑     │       │      │
│  │ └──────────────┴───────────────┴─────────────┘       │      │
│  │                                                         │      │
│  │ Gráfico de Ingresos Mensuales (12 meses):            │      │
│  │ ┌────────────────────────────────────────────────┐   │      │
│  │ │        ▄▄                                       │   │      │
│  │ │    ▄▄ ████                                      │   │      │
│  │ │   ████████ ▄▄    ▄▄                            │   │      │
│  │ │  ████████████ ▄▄████ ▄▄                        │   │      │
│  │ │ ████████████████████████                        │   │      │
│  │ │ E F M A M J J A S O N D                        │   │      │
│  │ └────────────────────────────────────────────────┘   │      │
│  │                                                         │      │
│  │ Top 5 Clientes (por ingresos):                        │      │
│  │ 1. Juan Pérez        $15,000.00   3 casos            │      │
│  │ 2. María García      $12,500.00   2 casos            │      │
│  │ 3. Carlos López      $10,200.00   4 casos            │      │
│  │                                                         │      │
│  │ Casos con Balance Pendiente:                           │      │
│  │ • Caso #1234 - $2,000.00 (Vence en 5 días)           │      │
│  │ • Caso #5678 - $1,500.00 (Vencido hace 2 días) 🔴   │      │
│  │                                                         │      │
│  └─────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Estructura de Componentes

```typescript
FinancialDashboard/
├── FinancialTabs
│   ├── ByCaseView
│   ├── ByClientView
│   └── GlobalView
├── ByCaseView/
│   ├── CaseSelector
│   ├── FinancialSummaryCards
│   ├── AgreementDetails
│   ├── ServicesTable
│   ├── PaymentTimeline
│   └── QuickActions
├── ByClientView/
│   ├── ClientSelector
│   ├── ClientFinancialSummary
│   ├── CasesList
│   └── PaymentHistory
└── GlobalView/
    ├── KPICards
    ├── RevenueChart
    ├── TopClientsList
    ├── PendingBalances
    └── ReportActions
```

### 5.3 Componentes Detallados

#### FinancialSummaryCards (Por Caso)

```typescript
interface CaseFinancials {
  caseId: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  currency: string;
  agreement: {
    date: Date;
    totalAmount: number;
    paymentTerms: string;
    installments?: number;
  };
  services: Service[];
  payments: Payment[];
  status: 'paid' | 'partial' | 'pending' | 'overdue';
}

const FinancialSummaryCards: React.FC<{ financials: CaseFinancials }> = ({
  financials
}) => {
  const paidPercentage = (financials.paidAmount / financials.totalAmount) * 100;
  const pendingPercentage = 100 - paidPercentage;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Total Amount Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total del Caso</span>
            <Receipt className="w-4 h-4 text-gray-400" />
          </div>

          <div className="text-3xl font-bold mb-1">
            {formatCurrency(financials.totalAmount)}
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-legal-info" style={{ width: '100%' }} />
          </div>
        </CardContent>
      </Card>

      {/* Paid Amount Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Monto Pagado</span>
            <CheckCircle2 className="w-4 h-4 text-financial-paid" />
          </div>

          <div className="text-3xl font-bold text-financial-paid mb-1">
            {formatCurrency(financials.paidAmount)}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{paidPercentage.toFixed(0)}%</span>
            <div className="h-2 w-20 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-financial-paid"
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Amount Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Saldo Pendiente</span>
            <Clock className="w-4 h-4 text-financial-pending" />
          </div>

          <div className="text-3xl font-bold text-financial-pending mb-1">
            {formatCurrency(financials.pendingAmount)}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{pendingPercentage.toFixed(0)}%</span>
            <div className="h-2 w-20 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-financial-pending"
                style={{ width: `${pendingPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

#### PaymentTimeline Component

```typescript
const PaymentTimeline: React.FC<{ payments: Payment[] }> = ({ payments }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Historial de Pagos
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {payments.map((payment, index) => (
            <div key={payment.id} className="flex gap-4">
              {/* Timeline Indicator */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  payment.status === 'completed' && "bg-financial-paid text-white",
                  payment.status === 'pending' && "bg-financial-pending text-white",
                  payment.status === 'failed' && "bg-financial-overdue text-white"
                )}>
                  {payment.status === 'completed' && <Check className="w-5 h-5" />}
                  {payment.status === 'pending' && <Clock className="w-5 h-5" />}
                  {payment.status === 'failed' && <X className="w-5 h-5" />}
                </div>

                {index < payments.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-2" />
                )}
              </div>

              {/* Payment Details */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">
                        Pago #{payment.number}
                      </h4>

                      <StatusBadge status={payment.status} />
                    </div>

                    <p className="text-sm text-gray-600">
                      {format(payment.date, "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {formatCurrency(payment.amount)}
                    </div>

                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <PaymentMethodIcon method={payment.method} />
                      {payment.methodLabel}
                    </div>
                  </div>
                </div>

                {payment.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {payment.description}
                  </p>
                )}

                {payment.reference && (
                  <div className="text-xs text-gray-500">
                    Ref: {payment.reference}
                  </div>
                )}

                {/* Actions */}
                {payment.status === 'completed' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadReceipt(payment.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Descargar Recibo
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDetails(payment.id)}
                    >
                      Ver Detalles
                    </Button>
                  </div>
                )}

                {payment.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => registerPayment(payment.id)}
                      className="bg-financial-paid hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Confirmar Pago
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editPayment(payment.id)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {payments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No hay pagos registrados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

#### GlobalFinancialKPIs Component

```typescript
const GlobalFinancialKPIs: React.FC<{ data: GlobalFinancials }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Revenue */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
              <h3 className="text-3xl font-bold">
                {formatCurrency(data.totalRevenue)}
              </h3>
            </div>

            <div className="w-12 h-12 rounded-full bg-legal-primary-light flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-legal-primary" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-legal-success font-medium">
              <ArrowUp className="w-4 h-4" />
              +12.5%
            </span>
            <span className="text-gray-600">vs mes anterior</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Collections */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pendientes de Cobro</p>
              <h3 className="text-3xl font-bold text-financial-pending">
                {formatCurrency(data.pendingAmount)}
              </h3>
            </div>

            <div className="w-12 h-12 rounded-full bg-financial-pending/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-financial-pending" />
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {data.pendingCasesCount} casos con saldo pendiente
          </div>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Este Mes</p>
              <h3 className="text-3xl font-bold text-legal-success">
                {formatCurrency(data.currentMonthRevenue)}
              </h3>
            </div>

            <div className="w-12 h-12 rounded-full bg-legal-success/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-legal-success" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-legal-success font-medium">
              <ArrowUp className="w-4 h-4" />
              +8.3%
            </span>
            <span className="text-gray-600">vs mes anterior</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

#### RevenueChart Component

```typescript
import { Line, Bar } from 'recharts';

const RevenueChart: React.FC<{ data: MonthlyRevenue[] }> = ({ data }) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Ingresos Mensuales
          </CardTitle>

          <div className="flex gap-2">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>

            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChart className="w-4 h-4" />
            </Button>

            <Select defaultValue="12">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="revenue" fill="var(--legal-primary)" name="Ingresos" />
              <Bar dataKey="expenses" fill="var(--legal-error)" name="Gastos" />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--legal-primary)"
                strokeWidth={2}
                name="Ingresos"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="var(--legal-error)"
                strokeWidth={2}
                name="Gastos"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

#### RegisterPaymentModal Component

```typescript
const RegisterPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
}> = ({ isOpen, onClose, caseId }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-legal-primary" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Case Selection */}
          {!caseId && (
            <div>
              <Label htmlFor="case">Caso *</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caso..." />
                </SelectTrigger>
                <SelectContent>
                  {casesWithBalance.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number} - {c.clientName} (${c.pendingAmount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Monto del Pago *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-9"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label>Método de Pago *</Label>
            <RadioGroup defaultValue="cash">
              <div className="grid grid-cols-2 gap-3 mt-2">
                <PaymentMethodOption
                  value="cash"
                  icon={Banknote}
                  label="Efectivo"
                />
                <PaymentMethodOption
                  value="card"
                  icon={CreditCard}
                  label="Tarjeta"
                />
                <PaymentMethodOption
                  value="transfer"
                  icon={Building2}
                  label="Transferencia"
                />
                <PaymentMethodOption
                  value="check"
                  icon={FileText}
                  label="Cheque"
                />
              </div>
            </RadioGroup>
          </div>

          {/* Payment Date */}
          <div>
            <Label htmlFor="paymentDate">Fecha de Pago *</Label>
            <Input
              id="paymentDate"
              type="date"
              defaultValue={format(new Date(), 'yyyy-MM-DD')}
              required
            />
          </div>

          {/* Reference Number */}
          <div>
            <Label htmlFor="reference">Número de Referencia</Label>
            <Input
              id="reference"
              placeholder="ej. TRANS-123456"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Notas adicionales sobre este pago..."
            />
          </div>

          {/* Proof of Payment Upload */}
          <div>
            <Label>Comprobante de Pago (opcional)</Label>
            <FileUpload
              accept="image/*,application/pdf"
              maxSize={5 * 1024 * 1024} // 5MB
              onUpload={handleFileUpload}
            />
          </div>

          {/* Generate Receipt */}
          <div className="flex items-center gap-2">
            <Switch id="generateReceipt" defaultChecked />
            <Label htmlFor="generateReceipt">
              Generar recibo automáticamente
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-legal-success hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 6. Panel de Reportes

### 6.1 Wireframe Conceptual

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Reportes Financieros                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Configuración del Reporte                              │     │
│  │                                                          │     │
│  │ Período:                                                │     │
│  │ [ Hoy ] [ Esta Semana ] [ Este Mes ] [ Personalizado ] │     │
│  │                                                          │     │
│  │ ┌──────────────┬──────────────┐                         │     │
│  │ │ Desde:       │ Hasta:       │                         │     │
│  │ │ 01/11/2025   │ 30/11/2025   │                         │     │
│  │ └──────────────┴──────────────┘                         │     │
│  │                                                          │     │
│  │ Filtros:                                                │     │
│  │ [ Caso ▾ ] [ Cliente ▾ ] [ Servicio ▾ ]               │     │
│  │                                                          │     │
│  │ [Generar Reporte] [Exportar PDF] [Exportar Excel]     │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌─ REPORTE GENERADO ──────────────────────────────────┐        │
│  │                                                       │        │
│  │ Resumen del Período: Noviembre 2025                 │        │
│  │                                                       │        │
│  │ ┌─────────────┬──────────────┬──────────────┐       │        │
│  │ │ Ingresos    │ Gastos       │ Balance Neto │       │        │
│  │ │             │              │              │       │        │
│  │ │ $18,200.00  │ $5,300.00    │ $12,900.00   │       │        │
│  │ │ +8.3% ↑     │ -2.1% ↓      │ +15.2% ↑     │       │        │
│  │ └─────────────┴──────────────┴──────────────┘       │        │
│  │                                                       │        │
│  │ Comparativa con Período Anterior:                   │        │
│  │ [Gráfico de barras comparativo]                     │        │
│  │                                                       │        │
│  │ Desglose por Tipo de Servicio:                      │        │
│  │ ┌───────────────────────────────────────┐           │        │
│  │ │ Servicio          Cantidad  Ingresos  │           │        │
│  │ ├───────────────────────────────────────┤           │        │
│  │ │ Consultas            15     $7,500    │           │        │
│  │ │ Juicios               8     $6,400    │           │        │
│  │ │ Redacción            12     $4,300    │           │        │
│  │ └───────────────────────────────────────┘           │        │
│  │                                                       │        │
│  │ Top 10 Clientes (por ingresos):                     │        │
│  │ 1. Juan Pérez        $2,500.00                      │        │
│  │ 2. María García      $2,100.00                      │        │
│  │ 3. Carlos López      $1,800.00                      │        │
│  │                                                       │        │
│  └───────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Componentes Clave

```typescript
const ReportsPanel: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [filters, setFilters] = useState<ReportFilters>({});
  const [reportData, setReportData] = useState<ReportData | null>(null);

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Period Selection */}
          <div>
            <Label>Período</Label>
            <div className="flex gap-2 mt-2">
              <QuickPeriodButton
                label="Hoy"
                onClick={() => setDateRange({
                  start: startOfDay(new Date()),
                  end: endOfDay(new Date())
                })}
              />
              <QuickPeriodButton
                label="Esta Semana"
                onClick={() => setDateRange({
                  start: startOfWeek(new Date()),
                  end: endOfWeek(new Date())
                })}
              />
              <QuickPeriodButton
                label="Este Mes"
                onClick={() => setDateRange({
                  start: startOfMonth(new Date()),
                  end: endOfMonth(new Date())
                })}
              />
              <QuickPeriodButton
                label="Este Año"
                onClick={() => setDateRange({
                  start: startOfYear(new Date()),
                  end: endOfYear(new Date())
                })}
              />
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Desde</Label>
              <Input
                type="date"
                id="startDate"
                value={format(dateRange.start, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange({
                  ...dateRange,
                  start: new Date(e.target.value)
                })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Hasta</Label>
              <Input
                type="date"
                id="endDate"
                value={format(dateRange.end, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange({
                  ...dateRange,
                  end: new Date(e.target.value)
                })}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Caso</Label>
              <Select onValueChange={(value) => setFilters({ ...filters, caseId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los casos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {cases.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number} - {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cliente</Label>
              <Select onValueChange={(value) => setFilters({ ...filters, clientId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Servicio</Label>
              <Select onValueChange={(value) => setFilters({ ...filters, serviceType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los servicios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {serviceTypes.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={generateReport}
              className="bg-legal-primary hover:bg-legal-primary-hover"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generar Reporte
            </Button>

            <Button
              variant="outline"
              onClick={exportPDF}
              disabled={!reportData}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>

            <Button
              variant="outline"
              onClick={exportExcel}
              disabled={!reportData}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Report */}
      {reportData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Reporte: {format(dateRange.start, 'd MMM', { locale: es })} - {format(dateRange.end, 'd MMM yyyy', { locale: es })}
              </CardTitle>

              <Button variant="ghost" size="sm" onClick={() => setReportData(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <ReportSummaryCard
                title="Ingresos"
                value={reportData.totalRevenue}
                trend={reportData.revenueTrend}
                icon={TrendingUp}
                color="success"
              />
              <ReportSummaryCard
                title="Gastos"
                value={reportData.totalExpenses}
                trend={reportData.expensesTrend}
                icon={TrendingDown}
                color="error"
              />
              <ReportSummaryCard
                title="Balance Neto"
                value={reportData.netBalance}
                trend={reportData.netTrend}
                icon={DollarSign}
                color="primary"
              />
            </div>

            {/* Comparison Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">
                Comparativa con Período Anterior
              </h3>
              <ComparisonChart
                current={reportData.currentPeriod}
                previous={reportData.previousPeriod}
              />
            </div>

            {/* Service Breakdown */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">
                Desglose por Tipo de Servicio
              </h3>
              <ServiceBreakdownTable data={reportData.serviceBreakdown} />
            </div>

            {/* Top Clients */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Top 10 Clientes (por ingresos)
              </h3>
              <TopClientsList clients={reportData.topClients} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

---

## 7. Paleta de Colores y Accesibilidad

### 7.1 Color Contrast Ratios (WCAG AA)

```typescript
// All color combinations meet WCAG AA standards (4.5:1 minimum)

// Primary on White
--legal-primary (#2563eb) on --gray-50 (#f9fafb): 6.82:1 ✓

// Text Colors
--gray-900 (#111827) on --gray-50 (#f9fafb): 17.84:1 ✓
--gray-700 (#374151) on --gray-50 (#f9fafb): 10.42:1 ✓
--gray-600 (#4b5563) on white (#ffffff): 7.78:1 ✓

// Status Colors on White
--financial-paid (#10b981) on white: 3.89:1 (use darker shade for text)
--financial-pending (#f59e0b) on white: 2.18:1 (use darker shade for text)
--financial-overdue (#ef4444) on white: 3.76:1 (use darker shade for text)

// Recommended: Use darker shades for text
--financial-paid-text: #059669; (5.34:1) ✓
--financial-pending-text: #d97706; (4.52:1) ✓
--financial-overdue-text: #dc2626; (5.15:1) ✓
```

### 7.2 Focus Indicators

```css
/* Keyboard Focus States */
*:focus-visible {
  outline: 2px solid var(--legal-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

button:focus-visible {
  box-shadow: 0 0 0 3px var(--legal-primary-light);
}

input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  border-color: var(--legal-primary);
  box-shadow: 0 0 0 3px var(--legal-primary-light);
}
```

---

## 8. Responsive Breakpoints

```typescript
// Tailwind Breakpoints
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / Small desktop
  xl: '1280px',  // Desktop
  '2xl': '1536px' // Large desktop
};

// Usage Examples:
// Mobile-first approach

// Stack cards vertically on mobile
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Hide sidebar on mobile, show on tablet+
<div className="hidden lg:block">

// Adjust font sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Change layout
<div className="flex-col lg:flex-row">
```

---

## 9. User Flows

### 9.1 Flow: Agregar Evento al Calendario

1. Usuario en dashboard hace clic en "Calendario"
2. Ve calendario mensual con eventos existentes
3. Hace clic en fecha deseada
4. Se abre modal "Nuevo Evento"
5. Completa formulario:
   - Título del evento
   - Tipo (audiencia, reunión, plazo, etc.)
   - Fecha y hora
   - Caso asociado (opcional)
   - Ubicación
   - Recordatorios
6. Hace clic en "Guardar Evento"
7. Sistema valida y guarda
8. Evento aparece en calendario
9. Notificación de éxito
10. Opcionalmente: Configurar recordatorio por email

### 9.2 Flow: Completar Tarea

1. Usuario ve lista de tareas
2. Identifica tarea completada
3. Hace clic en checkbox de la tarea
4. Sistema marca tarea como completada
5. Tarea se mueve a sección "Completadas" (con animación)
6. Se actualiza contador de tareas pendientes
7. Notificación de éxito sutil (toast)

### 9.3 Flow: Registrar Pago

1. Usuario en Dashboard Financiero
2. Selecciona vista "Por Caso"
3. Elige caso con saldo pendiente
4. Hace clic en "Registrar Pago"
5. Se abre modal de registro
6. Completa formulario:
   - Monto del pago
   - Método de pago
   - Fecha
   - Referencia/comprobante
7. Opcionalmente sube comprobante de pago
8. Hace clic en "Registrar Pago"
9. Sistema actualiza saldo del caso
10. Genera recibo automáticamente
11. Envía email de confirmación al cliente
12. Actualiza timeline de pagos
13. Muestra notificación de éxito

### 9.4 Flow: Generar Reporte Mensual

1. Usuario navega a "Reportes"
2. Selecciona período "Este Mes"
3. Opcionalmente aplica filtros (cliente, servicio)
4. Hace clic en "Generar Reporte"
5. Sistema procesa datos
6. Muestra reporte con:
   - Resumen financiero
   - Gráficos comparativos
   - Desglose por servicios
   - Top clientes
7. Usuario revisa reporte
8. Hace clic en "Exportar PDF"
9. Sistema genera PDF
10. Descarga automáticamente
11. Usuario puede compartir vía email

---

## 10. Accessibility Guidelines

### 10.1 Keyboard Navigation

```typescript
// Tab Order
// Ensure logical tab order:
// 1. Header navigation
// 2. Main content
// 3. Sidebar (if applicable)
// 4. Footer

// Skip Links
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-legal-primary focus:text-white focus:rounded"
>
  Saltar al contenido principal
</a>

// Keyboard Shortcuts
const shortcuts = {
  'g d': 'Go to Dashboard',
  'g c': 'Go to Cases',
  'g t': 'Go to Tasks',
  'g k': 'Go to Calendar',
  'g f': 'Go to Financials',
  'n e': 'New Event',
  'n t': 'New Task',
  'n p': 'New Payment',
  '/ ': 'Search'
};
```

### 10.2 ARIA Labels

```typescript
// Buttons
<button aria-label="Cerrar modal">
  <X className="w-4 h-4" />
</button>

// Notifications
<div
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  Pago registrado exitosamente
</div>

// Progress Bars
<div
  role="progressbar"
  aria-valuenow={60}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Progreso de pagos"
>

// Status Indicators
<span
  className="status-badge"
  aria-label="Estado: Pagado"
>
  Pagado
</span>

// Live Regions for Dynamic Content
<div
  aria-live="polite"
  aria-relevant="additions"
  className="sr-only"
>
  {notifications.length} nuevas notificaciones
</div>
```

### 10.3 Screen Reader Support

```typescript
// Semantic HTML
<nav aria-label="Navegación principal">
<main id="main-content">
<aside aria-label="Filtros">
<footer>

// Headings Hierarchy
<h1>Dashboard Financiero</h1>
  <h2>Resumen del Mes</h2>
    <h3>Ingresos Totales</h3>
    <h3>Gastos</h3>
  <h2>Historial de Pagos</h2>

// Form Labels
<label htmlFor="payment-amount">
  Monto del Pago
  <span className="text-legal-error">*</span>
</label>
<input
  id="payment-amount"
  type="number"
  aria-required="true"
  aria-describedby="amount-help"
/>
<span id="amount-help" className="text-sm text-gray-600">
  Ingrese el monto en dólares
</span>

// Error Messages
<input
  id="email"
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert" className="text-legal-error">
  Por favor ingrese un email válido
</span>
```

---

## 11. Performance Optimizations

### 11.1 Lazy Loading

```typescript
// Code Splitting for Routes
const CalendarView = lazy(() => import('@/components/calendar/CalendarView'));
const TasksView = lazy(() => import('@/components/tasks/TasksView'));
const FinancialDashboard = lazy(() => import('@/components/financial/Dashboard'));

// Lazy Load Heavy Components
const RevenueChart = lazy(() => import('@/components/charts/RevenueChart'));

// Usage with Suspense
<Suspense fallback={<Skeleton className="h-64" />}>
  <RevenueChart data={data} />
</Suspense>
```

### 11.2 Data Fetching

```typescript
// React Query for Server State
const { data, isLoading } = useQuery({
  queryKey: ['financial-summary', caseId],
  queryFn: () => fetchFinancialSummary(caseId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000 // 10 minutes
});

// Prefetch on Hover
const prefetchCase = () => {
  queryClient.prefetchQuery({
    queryKey: ['case', caseId],
    queryFn: () => fetchCase(caseId)
  });
};

<Link
  to={`/cases/${caseId}`}
  onMouseEnter={prefetchCase}
>
  Ver Caso
</Link>
```

### 11.3 Virtualization

```typescript
// For Long Lists (Tanstack Virtual)
import { useVirtualizer } from '@tanstack/react-virtual';

const TaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <TaskRow task={tasks[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 12. Implementación Sugerida

### Fase 1: Fundamentos (Semana 1-2)
- [ ] Configurar design tokens en Tailwind
- [ ] Crear componentes base (Button, Card, Badge, etc.)
- [ ] Implementar sistema de iconos (Lucide)
- [ ] Configurar React Query
- [ ] Setup de rutas y navegación

### Fase 2: Calendario (Semana 3-4)
- [ ] CalendarGrid component
- [ ] EventModal component
- [ ] Integración con API de eventos
- [ ] Filtros y búsqueda
- [ ] Recordatorios

### Fase 3: Tareas (Semana 5-6)
- [ ] TaskList view
- [ ] TaskKanban view
- [ ] TaskModal component
- [ ] Drag & drop functionality
- [ ] Integración con API

### Fase 4: Notificaciones (Semana 7)
- [ ] NotificationBell component
- [ ] NotificationCenter page
- [ ] Configuración de preferencias
- [ ] Email notifications backend

### Fase 5: Dashboard Financiero (Semana 8-10)
- [ ] Vista por Caso
- [ ] Vista por Cliente
- [ ] Vista General
- [ ] Gráficos con Recharts
- [ ] Registro de pagos
- [ ] Generación de recibos

### Fase 6: Reportes (Semana 11-12)
- [ ] Configuración de reportes
- [ ] Generación de datos
- [ ] Exportar a PDF
- [ ] Exportar a Excel
- [ ] Reportes programados

### Fase 7: Testing & Refinamiento (Semana 13-14)
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] User feedback iteration

---

## Archivos a Crear

```
frontend/src/
├── components/
│   ├── calendar/
│   │   ├── CalendarView.tsx
│   │   ├── CalendarGrid.tsx
│   │   ├── DayCell.tsx
│   │   ├── EventDot.tsx
│   │   ├── EventModal.tsx
│   │   ├── UpcomingEvents.tsx
│   │   └── CalendarFilters.tsx
│   │
│   ├── tasks/
│   │   ├── TasksView.tsx
│   │   ├── TaskListView.tsx
│   │   ├── TaskRow.tsx
│   │   ├── TaskKanbanView.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskModal.tsx
│   │   └── QuickFilters.tsx
│   │
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationDropdown.tsx
│   │   ├── NotificationItem.tsx
│   │   ├── NotificationsPage.tsx
│   │   └── NotificationSettings.tsx
│   │
│   ├── financial/
│   │   ├── FinancialDashboard.tsx
│   │   ├── ByCaseView.tsx
│   │   ├── ByClientView.tsx
│   │   ├── GlobalView.tsx
│   │   ├── FinancialSummaryCards.tsx
│   │   ├── PaymentTimeline.tsx
│   │   ├── RegisterPaymentModal.tsx
│   │   ├── RevenueChart.tsx
│   │   └── ServicesTable.tsx
│   │
│   ├── reports/
│   │   ├── ReportsPanel.tsx
│   │   ├── ReportConfig.tsx
│   │   ├── GeneratedReport.tsx
│   │   ├── ComparisonChart.tsx
│   │   └── ExportButtons.tsx
│   │
│   └── ui/
│       ├── PriorityFlag.tsx
│       ├── StatusBadge.tsx
│       ├── PaymentMethodIcon.tsx
│       └── QuickPeriodButton.tsx
│
├── hooks/
│   ├── useCalendarEvents.ts
│   ├── useTasks.ts
│   ├── useNotifications.ts
│   ├── useFinancials.ts
│   └── useReports.ts
│
├── lib/
│   ├── api/
│   │   ├── calendar.ts
│   │   ├── tasks.ts
│   │   ├── notifications.ts
│   │   ├── financials.ts
│   │   └── reports.ts
│   │
│   └── utils/
│       ├── formatters.ts
│       ├── date-helpers.ts
│       └── calculations.ts
│
└── types/
    ├── calendar.ts
    ├── tasks.ts
    ├── notifications.ts
    ├── financials.ts
    └── reports.ts
```

---

## Notas Finales

Este diseño prioriza:
1. **Simplicidad**: Interfaces limpias y fáciles de usar
2. **Poder**: Funcionalidad completa sin abrumar
3. **Accesibilidad**: WCAG AA compliance
4. **Performance**: Optimizado para velocidad
5. **Responsive**: Funciona en todos los dispositivos
6. **Extensibilidad**: Fácil de mantener y escalar

**Próximos Pasos Sugeridos**:
1. Revisar y aprobar diseño
2. Crear prototipos interactivos en Figma (opcional)
3. Iniciar implementación por fases
4. Iterar basado en feedback de usuarios
