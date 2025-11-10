# Legal RAG System - Implementation Roadmap
## From Design to Production

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Foundation Setup](#phase-1-foundation-setup)
3. [Phase 2: Calendar Module](#phase-2-calendar-module)
4. [Phase 3: Tasks Module](#phase-3-tasks-module)
5. [Phase 4: Notifications Module](#phase-4-notifications-module)
6. [Phase 5: Financial Dashboard](#phase-5-financial-dashboard)
7. [Phase 6: Reports Panel](#phase-6-reports-panel)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)

---

## Implementation Overview

### Timeline: 14 Weeks

```
Week 1-2:   Foundation & Design Tokens
Week 3-4:   Calendar Module
Week 5-6:   Tasks Module
Week 7-8:   Notifications Module
Week 9-10:  Financial Dashboard
Week 11-12: Reports Panel
Week 13:    Integration Testing
Week 14:    UAT & Deployment
```

### Team Requirements

- 2 Frontend Developers (React/TypeScript)
- 1 Backend Developer (FastAPI/Prisma)
- 1 UI/UX Designer (for design QA)
- 1 QA Engineer (testing & accessibility)

### Technology Stack Confirmation

**Frontend:**
- React 18+ with TypeScript
- TailwindCSS (existing setup)
- shadcn/ui components
- Lucide React icons
- React Query for data fetching
- Recharts for visualizations
- date-fns for date handling
- React DnD for Kanban (optional)

**Backend:**
- Existing Fastify API
- Prisma ORM (existing models to extend)
- PostgreSQL database

---

## Phase 1: Foundation Setup
**Duration: 2 weeks**

### Week 1: Design System Implementation

#### Task 1.1: Extend TailwindCSS Configuration

**File:** `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        legal: {
          primary: '#2563eb',
          'primary-hover': '#1d4ed8',
          'primary-light': '#dbeafe',
          'primary-dark': '#1e40af',
          secondary: '#7c3aed',
          'secondary-light': '#ede9fe',
          accent: '#06b6d4',
          'accent-light': '#cffafe',
          success: '#10b981',
          'success-light': '#d1fae5',
          warning: '#f59e0b',
          'warning-light': '#fef3c7',
          error: '#ef4444',
          'error-light': '#fee2e2',
          info: '#3b82f6',
          'info-light': '#dbeafe',
        },
        // Status Colors
        status: {
          pending: '#f59e0b',
          progress: '#3b82f6',
          completed: '#10b981',
          blocked: '#ef4444',
        },
        // Priority Colors
        priority: {
          urgent: '#dc2626',
          high: '#ea580c',
          medium: '#f59e0b',
          low: '#6b7280',
        },
        // Financial Status
        financial: {
          paid: '#10b981',
          pending: '#f59e0b',
          overdue: '#ef4444',
          partial: '#3b82f6',
        },
        // Event Types
        event: {
          hearing: '#8b5cf6',
          deadline: '#ef4444',
          meeting: '#3b82f6',
          task: '#10b981',
          other: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'custom-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'custom-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'custom-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
}
```

#### Task 1.2: Install Required Dependencies

```bash
# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast

# shadcn/ui components (run for each component needed)
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add calendar

# Icons
npm install lucide-react

# Date handling
npm install date-fns

# Data fetching
npm install @tanstack/react-query

# Charts
npm install recharts

# Drag & Drop (for Kanban)
npm install react-beautiful-dnd
npm install @types/react-beautiful-dnd --save-dev

# Forms
npm install react-hook-form
npm install @hookform/resolvers zod
```

#### Task 1.3: Create Base Layout Components

**File:** `src/components/layout/AppLayout.tsx`

```typescript
import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '@/components/ui/toaster';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
};
```

#### Task 1.4: Create Shared TypeScript Interfaces

**File:** `src/types/calendar.ts`

```typescript
export type EventType = 'hearing' | 'deadline' | 'meeting' | 'task' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  caseId?: string;
  caseName?: string;
  location?: string;
  attendees?: string[];
  reminders?: {
    type: 'email' | 'push';
    minutesBefore: number;
  }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarFilters {
  caseId?: string;
  eventTypes?: EventType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}
```

**File:** `src/types/task.ts`

```typescript
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assignedTo?: string[];
  caseId?: string;
  caseName?: string;
  tags?: string[];
  attachments?: number;
  comments?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignedTo?: string;
  caseId?: string;
  dueDate?: 'today' | 'this_week' | 'overdue';
}
```

**File:** `src/types/notification.ts`

```typescript
export type NotificationType = 'event' | 'task' | 'payment' | 'system' | 'message';
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
}
```

**File:** `src/types/financial.ts`

```typescript
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  dueDate: Date;
  paidDate?: Date;
  caseId: string;
  caseName: string;
  clientName: string;
  description?: string;
  paymentMethod?: string;
  createdAt: Date;
}

export interface CaseFinancials {
  caseId: string;
  caseName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  payments: Payment[];
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  pendingPayments: number;
  overduePayments: number;
  paymentsByStatus: Record<PaymentStatus, number>;
}
```

### Week 2: API Integration Setup

#### Task 2.1: React Query Configuration

**File:** `src/lib/react-query.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

#### Task 2.2: API Client Setup

**File:** `src/lib/api-client.ts`

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### Task 2.3: Database Schema Updates

**File:** `prisma/schema.prisma` (additions)

```prisma
model CalendarEvent {
  id          String    @id @default(cuid())
  title       String
  description String?
  type        EventType
  startDate   DateTime
  endDate     DateTime?
  allDay      Boolean   @default(false)
  location    String?

  caseId      String?
  case        Case?     @relation(fields: [caseId], references: [id])

  createdBy   String
  user        User      @relation(fields: [createdBy], references: [id])

  attendees   EventAttendee[]
  reminders   EventReminder[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([caseId])
  @@index([startDate])
  @@index([type])
}

enum EventType {
  hearing
  deadline
  meeting
  task
  other
}

model EventAttendee {
  id      String @id @default(cuid())
  eventId String
  event   CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId  String
  user    User   @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
}

model EventReminder {
  id            String @id @default(cuid())
  eventId       String
  event         CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  type          ReminderType
  minutesBefore Int
  sent          Boolean @default(false)
}

enum ReminderType {
  email
  push
}

model Task {
  id          String       @id @default(cuid())
  title       String
  description String?
  status      TaskStatus   @default(pending)
  priority    TaskPriority @default(medium)
  dueDate     DateTime?

  caseId      String?
  case        Case?        @relation(fields: [caseId], references: [id])

  createdBy   String
  user        User         @relation(fields: [createdBy], references: [id])

  assignees   TaskAssignee[]
  tags        TaskTag[]

  completedAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([caseId])
  @@index([status])
  @@index([priority])
  @@index([dueDate])
}

enum TaskStatus {
  pending
  in_progress
  completed
  blocked
}

enum TaskPriority {
  urgent
  high
  medium
  low
}

model TaskAssignee {
  id      String @id @default(cuid())
  taskId  String
  task    Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId  String
  user    User   @relation(fields: [userId], references: [id])

  @@unique([taskId, userId])
}

model TaskTag {
  id     String @id @default(cuid())
  taskId String
  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag    String
}

model Notification {
  id       String             @id @default(cuid())
  type     NotificationType
  priority NotificationPriority @default(normal)
  title    String
  message  String
  read     Boolean            @default(false)

  userId   String
  user     User               @relation(fields: [userId], references: [id])

  actionUrl   String?
  actionLabel String?
  metadata    Json?

  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([read])
  @@index([createdAt])
}

enum NotificationType {
  event
  task
  payment
  system
  message
}

enum NotificationPriority {
  urgent
  high
  normal
  low
}
```

Run migration:
```bash
npx prisma migrate dev --name add_calendar_tasks_notifications
npx prisma generate
```

---

## Phase 2: Calendar Module
**Duration: 2 weeks (Weeks 3-4)**

### Week 3: Calendar Core Components

#### Task 3.1: Calendar Grid Component

**File:** `src/components/calendar/CalendarGrid.tsx`

```typescript
import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import { EventDot } from './EventDot';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  currentMonth: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  events,
  onDayClick,
  onEventClick,
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.startDate), day));
  };

  return (
    <div className="bg-white rounded-lg shadow-custom-md p-4">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'aspect-square p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                isCurrentDay && 'border-legal-primary border-2',
                !isCurrentMonth && 'text-gray-400'
              )}
            >
              <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>

              {dayEvents.length > 0 && (
                <div className="flex gap-1 justify-center flex-wrap">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventDot
                      key={event.id}
                      event={event}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-gray-500">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

#### Task 3.2: Event Dot Component

**File:** `src/components/calendar/EventDot.tsx`

```typescript
import React from 'react';
import { CalendarEvent, EventType } from '@/types/calendar';
import { cn } from '@/lib/utils';

interface EventDotProps {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
}

const eventTypeColors: Record<EventType, string> = {
  hearing: 'bg-event-hearing',
  deadline: 'bg-event-deadline',
  meeting: 'bg-event-meeting',
  task: 'bg-event-task',
  other: 'bg-event-other',
};

export const EventDot: React.FC<EventDotProps> = ({ event, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform',
        eventTypeColors[event.type]
      )}
      title={event.title}
    />
  );
};
```

#### Task 3.3: Create Event Dialog

**File:** `src/components/calendar/CreateEventDialog.tsx`

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarEvent, EventType } from '@/types/calendar';

const eventSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  type: z.enum(['hearing', 'deadline', 'meeting', 'task', 'other']),
  startDate: z.string(),
  endDate: z.string().optional(),
  allDay: z.boolean(),
  caseId: z.string().optional(),
  location: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  onSubmit: (data: EventFormData) => Promise<void>;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onOpenChange,
  defaultDate,
  onSubmit,
}) => {
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      allDay: false,
      type: 'meeting',
      startDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd\'T\'HH:mm') : '',
    },
  });

  const handleSubmit = async (data: EventFormData) => {
    await onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <Input {...form.register('title')} placeholder="Título del evento" />
            {form.formState.errors.title && (
              <p className="text-sm text-legal-error mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Evento *</label>
            <Select
              value={form.watch('type')}
              onValueChange={(value) => form.setValue('type', value as EventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hearing">🏛️ Audiencia</SelectItem>
                <SelectItem value="deadline">⏰ Plazo Legal</SelectItem>
                <SelectItem value="meeting">👥 Reunión</SelectItem>
                <SelectItem value="task">✓ Tarea</SelectItem>
                <SelectItem value="other">📌 Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <Textarea
              {...form.register('description')}
              placeholder="Detalles adicionales"
              rows={3}
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha y Hora Inicio *</label>
              <Input type="datetime-local" {...form.register('startDate')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha y Hora Fin</label>
              <Input type="datetime-local" {...form.register('endDate')} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">Ubicación</label>
            <Input {...form.register('location')} placeholder="Lugar del evento" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creando...' : 'Crear Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

#### Task 3.4: Calendar Page Component

**File:** `src/pages/CalendarPage.tsx`

```typescript
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { UpcomingEvents } from '@/components/calendar/UpcomingEvents';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/api-client';
import { CalendarEvent } from '@/types/calendar';

export const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', currentMonth],
    queryFn: async () => {
      const response = await apiClient.get('/calendar/events', {
        params: {
          month: format(currentMonth, 'yyyy-MM'),
        },
      });
      return response.data;
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiClient.post('/calendar/events', eventData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Evento creado',
        description: 'El evento se ha creado exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo crear el evento.',
        variant: 'destructive',
      });
    },
  });

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    // Open event details modal
    console.log('Event clicked:', event);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Calendario</h1>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>

          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* Calendar Grid & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="animate-pulse bg-white rounded-lg h-96" />
          ) : (
            <CalendarGrid
              currentMonth={currentMonth}
              events={events}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        <div>
          <UpcomingEvents events={events} />
        </div>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDate={selectedDate}
        onSubmit={createEventMutation.mutateAsync}
      />
    </div>
  );
};
```

### Week 4: Calendar API & Polish

#### Task 4.1: Backend API Routes

**File:** `src/routes/calendar.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(['hearing', 'deadline', 'meeting', 'task', 'other']),
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().transform(s => new Date(s)).optional(),
  allDay: z.boolean(),
  caseId: z.string().optional(),
  location: z.string().optional(),
});

export async function calendarRoutes(fastify: FastifyInstance) {
  // Get events for a month
  fastify.get('/events', async (request, reply) => {
    const { month, caseId, type } = request.query as any;

    const events = await prisma.calendarEvent.findMany({
      where: {
        startDate: {
          gte: new Date(`${month}-01`),
          lt: new Date(`${month}-31`),
        },
        ...(caseId && { caseId }),
        ...(type && { type }),
      },
      include: {
        case: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return events;
  });

  // Create event
  fastify.post('/events', async (request, reply) => {
    const data = createEventSchema.parse(request.body);
    const userId = request.user.id; // From JWT auth

    const event = await prisma.calendarEvent.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });

    return event;
  });

  // Update event
  fastify.put('/events/:id', async (request, reply) => {
    const { id } = request.params as any;
    const data = createEventSchema.partial().parse(request.body);

    const event = await prisma.calendarEvent.update({
      where: { id },
      data,
    });

    return event;
  });

  // Delete event
  fastify.delete('/events/:id', async (request, reply) => {
    const { id } = request.params as any;

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return { success: true };
  });
}
```

#### Task 4.2: Testing & Accessibility

- Add keyboard navigation (arrow keys for date navigation)
- Test screen reader compatibility
- Add loading states and error boundaries
- Test on mobile devices (responsive grid)
- Add event drag-and-drop (optional enhancement)

---

## Phase 3: Tasks Module
**Duration: 2 weeks (Weeks 5-6)**

### Week 5: Task Components

#### Task 5.1: Task List Component

**File:** `src/components/tasks/TaskList.tsx`

```typescript
import React from 'react';
import { Task, TaskStatus } from '@/types/task';
import { TaskRow } from './TaskRow';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTaskClick,
  onTaskComplete,
}) => {
  const groupedTasks = {
    urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed'),
    high: tasks.filter(t => t.priority === 'high' && t.status !== 'completed'),
    medium: tasks.filter(t => t.priority === 'medium' && t.status !== 'completed'),
    low: tasks.filter(t => t.priority === 'low' && t.status !== 'completed'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  return (
    <div className="space-y-6">
      {/* Urgent Tasks */}
      {groupedTasks.urgent.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-priority-urgent mb-3">
            🚨 Urgentes ({groupedTasks.urgent.length})
          </h3>
          <div className="space-y-2">
            {groupedTasks.urgent.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onComplete={() => onTaskComplete(task.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* High Priority Tasks */}
      {groupedTasks.high.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-priority-high mb-3">
            ⚡ Alta Prioridad ({groupedTasks.high.length})
          </h3>
          <div className="space-y-2">
            {groupedTasks.high.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onComplete={() => onTaskComplete(task.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Medium Priority Tasks */}
      {groupedTasks.medium.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-priority-medium mb-3">
            📋 Prioridad Media ({groupedTasks.medium.length})
          </h3>
          <div className="space-y-2">
            {groupedTasks.medium.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onComplete={() => onTaskComplete(task.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Tasks (collapsed by default) */}
      {groupedTasks.completed.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-lg font-semibold text-status-completed mb-3">
            ✓ Completadas ({groupedTasks.completed.length})
          </summary>
          <div className="space-y-2 mt-3">
            {groupedTasks.completed.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onComplete={() => onTaskComplete(task.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
```

#### Task 5.2: Task Row Component

**File:** `src/components/tasks/TaskRow.tsx`

```typescript
import React from 'react';
import { format, isPast } from 'date-fns';
import { Calendar, Tag, MessageSquare, Paperclip, AlertCircle } from 'lucide-react';
import { Task } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskRowProps {
  task: Task;
  onClick: () => void;
  onComplete: () => void;
}

const priorityConfig = {
  urgent: { color: 'text-priority-urgent', border: 'border-l-priority-urgent' },
  high: { color: 'text-priority-high', border: 'border-l-priority-high' },
  medium: { color: 'text-priority-medium', border: 'border-l-priority-medium' },
  low: { color: 'text-priority-low', border: 'border-l-priority-low' },
};

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-status-pending' },
  in_progress: { label: 'En Progreso', color: 'bg-status-progress' },
  completed: { label: 'Completada', color: 'bg-status-completed' },
  blocked: { label: 'Bloqueada', color: 'bg-status-blocked' },
};

export const TaskRow: React.FC<TaskRowProps> = ({ task, onClick, onComplete }) => {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const config = priorityConfig[task.priority];

  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-4 bg-white rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md',
        config.border,
        task.status === 'completed' && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={(checked) => {
          if (checked) onComplete();
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-5 h-5"
      />

      {/* Priority Icon */}
      <div className={cn('flex-shrink-0', config.color)}>
        {task.priority === 'urgent' && <AlertCircle className="w-5 h-5" />}
      </div>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          'font-medium truncate',
          task.status === 'completed' && 'line-through text-gray-500'
        )}>
          {task.title}
        </h4>

        {task.caseName && (
          <p className="text-sm text-gray-500 truncate">{task.caseName}</p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {task.dueDate && (
            <span className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-legal-error font-medium'
            )}>
              <Calendar className="w-3 h-3" />
              {format(new Date(task.dueDate), 'dd/MM/yyyy')}
              {isOverdue && ' (Vencida)'}
            </span>
          )}

          {task.tags && task.tags.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {task.tags[0]}
            </span>
          )}

          {task.comments && task.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.comments}
            </span>
          )}

          {task.attachments && task.attachments > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachments}
            </span>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <Badge className={cn('text-white', statusConfig[task.status].color)}>
        {statusConfig[task.status].label}
      </Badge>

      {/* Assignees (if any) */}
      {task.assignedTo && task.assignedTo.length > 0 && (
        <div className="flex -space-x-2">
          {task.assignedTo.slice(0, 3).map((user, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-legal-primary text-white flex items-center justify-center text-xs font-medium border-2 border-white"
            >
              {user.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Week 6: Task Management & Kanban

#### Task 6.1: Kanban Board (Optional)

**File:** `src/components/tasks/KanbanBoard.tsx`

```typescript
import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Task, TaskStatus } from '@/types/task';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
}

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'pending', title: 'Pendiente', color: 'bg-status-pending' },
  { id: 'in_progress', title: 'En Progreso', color: 'bg-status-progress' },
  { id: 'completed', title: 'Completada', color: 'bg-status-completed' },
  { id: 'blocked', title: 'Bloqueada', color: 'bg-status-blocked' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskMove,
  onTaskClick,
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;

    onTaskMove(taskId, newStatus);
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={cn(
                'rounded-t-lg p-3 text-white font-semibold',
                column.color
              )}>
                {column.title}
                <span className="ml-2 bg-white/20 px-2 py-1 rounded text-sm">
                  {columnTasks.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 bg-gray-50 p-3 rounded-b-lg space-y-3 min-h-[500px]',
                      snapshot.isDraggingOver && 'bg-legal-primary-light'
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onTaskClick(task)}
                          >
                            <TaskCard
                              task={task}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
```

---

## Phase 4-6: Remaining Modules

*[Continue with similar detailed implementation for Notifications, Financial Dashboard, and Reports Panel]*

---

## Testing Strategy

### Unit Testing (Jest + React Testing Library)

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest
```

Example test:
```typescript
// CalendarGrid.test.tsx
import { render, screen } from '@testing-library/react';
import { CalendarGrid } from './CalendarGrid';

describe('CalendarGrid', () => {
  it('renders days of the month', () => {
    const mockEvents = [];
    render(
      <CalendarGrid
        currentMonth={new Date(2024, 0, 1)}
        events={mockEvents}
        onDayClick={jest.fn()}
        onEventClick={jest.fn()}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });
});
```

### Accessibility Testing

```bash
npm install --save-dev @axe-core/react
```

### E2E Testing (Playwright)

```bash
npm install --save-dev @playwright/test
```

---

## Deployment Checklist

- [ ] Run production build: `npm run build`
- [ ] Run all tests: `npm test`
- [ ] Run accessibility audit: `npm run a11y`
- [ ] Check bundle size: `npm run analyze`
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Set environment variables
- [ ] Configure CDN for static assets
- [ ] Set up error monitoring (Sentry)
- [ ] Configure analytics
- [ ] Test on production-like environment
- [ ] Create rollback plan
- [ ] Notify stakeholders

---

## Success Metrics

**Week 4:** Calendar module functional with event creation/viewing
**Week 6:** Tasks module complete with Kanban board
**Week 8:** Notifications integrated across all modules
**Week 10:** Financial dashboard showing real payment data
**Week 12:** Reports panel generating PDF/Excel exports
**Week 14:** All modules tested, accessible, and deployed

---

## Notes

This roadmap provides a practical, phased approach to implementing the UI design. Each phase builds on the previous one, ensuring a solid foundation before moving to more complex features. Adjust timelines based on team capacity and business priorities.
