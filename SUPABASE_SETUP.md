# Supabase Setup Guide - Legal RAG System

Esta guía te llevará paso a paso para configurar Supabase para el proyecto Legal RAG System.

## 📋 Índice

1. [Crear Proyecto en Supabase](#1-crear-proyecto-en-supabase)
2. [Configurar Base de Datos](#2-configurar-base-de-datos)
3. [Ejecutar Migraciones](#3-ejecutar-migraciones)
4. [Configurar Storage Buckets](#4-configurar-storage-buckets)
5. [Configurar Autenticación](#5-configurar-autenticación)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [Verificar Setup](#7-verificar-setup)

---

## 1. Crear Proyecto en Supabase

### Paso 1.1: Crear cuenta
1. Ve a [https://supabase.com](https://supabase.com)
2. Click en "Start your project"
3. Regístrate con GitHub (recomendado) o email

### Paso 1.2: Crear nuevo proyecto
1. Click en "New Project"
2. Configura:
   - **Name**: `legal-rag-system` (o tu nombre preferido)
   - **Database Password**: Genera una contraseña segura (guárdala!)
   - **Region**: Selecciona la región más cercana (ej: `South America (São Paulo)`)
   - **Pricing Plan**: Free (suficiente para MVP)

3. Click "Create new project"
4. Espera 2-3 minutos mientras se crea el proyecto

---

## 2. Configurar Base de Datos

### Paso 2.1: Habilitar pgvector

Supabase ya tiene pgvector instalado, pero necesitas habilitarlo:

1. Ve a **SQL Editor** en el panel izquierdo
2. Click en "New query"
3. Ejecuta:

```sql
-- Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar instalación
SELECT * FROM pg_extension WHERE extname = 'vector';
```

4. Click "Run" (o presiona `Ctrl+Enter`)

### Paso 2.2: Ejecutar script de funciones vectoriales

1. En el SQL Editor, crea una nueva query
2. Copia y pega el contenido completo de `database/supabase-functions.sql`
3. Click "Run"
4. Verifica que no haya errores

---

## 3. Ejecutar Migraciones

### Opción A: Usando Prisma (Recomendado)

```bash
# 1. Obtener connection string de Supabase
# Dashboard > Settings > Database > Connection String > URI

# 2. Actualizar .env con el connection string
DATABASE_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"

# 3. Generar cliente de Prisma
bun run prisma:generate

# 4. Crear y aplicar migraciones
bun run prisma migrate dev --name init

# 5. Ver base de datos (opcional)
bun run prisma:studio
```

### Opción B: Usando Supabase CLI

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Iniciar sesión
supabase login

# 3. Vincular proyecto local
supabase link --project-ref [your-project-ref]

# 4. Push migraciones
supabase db push
```

---

## 4. Configurar Storage Buckets

### Paso 4.1: Crear buckets manualmente

1. Ve a **Storage** en el panel izquierdo
2. Click "Create a new bucket"

**Bucket 1: case-documents**
- **Name**: `case-documents`
- **Public bucket**: ❌ NO (privado)
- **File size limit**: 10 MB
- Click "Create bucket"

**Bucket 2: avatars**
- **Name**: `avatars`
- **Public bucket**: ✅ YES (público)
- **File size limit**: 2 MB
- Click "Create bucket"

### Paso 4.2: Configurar políticas RLS

Para `case-documents`:

```sql
-- Permitir a usuarios ver solo sus documentos
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM cases c WHERE c.user_id = auth.uid()
  )
);

-- Permitir a usuarios subir documentos a sus casos
CREATE POLICY "Users can upload to their cases"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM cases c WHERE c.user_id = auth.uid()
  )
);

-- Permitir a usuarios eliminar sus documentos
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM cases c WHERE c.user_id = auth.uid()
  )
);
```

Para `avatars`:

```sql
-- Permitir a todos ver avatares (público)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Permitir a usuarios actualizar solo su avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir a usuarios actualizar su avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 5. Configurar Autenticación

### Paso 5.1: Configuración básica

1. Ve a **Authentication** > **Providers**
2. Habilita **Email**:
   - ✅ Enable Email provider
   - ✅ Confirm email (recommended)
   - Email template: Puedes personalizar más tarde

