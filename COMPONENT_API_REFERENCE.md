# Legal RAG System - Component & API Reference
## Quick Developer Guide

---

## Table of Contents

1. [Component Hierarchy](#component-hierarchy)
2. [TypeScript Interfaces](#typescript-interfaces)
3. [API Endpoints](#api-endpoints)
4. [React Query Hooks](#react-query-hooks)
5. [Utility Functions](#utility-functions)
6. [Common Patterns](#common-patterns)

---

## Component Hierarchy

### Calendar Module

```
CalendarPage
├── CalendarHeader
│   ├── MonthNavigator (ChevronLeft, ChevronRight)
│   ├── FilterButton
│   └── CreateEventButton
├── CalendarGrid
│   ├── DayHeaders (7 columns)
│   └── DayCell[] (30-31 cells)
│       └── EventDot[] (color-coded by type)
├── UpcomingEvents
│   └── EventCard[]
└── CreateEventDialog
    └── EventForm
```

### Tasks Module

```
TasksPage
├── TasksHeader
│   ├── ViewToggle (List/Kanban)
│   ├── FilterTabs (All, Urgent, Today, etc.)
│   └── CreateTaskButton
├── TaskList (default view)
│   ├── TaskSection[] (grouped by priority)
│   └── TaskRow[]
│       ├── Checkbox
│       ├── PriorityIcon
│       ├── TaskContent
│       ├── StatusBadge
│       └── Assignees
└── KanbanBoard (optional view)
    └── KanbanColumn[] (4 columns by status)
        └── TaskCard[]
```

### Notifications Module

```
NotificationCenter
├── NotificationBell (header icon)
│   └── UnreadBadge
├── NotificationDropdown
│   ├── NotificationTabs (All, Unread)
│   └── NotificationList
│       └── NotificationItem[]
│           ├── TypeIcon
│           ├── Content
│           ├── Timestamp
│           └── ActionButton
└── NotificationSettings
```

### Financial Dashboard

```
FinancialDashboard
├── ViewSelector (By Case, By Client, Global)
├── FinancialSummaryCards[]
│   ├── TotalCard
│   ├── PaidCard
│   └── PendingCard
├── PaymentTimeline
│   └── PaymentNode[]
│       ├── StatusIcon
│       └── PaymentDetails
├── FinancialCharts
│   ├── PaymentStatusChart (Pie)
│   └── RevenueChart (Bar/Line)
└── RecentPayments
    └── PaymentRow[]
```

### Reports Panel

```
ReportsPage
├── ReportsHeader
│   ├── PeriodSelector
│   └── ExportButton (PDF/Excel)
├── ReportFilters
│   ├── ClientFilter
│   ├── CaseFilter
│   └── ServiceTypeFilter
├── KPISummary
│   └── KPICard[] (Revenue, Expenses, Net)
├── RevenueChart
└── PaymentBreakdown
```

---

## TypeScript Interfaces

### Calendar Types

```typescript
// Event Types
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
  reminders?: EventReminder[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventReminder {
  type: 'email' | 'push';
  minutesBefore: number;
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

### Task Types

```typescript
// Task Enums
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

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}
```

### Notification Types

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

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}
```

### Financial Types

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
  overdueAmount: number;
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

export interface RevenueByPeriod {
  period: string; // 'YYYY-MM'
  revenue: number;
  expenses: number;
  netIncome: number;
}
```

---

## API Endpoints

### Calendar Endpoints

```typescript
// GET /api/calendar/events
// Query params: month, caseId, type
GET /api/calendar/events?month=2024-01&caseId=abc123&type=hearing

Response: CalendarEvent[]

// POST /api/calendar/events
POST /api/calendar/events
Body: {
  title: string;
  type: EventType;
  startDate: string; // ISO 8601
  endDate?: string;
  allDay: boolean;
  caseId?: string;
  location?: string;
  description?: string;
}

Response: CalendarEvent

// PUT /api/calendar/events/:id
PUT /api/calendar/events/evt_123

Response: CalendarEvent

// DELETE /api/calendar/events/:id
DELETE /api/calendar/events/evt_123

Response: { success: true }
```

### Task Endpoints

```typescript
// GET /api/tasks
// Query params: status, priority, caseId, assignedTo, dueDate
GET /api/tasks?status=pending,in_progress&priority=urgent

Response: {
  tasks: Task[];
  stats: TaskStats;
}

// POST /api/tasks
POST /api/tasks
Body: {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  caseId?: string;
  assignedTo?: string[];
  tags?: string[];
}

Response: Task

// PUT /api/tasks/:id
PUT /api/tasks/tsk_123
Body: {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  // ... other fields
}

Response: Task

// PUT /api/tasks/:id/complete
PUT /api/tasks/tsk_123/complete

Response: Task

// DELETE /api/tasks/:id
DELETE /api/tasks/tsk_123

Response: { success: true }
```

### Notification Endpoints

```typescript
// GET /api/notifications
// Query params: read, type, limit, offset
GET /api/notifications?read=false&limit=20

Response: {
  notifications: Notification[];
  stats: NotificationStats;
  hasMore: boolean;
}

// PUT /api/notifications/:id/read
PUT /api/notifications/ntf_123/read

Response: Notification

// PUT /api/notifications/mark-all-read
PUT /api/notifications/mark-all-read

Response: { success: true, count: number }

// DELETE /api/notifications/:id
DELETE /api/notifications/ntf_123

Response: { success: true }
```

### Financial Endpoints

```typescript
// GET /api/financials/summary
// Query params: period
GET /api/financials/summary?period=current_month

Response: FinancialSummary

// GET /api/financials/cases/:caseId
GET /api/financials/cases/case_123

Response: CaseFinancials

// GET /api/financials/payments
// Query params: status, caseId, clientId, dateFrom, dateTo
GET /api/financials/payments?status=pending&dateFrom=2024-01-01

Response: Payment[]

// POST /api/financials/payments
POST /api/financials/payments
Body: {
  amount: number;
  dueDate: string;
  caseId: string;
  description?: string;
}

Response: Payment

// PUT /api/financials/payments/:id
PUT /api/financials/payments/pmt_123
Body: {
  status: PaymentStatus;
  paidDate?: string;
  paymentMethod?: string;
}

Response: Payment
```

### Reports Endpoints

```typescript
// GET /api/reports/revenue
// Query params: period, groupBy, filters
GET /api/reports/revenue?period=2024-01&groupBy=month

Response: {
  summary: FinancialSummary;
  byPeriod: RevenueByPeriod[];
}

// GET /api/reports/export
// Query params: type, period, format
GET /api/reports/export?type=revenue&period=2024-01&format=pdf

Response: Blob (PDF/Excel file)
```

---

## React Query Hooks

### Calendar Hooks

```typescript
// useCalendarEvents.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { CalendarEvent, CalendarFilters } from '@/types/calendar';

export function useCalendarEvents(month: string, filters?: CalendarFilters) {
  return useQuery({
    queryKey: ['calendar-events', month, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<CalendarEvent[]>('/calendar/events', {
        params: {
          month,
          ...filters,
        },
      });
      return data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// useCreateEvent.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: any) => {
      const { data } = await apiClient.post('/calendar/events', eventData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}
```

### Task Hooks

```typescript
// useTasks.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Task, TaskFilters } from '@/types/task';

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/tasks', {
        params: filters,
      });
      return data;
    },
  });
}

// useCompleteTask.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data } = await apiClient.put(`/tasks/${taskId}/complete`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// useUpdateTaskStatus.ts
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { data } = await apiClient.put(`/tasks/${taskId}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### Notification Hooks

```typescript
// useNotifications.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useNotifications(filters?: { read?: boolean }) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications', {
        params: filters,
      });
      return data;
    },
    refetchInterval: 30 * 1000, // Poll every 30 seconds
  });
}

