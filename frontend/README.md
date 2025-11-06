# Legal RAG System - Frontend

Frontend moderno construido con Next.js 15, React 19 y TypeScript.

## 🚀 Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Lenguaje**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **Auth**: NextAuth.js v5
- **Icons**: Lucide React
- **HTTP Client**: Axios

## 📦 Instalación

```bash
# Instalar dependencias
bun install

# Copiar variables de entorno
cp .env.example .env.local

# Editar variables de entorno
nano .env.local
```

## 🔧 Variables de Entorno

Crea un archivo `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# OAuth (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 🎯 Scripts

```bash
bun run dev          # Desarrollo (http://localhost:3000)
bun run build        # Build para producción
bun run start        # Servidor de producción
bun run lint         # Ejecutar ESLint
bun run type-check   # Verificar tipos TypeScript
bun run format       # Formatear código con Prettier
```

## 📁 Estructura de Directorios

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Grupo de rutas de autenticación
│   │   ├── (dashboard)/       # Grupo de rutas del dashboard
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Layout raíz
│   │   ├── page.tsx           # Página de inicio
│   │   └── globals.css        # Estilos globales
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes de UI base
│   │   ├── forms/            # Componentes de formularios
│   │   └── layout/           # Componentes de layout
│   ├── lib/                   # Utilidades y configuración
│   │   ├── api.ts            # Cliente HTTP
│   │   └── utils.ts          # Funciones de utilidad
│   └── types/                 # Definiciones de tipos TypeScript
│       └── index.ts
├── public/                    # Assets estáticos
├── next.config.js            # Configuración de Next.js
├── tailwind.config.ts        # Configuración de Tailwind
├── tsconfig.json             # Configuración de TypeScript
└── package.json
```

## 🎨 Desarrollo

### Crear un Nuevo Componente

```tsx
// src/components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg font-semibold',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground'
      )}
    >
      {children}
    </button>
  );
}
```

### Crear una Nueva Página

```tsx
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
    </div>
  );
}
```

### Usar el API Client

```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function CasesPage() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    async function fetchCases() {
      const response = await api.getCases();
      setCases(response.data);
    }
    fetchCases();
  }, []);

  return (
    <div>
      {cases.map((case) => (
        <div key={case.id}>{case.title}</div>
      ))}
    </div>
  );
}
```

## 🎨 Tailwind CSS

El proyecto usa Tailwind CSS con una configuración personalizada que incluye:

- Design tokens para colores
- Dark mode support
- Typography plugin
- Custom animations

### Usar Classes de Tailwind

```tsx
<div className="flex items-center justify-between p-4 border rounded-lg">
  <h2 className="text-xl font-bold">Título</h2>
  <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
    Acción
  </button>
</div>
```

## 🔐 Autenticación

El sistema usa NextAuth.js para autenticación:

```tsx
// Proteger una página
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default async function ProtectedPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return <div>Contenido protegido</div>;
}
```

## 📱 Responsive Design

Todos los componentes deben ser responsive:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Contenido */}
</div>
```

## 🧪 Testing

```bash
# Tests unitarios con Vitest
bun test

# Tests E2E con Playwright
bun run test:e2e
```

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)

## 🐛 Troubleshooting

### Error: "Module not found"
```bash
rm -rf node_modules .next
bun install
```

### Error: "Cannot read property of undefined"
```bash
# Verificar que el backend está corriendo
curl http://localhost:8000/health
```

### Hot Reload no funciona
```bash
# Limpiar cache de Next.js
rm -rf .next
bun run dev
```

---

Ver [../SETUP.md](../SETUP.md) para el setup completo del proyecto.