### Paso 5.2: Configurar emails (opcional)

1. Ve a **Authentication** > **Email Templates**
2. Personaliza:
   - Confirm signup
   - Magic Link
   - Reset Password

### Paso 5.3: Habilitar OAuth (opcional, post-MVP)

Para Google OAuth:
1. Ve a **Authentication** > **Providers**
2. Habilita **Google**
3. Ingresa:
   - Client ID (de Google Cloud Console)
   - Client Secret
   - Redirect URL: `https://[your-project].supabase.co/auth/v1/callback`

---

## 6. Variables de Entorno

### Paso 6.1: Obtener credenciales

1. Ve a **Settings** > **API**
2. Copia:
   - **Project URL**: `https://[ref].supabase.co`
   - **anon public**: API Key que empieza con `eyJ...`
   - **service_role**: API Key secreta (¡no expongas!)

3. Ve a **Settings** > **Database** > **Connection string**
4. Copia la URI connection string

### Paso 6.2: Configurar Backend (.env)

```bash
# Supabase
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Database
DATABASE_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"

# OpenAI (obligatorio para RAG)
OPENAI_API_KEY="sk-..."

# Resto de configuración...
```

### Paso 6.3: Configurar Frontend (frontend/.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 7. Verificar Setup

### 7.1: Test de conexión (Backend)

```bash
# Iniciar backend
bun run dev

# Debería ver:
# ✅ Supabase connected
# ✅ Database connected
# 🚀 Server running on port 8000
```

### 7.2: Test de conexión (Frontend)

Crea un componente de prueba en `frontend/src/app/test/page.tsx`:

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function TestPage() {
  const [status, setStatus] = useState('Testing...');
  const supabase = createClient();

  useEffect(() => {
    async function test() {
      // Test auth
      const { data: { session } } = await supabase.auth.getSession();

      // Test database
      const { data, error } = await supabase.from('users').select('count');

      if (error) {
        setStatus(`❌ Error: ${error.message}`);
      } else {
        setStatus('✅ Supabase connection successful!');
      }
    }
    test();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Supabase Connection Test</h1>
      <p className="mt-4">{status}</p>
    </div>
  );
}
```

Visita: http://localhost:3000/test

### 7.3: Test de funciones vectoriales

En Supabase SQL Editor:

```sql
-- Test match_legal_documents function
SELECT * FROM match_legal_documents(
  query_embedding := array_fill(0.1, ARRAY[3072])::vector(3072),
  match_threshold := 0.5,
  match_count := 5
);

-- Debería retornar estructura correcta (aunque vacía al inicio)
```

---

## 🎉 ¡Listo!

Tu proyecto está configurado con Supabase. Ahora puedes:

1. ✅ Autenticar usuarios con Supabase Auth
2. ✅ Almacenar archivos en Supabase Storage
3. ✅ Hacer búsquedas vectoriales con pgvector
4. ✅ Usar Row Level Security para proteger datos

## 📚 Próximos Pasos

1. **Implementar Auth**: Ver `src/routes/auth.ts`
2. **Upload de documentos**: Ver `src/services/storage.service.ts`
3. **RAG Pipeline**: Ver `src/services/rag.service.ts`
4. **Frontend**: Ver `frontend/src/lib/supabase/`

## 🆘 Troubleshooting

### Error: "relation 'users' does not exist"
```bash
# Ejecutar migraciones
bun run prisma migrate dev
```

### Error: "extension 'vector' does not exist"
```sql
-- En Supabase SQL Editor
CREATE EXTENSION vector;
```

### Error: "Invalid API key"
```bash
# Verificar que copiaste las keys correctamente
# Asegúrate de usar SUPABASE_ANON_KEY en frontend
# y SUPABASE_SERVICE_ROLE_KEY en backend
```

### Error: "Failed to upload file"
```sql
-- Verificar que los buckets existan
SELECT * FROM storage.buckets;

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

---

## 📖 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [pgvector Docs](https://github.com/pgvector/pgvector)
- [Prisma + Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Next.js + Supabase Auth](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**¿Problemas?** Abre un issue en GitHub o revisa los logs de Supabase Dashboard > Logs
