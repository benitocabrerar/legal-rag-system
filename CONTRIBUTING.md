# Guía de Contribución

## Bienvenido

Gracias por tu interés en contribuir a Legal RAG System.

## Código de Conducta

- Sé respetuoso
- Acepta críticas constructivas
- Enfócate en lo mejor para la comunidad

## Cómo Contribuir

### Setup Local

1. Fork el repositorio
2. Clone tu fork
```bash
git clone https://github.com/tu-usuario/legal-rag-system
cd legal-rag-system
```

3. Instala dependencias
```bash
bun install
cd frontend && bun install
```

4. Configura .env
```bash
cp .env.example .env
# Edita con tus credenciales
```

5. Setup database
```bash
bun run prisma:migrate
```

### Convenciones de Código

#### TypeScript
- Usar interfaces sobre types
- Preferir const sobre let
- Async/await sobre promises
- Typed functions

#### Naming
- Archivos: kebab-case (user-service.ts)
- Componentes: PascalCase (UserCard.tsx)
- Variables: camelCase (userName)
- Constants: UPPER_CASE (API_URL)

#### Formatting
```bash
bun run lint
bun run format
```

### Pull Requests

1. Crea branch desde main
```bash
git checkout -b feature/amazing-feature
```

2. Commit cambios
```bash
git commit -m "Add amazing feature"
```

3. Push y crea PR
```bash
git push origin feature/amazing-feature
```

4. Describe cambios claramente
5. Espera code review

### Testing

```bash
# Backend
bun test

# Frontend
cd frontend && bun test

# E2E
cd frontend && bun test:e2e
```

### Code Review

- Mínimo 1 approval
- Pasar CI/CD
- Sin conflictos
- Tests passing

## Reportar Bugs

Usa GitHub Issues con:
- Descripción clara
- Steps to reproduce
- Expected vs actual
- Screenshots si aplica

## Feature Requests

Abre issue con:
- Use case
- Propuesta de solución
- Alternativas consideradas

## Preguntas

- GitHub Discussions
- Discord
- Email: dev@poweria.com

Gracias por contribuir!
