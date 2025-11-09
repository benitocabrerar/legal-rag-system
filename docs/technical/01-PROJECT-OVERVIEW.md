# Project Overview - Legal RAG System

## Executive Summary

The Legal RAG System is an AI-powered legal case management platform that combines document management with Retrieval-Augmented Generation (RAG) technology to provide intelligent legal assistance. The system enables lawyers and legal professionals to upload case documents, manage client cases, and query legal information using natural language.

## Project Metadata

| Property | Value |
|----------|-------|
| **Project Name** | Legal RAG System |
| **Version** | 1.0.0 |
| **Status** | Production-Ready (95% Complete) |
| **License** | Proprietary |
| **Platform** | Web Application (Full-Stack) |
| **Deployment** | Render.com |

## Core Objectives

1. **Document Management**: Centralized storage and organization of legal documents by case
2. **AI-Powered Search**: Semantic search using vector embeddings for document retrieval
3. **Intelligent Q&A**: Natural language querying with GPT-4 powered answers
4. **Case Organization**: Structured case management with client information
5. **Role-Based Access**: Multi-tier user system (User, Lawyer, Admin)
6. **Global Legal Library**: Admin-managed repository of legal reference documents

## Technology Stack Overview

### Frontend
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4
- **State Management**: TanStack Query + Zustand
- **UI Components**: shadcn/ui + Radix UI

### Backend
- **Framework**: Fastify 4.26
- **Language**: TypeScript 5.3
- **Runtime**: Node.js with tsx
- **ORM**: Prisma Client 5.10
- **AI Services**: OpenAI API (GPT-4 + Embeddings)

### Infrastructure
- **Database**: PostgreSQL 14+ (Render)
- **Cache**: Redis (Render)
- **Hosting**: Render.com (4 services)
- **Version Control**: Git

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│                     (React 19 + Next.js 15)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Fastify API Server                          │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────────┐ │
│  │   Auth   │  Cases   │Documents │  Query   │Legal Documents│ │
│  └──────────┴──────────┴──────────┴──────────┴───────────────┘ │
└────────┬─────────────────────────────┬────────────────┬─────────┘
         │                             │                │
         │                             │                │
    ┌────▼────┐                   ┌────▼────┐     ┌────▼────┐
    │PostgreSQL│                   │  Redis  │     │ OpenAI  │
    │         │                   │  Cache  │     │   API   │
    │ 6 Models│                   │         │     │GPT-4 +  │
    │         │                   │         │     │Embedding│
    └─────────┘                   └─────────┘     └─────────┘
```

## Key Features

### 1. User Management
- Secure registration and authentication
- JWT-based session management
- Role-based access control (User, Lawyer, Admin)
- Password encryption with bcrypt

### 2. Case Management
- Create and organize legal cases
- Track case status (active, pending, closed)
- Associate documents with cases
- Client information management

### 3. Document Processing
- Multi-format document upload (PDF, DOCX, TXT)
- Automatic text extraction
- Document chunking (1000 characters per chunk)
- Vector embedding generation using OpenAI

### 4. RAG Query System
- Natural language question input
- Semantic search using cosine similarity
- Context-aware answer generation with GPT-4
- Source citation and document references
- Maximum 5 relevant chunks per query

### 5. Global Legal Library
- Admin-only document upload
- Categorized legal references (laws, codes, regulations, jurisprudence)
- Centralized knowledge base
- Bulk document upload support

### 6. Admin Panel
- User management
- Legal document library management
- System analytics and embeddings monitoring
- Bulk operations support

## Data Flow

### Document Upload Flow
```
User Upload → Multipart Parser → Text Extraction → Chunking →
Embedding Generation (OpenAI) → Database Storage → Confirmation
```

### Query Flow
```
User Query → Embedding Generation → Vector Search (Cosine Similarity) →
Top 5 Chunks → Context Building → GPT-4 Processing →
Answer + Sources → User Display
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| **API Response Time** | < 200ms (avg) |
| **Query Processing** | 3-8 seconds (with GPT-4) |
| **Embedding Generation** | 1-2 seconds per document |
| **Database Queries** | < 100ms (indexed) |
| **Rate Limit** | 100 requests / 15 minutes |
| **Concurrent Users** | 50+ (Render Starter plan) |

## Security Features

- HTTPS enforced on production
- JWT token authentication
- Password hashing with bcrypt (10 rounds)
- CORS restrictions to frontend domain
- Rate limiting (100 req/15min)
- SQL injection prevention via Prisma ORM
- Input validation with Zod schemas
- Row-level security (userId filtering)

## Deployment Architecture

The system is deployed on Render.com with 4 interconnected services:

1. **PostgreSQL Database** - Persistent data storage
2. **Redis Cache** - Session and rate-limit storage
3. **Backend API** - Fastify REST API server
4. **Frontend** - Next.js server-side rendered application

All services communicate over Render's internal network with environment variables for configuration.

## Project Structure

```
legal/
├── src/                    # Backend source code
│   ├── server.ts          # Main Fastify server
│   └── routes/            # API route handlers
├── frontend/              # Next.js frontend
│   └── src/
│       ├── app/           # App router pages
│       ├── components/    # React components
│       ├── lib/           # Utilities and API client
│       └── contexts/      # React contexts
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Data models
│   └── migrations/       # SQL migration files
├── scripts/              # Utility scripts
│   └── add-admin.cjs     # Admin user creation
└── render.yaml           # Deployment configuration
```

## Current Status

### Completed Features (95%)
- ✅ User authentication system
- ✅ Case management CRUD
- ✅ Document upload and processing
- ✅ Vector embedding generation
- ✅ RAG query system
- ✅ Admin panel
- ✅ Global legal documents
- ✅ Frontend UI/UX
- ✅ Deployment on Render

### Pending Tasks (5%)
- ⏳ Database migration execution on production
- ⏳ Admin user creation in production
- ⏳ User acceptance testing
- ⏳ Performance optimization
- ⏳ Documentation completion

## Success Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| **System Uptime** | 99.5% | On track |
| **Query Accuracy** | 85%+ | TBD (needs testing) |
| **User Satisfaction** | 4.5/5 | TBD (needs feedback) |
| **Document Processing Speed** | < 30s/doc | Achieved |
| **API Availability** | 99.9% | On track |

## Future Enhancements

1. **Advanced Search**: Full-text search with Elasticsearch
2. **Document OCR**: Image-based document processing
3. **Multi-language Support**: Spanish, French, Portuguese
4. **Mobile App**: iOS and Android native apps
5. **Collaboration**: Real-time case sharing between users
6. **Analytics Dashboard**: Usage statistics and insights
7. **Payment Integration**: Stripe for premium tiers
8. **Email Notifications**: Case updates and document alerts

## Contact Information

For technical support or inquiries, contact the development team.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
