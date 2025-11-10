# Legal RAG System - Accessibility Checklist (WCAG 2.1 AA)

---

## Overview

This checklist ensures all new UI modules comply with **WCAG 2.1 Level AA** standards. Each component must be tested and verified before deployment.

**Target:** WCAG 2.1 AA compliance across all modules
**Testing Tools:** axe DevTools, NVDA/JAWS screen readers, keyboard-only navigation
**Responsibility:** QA Engineer + Frontend Developers

---

## General Accessibility Requirements

### Color & Contrast

- [ ] All text has minimum 4.5:1 contrast ratio with background (7:1 for AAA)
- [ ] Large text (18pt+) has minimum 3:1 contrast ratio
- [ ] UI components (buttons, borders) have minimum 3:1 contrast ratio
- [ ] Color is not the only way to convey information
- [ ] Links are distinguishable from surrounding text (underline or 3:1 contrast)
- [ ] Focus indicators have minimum 3:1 contrast ratio against background
- [ ] Status indicators use both color AND icons/text

**Testing:**
```bash
# Use browser DevTools or axe extension
# Check contrast ratios for all color combinations
```

**Problematic Colors to Review:**
```css
/* These need verification: */
--priority-low: #6b7280 on white (verify contrast)
--event-other: #6b7280 on white (verify contrast)
```

**Fix Example:**
```css
/* If contrast fails, darken: */
--priority-low: #4b5563; /* Gray-600 instead of Gray-500 */
```

---

### Keyboard Navigation

- [ ] All interactive elements are keyboard accessible (Tab, Enter, Space, Arrows)
- [ ] Tab order follows visual/logical order
- [ ] Focus is visible on all interactive elements
- [ ] No keyboard traps (users can always navigate away)
- [ ] Shortcuts don't conflict with screen reader shortcuts
- [ ] Modal dialogs trap focus until dismissed
- [ ] Skip links are provided to bypass repetitive content

**Key Patterns:**

#### Calendar Navigation
```typescript
// Arrow keys navigate between dates
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowLeft':
        setSelectedDate(subDays(selectedDate, 1));
        break;
      case 'ArrowRight':
        setSelectedDate(addDays(selectedDate, 1));
        break;
      case 'ArrowUp':
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case 'ArrowDown':
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case 'Enter':
      case ' ':
        onDayClick(selectedDate);
        e.preventDefault();
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedDate]);
```

#### Task List Navigation
```typescript
// Up/Down arrows navigate tasks, Space toggles completion
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === ' ' && e.target instanceof HTMLElement) {
    const checkbox = e.target.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.click();
      e.preventDefault();
    }
  }
};
```

#### Modal Focus Trap
```typescript
import { useEffect, useRef } from 'react';

export const Dialog: React.FC = ({ open, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement>();

  useEffect(() => {
    if (open) {
      // Store previous focus
      previousFocus.current = document.activeElement as HTMLElement;

      // Focus first interactive element
      const firstInput = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstInput?.focus();

      // Trap focus
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => {
        document.removeEventListener('keydown', handleTab);
        previousFocus.current?.focus();
      };
    }
  }, [open]);

  return <div ref={dialogRef}>{children}</div>;
};
```

---

### Screen Reader Support

- [ ] All images have alt text (empty alt="" for decorative)
- [ ] Form inputs have associated labels
- [ ] ARIA landmarks identify page regions (main, navigation, complementary)
- [ ] ARIA labels describe interactive elements
- [ ] ARIA live regions announce dynamic changes
- [ ] Status messages are announced to screen readers
- [ ] Error messages are associated with form fields

**ARIA Landmarks:**
```typescript
<header role="banner">
  <nav aria-label="Main navigation">
    {/* Navigation items */}
  </nav>
</header>

<main role="main" aria-label="Main content">
  <section aria-labelledby="calendar-heading">
    <h2 id="calendar-heading">Calendario</h2>
    {/* Calendar content */}
  </section>
</main>

<aside role="complementary" aria-label="Upcoming events">
  {/* Upcoming events list */}
</aside>
```

**ARIA Live Regions:**
```typescript
// Announce notification count changes
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {unreadCount > 0
    ? `Tienes ${unreadCount} notificaciones sin leer`
    : 'No tienes notificaciones sin leer'
  }
</div>

// Announce task completion
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {justCompleted && `Tarea "${taskTitle}" marcada como completada`}
</div>
```

