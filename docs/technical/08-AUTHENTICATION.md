# Authentication & Authorization - Legal RAG System

## Overview

The system implements a comprehensive authentication and authorization framework using:
- **JWT (JSON Web Tokens)** for stateless authentication
- **Bcrypt** for password hashing
- **Role-Based Access Control (RBAC)** for authorization
- **Row-Level Security** for data isolation

## Authentication Flow

### Registration Process

```
┌──────┐  1. POST /auth/register      ┌──────────┐
│Client│────────────────────────────►│  Server  │
└──────┘  {email, password, name}    └────┬─────┘
                                          │
   ▲                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │ Validate Input│
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │ Check if Email│
   │                              │   Exists      │
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │  Hash Password│
   │                              │  (bcrypt)     │
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │ Create User in│
   │                              │   Database    │
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │  4. Return JWT + User Data   │ Generate JWT  │
   └──────────────────────────────┤  Token        │
                                  └───────────────┘
```

**Implementation** (`src/routes/auth.ts`):

```typescript
import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

app.post('/auth/register', async (request, reply) => {
  const { email, password, name } = registerSchema.parse(request.body);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return reply.code(400).send({ error: 'Email already exists' });
  }

  // Hash password (10 salt rounds)
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'user',
      planTier: 'free',
    },
  });

  // Generate JWT
  const token = app.jwt.sign({
    id: user.id,
    email: user.email,
  });

  return reply.code(201).send({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      planTier: user.planTier,
    },
    token,
  });
});
```

### Login Process

```
┌──────┐  1. POST /auth/login         ┌──────────┐
│Client│────────────────────────────►│  Server  │
└──────┘  {email, password}          └────┬─────┘
                                          │
   ▲                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │  Find User by │
   │                              │     Email     │
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │Verify Password│
   │                              │(bcrypt.compare│
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │  3. Return JWT + User Data   │ Generate JWT  │
   └──────────────────────────────┤  Token        │
                                  └───────────────┘
```

**Implementation**:

```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.post('/auth/login', async (request, reply) => {
  const { email, password } = loginSchema.parse(request.body);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return reply.code(400).send({ error: 'Invalid credentials' });
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    return reply.code(400).send({ error: 'Invalid credentials' });
  }

  // Generate JWT
  const token = app.jwt.sign({
    id: user.id,
    email: user.email,
  });

  return reply.send({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      planTier: user.planTier,
    },
    token,
  });
});
```

### Token Verification

```
┌──────┐  1. Request with Bearer Token┌──────────┐
│Client│────────────────────────────►│  Server  │
└──────┘  Authorization: Bearer {...} └────┬─────┘
                                          │
   ▲                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │ Extract Token │
   │                              │  from Header  │
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │ Verify JWT    │
   │                              │ Signature     │
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │                              │Check Expiration│
   │                              └───────┬───────┘
   │                                      │
   │                                      ▼
   │                              ┌───────────────┐
   │  3. Allow Request            │ Attach User   │
   └──────────────────────────────┤   to Request  │
                                  └───────────────┘
```

**Implementation**:

```typescript
// Fastify JWT Plugin Configuration
app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret',
});

// Authentication Decorator
app.decorate('authenticate', async function(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Usage in routes
app.get('/protected', {
  onRequest: [app.authenticate]
}, async (request, reply) => {
  const userId = request.user.id;
  // Handle authenticated request
});
```

## JWT Token Structure

### Token Payload

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1704672000,
  "exp": 1705276800
}
```

**Fields**:
- `id`: User UUID
- `email`: User email
- `iat`: Issued at timestamp (seconds since epoch)
- `exp`: Expiration timestamp (7 days from issuance)

### Token Format

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImlhdCI6MTcwNDY3MjAwMCwiZXhwIjoxNzA1Mjc2ODAwfQ.Xkn8pJ6vQ4Y3sZ9oL2mN1wR5tK7uV0bC8dE3fG4hH5i
```

**Parts** (separated by `.`):
1. **Header**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
   ```json
   {"alg":"HS256","typ":"JWT"}
   ```

2. **Payload**: `eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImlhdCI6MTcwNDY3MjAwMCwiZXhwIjoxNzA1Mjc2ODAwfQ`
   ```json
   {"id":"550e8400-e29b-41d4-a716-446655440000","email":"user@example.com","iat":1704672000,"exp":1705276800}
   ```

3. **Signature**: `Xkn8pJ6vQ4Y3sZ9oL2mN1wR5tK7uV0bC8dE3fG4hH5i`
   - HMAC-SHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)

### Token Lifecycle

```
Token Created (iat: 2025-01-01 00:00:00)
    │
    │ Valid for 7 days
    │
    ▼
Token Expires (exp: 2025-01-08 00:00:00)
    │
    │ Server rejects expired tokens
    │
    ▼
User must re-authenticate
```

## Password Security

### Hashing Algorithm: Bcrypt

**Configuration**:
- **Algorithm**: bcrypt
- **Salt Rounds**: 10
- **Work Factor**: 2^10 = 1024 iterations

**Why Bcrypt**:
1. **Adaptive**: Can increase cost factor over time
2. **Salted**: Unique salt per password
3. **Slow**: Intentionally computationally expensive (prevents brute force)
4. **Battle-tested**: Industry standard

