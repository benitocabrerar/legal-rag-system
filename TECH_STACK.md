# Stack Tecnológico Completo

## Frontend

### Core
| Tech | Versión | Justificación |
|------|---------|---------------|
| Next.js | 15+ | SSR, App Router, RSC |
| React | 19+ | Server Components |
| TypeScript | 5.x | Type safety |

### UI
| Tech | Justificación |
|------|---------------|
| Tailwind CSS | Utility-first, rápido |
| shadcn/ui | Accesible, customizable |
| Framer Motion | Animaciones fluidas |
| lucide-react | Iconos modernos |

### State Management
| Tech | Uso |
|------|-----|
| TanStack Query | Server state |
| Zustand | Client state |
| React Hook Form | Forms |
| Zod | Validation |

### Auth
- NextAuth.js v5
- JWT tokens
- OAuth providers

## Backend

### Core
| Tech | Versión | Justificación |
|------|---------|---------------|
| Bun | 1.0+ | 4x más rápido que Node |
| Fastify | 4.x | Alto rendimiento |
| Prisma | 5.x | Type-safe ORM |
| TypeScript | 5.x | Type safety |

### Plugins
- @fastify/jwt
- @fastify/cors
- @fastify/helmet
- @fastify/rate-limit
- @fastify/multipart

## Database

### Primary
| Tech | Versión | Justificación |
|------|---------|---------------|
| PostgreSQL | 14+ | Relacional + JSONB |
| pgvector | 0.5+ | Vector search |
| pg_trgm | - | Full-text search |

### Cache & Queue
| Tech | Uso |
|------|-----|
| Redis | Cache, sessions |
| BullMQ | Job queue |

## AI/ML

### Models
| Provider | Model | Uso |
|----------|-------|-----|
| OpenAI | GPT-4 Turbo | Generation |
| OpenAI | text-embedding-3-large | Embeddings |
| Anthropic | Claude 3.5 Sonnet | Alternativa |

### Framework
- LangChain (chains, agents)
- python-docx (parsing)
- PyMuPDF (PDF extraction)

## DevOps

### Hosting
- Render (Web + DB + Redis)
- Render CDN (assets)

### CI/CD
- GitHub Actions
- Automated tests
- Auto deploy

### Monitoring
- Render Logs
- Render Metrics
- Error tracking

## Justificaciones

### ¿Por qué Bun?
- 4x startup más rápido
- TypeScript nativo
- Compatible con npm
- Built-in bundler

### ¿Por qué pgvector?
- Sin costos extra vs Pinecone
- ACID transactions
- RLS nativo
- Suficiente para <1M vectors

### ¿Por qué Next.js App Router?
- Server Components (menos JS)
- Streaming
- Layouts anidados
- Mejor DX

### ¿Por qué Fastify?
- 3x más rápido que Express
- TypeScript first-class
- Validation built-in
- Extensible

## Comparaciones

### Bun vs Node.js
- Startup: 4x más rápido
- Memory: 30% menos
- Compatibility: 95%+

### pgvector vs Pinecone
- Cost: $0 vs $70/mes
- Latency: ~50ms vs ~10ms
- Scale: <10M vs unlimited

### Fastify vs Express
- RPS: 3x superior
- DX: Mejor TypeScript
- Ecosystem: Menor pero suficiente

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para más detalles.