**Form Labels:**
```typescript
// Good: Explicit label association
<label htmlFor="event-title">Título del evento</label>
<input id="event-title" name="title" />

// Good: Implicit label
<label>
  Título del evento
  <input name="title" />
</label>

// Good: ARIA label (when visual label isn't possible)
<input aria-label="Buscar eventos" type="search" placeholder="Buscar..." />

// Bad: No label
<input placeholder="Título del evento" /> {/* ❌ Screen reader can't identify */}
```

---

## Module-Specific Checklists

### Calendar Module

#### CalendarGrid Component

- [ ] Each day cell has semantic role and label
- [ ] Arrow keys navigate between dates
- [ ] Enter/Space keys open day details
- [ ] Event dots have descriptive tooltips
- [ ] Selected date is announced to screen readers
- [ ] Month/year change is announced
- [ ] Event count per day is announced

**Implementation:**
```typescript
<div
  role="button"
  tabIndex={0}
  aria-label={`${format(day, 'd de MMMM yyyy', { locale: es })}. ${dayEvents.length} eventos.`}
  aria-pressed={isSelected}
  onKeyDown={handleKeyDown}
  onClick={() => onDayClick(day)}
>
  <span aria-hidden="true">{format(day, 'd')}</span>

  {dayEvents.length > 0 && (
    <div role="list" aria-label="Eventos del día">
      {dayEvents.map(event => (
        <div
          key={event.id}
          role="listitem"
          aria-label={`${event.title}, ${event.type}`}
          className="event-dot"
        />
      ))}
    </div>
  )}
</div>
```

#### CreateEventDialog Component

- [ ] Dialog has role="dialog" and aria-labelledby
- [ ] Focus moves to dialog when opened
- [ ] Focus returns to trigger when closed
- [ ] Escape key closes dialog
- [ ] Form has clear validation error messages
- [ ] Required fields are marked with aria-required
- [ ] Date/time pickers are keyboard accessible

**Implementation:**
```typescript
<Dialog role="dialog" aria-labelledby="dialog-title" aria-modal="true">
  <DialogHeader>
    <DialogTitle id="dialog-title">Crear Nuevo Evento</DialogTitle>
  </DialogHeader>

  <form onSubmit={handleSubmit}>
    <div>
      <label htmlFor="event-title">
        Título <span aria-label="requerido">*</span>
      </label>
      <input
        id="event-title"
        type="text"
        aria-required="true"
        aria-invalid={!!errors.title}
        aria-describedby={errors.title ? 'title-error' : undefined}
      />
      {errors.title && (
        <span id="title-error" role="alert" className="text-legal-error">
          {errors.title.message}
        </span>
      )}
    </div>

    {/* More fields... */}

    <div role="group" aria-labelledby="event-type-label">
      <span id="event-type-label">Tipo de evento</span>
      <Select aria-labelledby="event-type-label">
        <SelectItem value="hearing">Audiencia</SelectItem>
        <SelectItem value="deadline">Plazo legal</SelectItem>
        {/* More options... */}
      </Select>
    </div>
  </form>
</Dialog>
```

#### UpcomingEvents Component

- [ ] Events list has role="list"
- [ ] Each event has role="listitem"
- [ ] Event dates are in accessible format
- [ ] Empty state has descriptive text

**Implementation:**
```typescript
<aside aria-labelledby="upcoming-events-title">
  <h3 id="upcoming-events-title">Próximos Eventos</h3>

  {events.length === 0 ? (
    <p>No hay eventos próximos</p>
  ) : (
    <ul role="list">
      {events.map(event => (
        <li key={event.id} role="listitem">
          <a
            href={`/events/${event.id}`}
            aria-label={`${event.title}, ${format(event.startDate, 'PPP', { locale: es })}`}
          >
            <span aria-hidden="true">{event.title}</span>
            <time dateTime={event.startDate.toISOString()}>
              {format(event.startDate, 'PPP', { locale: es })}
            </time>
          </a>
        </li>
      ))}
    </ul>
  )}
</aside>
```

---

### Tasks Module

#### TaskList Component

