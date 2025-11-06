# Arquitectura Frontend - Sistema RAG Legal

## Stack Tecnológico

### Core
- **Framework**: Next.js 15 (App Router)
- **React**: 19+ (Server Components + Client Components)
- **TypeScript**: 5.x
- **Node**: 18+

### UI & Styling
- **CSS Framework**: Tailwind CSS 3.4+
- **Component Library**: shadcn/ui
- **Icons**: lucide-react
- **Animations**: framer-motion
- **Charts**: recharts

### State Management & Data Fetching
- **Server State**: TanStack Query (React Query) v5
- **Client State**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Real-time**: Socket.io-client (para chat)

### Authentication & Security
- **Auth**: NextAuth.js v5 (Auth.js)
- **Session Management**: JWT + HTTP-only cookies
- **Role-based Access**: Middleware + Route Guards

### File Handling & Editors
- **File Upload**: react-dropzone
- **PDF Viewer**: react-pdf
- **Rich Text Editor**: TipTap (extensible, mejor para documentos legales)
- **Syntax Highlighting**: prism-react-renderer

### Development Tools
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Testing**: Vitest + React Testing Library
- **E2E**: Playwright
- **Git Hooks**: Husky + lint-staged

### Deployment
- **Platform**: Render (Static Site + Node.js)
- **CDN**: Render CDN
- **Environment**: .env.local (dev) + Render Environment Variables

---

## Estructura de Carpetas

