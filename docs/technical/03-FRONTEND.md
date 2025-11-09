# Frontend Architecture - Legal RAG System

## Technology Stack

### Core Framework
- **Next.js 15.0.0** - React meta-framework with App Router
- **React 18.3.1** - UI component library
- **TypeScript 5.3.3** - Type-safe JavaScript

### State Management
- **TanStack Query 5.24.1** - Server state management
- **Zustand 4.5.0** - Lightweight client state
- **React Context API** - Authentication state

### Styling & UI
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **PostCSS 8.4.35** - CSS processing
- **shadcn/ui** - Pre-built UI components
- **Radix UI** - Accessible component primitives
- **Lucide React 0.330.0** - Icon library

### HTTP Client
- **Axios 1.6.7** - Promise-based HTTP client

### Build Tools
- **Next.js Compiler** - Built-in SWC-based compiler
- **TypeScript Compiler** - Type checking
- **ESLint 8.56.0** - Code linting

## Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout with providers
│   │   ├── page.tsx             # Landing page (/)
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   ├── dashboard/           # Protected dashboard
│   │   │   ├── page.tsx        # Cases list
│   │   │   └── cases/
│   │   │       └── [id]/       # Case detail page
│   │   └── admin/              # Admin panel
│   │       ├── legal-library/  # Legal documents
│   │       ├── bulk-upload/    # Bulk operations
│   │       ├── users/          # User management
│   │       ├── embeddings/     # Embeddings monitor
│   │       └── analytics/      # System analytics
│   │
│   ├── components/              # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── providers.tsx       # Context providers
│   │   └── auth-provider.tsx   # Auth context
│   │
│   ├── lib/                     # Utilities and configuration
│   │   ├── api/                # API client
│   │   │   └── client.ts       # Axios instance
│   │   └── utils.ts            # Helper functions
│   │
│   └── contexts/               # React contexts
│       └── auth-context.tsx    # Authentication context
│
├── public/                      # Static assets
├── .env.local                  # Environment variables
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Component Architecture

### Layout Hierarchy

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

// components/providers.tsx
export function Providers({ children }) {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

### Page Components

#### 1. **Landing Page** (`app/page.tsx`)
- Public marketing page
- Hero section with CTA
- Feature highlights
- Navigation to login/register

#### 2. **Authentication Pages**

```tsx
// app/login/page.tsx
- Email/password form
- Form validation
- JWT token storage
- Redirect on success

// app/register/page.tsx
- Registration form
- Password confirmation
- Email validation
- Auto-login after registration
```

#### 3. **Dashboard** (`app/dashboard/page.tsx`)

```tsx
Features:
- Cases list with search
- Create new case modal
- Case cards with metadata
- Status badges
- Loading states
- Empty states
```

#### 4. **Case Detail** (`app/dashboard/cases/[id]/page.tsx`)

```tsx
Components:
- Case header with edit
- Documents list
- Document upload
- Query interface
- Answer display
- Source citations
```

#### 5. **Admin Panel** (`app/admin/*`)

```tsx
Sections:
- Legal Library: CRUD for global legal docs
- Bulk Upload: Multiple file processing
- Users: User management (future)
- Embeddings: Monitor embedding status
- Analytics: System metrics (future)
```

## State Management

### 1. Server State (TanStack Query)

```typescript
// Example: Fetch cases
const { data: cases, isLoading } = useQuery({
  queryKey: ['cases'],
  queryFn: async () => {
    const response = await api.get('/cases');
    return response.data;
  },
});

// Example: Create case mutation
const createCaseMutation = useMutation({
  mutationFn: async (caseData) => {
    return api.post('/cases', caseData);
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['cases']);
  },
});
```

### 2. Client State (Zustand)

```typescript
// Example: UI state store
interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({
    sidebarOpen: !state.sidebarOpen
  })),
}));
```

### 3. Authentication State (Context)

```typescript
// contexts/auth-context.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## API Integration

### Axios Configuration

```typescript
// lib/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### API Modules

```typescript
// lib/api/cases.ts
export const casesAPI = {
  list: () => api.get('/cases'),
  get: (id: string) => api.get(`/cases/${id}`),
  create: (data: CreateCaseDTO) => api.post('/cases', data),
  update: (id: string, data: UpdateCaseDTO) =>
    api.patch(`/cases/${id}`, data),
  delete: (id: string) => api.delete(`/cases/${id}`),
};

// lib/api/documents.ts
export const documentsAPI = {
  upload: (caseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listByCase: (caseId: string) =>
    api.get(`/documents/case/${caseId}`),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// lib/api/query.ts
export const queryAPI = {
  ask: (caseId: string, query: string) =>
    api.post('/query', { caseId, query }),
  history: (caseId: string) =>
    api.get(`/query/history/${caseId}`),
};
```

## UI Components (shadcn/ui)

### Component Library

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### Used Components
- **Button** - Primary actions
- **Dialog** - Modals and confirmations
- **Input** - Form fields
- **Label** - Form labels
- **Card** - Content containers
- **Badge** - Status indicators
- **Toast** - Notifications
- **Dropdown** - Context menus
- **Table** - Data tables
- **Textarea** - Multi-line input

## Routing & Navigation

### App Router Structure

```typescript
app/
├── (public)              # Public routes group
│   ├── page.tsx         # /
│   ├── login/           # /login
│   └── register/        # /register
│
└── (protected)          # Protected routes group
    ├── dashboard/       # /dashboard
    │   ├── page.tsx    # Cases list
    │   └── cases/
    │       └── [id]/   # /dashboard/cases/:id
    └── admin/          # /admin/* (admin only)
```

### Navigation Components

```tsx
// Example: Protected route wrapper
export default function DashboardLayout({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

## Forms & Validation

### Form Handling

```tsx
// Example: Login form
const [formData, setFormData] = useState({
  email: '',
  password: '',
});
const [errors, setErrors] = useState({});
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    await login(formData.email, formData.password);
    router.push('/dashboard');
  } catch (error) {
    setErrors({ form: error.message });
  } finally {
    setIsLoading(false);
  }
};

return (
  <form onSubmit={handleSubmit}>
    <Input
      type="email"
      value={formData.email}
      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      required
    />
    <Button type="submit" disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Login'}
    </Button>
  </form>
);
```

## Styling System

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
      },
    },
  },
  plugins: [],
};
```

### CSS Variables

```css
/* globals.css */
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

## Performance Optimization

### Code Splitting
```tsx
// Dynamic imports for heavy components
const AdminPanel = dynamic(() => import('@/components/admin-panel'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  priority
/>
```

### Caching Strategy
```typescript
// React Query default config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
      cacheTime: 5 * 60 * 1000,    // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://legal-rag-api-qnew.onrender.com/api/v1
NEXTAUTH_URL=https://legal-rag-frontend.onrender.com
NEXTAUTH_SECRET=auto-generated-secret
```

## Build & Deployment

### Build Process
```bash
# Development
npm run dev          # Next.js dev server on port 3000

# Production
npm run build        # Create optimized production build
npm start            # Start production server
```

### Build Output
```
.next/
├── static/          # Static assets with content hashing
├── server/          # Server-side code
└── cache/           # Build cache
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## Testing Strategy (Future)

### Recommended Stack
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **MSW** - API mocking

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