- [ ] Task groups have clear headings
- [ ] Checkboxes are keyboard accessible
- [ ] Checkbox state changes are announced
- [ ] Priority is conveyed with text, not just color
- [ ] Overdue tasks are clearly indicated
- [ ] Empty states have descriptive text

**Implementation:**
```typescript
<section aria-labelledby="urgent-tasks-heading">
  <h3 id="urgent-tasks-heading">
    <span className="priority-urgent" aria-hidden="true">🚨</span>
    <span>Tareas Urgentes ({urgentTasks.length})</span>
  </h3>

  <ul role="list">
    {urgentTasks.map(task => (
      <li key={task.id}>
        <TaskRow
          task={task}
          aria-label={`${task.title}. Prioridad: Urgente. ${
            task.dueDate ? `Vence: ${format(task.dueDate, 'PPP', { locale: es })}` : ''
          }${isOverdue(task.dueDate) ? '. VENCIDA' : ''}`}
        />
      </li>
    ))}
  </ul>
</section>
```

#### TaskRow Component

- [ ] Checkbox has descriptive label
- [ ] Task status is announced
- [ ] Due date is in accessible format
- [ ] Priority is conveyed semantically

**Implementation:**
```typescript
<div
  role="article"
  aria-labelledby={`task-${task.id}-title`}
  className={cn('task-row', priorityBorderClass[task.priority])}
>
  <Checkbox
    id={`task-${task.id}-checkbox`}
    checked={task.status === 'completed'}
    onCheckedChange={onComplete}
    aria-label={`Marcar "${task.title}" como completada`}
  />

  <div className="task-content">
    <h4 id={`task-${task.id}-title`}>{task.title}</h4>

    <div className="task-meta">
      {/* Priority - text + icon */}
      <span className="priority-indicator">
        <span className="sr-only">Prioridad: </span>
        {priorityLabels[task.priority]}
      </span>

      {/* Due date - semantic time element */}
      {task.dueDate && (
        <time dateTime={task.dueDate.toISOString()}>
          <span className="sr-only">Fecha de vencimiento: </span>
          {format(task.dueDate, 'PPP', { locale: es })}
          {isOverdue && (
            <span className="text-legal-error">
              {' '}<span className="sr-only">- </span>(Vencida)
            </span>
          )}
        </time>
      )}
    </div>
  </div>

  {/* Status badge */}
  <Badge
    className={statusColors[task.status]}
    aria-label={`Estado: ${statusLabels[task.status]}`}
  >
    <span aria-hidden="true">{statusLabels[task.status]}</span>
  </Badge>
</div>
```

#### KanbanBoard Component (Optional)

- [ ] Drag and drop has keyboard alternative
- [ ] Column headers are semantic headings
- [ ] Drag instructions are announced
- [ ] Drop zones are indicated

**Keyboard-Accessible Drag & Drop:**
```typescript
// Add keyboard controls for moving tasks between columns
const handleKeyDown = (e: KeyboardEvent, task: Task) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const columns = ['pending', 'in_progress', 'completed', 'blocked'];
    const currentIndex = columns.indexOf(task.status);
    const newIndex = e.key === 'ArrowLeft'
      ? Math.max(0, currentIndex - 1)
      : Math.min(columns.length - 1, currentIndex + 1);

    if (newIndex !== currentIndex) {
      const newStatus = columns[newIndex] as TaskStatus;
      onTaskMove(task.id, newStatus);

      // Announce change
      announceToScreenReader(
        `Tarea movida a ${statusLabels[newStatus]}`
      );
    }
  }
};

<div
  tabIndex={0}
  role="button"
  aria-label={`${task.title}. Presiona flecha izquierda o derecha para mover entre columnas.`}
  onKeyDown={(e) => handleKeyDown(e, task)}
>
  <TaskCard task={task} />
</div>
```

---

### Notifications Module

#### NotificationBell Component

- [ ] Unread count is announced
- [ ] Dropdown is keyboard accessible
- [ ] Notification list has role="list"
- [ ] Notification actions are keyboard accessible