// useMarkNotificationRead.ts
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiClient.put(`/notifications/${notificationId}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

### Financial Hooks

```typescript
// useFinancialSummary.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useFinancialSummary(period: string) {
  return useQuery({
    queryKey: ['financial-summary', period],
    queryFn: async () => {
      const { data } = await apiClient.get('/financials/summary', {
        params: { period },
      });
      return data;
    },
  });
}

// useCaseFinancials.ts
export function useCaseFinancials(caseId: string) {
  return useQuery({
    queryKey: ['case-financials', caseId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/financials/cases/${caseId}`);
      return data;
    },
    enabled: !!caseId,
  });
}

// useRegisterPayment.ts
export function useRegisterPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: any) => {
      const { data } = await apiClient.put(`/financials/payments/${paymentData.id}`, {
        status: 'paid',
        paidDate: new Date().toISOString(),
        paymentMethod: paymentData.paymentMethod,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['case-financials'] });
    },
  });
}
```

---

## Utility Functions

### Date Utilities

```typescript
// src/lib/date-utils.ts
import { format, formatDistance, isPast, isFuture, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatEventDate(date: Date, allDay: boolean = false): string {
  if (allDay) {
    return format(date, 'dd MMMM yyyy', { locale: es });
  }
  return format(date, "dd MMMM yyyy 'a las' HH:mm", { locale: es });
}

export function formatRelativeDate(date: Date): string {
  return formatDistance(date, new Date(), {
    addSuffix: true,
    locale: es,
  });
}

export function isOverdue(date: Date): boolean {
  return isPast(date) && !isSameDay(date, new Date());
}

export function getDaysUntil(date: Date): number {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
```

### Currency Utilities

```typescript
// src/lib/currency-utils.ts
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
```

### Status Utilities

```typescript
// src/lib/status-utils.ts
import { TaskPriority, PaymentStatus } from '@/types';

export function getPriorityColor(priority: TaskPriority): string {
  const colors = {
    urgent: 'text-priority-urgent',
    high: 'text-priority-high',
    medium: 'text-priority-medium',
    low: 'text-priority-low',
  };
  return colors[priority];
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors = {
    paid: 'bg-financial-paid',
    pending: 'bg-financial-pending',
    overdue: 'bg-financial-overdue',
    partial: 'bg-financial-partial',
  };
  return colors[status];
}
```

---

## Common Patterns

### Loading States

```typescript
// Pattern 1: Using React Query isLoading
const { data, isLoading } = useCalendarEvents(currentMonth);

if (isLoading) {
  return <CalendarSkeleton />;
}

// Pattern 2: Skeleton components
export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
};
```

### Error Handling

```typescript
// Pattern: Error boundaries + toast notifications
const { mutate, error } = useCreateEvent();

const handleSubmit = async (data: any) => {
  try {
    await mutate(data);
    toast({
      title: 'Evento creado',
      description: 'El evento se ha creado exitosamente.',
    });
  } catch (error) {
    toast({
      title: 'Error',
      description: 'No se pudo crear el evento.',
      variant: 'destructive',
    });
  }
};
```

### Optimistic Updates

```typescript
// Pattern: Update UI immediately, rollback on error
const queryClient = useQueryClient();

const updateTaskStatus = useMutation({
  mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
    const { data } = await apiClient.put(`/tasks/${taskId}`, { status });
    return data;
  },
  onMutate: async ({ taskId, status }) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['tasks'] });

    // Snapshot previous value
    const previousTasks = queryClient.getQueryData(['tasks']);

    // Optimistically update
    queryClient.setQueryData(['tasks'], (old: any) => {
      return {
        ...old,
        tasks: old.tasks.map((task: Task) =>
          task.id === taskId ? { ...task, status } : task
        ),
      };
    });

    return { previousTasks };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousTasks) {
      queryClient.setQueryData(['tasks'], context.previousTasks);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

### Pagination

```typescript
// Pattern: Infinite scroll with React Query
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await apiClient.get('/notifications', {
        params: {
          limit: 20,
          offset: pageParam,
        },
      });
      return data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasMore) return undefined;
      return pages.length * 20;
    },
  });
}
```

### Search/Filtering

```typescript
// Pattern: Debounced search with React Query
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

