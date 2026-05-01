# Frontend Code Templates

Ready-to-use code templates for the Legal RAG System frontend.

---

## Table of Contents
1. [React Query Hooks](#react-query-hooks)
2. [Page Templates](#page-templates)
3. [Component Templates](#component-templates)
4. [Zustand Stores](#zustand-stores)
5. [Animation Variants](#animation-variants)

---

## React Query Hooks

### Template: use-cases.ts

**File**: `C:/Users/benito/poweria/legal/frontend/src/hooks/api/use-cases.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface Case {
  id: string;
  title: string;
  description?: string;
  legalType: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  clientName: string;
  caseNumber?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CaseFilters {
  legalType?: string;
  status?: string;
  priority?: string;
  search?: string;
}

export function useCases(filters?: CaseFilters) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Case[]>('/api/v1/cases', {
        params: filters
      });
      return data;
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Case>(`/api/v1/cases/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCase: Partial<Case>) => {
      const { data } = await apiClient.post<Case>('/api/v1/cases', newCase);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Case> }) => {
      const { data } = await apiClient.patch<Case>(`/api/v1/cases/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['cases', data.id] });
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/cases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
```

### Template: use-analytics.ts

**File**: `C:/Users/benito/poweria/legal/frontend/src/hooks/api/use-analytics.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface UsageAnalytics {
  totalQueries: number;
  totalDocuments: number;
  averageResponseTime: number;
  queriesByDay: Array<{ date: string; count: number }>;
  documentsByType: Array<{ type: string; count: number }>;
}

export interface QueryAnalytics {
  topQueries: Array<{ query: string; count: number }>;
  avgRelevanceScore: number;
  successRate: number;
}

export function useUsageAnalytics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'usage', startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get<UsageAnalytics>('/api/v1/analytics/usage', {
        params: { startDate, endDate },
      });
      return data;
    },
    staleTime: 60000, // 1 minute
  });
}

export function useQueryAnalytics(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['analytics', 'queries', dateRange],
    queryFn: async () => {
      const { data } = await apiClient.get<QueryAnalytics>('/api/v1/analytics/queries', {
        params: dateRange,
      });
      return data;
    },
    staleTime: 60000,
  });
}

export function useDocumentAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'documents'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/analytics/documents');
      return data;
    },
    staleTime: 300000, // 5 minutes
  });
}
```

### Template: use-ai-assistant.ts

**File**: `C:/Users/benito/poweria/legal/frontend/src/hooks/api/use-ai-assistant.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  references?: Array<{
    documentId: string;
    title: string;
    relevance: number;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export function useChatHistory(userId?: string) {
  return useQuery({
    queryKey: ['ai-assistant', 'history', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<ChatSession[]>('/api/v1/ai-assistant/history', {
        params: { userId },
      });
      return data;
    },
    staleTime: 30000,
  });
}

export function useChatSession(sessionId: string) {
  return useQuery({
    queryKey: ['ai-assistant', 'session', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<ChatSession>(`/api/v1/ai-assistant/session/${sessionId}`);
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      message,
      sessionId,
      context
    }: {
      message: string;
      sessionId?: string;
      context?: string[]
    }) => {
      const { data } = await apiClient.post<ChatMessage>('/api/v1/ai-assistant/chat', {
        message,
        sessionId,
        context,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['ai-assistant', 'session', variables.sessionId]
        });
      }
      queryClient.invalidateQueries({ queryKey: ['ai-assistant', 'history'] });
    },
  });
}
```

---

## Page Templates

### Template: Analytics Dashboard

**File**: `C:/Users/benito/poweria/legal/frontend/src/app/dashboard/analytics/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsageAnalytics, useQueryAnalytics } from '@/hooks/api/use-analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, FileText, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  });

  const { data: usageData, isLoading: usageLoading } = useUsageAnalytics(
    dateRange.start,
    dateRange.end
  );

  const { data: queryData, isLoading: queryLoading } = useQueryAnalytics(dateRange);

  if (usageLoading || queryLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your Legal RAG system usage
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData?.totalQueries || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData?.totalDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">In library</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData?.averageResponseTime?.toFixed(2) || '0'}ms
            </div>
            <p className="text-xs text-muted-foreground">System performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((queryData?.successRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Query success</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="queries">Top Queries</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Queries Over Time</CardTitle>
              <CardDescription>Daily query volume for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={usageData?.queriesByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4f46e5"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Queries</CardTitle>
              <CardDescription>Top 10 most searched queries</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={queryData?.topQueries?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="query" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents by Legal Type</CardTitle>
              <CardDescription>Distribution of documents across legal categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={usageData?.documentsByType || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Template: AI Assistant Chat

**File**: `C:/Users/benito/poweria/legal/frontend/src/app/dashboard/ai-assistant/page.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatHistory, useSendMessage } from '@/hooks/api/use-ai-assistant';
import { Loader2, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export default function AIAssistantPage() {
  const [message, setMessage] = useState('');
  const [currentSession, setCurrentSession] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: history } = useChatHistory();
  const { mutate: sendMessage, isPending } = useSendMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSend = () => {
    if (!message.trim() || isPending) return;

    sendMessage(
      {
        message: message.trim(),
        sessionId: currentSession,
      },
      {
        onSuccess: (data) => {
          setMessage('');
          if (!currentSession && data.sessionId) {
            setCurrentSession(data.sessionId);
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeSession = currentSession
    ? history?.find((s) => s.id === currentSession)
    : history?.[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-6">
      {/* Chat History Sidebar */}
      <Card className="w-64 flex-shrink-0">
        <CardHeader>
          <CardTitle>Chat History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setCurrentSession(undefined)}
          >
            New Chat
          </Button>
          <div className="space-y-1">
            {history?.map((session) => (
              <Button
                key={session.id}
                variant={currentSession === session.id ? 'secondary' : 'ghost'}
                className="w-full justify-start text-left"
                onClick={() => setCurrentSession(session.id)}
              >
                <span className="truncate">{session.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Legal AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {activeSession?.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm dark:prose-invert">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask a legal question..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none"
              rows={3}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isPending}
              size="icon"
              className="self-end"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Component Templates

### Template: DataTable Component

**File**: `C:/Users/benito/poweria/legal/frontend/src/components/ui/data-table.tsx`

```typescript
'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-4">
      {searchKey && (
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn(searchKey)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

## Zustand Stores

### Template: UI Store

**File**: `C:/Users/benito/poweria/legal/frontend/src/stores/useUIStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  modalStack: string[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      modalStack: [],
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      openModal: (modalId) =>
        set((state) => ({ modalStack: [...state.modalStack, modalId] })),
      closeModal: (modalId) =>
        set((state) => ({
          modalStack: state.modalStack.filter((id) => id !== modalId),
        })),
      closeAllModals: () => set({ modalStack: [] }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
```

---

## Animation Variants

### Template: Framer Motion Animations

**File**: `C:/Users/benito/poweria/legal/frontend/src/lib/animations.ts`

```typescript
import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { opacity: 0 }
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  },
  exit: { opacity: 0, y: 20 }
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  },
  exit: { opacity: 0, y: -20 }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 }
  },
  exit: { opacity: 0, scale: 0.9 }
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 }
  },
  exit: { opacity: 0, x: 50 }
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 }
  },
  exit: { opacity: 0, x: -50 }
};

// Card hover effect
export const cardHover = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
};

// Modal/Dialog animation
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.2 }
  }
};
```

---

## API Client Configuration

### Template: API Client

**File**: `C:/Users/benito/poweria/legal/frontend/src/lib/api-client.ts`

```typescript
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      // Unauthorized - redirect to login
      if (status === 401) {
        localStorage.removeItem('token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      // Forbidden
      if (status === 403) {
        console.error('Access forbidden');
      }

      // Server error
      if (status >= 500) {
        console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Helper for file uploads
export const uploadFile = async (
  url: string,
  file: File,
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData();
  formData.append('file', file);

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  };

  return apiClient.post(url, formData, config);
};
```

---

## Usage Examples

### Using the DataTable Component

```typescript
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Case>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'legalType',
    header: 'Legal Type',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];

function MyCasesPage() {
  const { data: cases } = useCases();

  return (
    <DataTable
      columns={columns}
      data={cases || []}
      searchKey="title"
      searchPlaceholder="Search cases..."
    />
  );
}
```

### Using Animations

```typescript
import { motion } from 'framer-motion';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations';

function AnimatedList({ items }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.div key={item.id} variants={staggerItem}>
          <Card>{item.title}</Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

This file provides complete, copy-paste ready code templates for all major components and patterns needed in the Legal RAG System frontend.
