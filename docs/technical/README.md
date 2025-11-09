# Legal RAG System - Technical Documentation

## Overview

This directory contains comprehensive technical documentation for the Legal RAG System, covering all aspects of the application from architecture to deployment.

## Documentation Structure

### Core Documents

1. **01-PROJECT-OVERVIEW.md**
   - Executive summary
   - Project objectives and status
   - Technology stack overview
   - System architecture diagram
   - Key features and metrics
   - Future enhancements

2. **02-ARCHITECTURE.md**
   - System architecture patterns
   - Component hierarchy
   - Data flow diagrams
   - Design patterns
   - Network architecture
   - Scalability considerations
   - Performance optimization

3. **03-FRONTEND.md**
   - Next.js 15 architecture
   - React 19 components
   - State management (TanStack Query, Zustand)
   - API integration with Axios
   - UI components (shadcn/ui)
   - Routing and navigation
   - Styling system (Tailwind CSS)

4. **04-BACKEND-API.md**
   - Fastify server configuration
   - Complete API endpoint reference
   - Request/response formats
   - Authentication and authorization
   - Error handling
   - Rate limiting
   - Logging system

5. **05-DATABASE-SCHEMA.md**
   - Prisma schema definition
   - 6 database models in detail
   - Relationships and constraints
   - Migration strategy
   - Query optimization
   - Performance considerations

6. **06-RAG-SYSTEM.md**
   - Retrieval-Augmented Generation pipeline
   - Document processing workflow
   - Text chunking strategy
   - Vector embeddings (OpenAI ada-002)
   - Cosine similarity search
   - GPT-4 answer generation
   - Performance metrics

7. **07-DEPLOYMENT.md**
   - Render.com infrastructure
   - 4 service configuration
   - Environment variables
   - Database migrations
   - Monitoring and logging
   - Scaling strategies
   - Cost analysis

8. **08-AUTHENTICATION.md**
   - JWT token implementation
   - Bcrypt password hashing
   - Authentication flow diagrams
   - Role-based access control (RBAC)
   - Session management
   - Security best practices

9. **09-DEPENDENCIES.md**
   - Backend dependencies
   - Frontend dependencies
   - Version constraints
   - Security scanning
   - License compliance
   - Runtime requirements

10. **TECHNICAL-SUMMARY.html**
    - Interactive HTML summary
    - Visual statistics and charts
    - Technology stack badges
    - Complete system overview
    - Beautiful responsive design

## Quick Start

### View HTML Summary (Recommended)

Open `TECHNICAL-SUMMARY.html` in your browser for an interactive, visually appealing overview of the entire system.

### Read Markdown Documentation

All documents are in Markdown format and can be viewed in:
- GitHub
- VS Code
- Any Markdown viewer
- Text editor

## Document Organization

```
docs/technical/
├── README.md                    # This file
├── 01-PROJECT-OVERVIEW.md      # Start here
├── 02-ARCHITECTURE.md          # System design
├── 03-FRONTEND.md              # Frontend details
├── 04-BACKEND-API.md           # API reference
├── 05-DATABASE-SCHEMA.md       # Database docs
├── 06-RAG-SYSTEM.md            # AI/RAG pipeline
├── 07-DEPLOYMENT.md            # Infrastructure
├── 08-AUTHENTICATION.md        # Security
├── 09-DEPENDENCIES.md          # Packages
└── TECHNICAL-SUMMARY.html      # HTML summary
```

## Key Technologies

### Frontend
- Next.js 15 with App Router
- React 19
- TypeScript 5.3
- Tailwind CSS 3.4
- TanStack Query
- Axios

### Backend
- Fastify 4.26
- Prisma ORM 5.10
- PostgreSQL 14
- Redis
- OpenAI GPT-4

### Infrastructure
- Render.com (4 services)
- PostgreSQL (Render)
- Redis (Render)
- SSL/TLS encryption

## Statistics

- **6** Database Models
- **20+** API Endpoints
- **1536** Embedding Dimensions
- **4** Cloud Services
- **95%** Project Completion
- **100+** Dependencies

## Production URLs

- **Frontend**: https://legal-rag-frontend.onrender.com
- **Backend API**: https://legal-rag-api-qnew.onrender.com/api/v1
- **Health Check**: https://legal-rag-api-qnew.onrender.com/health

## For Developers

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- OpenAI API key

### Local Development
```bash
# Backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Documentation Updates

To update this documentation:
1. Edit the appropriate Markdown file
2. Regenerate HTML summary if needed
3. Update version numbers
4. Commit changes to Git

## Version Information

- **Documentation Version**: 1.0
- **Last Updated**: January 8, 2025
- **Project Status**: Production Ready (95% complete)

## Support

For technical questions or issues, refer to the detailed documentation in each file or contact the development team.

---

**Generated**: 2025-01-08
**Classification**: Technical Documentation