### Hash Generation

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Example
const password = 'MySecurePass123';
const hash = await hashPassword(password);
// Output: $2b$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG
```

### Password Verification

```typescript
async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Example
const isValid = await verifyPassword('MySecurePass123', hash);
// Output: true
```

### Password Requirements

**Minimum Requirements**:
- Minimum length: 8 characters
- No maximum length (bcrypt handles truncation at 72 bytes)
- No complexity requirements (enforced at application level if needed)

**Recommended Guidelines**:
- Mix of uppercase and lowercase
- Include numbers
- Include special characters
- Avoid common patterns

## Authorization

### Role-Based Access Control (RBAC)

**Roles**:
1. **user** (default) - Regular users
2. **lawyer** - Legal professionals
3. **admin** - System administrators

**Role Assignment**:
```typescript
// Default role on registration
const user = await prisma.user.create({
  data: {
    email,
    passwordHash,
    role: 'user', // Default
  },
});

// Manual role upgrade (admin action)
await prisma.user.update({
  where: { id: userId },
  data: { role: 'lawyer' },
});
```

### Permission Matrix

| Resource | User | Lawyer | Admin |
|----------|------|--------|-------|
| Create Case | ✓ | ✓ | ✓ |
| View Own Cases | ✓ | ✓ | ✓ |
| View All Cases | ✗ | ✗ | ✓ |
| Upload Document | ✓ | ✓ | ✓ |
| Query Documents | ✓ | ✓ | ✓ |
| Upload Legal Docs | ✗ | ✗ | ✓ |
| Delete Legal Docs | ✗ | ✗ | ✓ |
| Manage Users | ✗ | ✗ | ✓ |
| View Analytics | ✗ | ✓ | ✓ |

### Admin-Only Routes

```typescript
function requireAdmin(request, reply, done) {
  const user = request.user;

  if (user.role !== 'admin') {
    return reply.code(403).send({
      error: 'Admin access required'
    });
  }

  done();
}

// Apply to routes
app.post('/legal-documents/upload', {
  onRequest: [app.authenticate, requireAdmin]
}, async (request, reply) => {
  // Only admins can access
});
```

### Row-Level Security

**Principle**: Users can only access their own data

**Implementation**:

```typescript
// Find cases - automatically filtered by userId
app.get('/cases', {
  onRequest: [app.authenticate]
}, async (request, reply) => {
  const userId = request.user.id;

  const cases = await prisma.case.findMany({
    where: { userId }, // Row-level filter
  });

  return reply.send({ cases });
});

// Get specific case - verify ownership
app.get('/cases/:id', {
  onRequest: [app.authenticate]
}, async (request, reply) => {
  const { id } = request.params;
  const userId = request.user.id;

  const caseDoc = await prisma.case.findFirst({
    where: {
      id,
      userId, // Ownership verification
    },
  });

  if (!caseDoc) {
    return reply.code(404).send({ error: 'Case not found' });
  }

  return reply.send(caseDoc);
});
```

## Session Management

### Client-Side Storage

**Storage Method**: `localStorage`
**Key**: `token`

```typescript
// Frontend: Store token after login
const response = await api.post('/auth/login', { email, password });
localStorage.setItem('token', response.data.token);

// Frontend: Retrieve token for requests
const token = localStorage.getItem('token');
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Frontend: Clear token on logout
localStorage.removeItem('token');
```

### Token Refresh

**Current Implementation**: No automatic refresh
**Token Lifetime**: 7 days
**Behavior**: User must re-login after expiration

**Future Enhancement**: Implement refresh tokens

```typescript
// Proposed refresh token flow
interface TokenPair {
  accessToken: string;   // Short-lived (15 min)
  refreshToken: string;  // Long-lived (7 days)
}

// Client refreshes access token before expiration
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await api.post('/auth/refresh', { refreshToken });
  localStorage.setItem('token', response.data.accessToken);
}
```

## Security Best Practices

### Implemented

1. **Password Hashing**: Bcrypt with 10 salt rounds
2. **HTTPS**: Enforced on production
3. **JWT Expiration**: 7-day token lifetime
4. **CORS**: Restricted to frontend domain
5. **Rate Limiting**: 100 req/15 min
6. **Input Validation**: Zod schemas
7. **SQL Injection Prevention**: Prisma ORM
8. **XSS Prevention**: React DOM escaping
9. **CSRF Protection**: SameSite cookies (when implemented)

### Recommended Enhancements

1. **Multi-Factor Authentication (MFA)**
   - TOTP (Time-based One-Time Password)
   - SMS verification
   - Email verification

2. **Account Lockout**
   - Lock account after 5 failed login attempts
   - Unlock after 15 minutes or via email

3. **Password Reset**
   - Secure password reset flow
   - Email verification
   - Token expiration (1 hour)

4. **Session Timeout**
   - Auto-logout after inactivity
   - Warning before timeout

5. **Audit Logging**
   - Log authentication events
   - Track failed login attempts
   - Monitor suspicious activity

## Common Security Threats & Mitigations

| Threat | Mitigation |
|--------|------------|
| **SQL Injection** | Prisma ORM (parameterized queries) |
| **XSS** | React DOM escaping, Content Security Policy |
| **CSRF** | SameSite cookies, CSRF tokens |
| **Brute Force** | Bcrypt (slow hashing), Rate limiting |
| **Session Hijacking** | HTTPS only, Secure cookies |
| **Password Leaks** | Bcrypt hashing, No plaintext storage |
| **JWT Tampering** | HMAC signature verification |
| **Man-in-the-Middle** | HTTPS/TLS encryption |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Classification**: Technical Documentation
