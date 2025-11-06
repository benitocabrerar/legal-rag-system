# 🚀 Setup Final - Pasos Restantes

Tu proyecto está **95% configurado**. Solo necesitas ejecutar estos comandos finales localmente en tu máquina.

---

## ✅ Lo que YA está configurado

- ✅ Archivos `.env` con tus credenciales de Supabase
- ✅ `frontend/.env.local` configurado
- ✅ Supabase URL: `https://upqbwtgokdordetwjzuj.supabase.co`
- ✅ Database URL configurada
- ✅ Código completo del proyecto
- ✅ Dependencias en `package.json`

---

## 📋 Pasos Finales (5-10 minutos)

### 1️⃣ Instalar Dependencias

```bash
# Backend
cd /ruta/a/legal-rag-system
npm install
# o si prefieres bun:
# bun install

# Frontend
cd frontend
npm install
# o: bun install
```

### 2️⃣ Generar Cliente de Prisma

```bash
# Desde la raíz del proyecto
npx prisma generate
```

### 3️⃣ Ejecutar Migraciones (Crear Tablas)

```bash
npx prisma migrate dev --name init
```

Esto creará todas las tablas en tu base de datos de Supabase.

### 4️⃣ Ejecutar Funciones SQL Vectoriales

**Opción A: Supabase Dashboard (Recomendado)**

1. Ve a: https://supabase.com/dashboard/project/upqbwtgokdordetwjzuj
2. Click en **SQL Editor** en el menú izquierdo
3. Click en **New query**
4. Copia y pega TODO el contenido de: `database/supabase-functions.sql`
5. Click en **Run** (o presiona Ctrl+Enter)
6. Verifica que no haya errores

**Opción B: CLI (si tienes psql instalado)**

```bash
psql "postgresql://postgres:Benitomz2025$@db.upqbwtgokdordetwjzuj.supabase.co:5432/postgres" \
  -f database/supabase-functions.sql
```

### 5️⃣ Crear Buckets de Storage

**En Supabase Dashboard:**

1. Ve a: https://supabase.com/dashboard/project/upqbwtgokdordetwjzuj
2. Click en **Storage** en el menú izquierdo
3. Click en **Create a new bucket**

**Bucket 1: case-documents**
- Name: `case-documents`
- Public: ❌ NO (privado)
- File size limit: 10 MB
- Click "Create bucket"

**Bucket 2: avatars**
- Name: `avatars`
- Public: ✅ YES (público)
- File size limit: 2 MB
- Click "Create bucket"

### 6️⃣ Configurar Políticas RLS de Storage (Opcional pero Recomendado)

En **SQL Editor**, ejecuta:

```sql
-- Políticas para case-documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM cases c WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload to their cases"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM cases c WHERE c.user_id = auth.uid()
  )
);

-- Políticas para avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 7️⃣ Agregar OpenAI API Key (Obligatorio para RAG)

Edita `.env` y agrega tu OpenAI API Key:

```bash
OPENAI_API_KEY="sk-tu-api-key-aqui"
```

Obtén tu API key de: https://platform.openai.com/api-keys

---

## 🎯 Iniciar el Proyecto

### Terminal 1: Backend

```bash
npm run dev
# o: bun run dev
```

Deberías ver:
```
✅ Supabase connected
✅ Database connected
🚀 Server running on port 8000
📚 API Documentation: http://localhost:8000/documentation
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
# o: bun run dev
```

Deberías ver:
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
✓ Ready in 2.5s
```

---

## ✅ Verificar que Todo Funciona

### 1. Backend Health Check

Abre en tu navegador:
```
http://localhost:8000/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "database": true,
  "timestamp": "2025-11-06T..."
}
```

### 2. Frontend

Abre en tu navegador:
```
http://localhost:3000
```

Deberías ver la landing page del Legal RAG System.

### 3. Supabase Connection Test

En Node.js REPL:

```bash
node
```

```javascript
// Copiar y pegar esto:
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://upqbwtgokdordetwjzuj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcWJ3dGdva2RvcmRldHdqenVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDcwMDYsImV4cCI6MjA2ODg4MzAwNn0.KjYMrpBVkfDKAoba5AyUtkXdChElX7LCIty-8TqaPuI'
);

supabase.from('users').select('count').then(console.log);
// Debería mostrar: { data: null, count: 0, ... } o similar
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@supabase/supabase-js'"

```bash
npm install
```

### Error: "Prisma Client not generated"

```bash
npx prisma generate
```

### Error: "relation 'users' does not exist"

```bash
# Ejecutar migraciones
npx prisma migrate dev
```

### Error: "Failed to fetch"

Verifica que:
- Backend está corriendo en puerto 8000
- Frontend está corriendo en puerto 3000
- La Database URL en `.env` es correcta

### Error: "function match_legal_documents does not exist"

Ejecuta las funciones SQL desde Supabase Dashboard (paso 4 arriba).

---

## 📚 Documentación Adicional

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Guía completa de Supabase
- [README.md](./README.md) - Visión general del proyecto
- [SETUP.md](./SETUP.md) - Setup general

---

## 🎉 ¡Listo para Desarrollar!

Una vez completados estos pasos, tendrás:

- ✅ Base de datos PostgreSQL con pgvector
- ✅ Autenticación con Supabase
- ✅ Storage para documentos
- ✅ Funciones de búsqueda vectorial
- ✅ Backend API corriendo
- ✅ Frontend corriendo

**Siguiente paso:** Implementar las rutas de autenticación (login/register)

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa los logs de error
2. Verifica las credenciales en `.env`
3. Asegúrate de que Supabase está activo
4. Consulta SUPABASE_SETUP.md

**¡Todo está listo para empezar a desarrollar! 🚀**