**Implementation:**
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        unreadCount > 0
          ? `Notificaciones. ${unreadCount} sin leer.`
          : 'Notificaciones. No hay notificaciones sin leer.'
      }
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span
          className="notification-badge"
          aria-hidden="true"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent align="end" className="w-80">
    <div className="flex items-center justify-between p-4 border-b">
      <h3 id="notifications-heading">Notificaciones</h3>
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={markAllAsRead}
          aria-label={`Marcar todas las ${unreadCount} notificaciones como leídas`}
        >
          Marcar todas como leídas
        </Button>
      )}
    </div>

    <div
      role="list"
      aria-labelledby="notifications-heading"
      className="max-h-96 overflow-y-auto"
    >
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={markAsRead}
        />
      ))}
    </div>
  </DropdownMenuContent>
</DropdownMenu>
```

#### NotificationItem Component

- [ ] Priority is conveyed semantically
- [ ] Timestamp is in accessible format
- [ ] Action buttons have descriptive labels
- [ ] Read/unread state is announced

**Implementation:**
```typescript
<div
  role="listitem"
  aria-label={`${notification.priority === 'urgent' ? 'Urgente: ' : ''}${notification.title}. ${
    notification.read ? 'Leída' : 'Sin leer'
  }. ${formatRelativeDate(notification.createdAt)}`}
  className={cn(
    'notification-item',
    !notification.read && 'bg-legal-primary-light'
  )}
>
  {/* Priority indicator */}
  {notification.priority === 'urgent' && (
    <div className="priority-badge" aria-hidden="true">
      <AlertCircle className="w-4 h-4 text-legal-error" />
    </div>
  )}

  <div className="flex-1">
    <h4>{notification.title}</h4>
    <p>{notification.message}</p>

    <time dateTime={notification.createdAt.toISOString()}>
      <span className="sr-only">Recibida: </span>
      {formatRelativeDate(notification.createdAt)}
    </time>
  </div>

  {/* Read/unread indicator */}
  {!notification.read && (
    <div
      className="unread-dot"
      aria-label="Sin leer"
      role="status"
    />
  )}

  {/* Action button */}
  {notification.actionUrl && (
    <Button
      variant="ghost"
      size="sm"
      asChild
      aria-label={`${notification.actionLabel || 'Ver detalles'} de ${notification.title}`}
    >
      <a href={notification.actionUrl}>
        {notification.actionLabel || 'Ver'}
      </a>
    </Button>
  )}

  {/* Mark as read button */}
  {!notification.read && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onMarkRead(notification.id)}
      aria-label={`Marcar "${notification.title}" como leída`}
    >
      <Check className="w-4 h-4" />
    </Button>
  )}
