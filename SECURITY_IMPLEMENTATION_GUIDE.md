# 🛡️ GUÍA DE IMPLEMENTACIÓN DE MEJORAS DE SEGURIDAD

## 📌 ACCIONES INMEDIATAS (0-24 HORAS)

### 1. Rotación de Credenciales

#### Paso 1: Generar nuevas credenciales
```bash
# Generar nuevo JWT secret
openssl rand -base64 64

# Resultado ejemplo:
# h3K8nD9sP2mQ5vT7wX1yZ4aB6cE8fG0jL3nM5pR7sU9vX1zB3dF5hJ7kN9qS2wY4
```

#### Paso 2: Actualizar variables de entorno
```env
# .env.production (NO COMMITEAR)
JWT_SECRET=h3K8nD9sP2mQ5vT7wX1yZ4aB6cE8fG0jL3nM5pR7sU9vX1zB3dF5hJ7kN9qS2wY4
JWT_REFRESH_SECRET=otra_clave_segura_generada
OPENAI_API_KEY=solicitar_nueva_en_openai_dashboard
SENDGRID_API_KEY=solicitar_nueva_en_sendgrid
```

#### Paso 3: Implementar Secrets Manager
```typescript
// src/config/secrets.ts
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<string> {
  try {
    const response = await client.getSecretValue({
      SecretId: secretName
    });
    return response.SecretString || '';
  } catch (error) {
    throw new Error(`Failed to retrieve secret: ${secretName}`);
  }
}

// Uso en server.ts
const JWT_SECRET = await getSecret('legal-rag/jwt-secret');
```

---

## 🔒 MEJORAS DE AUTENTICACIÓN

### 2. Implementar Refresh Tokens

```typescript
// src/services/auth-service.ts
import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis';

export class AuthService {
  static async generateTokens(userId: string, email: string, role: string) {
    const payload = { id: userId, email, role };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '15m',
      issuer: 'legal-rag',
      audience: 'legal-rag-api'
    });

    const refreshToken = jwt.sign(
      { id: userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Guardar refresh token en Redis
    await redis.setex(
      `refresh:${userId}`,
      7 * 24 * 60 * 60, // 7 días
      refreshToken
    );

    return { accessToken, refreshToken };
  }

  static async refreshAccessToken(refreshToken: string) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as any;

      // Verificar que el token existe en Redis
      const storedToken = await redis.get(`refresh:${payload.id}`);

      if (storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generar nuevo access token
      const user = await prisma.user.findUnique({
        where: { id: payload.id }
      });

      if (!user) throw new Error('User not found');

      return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async revokeTokens(userId: string) {
    await redis.del(`refresh:${userId}`);
    // Añadir access token a blacklist
    await redis.setex(`blacklist:${userId}`, 15 * 60, '1');
  }
}
```

### 3. Mejorar Política de Contraseñas

```typescript
// src/validators/password-validator.ts
import { z } from 'zod';
import zxcvbn from 'zxcvbn';

export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .refine((password) => {
    const result = zxcvbn(password);
    return result.score >= 3; // Requiere fortaleza mínima de 3/4
  }, 'Password is too weak')
  .refine((password) => {
    return /[A-Z]/.test(password);
  }, 'Password must contain at least one uppercase letter')
  .refine((password) => {
    return /[a-z]/.test(password);
  }, 'Password must contain at least one lowercase letter')
  .refine((password) => {
    return /[0-9]/.test(password);
  }, 'Password must contain at least one number')
  .refine((password) => {
    return /[^A-Za-z0-9]/.test(password);
  }, 'Password must contain at least one special character');

// Verificar contraseñas comprometidas
export async function checkCompromisedPassword(password: string): Promise<boolean> {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha1').update(password).digest('hex');
  const prefix = hash.substring(0, 5);
  const suffix = hash.substring(5).toUpperCase();

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const data = await response.text();

  return data.includes(suffix);
}
```

---

## 🛡️ SEGURIDAD DE API

### 4. Configurar CORS Restrictivo

```typescript
// src/config/cors.ts
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      'https://app.poweria-legal.com',
      'https://poweria-legal.com',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
    ].filter(Boolean);

    // Permitir requests sin origin (Postman, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 horas
};

// En server.ts
await app.register(cors, corsOptions);
```