```
legal-frontend/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD
├── public/
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Route Group - Authentication
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Route Group - Protected Routes
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Main dashboard
│   │   │   ├── cases/
│   │   │   │   ├── page.tsx          # Cases list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Case detail
│   │   │   │       ├── documents/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── chat/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── analysis/
│   │   │   │           └── page.tsx
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx          # Document generator
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── subscription/
│   │   │   │   ├── page.tsx          # Subscription management
│   │   │   │   ├── plans/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── billing/
│   │   │   │       └── page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx          # Profile settings
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── team/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── preferences/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx            # Dashboard layout (sidebar, header)
│   │   ├── (marketing)/              # Route Group - Public Pages
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx
│   │   │   ├── features/
│   │   │   │   └── page.tsx
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   └── webhooks/
│   │   │       └── stripe/
│   │   │           └── route.ts
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── loading.tsx               # Global loading
│   │   ├── not-found.tsx             # 404 page
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   ├── components/                   # Shared components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── breadcrumb.tsx
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── protected-route.tsx
│   │   ├── cases/
│   │   │   ├── case-card.tsx
│   │   │   ├── case-list.tsx
│   │   │   ├── case-header.tsx
│   │   │   └── case-stats.tsx
│   │   ├── documents/
│   │   │   ├── document-uploader.tsx
│   │   │   ├── document-viewer.tsx
│   │   │   ├── document-list.tsx
│   │   │   ├── document-editor.tsx
│   │   │   └── template-selector.tsx
│   │   ├── chat/
│   │   │   ├── chat-interface.tsx
│   │   │   ├── chat-message.tsx
│   │   │   ├── chat-input.tsx
│   │   │   ├── chat-sidebar.tsx
│   │   │   └── suggested-prompts.tsx
│   │   ├── search/
│   │   │   ├── search-bar.tsx
│   │   │   ├── search-results.tsx
│   │   │   └── search-filters.tsx
│   │   ├── subscription/
│   │   │   ├── plan-card.tsx
│   │   │   ├── billing-history.tsx
│   │   │   └── upgrade-modal.tsx
│   │   └── shared/
│   │       ├── loading-spinner.tsx
│   │       ├── empty-state.tsx
│   │       ├── error-fallback.tsx
│   │       └── confirmation-dialog.tsx
│   ├── lib/                          # Utilities & configurations
│   │   ├── api/
│   │   │   ├── client.ts             # API client configuration
│   │   │   ├── endpoints.ts          # API endpoints
│   │   │   └── types.ts              # API types
│   │   ├── auth/
│   │   │   ├── auth.config.ts        # NextAuth configuration
│   │   │   ├── providers.ts          # Auth providers
│   │   │   └── session.ts            # Session helpers
│   │   ├── utils/
│   │   │   ├── cn.ts                 # Tailwind merge utility
│   │   │   ├── format.ts             # Formatters (date, currency)
│   │   │   ├── validation.ts         # Validation helpers
│   │   │   └── constants.ts          # App constants
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-cases.ts
│   │   │   ├── use-documents.ts
│   │   │   ├── use-chat.ts
│   │   │   ├── use-upload.ts
│   │   │   └── use-debounce.ts
│   │   └── store/
│   │       ├── auth-store.ts         # Zustand store
│   │       ├── chat-store.ts
│   │       └── ui-store.ts
│   ├── types/                        # TypeScript types
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── case.ts
│   │   ├── document.ts
│   │   ├── chat.ts
│   │   └── subscription.ts
│   └── middleware.ts                 # Next.js middleware (auth guard)
├── .env.local                        # Local environment variables
├── .env.example                      # Environment variables template
├── .eslintrc.json
├── .prettierrc
├── components.json                   # shadcn/ui config
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Rutas y Navegación

### Rutas Públicas
- `/` - Landing page
- `/pricing` - Planes y precios
- `/features` - Características del sistema
- `/about` - Acerca de nosotros
- `/login` - Inicio de sesión
- `/register` - Registro
- `/forgot-password` - Recuperar contraseña

### Rutas Protegidas (requieren autenticación)
- `/dashboard` - Dashboard principal
- `/cases` - Lista de casos
- `/cases/[id]` - Detalle de caso
- `/cases/[id]/documents` - Documentos del caso
- `/cases/[id]/chat` - Chat del caso
- `/cases/[id]/analysis` - Análisis del caso
- `/documents` - Generador de documentos
- `/documents/new` - Crear nuevo documento
- `/documents/[id]` - Ver documento
- `/documents/[id]/edit` - Editar documento
- `/subscription` - Gestión de suscripción
- `/subscription/plans` - Cambiar plan
- `/subscription/billing` - Facturación
- `/settings` - Configuración
- `/settings/profile` - Perfil
- `/settings/team` - Equipo (plan Team)
- `/settings/preferences` - Preferencias

### API Routes
- `/api/auth/[...nextauth]` - NextAuth endpoints
- `/api/upload` - Subida de archivos
- `/api/webhooks/stripe` - Webhooks de Stripe

---

## Componentes Principales

### 1. Layout Components

#### Root Layout (`app/layout.tsx`)
```typescript
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
```

#### Dashboard Layout (`app/(dashboard)/layout.tsx`)
- Sidebar con navegación
- Header con búsqueda, notificaciones, perfil
- Breadcrumbs
- Footer

#### Marketing Layout (`app/(marketing)/layout.tsx`)
- Header público
- Footer con links
- CTA sections

### 2. Feature Components

#### Chat Interface
- Real-time streaming responses
- Message history
- Context awareness (caso actual)
- Suggested prompts
- File attachments
- Code highlighting para leyes/artículos

#### Document Components
- **Uploader**: Drag & drop, multiple files, progress
- **Viewer**: PDF/DOCX preview, annotations
- **Editor**: Rich text con templates legales
- **Generator**: Template selection, AI-assisted drafting

#### Case Management
- Case cards con stats
- Filtros y búsqueda
- Status indicators
- Quick actions

### 3. Shared Components

#### UI Components (shadcn/ui)
- Button
- Card
- Dialog/Modal
- Dropdown Menu
- Form
- Input
- Select
- Table
- Tabs
- Toast
- Command (⌘K search)
- Popover
- Skeleton (loading states)

---

## Gestión de Estado

### 1. Server State (React Query)

**Configuración**:
```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**Custom Hooks**:
```typescript
// lib/hooks/use-cases.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { casesApi } from '@/lib/api/client'
import type { Case } from '@/types/case'

export function useCases() {
  return useQuery({
    queryKey: ['cases'],
    queryFn: () => casesApi.getAll(),
  })
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: () => casesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Case>) => casesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}
```

### 2. Client State (Zustand)

```typescript
// lib/store/chat-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatState {
  messages: Message[]
  isStreaming: boolean
  currentCaseId: string | null
  addMessage: (message: Message) => void
  setStreaming: (isStreaming: boolean) => void
  setCurrentCase: (caseId: string) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set) => ({
        messages: [],
        isStreaming: false,
        currentCaseId: null,
        addMessage: (message) =>
          set((state) => ({ messages: [...state.messages, message] })),
        setStreaming: (isStreaming) => set({ isStreaming }),
        setCurrentCase: (caseId) => set({ currentCaseId: caseId }),
        clearMessages: () => set({ messages: [] }),
      }),
      {
        name: 'chat-storage',
      }
    )
  )
)
```

### 3. Form State (React Hook Form + Zod)

