# Guía de Desarrollo del MVP - Legal RAG System

## Tabla de Contenidos

- [Definición del MVP](#definición-del-mvp)
- [Funcionalidades Core](#funcionalidades-core)
- [Timeline de Desarrollo](#timeline-de-desarrollo)
- [Fases de Implementación](#fases-de-implementación)
- [Criterios de Éxito](#criterios-de-éxito)

## Definición del MVP

**Objetivo**: Lanzar un producto mínimo viable funcional en 10 semanas que permita a abogados gestionar casos, buscar en documentos legales de Ecuador, y obtener asistencia mediante chat con IA.

### Lo que INCLUYE el MVP

- Autenticación de usuarios
- Gestión básica de casos (CRUD)
- Carga de documentos (PDF/DOCX)
- Búsqueda semántica en leyes
- Chat RAG con contexto
- Base de datos con legislación ecuatoriana
- Plan gratuito + suscripción básica
- Deployment en Render

### Lo que NO INCLUYE el MVP

- OAuth (Google, Microsoft)
- Generador de documentos avanzado
- Múltiples países  
- Analytics avanzado
- Mobile app
- API pública
- Equipos/Colaboración

## Timeline de Desarrollo

| Fase | Semanas | Entregas |
|------|---------|----------|
| Fase 1: Infraestructura | 1-2 | Database, Backend base, Auth |
| Fase 2: Gestión de Casos | 3-4 | Cases CRUD, Document upload |
| Fase 3: Sistema RAG | 5-6 | Search, Chat, Embeddings |
| Fase 4: Frontend | 7-8 | UI completa, integración |
| Fase 5: Testing & Deploy | 9-10 | Tests, optimización, deploy |

## Criterios de Éxito

### Funcionales
- Usuario puede registrarse y hacer login
- Usuario puede crear y gestionar casos
- Usuario puede subir y procesar documentos
- Sistema retorna búsquedas relevantes
- Chat RAG funciona correctamente
- Suscripciones operativas

### No Funcionales
- Response time <2s para búsquedas
- Response time <5s para chat (first token)
- Uptime >99%
- Zero critical vulnerabilities

Ver documentación completa en los archivos del proyecto.