### 5. Rate Limiting Granular

```typescript
// src/config/rate-limit.ts
export const rateLimitConfigs = {
  // Login endpoint - muy restrictivo
  login: {
    max: 5,
    timeWindow: '15 minutes',
    keyGenerator: (req: any) => req.ip + ':login',
    errorResponseBuilder: () => ({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 900 // segundos
    })
  },

  // API general
  api: {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req: any) => req.user?.id || req.ip
  },

  // Upload de documentos
  upload: {
    max: 10,
    timeWindow: '1 hour',
    keyGenerator: (req: any) => req.user?.id,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },

  // Búsquedas AI
  aiQuery: {
    max: 20,
    timeWindow: '1 hour',
    keyGenerator: (req: any) => req.user?.id,
    // Costo dinámico basado en tokens
    pointsConsumed: async (req: any) => {
      const estimatedTokens = req.body?.query?.length || 100;
      return Math.ceil(estimatedTokens / 100); // 1 punto por cada 100 tokens
    }
  }
};

// Aplicar en rutas
fastify.register(rateLimit, rateLimitConfigs.login);
```

### 6. Seguridad de Headers

```typescript
// src/plugins/security-headers.ts
import helmet from '@fastify/helmet';

export async function securityHeaders(fastify: FastifyInstance) {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.openai.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  });

  // Headers adicionales personalizados
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    reply.header('Surrogate-Control', 'no-store');
    return payload;
  });
}
```

---

## 🔐 ENCRIPTACIÓN DE DATOS

### 7. Encriptar Datos Sensibles

```typescript
// src/services/encryption-service.ts
import crypto from 'crypto';

export class EncryptionService {
  private static algorithm = 'aes-256-gcm';
  private static keyDerivation = 'pbkdf2';

  static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  static encrypt(text: string, masterKey: string): string {
    const salt = crypto.randomBytes(64);
    const key = this.deriveKey(masterKey, salt);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
  }

  static decrypt(encryptedData: string, masterKey: string): string {
    const bData = Buffer.from(encryptedData, 'base64');

    const salt = bData.slice(0, 64);
    const iv = bData.slice(64, 80);
    const authTag = bData.slice(80, 96);
    const encrypted = bData.slice(96);

    const key = this.deriveKey(masterKey, salt);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Encriptar campos específicos antes de guardar en DB
  static encryptUserData(userData: any) {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY!;
    const fieldsToEncrypt = ['ssn', 'creditCard', 'bankAccount'];

    const encrypted = { ...userData };

    fieldsToEncrypt.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field], masterKey);
      }
    });

    return encrypted;
  }
}

// Uso en Prisma middleware
prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'create') {
    params.args.data = EncryptionService.encryptUserData(params.args.data);
  }

  const result = await next(params);

  if (params.model === 'User' && params.action === 'findUnique') {
    // Desencriptar al recuperar
    return EncryptionService.decryptUserData(result);
  }

  return result;
});
```

---

## 📊 AUDITORÍA Y MONITOREO

### 8. Sistema de Auditoría Completo

```typescript
// src/services/audit-service.ts
export class AuditService {
  static async log(params: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          ...params,
          timestamp: new Date(),
          // Hash IP para privacidad
          ipAddress: params.ipAddress ?
            crypto.createHash('sha256').update(params.ipAddress).digest('hex') :
            null
        }
      });

      // Alertas en tiempo real para acciones críticas
      if (this.isCriticalAction(params.action)) {
        await this.sendSecurityAlert(params);
      }
    } catch (error) {
      console.error('Audit logging failed:', error);
      // No fallar la operación principal si el logging falla
    }
  }

  private static isCriticalAction(action: string): boolean {
    const criticalActions = [
      'DELETE_USER',
      'EXPORT_ALL_DATA',
      'CHANGE_ADMIN_ROLE',
      'ACCESS_DENIED',
      'MULTIPLE_FAILED_LOGINS',
      'SUSPICIOUS_ACTIVITY'
    ];

    return criticalActions.includes(action);
  }

  private static async sendSecurityAlert(params: any) {
    // Enviar alerta por email/Slack/etc
    await emailService.send({
      to: process.env.SECURITY_ALERT_EMAIL!,
      subject: `🚨 Security Alert: ${params.action}`,
      template: 'security-alert',
      data: params
    });
  }
}

// Middleware de auditoría
export function auditMiddleware(action: string, entity: string) {
  return async (request: any, reply: any) => {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;

    // Hook para capturar resultado
    reply.addHook('onSend', async (req, res, payload) => {
      success = res.statusCode < 400;
      errorMessage = res.statusCode >= 400 ? payload : undefined;

      await AuditService.log({
        userId: req.user?.id || 'anonymous',
        action,
        entity,
        entityId: req.params?.id,
        metadata: {
          method: req.method,
          path: req.url,
          query: req.query,
          responseTime: Date.now() - startTime,
          statusCode: res.statusCode
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success,
        errorMessage
      });

      return payload;
    });
  };
}
```

