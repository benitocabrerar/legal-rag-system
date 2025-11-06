# 🎉 Setup Final - Legal RAG System

## ✅ Estado Actual

La base de datos Supabase está **100% configurada**:
- ✅ 12 tablas creadas
- ✅ Extensiones habilitadas (uuid-ossp, vector, pg_trgm)
- ✅ Índices vectoriales IVFFlat (1536 dimensiones)
- ✅ 6 funciones de búsqueda semántica
- ✅ Índices full-text search en español

## 📋 Pasos Finales para Iniciar el Sistema

### 1. Crear Buckets de Storage (Si no lo has hecho)

Ve a: https://supabase.com/dashboard/project/kmpujsompmtfcudtxjah/storage/buckets

**Bucket 1: case-documents (privado)**
```
Name: case-documents
Public: No
File size limit: 10MB
Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

**Políticas RLS para case-documents:**
```sql
-- Política de INSERT
CREATE POLICY "Users can upload case documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case-documents');

-- Política de SELECT
CREATE POLICY "Users can read case documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'case-documents');
```

**Bucket 2: avatars (público)**
```
Name: avatars
Public: Yes
File size limit: 2MB
Allowed MIME types: image/jpeg, image/png, image/gif
```

### 2. Configurar Variables de Entorno

Ya tienes configurados los archivos `.env` y `frontend/.env.local`. Solo falta agregar tu **OpenAI API Key**.

**Edita el archivo `.env` en la raíz del proyecto:**
```bash
# Supabase (YA CONFIGURADO)
SUPABASE_URL="https://kmpujsompmtfcudtxjah.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.kmpujsompmtfcudtxjah.supabase.co:5432/postgres"

# OpenAI (NECESITAS AGREGAR ESTO)
OPENAI_API_KEY="sk-..."  # <-- Agrega tu API key aquí

# Opcional: Anthropic Claude
ANTHROPIC_API_KEY=""  # <-- Si quieres usar Claude también

# Configuración de embeddings (YA OPTIMIZADO)
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"

# Otros
NODE_ENV="development"
PORT="8000"
CORS_ORIGIN="http://localhost:3000"
```

**Nota:** El archivo `.env` ya está configurado con tus credenciales reales.

### 3. Instalar Dependencias

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 4. Generar Cliente Prisma

```bash
npx prisma generate
```

Esto genera el cliente de Prisma con los tipos TypeScript basados en tu schema.

### 5. Iniciar el Backend

```bash
npm run dev
```

Deberías ver:
```
✅ Database connection: OK
✅ Supabase connection: OK
✅ OpenAI API: OK
🚀 Server running on http://localhost:8000
📚 API docs: http://localhost:8000/documentation
```

### 6. Iniciar el Frontend (en otra terminal)

```bash
cd frontend
npm run dev
```

Deberías ver:
```
✓ Ready in 2.5s
➜ Local:   http://localhost:3000
```

## 🧪 Verificar que Todo Funciona

### 1. Verificar Backend Health

Abre en tu navegador:
```
http://localhost:8000/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T...",
  "database": "connected",
  "supabase": "connected"
}
```

### 2. Verificar API Docs

```
http://localhost:8000/documentation
```

Verás la documentación interactiva Swagger con todos los endpoints.

### 3. Verificar Frontend

```
http://localhost:3000
```

Deberías ver la página principal de la aplicación.

## 📊 Próximas Funcionalidades a Implementar

### Fase 2: Autenticación
- [ ] Endpoints de registro/login con Supabase Auth
- [ ] Protección de rutas en el frontend
- [ ] Middleware de autenticación en el backend

### Fase 3: Gestión de Casos
- [ ] CRUD de casos legales
- [ ] Subida de documentos a casos
- [ ] Procesamiento y extracción de texto (PDF/DOCX)
- [ ] Generación de embeddings para documentos

### Fase 4: RAG y Chat
- [ ] Endpoint de búsqueda semántica
- [ ] Endpoint de chat con contexto RAG
- [ ] Streaming de respuestas
- [ ] Historial de conversaciones

### Fase 5: Base de Conocimiento Legal
- [ ] Sistema de carga masiva de documentos legales
- [ ] Chunking y embedding automático
- [ ] Búsqueda avanzada con filtros

## 🎯 Comandos Útiles

```bash
# Backend
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar para producción
npm run start        # Iniciar producción
npm run lint         # Linter
npm run format       # Prettier

# Frontend
cd frontend
npm run dev          # Desarrollo
npm run build        # Compilar
npm run start        # Preview de producción
npm run lint         # Linter

# Prisma
npx prisma studio    # UI para ver la base de datos
npx prisma generate  # Regenerar cliente
npx prisma db pull   # Sincronizar schema desde DB
```

## 🔧 Troubleshooting

### Error: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### Error: "Connection refused" al conectar a Supabase
Verifica que las variables de entorno en `.env` estén correctas.

### Error: "OpenAI API key not set"
Agrega tu API key en `.env`:
```bash
OPENAI_API_KEY="sk-..."
```

### Puerto 8000 o 3000 ya en uso
```bash
# Cambiar puerto del backend (en .env)
PORT=8001

# Cambiar puerto del frontend
cd frontend
npm run dev -- -p 3001
```

## 📚 Recursos

- **Supabase Dashboard:** https://supabase.com/dashboard/project/kmpujsompmtfcudtxjah
- **Documentación Backend:** http://localhost:8000/documentation
- **Prisma Studio:** http://localhost:5555 (después de ejecutar `npx prisma studio`)

## 🎉 ¡Todo Listo!

El sistema está completamente configurado y listo para desarrollo. La arquitectura base está implementada con:

- ✅ Backend Fastify con TypeScript
- ✅ Frontend Next.js 15 con React 19
- ✅ Base de datos PostgreSQL con pgvector
- ✅ Supabase Auth + Storage
- ✅ Prisma ORM
- ✅ Sistema de búsqueda vectorial optimizado

**Comienza con la Fase 2: Autenticación** o explora el código existente para familiarizarte con la arquitectura.
