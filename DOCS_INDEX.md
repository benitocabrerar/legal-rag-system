# Índice de Documentación - Legal RAG System

## Documentos Principales

### 1. README.md
**Archivo principal del repositorio**

Incluye:
- Descripción del proyecto
- Características principales
- Quick start guide
- Stack tecnológico resumen
- Enlaces a toda la documentación

👉 [Leer README.md](./README.md)

---

### 2. ARCHITECTURE.md
**Arquitectura completa del sistema**

Incluye:
- Diagramas de arquitectura
- Stack tecnológico detallado
- Componentes principales (Frontend, Backend, Database, RAG)
- Flujo de datos
- Decisiones técnicas
- Escalabilidad y seguridad

👉 [Leer ARCHITECTURE.md](./ARCHITECTURE.md)

---

### 3. MVP_GUIDE.md
**Guía de desarrollo del MVP**

Incluye:
- Definición del MVP
- Funcionalidades core
- Timeline de 10 semanas
- Fases de implementación detalladas
- Criterios de éxito
- Métricas del MVP

👉 [Leer MVP_GUIDE.md](./MVP_GUIDE.md)

---

### 4. RENDER_DEPLOYMENT.md
**Guía completa de deployment en Render**

Incluye:
- Setup de PostgreSQL con pgvector
- Configuración de Redis
- Deployment del backend
- Deployment del frontend
- Variables de entorno
- Troubleshooting común

👉 [Leer RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

---

### 5. DEVELOPMENT_PHASES.md
**Roadmap completo del proyecto**

Incluye:
- Fase 0: MVP (2-3 meses)
- Fase 1: Post-MVP (1 mes)
- Fase 2: Features avanzadas (2 meses)
- Fase 3: Multi-país (2 meses)
- Fase 4: Enterprise (2 meses)

👉 [Leer DEVELOPMENT_PHASES.md](./DEVELOPMENT_PHASES.md)

---

### 6. CONTRIBUTING.md
**Guía para contribuidores**

Incluye:
- Setup del entorno de desarrollo
- Convenciones de código
- Proceso de pull requests
- Testing requirements
- Code review guidelines

👉 [Leer CONTRIBUTING.md](./CONTRIBUTING.md)

---

### 7. TECH_STACK.md
**Stack tecnológico detallado**

Incluye:
- Frontend (Next.js, React, TypeScript)
- Backend (Fastify, Bun, Prisma)
- Database (PostgreSQL, pgvector, Redis)
- IA/ML (OpenAI, Claude, LangChain)
- DevOps (Render, GitHub Actions)
- Justificación de cada tecnología

👉 [Leer TECH_STACK.md](./TECH_STACK.md)

---

## Documentación por Componente

### Backend
- 📁 [src/](./src/) - Código fuente del backend
- 📄 [docs/API.md](./docs/API.md) - Documentación de API endpoints
- 📄 [package.json](./package.json) - Dependencias y scripts

### Frontend
- 📁 [frontend/](./frontend/) - Código fuente del frontend
- 📄 [frontend/README.md](./frontend/README.md) - Documentación del frontend
- 📄 [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - Arquitectura detallada

### Database
- 📁 [database/](./database/) - Scripts y documentación de BD
- 📄 [database/ARCHITECTURE.md](./database/ARCHITECTURE.md) - Arquitectura de base de datos
- 📄 [database/README.md](./database/README.md) - Guía de la base de datos
- 📄 [database_schema.sql](./database_schema.sql) - Schema SQL completo
- 📁 [prisma/](./prisma/) - Prisma schema y migraciones

### RAG Pipeline
- 📄 [rag_architecture.md](./rag_architecture.md) - Arquitectura del pipeline RAG
- 📄 [rag_pipeline.py](./rag_pipeline.py) - Implementación del pipeline
- 📄 [evaluation_metrics.py](./evaluation_metrics.py) - Métricas de evaluación

### Deployment
- 📄 [render.yaml](./render.yaml) - Configuración de Render
- 📄 [.env.example](./.env.example) - Ejemplo de variables de entorno

---

## Orden Recomendado de Lectura

### Para Nuevos Desarrolladores

1. **README.md** - Visión general del proyecto
2. **TECH_STACK.md** - Entender las tecnologías
3. **ARCHITECTURE.md** - Arquitectura del sistema
4. **MVP_GUIDE.md** - Plan de implementación
5. **CONTRIBUTING.md** - Cómo contribuir

### Para Product Managers

1. **README.md** - Descripción del producto
2. **MVP_GUIDE.md** - Alcance del MVP
3. **DEVELOPMENT_PHASES.md** - Roadmap completo
4. **database/ARCHITECTURE.md** - Modelo de datos

### Para DevOps/Infrastructure

1. **ARCHITECTURE.md** - Arquitectura del sistema
2. **RENDER_DEPLOYMENT.md** - Guía de deployment
3. **database/render-setup.md** - Setup de PostgreSQL
4. **render.yaml** - Configuración de servicios

### Para Investigadores/ML Engineers

1. **rag_architecture.md** - Pipeline RAG
2. **rag_pipeline.py** - Implementación
3. **evaluation_metrics.py** - Métricas
4. **database/ARCHITECTURE.md** - Estrategia de vectores

---

## Estructura de Archivos

```
legal-rag-system/
├── README.md                          # 📘 Inicio aquí
├── ARCHITECTURE.md                    # 🏗️ Arquitectura completa
├── MVP_GUIDE.md                       # 🎯 Guía del MVP
├── DEVELOPMENT_PHASES.md              # 🗺️ Roadmap
├── RENDER_DEPLOYMENT.md               # 🚀 Deployment
├── CONTRIBUTING.md                    # 🤝 Contribuir
├── TECH_STACK.md                      # 🔧 Stack tecnológico
├── DOCS_INDEX.md                      # 📇 Este archivo
│
├── docs/                              # 📚 Documentación adicional
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── database/                          # 🗄️ Database docs
│   ├── ARCHITECTURE.md
│   ├── README.md
│   ├── render-setup.md
│   └── DIAGRAMS.md
│
├── frontend/                          # 💻 Frontend docs
│   ├── README.md
│   ├── ARCHITECTURE_DIAGRAM.md
│   └── IMPLEMENTATION_GUIDE.md
│
├── src/                               # ⚙️ Backend source
├── prisma/                            # 🔷 Prisma schema
├── rag_pipeline.py                    # 🧠 RAG implementation
├── evaluation_metrics.py              # 📊 Métricas
├── requirements.txt                   # 🐍 Python deps
└── package.json                       # 📦 Node deps
```

---

## Recursos Externos

### Tutoriales
- [Next.js Documentation](https://nextjs.org/docs)
- [Fastify Documentation](https://fastify.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI Cookbook](https://cookbook.openai.com/)
- [Render Documentation](https://render.com/docs)

### Comunidad
- **GitHub**: [github.com/tu-org/legal-rag-system](https://github.com)
- **Discord**: [Únete a nuestra comunidad](https://discord.gg)
- **Email**: support@poweria.com

---

## Actualizaciones

| Fecha | Documento | Cambios |
|-------|-----------|---------|
| 2025-11-05 | Todos | Creación inicial |

---

**Mantenido por**: Equipo PowerIA
**Última actualización**: 2025-11-05