---

## 🛡️ VALIDACIÓN Y SANITIZACIÓN

### 9. Input Validation Exhaustiva

```typescript
// src/validators/input-sanitizer.ts
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export class InputSanitizer {
  // Sanitizar HTML
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  // Sanitizar para SQL (aunque usemos Prisma)
  static sanitizeSql(input: string): string {
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '')
      .replace(/sp_/gi, '');
  }

  // Sanitizar nombres de archivo
  static sanitizeFilename(filename: string): string {
    return validator.whitelist(
      filename.toLowerCase(),
      'abcdefghijklmnopqrstuvwxyz0123456789-_.'
    );
  }

  // Validar y sanitizar email
  static sanitizeEmail(email: string): string {
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }
    return validator.normalizeEmail(email) || email;
  }

  // Validar URL
  static sanitizeUrl(url: string): string {
    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      throw new Error('Invalid URL');
    }
    return url;
  }

  // Prevenir path traversal
  static sanitizePath(path: string): string {
    return path
      .replace(/\.\./g, '')
      .replace(/\/\//g, '/')
      .replace(/\\/g, '/');
  }
}

// Middleware de sanitización
export function sanitizationMiddleware(schema: z.ZodSchema) {
  return async (request: any, reply: any) => {
    try {
      // Validar con Zod
      const validated = schema.parse(request.body);

      // Sanitizar strings
      const sanitized = Object.entries(validated).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = InputSanitizer.sanitizeHtml(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      request.body = sanitized;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors
        });
      }
      throw error;
    }
  };
}
```

---

## 🔍 MONITOREO EN TIEMPO REAL

### 10. Sistema de Detección de Anomalías

```typescript
// src/services/anomaly-detection.ts
export class AnomalyDetector {
  private static readonly THRESHOLDS = {
    maxFailedLogins: 5,
    maxRequestsPerMinute: 60,
    maxDataExportSize: 10000,
    unusualAccessTime: { start: 0, end: 6 }, // 00:00 - 06:00
  };

  static async checkForAnomalies(userId: string, action: string, metadata: any) {
    const anomalies: string[] = [];

    // Verificar múltiples logins fallidos
    if (action === 'LOGIN_FAILED') {
      const recentFailures = await prisma.auditLog.count({
        where: {
          userId,
          action: 'LOGIN_FAILED',
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // últimos 15 min
          }
        }
      });

      if (recentFailures >= this.THRESHOLDS.maxFailedLogins) {
        anomalies.push('MULTIPLE_FAILED_LOGINS');
        await this.blockUser(userId, 'Too many failed login attempts');
      }
    }

    // Verificar acceso en horario inusual
    const hour = new Date().getHours();
    if (hour >= this.THRESHOLDS.unusualAccessTime.start &&
        hour < this.THRESHOLDS.unusualAccessTime.end) {
      anomalies.push('UNUSUAL_ACCESS_TIME');
    }

    // Verificar exportación masiva de datos
    if (action === 'EXPORT_DATA' && metadata.recordCount > this.THRESHOLDS.maxDataExportSize) {
      anomalies.push('LARGE_DATA_EXPORT');
    }

    // Verificar cambios de privilegios
    if (action === 'CHANGE_ROLE' && metadata.newRole === 'admin') {
      anomalies.push('PRIVILEGE_ESCALATION');
    }

    // Si hay anomalías, registrar y alertar
    if (anomalies.length > 0) {
      await this.handleAnomalies(userId, anomalies, metadata);
    }

    return anomalies;
  }

  private static async handleAnomalies(userId: string, anomalies: string[], metadata: any) {
    // Registrar en base de datos
    await prisma.securityIncident.create({
      data: {
        userId,
        anomalies,
        metadata,
        severity: this.calculateSeverity(anomalies),
        status: 'PENDING_REVIEW'
      }
    });

    // Notificar al equipo de seguridad
    await this.notifySecurityTeam(userId, anomalies, metadata);

    // Tomar acciones automáticas si es necesario
    if (anomalies.includes('MULTIPLE_FAILED_LOGINS')) {
      await this.enforceAdditional2FA(userId);
    }

    if (anomalies.includes('PRIVILEGE_ESCALATION')) {
      await this.requireAdminApproval(userId);
    }
  }

  private static calculateSeverity(anomalies: string[]): string {
    if (anomalies.includes('PRIVILEGE_ESCALATION') ||
        anomalies.includes('LARGE_DATA_EXPORT')) {
      return 'CRITICAL';
    }
    if (anomalies.includes('MULTIPLE_FAILED_LOGINS')) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }
}
```

