# Legal RAG System

<div align="center">

![Legal RAG System](https://img.shields.io/badge/Legal%20RAG-AI%20Powered-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-95%25%20Complete-yellow?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Live-brightgreen?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-Migration%20Required-orange?style=for-the-badge)

**Sistema de asistencia legal potenciado por IA utilizando Retrieval-Augmented Generation (RAG)**

[Características](#características-principales) •
[Inicio Rápido](#inicio-rápido) •
[Documentación](#documentación) •
[Contribuir](#contribución)

</div>

---

## 🚨 Estado Actual: Migración de Base de Datos Requerida

El sistema está **95% completado** y completamente desplegado en producción. Para completar la configuración:

### Opción 1: Guía Interactiva (Recomendada)
Abre `apply-migrations-guide.html` en tu navegador para instrucciones paso a paso con botones de copiar.

### Opción 2: Actualizar Build Command
1. Ve a: https://dashboard.render.com/web/srv-d46ibnfdiees73crug50/settings
2. Cambia el "Build Command" a:
   ```bash
   npm install && npx prisma generate && npx prisma migrate deploy
   ```

### Opción 3: Shell de Render
1. Abre: https://dashboard.render.com/web/srv-d46ibnfdiees73crug50
2. Click en la pestaña "Shell"
3. Ejecuta: `npx prisma migrate deploy`

---

## Descripción

Legal RAG System es una plataforma de asistencia legal inteligente que combina búsqueda semántica, procesamiento de lenguaje natural y generación aumentada por recuperación para ayudar a profesionales legales a:

- 📝 Organizar casos y documentos legales
- 🤖 Consultar documentos usando lenguaje natural
- 🔍 Obtener respuestas instantáneas con GPT-4
- 📊 Rastrear progreso de casos e historial
- 🔐 Autenticación segura de usuarios

## Características Principales

### ✨ Búsqueda Semántica Avanzada
- Búsqueda híbrida combinando similitud vectorial y full-text search
- Soporte para múltiples jurisdicciones (inicialmente Ecuador)
- Resultados contextualizados con citas legales precisas

### 📄 Generador de Documentos
- Templates legales predefinidos (contratos, demandas, escritos)
- Generación asistida por IA con validación legal
- Editor de texto enriquecido con formato legal

### 💬 Asistente Legal por Chat
- Conversaciones contextuales por caso
- Respuestas fundamentadas en documentos legales
- Historial de conversaciones persistente

### 🗂️ Gestión de Casos
- Organización completa de casos legales
- Carga y procesamiento automático de documentos
- Análisis inteligente de documentación

### 👥 Multi-tenancy
- Soporte para usuarios individuales y equipos
- Row-Level Security para aislamiento de datos
- Planes flexibles (Free, Basic, Professional, Team)

## Stack Tecnológico

### Backend
- **Runtime**: Bun (JavaScript runtime rápido)
- **Framework**: Fastify (API REST de alto rendimiento)
- **ORM**: Prisma (TypeScript-first ORM)
- **Base de Datos**: PostgreSQL 14+ con pgvector
- **Cache**: Redis
- **IA/ML**: OpenAI GPT-4, Claude 3.5 Sonnet, LangChain

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19 con TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query + Zustand
- **Auth**: NextAuth.js v5

### DevOps
- **Hosting**: Render (Web Services + PostgreSQL + Redis)
- **CI/CD**: GitHub Actions
- **Monitoring**: Render Metrics + Logs

## Inicio Rápido

### Prerrequisitos

- Node.js 18+ o Bun 1.0+
- PostgreSQL 14+ con extensión pgvector
- Redis 6+
- Cuenta de OpenAI/Anthropic con API key

### Instalación Local

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-org/legal-rag-system.git
cd legal-rag-system
```

2. **Instalar dependencias del backend**
```bash
# Con Bun (recomendado)
bun install

# O con npm
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. **Configurar la base de datos**
```bash
# Crear extensiones necesarias
psql $DATABASE_URL -f database/extensions.sql

# Ejecutar migraciones
bun run prisma:migrate

# Generar cliente de Prisma
bun run prisma:generate

# Seed inicial (opcional)
bun run seed:laws
```

5. **Iniciar el backend**
```bash
bun run dev
# API disponible en http://localhost:8000
```

6. **Configurar e iniciar el frontend**
```bash
cd frontend
bun install
cp .env.example .env.local
# Editar .env.local con la URL del backend

bun run dev
# Frontend disponible en http://localhost:3000
```

### Deployment en Render

Ver [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) para instrucciones completas de deployment en producción.

## Estructura del Proyecto

```
legal-rag-system/
├── src/                          # Backend (Fastify + Bun)
│   ├── server.ts                 # Entry point
│   ├── routes/                   # API routes
│   ├── services/                 # Business logic
│   ├── plugins/                  # Fastify plugins
│   └── utils/                    # Utilities
├── frontend/                     # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   ├── components/           # React components
│   │   ├── lib/                  # Utilities & hooks
│   │   └── types/                # TypeScript types
│   └── public/                   # Static assets
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma
│   └── migrations/
├── database/                     # Database scripts & docs
│   ├── schema.sql
│   ├── ARCHITECTURE.md
│   └── render-setup.md
├── docs/                         # Documentation
│   ├── API.md
│   └── ARCHITECTURE.md
├── rag_pipeline.py               # RAG pipeline (Python)
├── evaluation_metrics.py         # Evaluation tools
├── requirements.txt              # Python dependencies
└── package.json                  # Backend dependencies
```

## Documentación

### Documentos Principales

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura completa del sistema
- **[MVP_GUIDE.md](./MVP_GUIDE.md)** - Guía de desarrollo del MVP
- **[DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)** - Roadmap completo
- **[RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)** - Deployment en Render
- **[TECH_STACK.md](./TECH_STACK.md)** - Stack tecnológico detallado
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guía para contribuidores

### Documentación por Componente

- **Backend**: [docs/API.md](./docs/API.md)
- **Frontend**: [frontend/README.md](./frontend/README.md)
- **Database**: [database/ARCHITECTURE.md](./database/ARCHITECTURE.md)
- **RAG Pipeline**: [rag_architecture.md](./rag_architecture.md)

## Contribución

Agradecemos las contribuciones a Legal RAG System. Por favor, lee nuestra [Guía de Contribución](./CONTRIBUTING.md) para más detalles sobre:

- Configuración del entorno de desarrollo
- Estándares de código y convenciones
- Proceso de pull requests
- Testing y code review

### Proceso Rápido

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Seguridad

Si descubres una vulnerabilidad de seguridad, por favor envía un email a security@poweria.com en lugar de usar el issue tracker.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Soporte

- **Documentación**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/tu-org/legal-rag-system/issues)
- **Email**: support@poweria.com
- **Discord**: [Únete a nuestra comunidad](https://discord.gg/legal-rag)

## Roadmap

### Fase 0: MVP (2-3 meses) - En Desarrollo
- ✅ Arquitectura de base de datos
- ✅ Pipeline RAG básico
- ✅ API REST backend
- ✅ Frontend Next.js
- ⬜ Sistema de autenticación
- ⬜ Gestión de casos básica
- ⬜ Chat con RAG
- ⬜ Deployment en Render

### Fase 1: Post-MVP (1 mes)
- ⬜ Optimización de búsqueda
- ⬜ Templates de documentos avanzados
- ⬜ Métricas y analytics
- ⬜ Notificaciones

### Fase 2: Features Avanzadas (2 meses)
- ⬜ Análisis de precedentes
- ⬜ Generación de informes
- ⬜ Integración con tribunales
- ⬜ Mobile app

Ver [DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md) para el roadmap completo.

## Agradecimientos

- [OpenAI](https://openai.com/) por GPT-4 y embeddings
- [Anthropic](https://anthropic.com/) por Claude
- [Render](https://render.com/) por hosting confiable
- Comunidad open-source de LangChain, Prisma, Next.js, y Fastify

---

<div align="center">

**Construido con ❤️ por el equipo de PowerIA**

[Website](https://poweria.com) •
[Twitter](https://twitter.com/poweria) •
[LinkedIn](https://linkedin.com/company/poweria)

</div>