</div>
```

---

### Financial Dashboard

#### FinancialSummaryCards Component

- [ ] Currency values are formatted accessibly
- [ ] Progress bars have text alternatives
- [ ] Card headings are semantic
- [ ] Color-coding has text labels

**Implementation:**
```typescript
<div className="grid grid-cols-3 gap-4" role="list">
  <Card role="listitem" aria-labelledby="total-card-title">
    <CardHeader>
      <h3 id="total-card-title" className="text-sm font-medium">
        Total Facturado
      </h3>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold" aria-label={`Total: ${formatCurrency(totalAmount)}`}>
        {formatCurrency(totalAmount)}
      </div>

      {/* Progress bar with text alternative */}
      <div
        role="progressbar"
        aria-valuenow={100}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Total facturado: 100%"
      >
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-legal-info"
            style={{ width: '100%' }}
            aria-hidden="true"
          />
        </div>
      </div>
    </CardContent>
  </Card>

  <Card role="listitem" aria-labelledby="paid-card-title">
    <CardHeader>
      <h3 id="paid-card-title" className="text-sm font-medium">
        Pagado
      </h3>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-legal-success">
        {formatCurrency(paidAmount)}
      </div>

      <div
        role="progressbar"
        aria-valuenow={paidPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Pagado: ${paidPercentage}%`}
      >
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-legal-success"
            style={{ width: `${paidPercentage}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-1">
        {paidPercentage}% del total
      </p>
    </CardContent>
  </Card>

  {/* Pending card... */}
</div>
```

#### PaymentTimeline Component

- [ ] Timeline has semantic structure
- [ ] Payment status is conveyed with text
- [ ] Dates are in accessible format
- [ ] Payment actions have descriptive labels

**Implementation:**
```typescript
<ol
  role="list"
  aria-label="Línea de tiempo de pagos"
  className="payment-timeline"
>
  {payments.map((payment, index) => (
    <li key={payment.id} className="timeline-item">
      <div className="timeline-marker">
        <div
          className={cn(
            'status-icon',
            payment.status === 'paid' && 'bg-financial-paid',
            payment.status === 'pending' && 'bg-financial-pending',
            payment.status === 'overdue' && 'bg-financial-overdue'
          )}
          aria-hidden="true"
        >
          {payment.status === 'paid' && <Check />}
          {payment.status === 'pending' && <Clock />}
          {payment.status === 'overdue' && <AlertCircle />}
        </div>
      </div>

      <div className="timeline-content">
        <h4>Pago #{index + 1}</h4>

        <div className="payment-details">
          <span className="sr-only">Monto: </span>
          <span className="font-semibold">{formatCurrency(payment.amount)}</span>

          <Badge
            className={statusColors[payment.status]}
            aria-label={`Estado: ${statusLabels[payment.status]}`}
          >
            {statusLabels[payment.status]}
          </Badge>
        </div>

        <time dateTime={payment.dueDate.toISOString()}>
          <span className="sr-only">Fecha de vencimiento: </span>
          {format(payment.dueDate, 'PPP', { locale: es })}
        </time>

        {payment.status === 'pending' && (
          <Button
            size="sm"
            onClick={() => onRegisterPayment(payment.id)}
            aria-label={`Registrar pago de ${formatCurrency(payment.amount)}`}
          >
            Registrar Pago
          </Button>
        )}
      </div>
    </li>
  ))}
</ol>
```

#### Charts (Recharts)

- [ ] Charts have descriptive titles
- [ ] Chart data has text alternative
- [ ] Color-coding has legends
- [ ] Data tables provided as alternative

**Implementation:**
```typescript
<div aria-labelledby="revenue-chart-title">
  <h3 id="revenue-chart-title">Ingresos por Mes</h3>

  {/* Screen reader accessible data table */}
  <table className="sr-only">
    <caption>Ingresos mensuales del año 2024</caption>
    <thead>
      <tr>
        <th scope="col">Mes</th>
        <th scope="col">Ingresos</th>
      </tr>
    </thead>
    <tbody>
      {data.map(item => (
        <tr key={item.month}>
          <th scope="row">{item.month}</th>
          <td>{formatCurrency(item.revenue)}</td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Visual chart */}
  <ResponsiveContainer width="100%" height={300} aria-hidden="true">
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip formatter={(value) => formatCurrency(value as number)} />
      <Legend />
      <Bar dataKey="revenue" fill="#10b981" name="Ingresos" />
    </BarChart>
  </ResponsiveContainer>
</div>
```

---

### Reports Panel

#### Export Functionality

- [ ] Export buttons have descriptive labels
- [ ] Loading states are announced
- [ ] Success/error messages are announced
- [ ] Download progress is indicated

**Implementation:**
```typescript
<div className="export-controls" role="group" aria-labelledby="export-label">
  <span id="export-label" className="sr-only">
    Exportar reporte
  </span>

  <Button
    onClick={handleExportPDF}
    disabled={isExporting}
    aria-label={
      isExporting
        ? 'Exportando reporte a PDF...'
        : 'Exportar reporte a PDF'
    }
  >
    <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
    {isExporting ? 'Exportando...' : 'Exportar PDF'}
  </Button>

  <Button
    onClick={handleExportExcel}
    disabled={isExporting}
    aria-label={
      isExporting
        ? 'Exportando reporte a Excel...'
        : 'Exportar reporte a Excel'
    }
  >
    <FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />
    {isExporting ? 'Exportando...' : 'Exportar Excel'}
  </Button>
</div>

{/* Live region for export status */}
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {exportStatus}
</div>
```

---

## Testing Procedures

### Automated Testing

```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Run in development
import { axe } from '@axe-core/react';

if (process.env.NODE_ENV !== 'production') {
  axe(React, ReactDOM, 1000);
}
```

**Axe DevTools Browser Extension:**
1. Install axe DevTools Chrome/Firefox extension
2. Navigate to page
3. Click "Scan ALL of my page"
4. Review violations (aim for 0 violations)
5. Fix issues and re-scan

### Manual Testing

#### Keyboard Navigation Test
1. Disconnect mouse
2. Use only keyboard (Tab, Shift+Tab, Enter, Space, Arrows, Escape)
3. Verify all functionality is accessible
4. Check focus visibility at all times
5. Ensure logical tab order

#### Screen Reader Test (NVDA/JAWS)
1. Install NVDA (free) or JAWS
2. Enable screen reader
3. Navigate with SR shortcuts (H for headings, L for links, B for buttons)
4. Verify all content is announced
5. Check form labels and error messages
6. Test dynamic content announcements

#### Color Contrast Test
1. Use browser DevTools color picker
2. Check contrast ratios for all text
3. Test in dark mode
4. Test with color blindness simulators

#### Mobile Accessibility Test
1. Test on actual mobile device
2. Check touch target sizes (min 44x44px)
3. Test with mobile screen readers (VoiceOver/TalkBack)
4. Verify responsive layout doesn't break accessibility

---

## Common Issues & Fixes

### Issue: Low Contrast on Gray Text
```css
/* ❌ Bad: Fails WCAG AA */
.task-meta {
  color: #9ca3af; /* Gray-400 on white = 2.8:1 contrast */
}

/* ✅ Good: Passes WCAG AA */
.task-meta {
  color: #6b7280; /* Gray-500 on white = 4.6:1 contrast */
}
```

### Issue: Missing Form Labels
```tsx
{/* ❌ Bad */}
<input placeholder="Search..." />

{/* ✅ Good */}
<label htmlFor="search">
  <span className="sr-only">Search</span>
  <input id="search" placeholder="Search..." aria-label="Search" />
</label>
```

### Issue: Inaccessible Icons
```tsx
{/* ❌ Bad */}
<button onClick={handleDelete}>
  <Trash2 className="w-4 h-4" />
</button>

{/* ✅ Good */}
<button onClick={handleDelete} aria-label="Delete task">
  <Trash2 className="w-4 h-4" aria-hidden="true" />
</button>
```

### Issue: Color-Only Status Indicators
```tsx
{/* ❌ Bad: Status only conveyed by color */}
<div className={statusColor} />

{/* ✅ Good: Status conveyed by color + text + icon */}
<Badge className={statusColor}>
  <StatusIcon aria-hidden="true" />
  {statusLabel}
</Badge>
```

### Issue: Inaccessible Drag & Drop
```tsx
{/* ❌ Bad: Only works with mouse */}
<Draggable>
  <TaskCard task={task} />
</Draggable>

{/* ✅ Good: Keyboard alternative provided */}
<div
  draggable
  onDragStart={handleDragStart}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'ArrowLeft') moveLeft();
    if (e.key === 'ArrowRight') moveRight();
  }}
  aria-label="Press arrow keys to move task between columns"
