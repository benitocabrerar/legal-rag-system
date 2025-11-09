# Dependencies Documentation - Legal RAG System

## Backend Dependencies

### Production Dependencies

#### Core Framework
```json
{
  "fastify": "^4.26.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/jwt": "^8.0.0",
  "@fastify/multipart": "^8.1.0",
  "@fastify/rate-limit": "^9.1.0"
}
```

- **fastify**: High-performance web framework (2x faster than Express)
- **@fastify/cors**: CORS plugin for cross-origin requests
- **@fastify/jwt**: JWT authentication plugin
- **@fastify/multipart**: File upload handling
- **@fastify/rate-limit**: Request rate limiting

#### Database & ORM
```json
{
  "@prisma/client": "^5.10.0",
  "prisma": "^5.10.0",
  "pg": "^8.16.3"
}
```

- **@prisma/client**: Type-safe database client
- **prisma**: Database toolkit and ORM
- **pg**: PostgreSQL driver

#### AI & ML
```json
{
  "openai": "^4.28.0",
  "langchain": "^0.1.25",
  "@langchain/openai": "^0.0.19",
  "@langchain/anthropic": "^0.1.3",
  "@pinecone-database/pinecone": "^2.0.0"
}
```

- **openai**: OpenAI API client (GPT-4, embeddings)
- **langchain**: AI application framework
- **@langchain/openai**: LangChain OpenAI integration
- **@langchain/anthropic**: LangChain Anthropic integration
- **@pinecone-database/pinecone**: Vector database client (optional)

#### Security & Validation
```json
{
  "bcrypt": "^5.1.1",
  "zod": "^3.22.4"
}
```

- **bcrypt**: Password hashing
- **zod**: Schema validation

#### Utilities
```json
{
  "dotenv": "^16.4.5",
  "redis": "^4.6.13",
  "tsx": "^4.7.1"
}
```

- **dotenv**: Environment variable management
- **redis**: Redis client for caching
- **tsx**: TypeScript execution runtime

### Development Dependencies
```json
{
  "@types/bcrypt": "^5.0.2",
  "@types/node": "^20.11.19",
  "bun-types": "^1.0.0",
  "typescript": "^5.3.3"
}
```

- **@types/bcrypt**: TypeScript types for bcrypt
- **@types/node**: Node.js TypeScript types
- **bun-types**: Bun runtime types
- **typescript**: TypeScript compiler

## Frontend Dependencies

### Production Dependencies

#### Core Framework
```json
{
  "next": "15.0.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

- **next**: React meta-framework with App Router
- **react**: UI component library
- **react-dom**: React DOM rendering

#### State Management
```json
{
  "@tanstack/react-query": "^5.24.1",
  "zustand": "^4.5.0"
}
```

- **@tanstack/react-query**: Server state management
- **zustand**: Lightweight client state

#### HTTP Client
```json
{
  "axios": "^1.6.7"
}
```

- **axios**: Promise-based HTTP client

#### Authentication
```json
{
  "next-auth": "^5.0.0-beta.4"
}
```

- **next-auth**: Authentication framework (optional, for future use)

#### Styling & UI
```json
{
  "tailwindcss": "^3.4.1",
  "postcss": "^8.4.35",
  "autoprefixer": "^10.4.17",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.2.1",
  "lucide-react": "^0.330.0"
}
```

- **tailwindcss**: Utility-first CSS framework
- **postcss**: CSS processing
- **autoprefixer**: Vendor prefixing
- **class-variance-authority**: Variant-based styling
- **clsx**: Conditional classNames
- **tailwind-merge**: Tailwind class merging
- **lucide-react**: Icon library

#### UI Components
```json
{
  "@radix-ui/react-toast": "^1.1.5",
  "@radix-ui/react-dialog": "^1.0.5"
}
```

- **@radix-ui/react-toast**: Toast notification primitives
- **@radix-ui/react-dialog**: Dialog/modal primitives

#### TypeScript
```json
{
  "typescript": "^5.3.3",
  "@types/node": "^20.11.19",
  "@types/react": "^18.2.56",
  "@types/react-dom": "^18.2.19"
}
```

### Development Dependencies
```json
{
  "eslint": "^8.56.0",
  "eslint-config-next": "15.0.0"
}
```

- **eslint**: Code linting
- **eslint-config-next**: Next.js ESLint configuration

## Dependency Security

### Known Vulnerabilities

**Check for vulnerabilities**:
```bash
# Backend
npm audit

# Frontend
cd frontend && npm audit
```

### Update Strategy

**Minor/Patch Updates**:
```bash
npm update
```

**Major Updates** (requires testing):
```bash
npm install package@latest
```

### Automated Scanning

**Dependabot** (GitHub):
- Automatic dependency updates
- Security vulnerability alerts
- Pull requests for updates

## Version Constraints

### Semantic Versioning

**Caret (`^`)**: Allow minor and patch updates
- `^4.26.0` → Allows 4.26.1, 4.27.0, but not 5.0.0
- Used for most dependencies

**Tilde (`~`)**: Allow only patch updates
- `~4.26.0` → Allows 4.26.1, but not 4.27.0
- Not currently used

**Exact**: No automatic updates
- `15.0.0` (Next.js) - Pinned to specific version

### Critical Dependencies

**Do NOT update without testing**:
1. **next**: Major framework changes
2. **react**: May break components
3. **@prisma/client**: May affect database operations
4. **openai**: API changes may break RAG system

## License Compliance

### License Summary

| Dependency | License | Commercial Use |
|------------|---------|----------------|
| fastify | MIT | ✓ |
| next | MIT | ✓ |
| react | MIT | ✓ |
| @prisma/client | Apache 2.0 | ✓ |
| openai | Apache 2.0 | ✓ |
| bcrypt | MIT | ✓ |
| zod | MIT | ✓ |
| tailwindcss | MIT | ✓ |

**All dependencies are MIT or Apache 2.0** - permissive licenses allowing commercial use.

## Package Managers

### Backend: npm
```bash
# Install dependencies
npm install

# Add new dependency
npm install package-name

# Remove dependency
npm uninstall package-name
```

### Frontend: npm
```bash
cd frontend
npm install
npm install package-name
npm uninstall package-name
```

### Alternative: Bun (optional)
```bash
# Install dependencies (faster)
bun install

# Run scripts
bun run dev
```

## Build Tools

### TypeScript Compiler

**Configuration** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Next.js Compiler

**Built-in SWC compiler**:
- Faster than Babel
- Automatic code splitting
- Image optimization
- Font optimization

## Runtime Requirements

### Node.js Version

**Minimum**: Node.js 18.x
**Recommended**: Node.js 20.x
**Current**: Node.js 20.11.19

**Check version**:
```bash
node --version
```

### PostgreSQL Version

**Minimum**: PostgreSQL 12
**Recommended**: PostgreSQL 14+
**Current**: PostgreSQL 14 (Render)

### Redis Version

**Minimum**: Redis 6.x
**Recommended**: Redis 7.x

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