```typescript
// components/cases/create-case-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const caseSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  clientName: z.string().min(1, 'Requerido'),
  caseType: z.enum(['civil', 'penal', 'laboral', 'mercantil']),
})

type CaseFormData = z.infer<typeof caseSchema>

export function CreateCaseForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
  })

  const onSubmit = (data: CaseFormData) => {
    // Handle submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

---

## Integración con API Backend

### API Client Configuration

```typescript
// lib/api/client.ts
import axios, { AxiosInstance } from 'axios'
import { getSession } from 'next-auth/react'

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor for adding auth token
  client.interceptors.request.use(
    async (config) => {
      const session = await getSession()
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized - redirect to login
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  return client
}

export const apiClient = createApiClient()
```

### API Endpoints

```typescript
// lib/api/endpoints.ts
import { apiClient } from './client'
import type { Case, Document, ChatMessage } from '@/types'

// Cases API
export const casesApi = {
  getAll: () => apiClient.get<Case[]>('/cases'),
  getById: (id: string) => apiClient.get<Case>(`/cases/${id}`),
  create: (data: Partial<Case>) => apiClient.post<Case>('/cases', data),
  update: (id: string, data: Partial<Case>) =>
    apiClient.patch<Case>(`/cases/${id}`, data),
  delete: (id: string) => apiClient.delete(`/cases/${id}`),
}

// Documents API
export const documentsApi = {
  upload: (caseId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`/cases/${caseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getAll: (caseId: string) =>
    apiClient.get<Document[]>(`/cases/${caseId}/documents`),
  delete: (documentId: string) =>
    apiClient.delete(`/documents/${documentId}`),
}

// Chat API
export const chatApi = {
  sendMessage: (caseId: string, message: string) =>
    apiClient.post<ChatMessage>(`/cases/${caseId}/chat`, { message }),
  getHistory: (caseId: string) =>
    apiClient.get<ChatMessage[]>(`/cases/${caseId}/chat/history`),
}

// Search API
export const searchApi = {
  semanticSearch: (query: string, caseId?: string) =>
    apiClient.post('/search', { query, case_id: caseId }),
}
```

---

## Autenticación

### NextAuth.js Configuration

```typescript
// lib/auth/auth.config.ts
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Call your backend API
        const res = await fetch(`${process.env.API_URL}/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: { 'Content-Type': 'application/json' },
        })

        const user = await res.json()

        if (res.ok && user) {
          return user
        }
        return null
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.user.role = token.role
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
```

### Middleware for Route Protection

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage =
      req.nextUrl.pathname.startsWith('/login') ||
      req.nextUrl.pathname.startsWith('/register')

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return null
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }

      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      )
    }
  },
  {
    callbacks: {
      async authorized() {
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/cases/:path*', '/documents/:path*', '/settings/:path*'],
}
```

---

## Performance Optimization

### 1. Code Splitting
- Route-based splitting (automatic with App Router)
- Dynamic imports for heavy components
- Lazy loading for modals and dialogs

### 2. Image Optimization
```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // for above-the-fold images
/>
```

### 3. Font Optimization
```typescript
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})
```

### 4. React Server Components
- Use Server Components by default
- Client Components only when needed (interactivity, hooks)
- Stream data with Suspense boundaries

### 5. Caching Strategy
- React Query for server state
- Local storage for user preferences
- Service Worker for offline support (PWA)

---

## Deployment en Render

### 1. Build Configuration

**package.json**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

### 2. Environment Variables (Render)

Variables requeridas:
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
NEXTAUTH_URL=https://tu-dominio.com
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=your-database-url (si usas prisma)
```

### 3. render.yaml (Blueprint)

```yaml
services:
  - type: web
    name: legal-rag-frontend
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        sync: false
      - key: NEXTAUTH_URL
        sync: false
      - key: NEXTAUTH_SECRET
        generateValue: true
```

### 4. next.config.mjs

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Optimized for Docker/Render
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For file uploads
    },
  },
}

export default nextConfig
```

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// __tests__/components/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### E2E Tests (Playwright)
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
```

---

## Security Best Practices

1. **XSS Protection**: Sanitize user inputs
2. **CSRF Protection**: NextAuth handles this
3. **Content Security Policy**: Configure in `next.config.mjs`
4. **Rate Limiting**: Implement in API routes
5. **Environment Variables**: Never commit `.env.local`
6. **Dependency Scanning**: Dependabot alerts
7. **HTTPS Only**: Enforce in production

---

## Accessibility

1. **Semantic HTML**: Use proper HTML5 elements
2. **ARIA Labels**: Add to interactive elements
3. **Keyboard Navigation**: Full keyboard support
4. **Color Contrast**: WCAG AA compliance
5. **Screen Reader Support**: Test with NVDA/JAWS
6. **Focus Management**: Visible focus indicators

---

## Next Steps for MVP

1. **Week 1**: Setup project, auth, basic layout
2. **Week 2**: Cases CRUD, document upload
3. **Week 3**: Chat interface, semantic search
4. **Week 4**: Document generator, subscription
5. **Week 5**: Testing, optimization, deployment

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [NextAuth.js](https://next-auth.js.org/)
- [Render Docs](https://render.com/docs)