>
  <TaskCard task={task} />
</div>
```

---

## Accessibility Statement (Template)

Include this on your website:

```markdown
## Accessibility Statement for Legal RAG System

We are committed to ensuring digital accessibility for all users, including those with disabilities.

### Conformance Status
Legal RAG System aims to conform to WCAG 2.1 Level AA standards.

### Features
- Keyboard navigation throughout the application
- Screen reader compatibility (tested with NVDA and JAWS)
- Sufficient color contrast (minimum 4.5:1 ratio)
- Resizable text up to 200%
- Clear focus indicators
- Descriptive labels and headings
- Alternative text for images

### Feedback
If you encounter accessibility barriers, please contact us:
- Email: accessibility@example.com
- Phone: +1 (555) 123-4567

We aim to respond within 2 business days.

### Last Updated
January 2025
```

---

## Sign-Off Checklist

Before deploying to production:

- [ ] All automated axe tests pass (0 violations)
- [ ] Manual keyboard navigation test completed
- [ ] Screen reader test completed (NVDA or JAWS)
- [ ] Color contrast verified (all text 4.5:1 minimum)
- [ ] Mobile accessibility tested
- [ ] Accessibility statement published
- [ ] Development team trained on accessibility
- [ ] QA team trained on accessibility testing
- [ ] Documentation includes accessibility notes
- [ ] Accessibility monitoring set up (ongoing)

---

**Remember:** Accessibility is not a one-time task. It requires ongoing commitment and testing as new features are added.