export function useTaskSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'search', debouncedSearch],
    queryFn: async () => {
      const { data } = await apiClient.get('/tasks/search', {
        params: { q: debouncedSearch },
      });
      return data;
    },
    enabled: debouncedSearch.length > 2,
  });

  return { searchTerm, setSearchTerm, results: data, isLoading };
}
```

---

## Color Classes Reference

```typescript
// Priority Classes
'text-priority-urgent'   // Red-600 (#dc2626)
'text-priority-high'     // Orange-600 (#ea580c)
'text-priority-medium'   // Amber-500 (#f59e0b)
'text-priority-low'      // Gray-500 (#6b7280)

// Status Classes
'bg-status-pending'      // Amber (#f59e0b)
'bg-status-progress'     // Blue (#3b82f6)
'bg-status-completed'    // Green (#10b981)
'bg-status-blocked'      // Red (#ef4444)

// Event Type Classes
'bg-event-hearing'       // Purple (#8b5cf6)
'bg-event-deadline'      // Red (#ef4444)
'bg-event-meeting'       // Blue (#3b82f6)
'bg-event-task'          // Green (#10b981)
'bg-event-other'         // Gray (#6b7280)

// Financial Status Classes
'bg-financial-paid'      // Green (#10b981)
'bg-financial-pending'   // Amber (#f59e0b)
'bg-financial-overdue'   // Red (#ef4444)
'bg-financial-partial'   // Blue (#3b82f6)

// Brand Classes
'bg-legal-primary'       // Blue (#2563eb)
'bg-legal-success'       // Green (#10b981)
'bg-legal-warning'       // Amber (#f59e0b)
'bg-legal-error'         // Red (#ef4444)
```

---

## Icons Reference (Lucide React)

```typescript
// Calendar Icons
import { Calendar, Clock, MapPin, Users, Bell } from 'lucide-react';

// Task Icons
import { CheckCircle, Circle, AlertCircle, XCircle, Flag } from 'lucide-react';

// Notification Icons
import { Bell, Mail, MessageSquare, Info, AlertTriangle } from 'lucide-react';

// Financial Icons
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt } from 'lucide-react';

// Navigation Icons
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

// Action Icons
import { Plus, Edit, Trash2, Download, Upload, Filter, Search } from 'lucide-react';
```

---

This reference provides quick access to the most commonly used patterns and APIs in the Legal RAG System. For detailed implementation examples, refer to the IMPLEMENTATION_ROADMAP.md.
