# Setup Guide - Legal RAG System

Este documento te guiará a través del proceso completo de configuración del proyecto Legal RAG System.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Bun** 1.0+ o **Node.js** 18+
- **PostgreSQL** 14+ con extensión pgvector
- **Redis** 6+
- **Git**

### Instalación de Bun (recomendado)

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

## 🚀 Setup Rápido (5 minutos)

### 1. Clonar el repositorio

```bash
git clone https://github.com/benitocabrerar/legal-rag-system.git
cd legal-rag-system
```

### 2. Configurar Backend

```bash
# Instalar dependencias
bun install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus credenciales
nano .env  # o tu editor preferido
```

**Variables críticas a configurar en `.env`:**

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/legal_rag_dev"
OPENAI_API_KEY="sk-..."
JWT_SECRET="your-secret-key"
```

### 3. Configurar Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb legal_rag_dev

# Instalar extensiones
psql legal_rag_dev -f database/extensions.sql

# O manualmente:
psql legal_rag_dev
CREATE EXTENSION vector;
CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION pg_trgm;
\q
```

### 4. Ejecutar Migraciones

```bash
# Generar cliente de Prisma
bun run prisma:generate

# Ejecutar migraciones
bun run prisma:migrate

# (Opcional) Ver base de datos en Prisma Studio
bun run prisma:studio
```

### 5. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
bun install

# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local
nano .env.local
```

**Variables del frontend en `.env.local`:**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-nextauth-secret"
```

### 6. Iniciar Servicios

**Terminal 1 - Backend:**
```bash
bun run dev
# API corriendo en http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
bun run dev
# Frontend corriendo en http://localhost:3000
```

**Terminal 3 - Redis (si no está corriendo):**
```bash
redis-server
```

## ✅ Verificar Instalación

1. **Backend API**: http://localhost:8000
   - Deberías ver la información del API

2. **API Docs**: http://localhost:8000/documentation
   - Swagger UI con todos los endpoints

3. **Health Check**: http://localhost:8000/health
   - Debe mostrar `status: "healthy"`

4. **Frontend**: http://localhost:3000
   - Página de inicio del sistema

5. **Prisma Studio**: http://localhost:5555
   - Interfaz visual de la base de datos

## 🔧 Configuración Detallada

### PostgreSQL con pgvector

#### macOS
```bash
# Instalar PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Instalar pgvector
brew install pgvector

# Crear base de datos
createdb legal_rag_dev
psql legal_rag_dev -f database/extensions.sql
```

#### Ubuntu/Debian
```bash
# Instalar PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-14 postgresql-contrib

# Instalar pgvector
sudo apt install postgresql-14-pgvector

# Crear base de datos
sudo -u postgres createdb legal_rag_dev
sudo -u postgres psql legal_rag_dev -f database/extensions.sql
```

#### Docker
```bash
docker run -d \
  --name legal-rag-postgres \
  -e POSTGRES_DB=legal_rag_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  ankane/pgvector

# Instalar extensiones
docker exec -it legal-rag-postgres psql -U postgres -d legal_rag_dev -f /path/to/extensions.sql
```

### Redis

#### macOS
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### Docker
```bash
docker run -d \
  --name legal-rag-redis \
  -p 6379:6379 \
  redis:7-alpine
```

## 📦 Scripts Disponibles

### Backend

```bash
bun run dev              # Desarrollo con hot reload
bun run start            # Producción
bun run build            # Build para producción
bun run prisma:generate  # Generar cliente Prisma
bun run prisma:migrate   # Ejecutar migraciones
bun run prisma:studio    # Abrir Prisma Studio
bun run lint             # Ejecutar linter
bun run format           # Formatear código
bun test                 # Ejecutar tests
```

### Frontend

```bash
cd frontend
bun run dev          # Desarrollo
bun run build        # Build para producción
bun run start        # Servidor de producción
bun run lint         # Linter
bun run type-check   # Verificar tipos TypeScript
```

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules bun.lockb
bun install
```

### Error: "Prisma Client not generated"
```bash
bun run prisma:generate
```

### Error: "Connection timeout" (Database)
```bash
# Verificar que PostgreSQL está corriendo
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Verificar DATABASE_URL en .env
```

### Error: "pgvector extension not found"
```bash
# Reinstalar pgvector
brew reinstall pgvector  # macOS
sudo apt install postgresql-14-pgvector  # Linux

# Verificar instalación
psql legal_rag_dev
\dx  # Debe aparecer 'vector'
```

### Error: "Port already in use"
```bash
# Backend (puerto 8000)
lsof -ti:8000 | xargs kill -9

# Frontend (puerto 3000)
lsof -ti:3000 | xargs kill -9
```

### Error: "OpenAI API rate limit"
```bash
# Verificar que tu API key es válida
# Agregar billing en OpenAI dashboard
# Considerar usar caching para reducir llamadas
```

## 🌐 Deployment en Render

Ver [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) para instrucciones completas.

### Resumen rápido:

1. **PostgreSQL**: New → PostgreSQL → Install pgvector extension
2. **Redis**: New → Redis → Starter plan
3. **Backend**: New → Web Service → Connect repo → Configure env vars
4. **Frontend**: New → Static Site → Connect repo/frontend

## 📚 Próximos Pasos

Después de completar el setup:

1. **Leer la arquitectura**: [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Seguir el MVP Guide**: [MVP_GUIDE.md](./MVP_GUIDE.md)
3. **Explorar el código**:
   - Backend: `src/server.ts`
   - Frontend: `frontend/src/app/page.tsx`
   - Schema DB: `prisma/schema.prisma`

## 🆘 Soporte

- **Documentación**: [DOCS_INDEX.md](./DOCS_INDEX.md)
- **Issues**: [GitHub Issues](https://github.com/benitocabrerar/legal-rag-system/issues)
- **Quick Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

**¿Todo funcionando?** ¡Genial! Ahora puedes empezar a desarrollar. 🚀

**¿Problemas?** Revisa el troubleshooting o crea un issue en GitHub.
