# Guía de Referencia Rápida

## 🚀 Inicio Rápido

### Setup Local (5 minutos)

```bash
# 1. Clonar repo
git clone https://github.com/tu-org/legal-rag-system
cd legal-rag-system

# 2. Instalar dependencias
bun install
cd frontend && bun install && cd ..

# 3. Configurar .env
cp .env.example .env
# Editar .env con tus credenciales

# 4. Setup database
bun run prisma:migrate
bun run prisma:generate

# 5. Iniciar servicios
bun run dev          # Backend en :8000
cd frontend && bun run dev  # Frontend en :3000
```

## 📁 Estructura de Archivos

```
legal-rag-system/
├── src/              # Backend (Fastify + Bun)
├── frontend/         # Frontend (Next.js)
├── prisma/           # Database schema
├── database/         # SQL scripts & docs
├── docs/             # Documentación adicional
├── *.md              # Docs principales
└── package.json      # Backend deps
```

## 🔧 Comandos Útiles

### Backend

```bash
bun run dev              # Desarrollo con hot reload
bun run build            # Build para producción
bun run start            # Iniciar en producción
bun run prisma:migrate   # Ejecutar migraciones
bun run prisma:generate  # Generar cliente Prisma
bun run prisma:studio    # Abrir Prisma Studio
bun run seed:laws        # Seed documentos legales
bun run lint             # Linter
bun run format           # Formatter
bun test                 # Tests
```

### Frontend

```bash
cd frontend
bun run dev          # Desarrollo
bun run build        # Build
bun run start        # Producción
bun run lint         # Linter
bun test             # Tests unitarios
bun run test:e2e     # Tests E2E (Playwright)
```

## 📚 Documentación Esencial

| Documento | Cuándo Leerlo |
|-----------|---------------|
| [README.md](./README.md) | Primera vez |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Entender sistema |
| [MVP_GUIDE.md](./MVP_GUIDE.md) | Empezar a desarrollar |
| [TECH_STACK.md](./TECH_STACK.md) | Conocer tecnologías |
| [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) | Deploy a producción |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribuir |

## 🌐 URLs Importantes

### Desarrollo
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/documentation
- Prisma Studio: http://localhost:5555

### Producción (Ejemplo)
- Frontend: https://legal-rag.onrender.com
- Backend: https://legal-rag-api.onrender.com
- API Docs: https://legal-rag-api.onrender.com/documentation

## 🔑 Variables de Entorno

### Backend (.env)

```bash
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="your-secret"
OPENAI_API_KEY="sk-..."
STRIPE_SECRET_KEY="sk_test_..."
NODE_ENV="development"
PORT=8000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
GOOGLE_CLIENT_ID="..." # opcional
```

## 📊 Stack en 30 Segundos

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind
- **Backend**: Fastify, Bun, Prisma, TypeScript
- **Database**: PostgreSQL + pgvector, Redis
- **IA**: OpenAI GPT-4, Embeddings
- **Deploy**: Render

## 🐛 Troubleshooting Rápido

### Error: "Cannot find module"
```bash
bun install  # o npm install
```

### Error: "Prisma Client not generated"
```bash
bun run prisma:generate
```

### Error: "Connection timeout" (Database)
```bash
# Verificar DATABASE_URL en .env
# Asegurar que PostgreSQL está corriendo
```

### Error: "CORS policy"
```bash
# Verificar CORS_ORIGIN en backend .env
# Debe coincidir con NEXT_PUBLIC_API_URL
```

### Frontend no conecta con Backend
```bash
# Verificar que backend está corriendo
curl http://localhost:8000/health

# Verificar NEXT_PUBLIC_API_URL en .env.local
```

## 📞 Soporte

- **Docs**: [DOCS_INDEX.md](./DOCS_INDEX.md)
- **Issues**: GitHub Issues
- **Discord**: [Unirse](https://discord.gg/legal-rag)
- **Email**: support@poweria.com

## 🎯 Próximos Pasos

1. ✅ Leer README.md
2. ⬜ Setup local (seguir Quick Start arriba)
3. ⬜ Leer ARCHITECTURE.md
4. ⬜ Leer MVP_GUIDE.md
5. ⬜ Empezar Fase 1 del MVP

---

**Tip**: Guarda este archivo para referencia rápida durante el desarrollo.