---

## 📝 SCRIPTS DE IMPLEMENTACIÓN

### Script de Migración de Seguridad

```bash
#!/bin/bash
# security-migration.sh

echo "🔒 Starting Security Migration..."

# 1. Backup actual
echo "Creating backup..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Instalar dependencias de seguridad
echo "Installing security dependencies..."
npm install @fastify/helmet@latest
npm install @fastify/rate-limit@latest
npm install bcrypt@latest
npm install jsonwebtoken@latest
npm install ioredis@latest
npm install zxcvbn@latest
npm install validator@latest
npm install isomorphic-dompurify@latest

# 3. Actualizar dependencias vulnerables
echo "Fixing vulnerabilities..."
npm audit fix --force

# 4. Crear tablas de seguridad
echo "Creating security tables..."
npx prisma migrate dev --name add_security_tables

# 5. Configurar variables de entorno
echo "Setting up environment variables..."
if [ ! -f .env.production ]; then
  cp .env.example .env.production
  echo "⚠️  Please update .env.production with secure values"
fi

# 6. Generar secretos
echo "Generating secrets..."
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env.production
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)" >> .env.production
echo "ENCRYPTION_MASTER_KEY=$(openssl rand -base64 32)" >> .env.production

# 7. Configurar Redis
echo "Setting up Redis for session management..."
docker-compose up -d redis

# 8. Ejecutar tests de seguridad
echo "Running security tests..."
npm run test:security

echo "✅ Security migration completed!"
echo "⚠️  Remember to:"
echo "  1. Update all API keys in .env.production"
echo "  2. Configure AWS Secrets Manager"
echo "  3. Set up monitoring alerts"
echo "  4. Review and test all changes before deployment"
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Crítico (0-24 horas)
- [ ] Rotar todas las API keys
- [ ] Eliminar secretos del código
- [ ] Configurar variables de entorno seguras
- [ ] Actualizar dependencias vulnerables
- [ ] Implementar validación de entrada básica

### Fase 2: Alto (1-3 días)
- [ ] Implementar refresh tokens
- [ ] Configurar CORS restrictivo
- [ ] Añadir rate limiting granular
- [ ] Implementar encriptación de datos sensibles
- [ ] Configurar headers de seguridad

### Fase 3: Medio (1 semana)
- [ ] Sistema de auditoría completo
- [ ] Detección de anomalías
- [ ] Compliance GDPR
- [ ] Monitoreo en tiempo real
- [ ] Tests de penetración

### Fase 4: Mantenimiento Continuo
- [ ] Auditorías mensuales
- [ ] Actualización de dependencias
- [ ] Revisión de logs de seguridad
- [ ] Capacitación del equipo
- [ ] Simulacros de incidentes

---

## 📚 RECURSOS ADICIONALES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Fastify Security Best Practices](https://www.fastify.io/docs/latest/Guides/Security/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [GDPR Developer Guide](https://gdpr.eu/developer-guide/)

---

**Documento generado por:** Security Audit System
**Última actualización:** 13 de Noviembre, 2025
**Versión:** 1.0.0