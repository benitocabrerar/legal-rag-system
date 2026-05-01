/**
 * Security Headers Middleware
 * Addresses SEC-003 (CVSS 7.4) - Missing Security Headers
 *
 * Implements comprehensive security headers to protect against:
 * - Clickjacking (X-Frame-Options)
 * - XSS attacks (X-XSS-Protection, CSP)
 * - MIME sniffing (X-Content-Type-Options)
 * - Protocol downgrade attacks (HSTS)
 * - Information leakage (Referrer-Policy)
 * - Unauthorized feature access (Permissions-Policy)
 *
 * @module middleware/security-headers
 */

import { FastifyRequest, FastifyReply, FastifyInstance, HookHandlerDoneFunction } from 'fastify';

/**
 * Security header configuration options
 */
export interface SecurityHeadersConfig {
  /** Enable HSTS header (default: true in production) */
  enableHSTS?: boolean;
  /** HSTS max-age in seconds (default: 31536000 - 1 year) */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS (default: true) */
  hstsIncludeSubDomains?: boolean;
  /** Enable HSTS preload (default: true) */
  hstsPreload?: boolean;
  /** X-Frame-Options value (default: DENY) */
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  /** Enable X-XSS-Protection (default: true) */
  enableXSSProtection?: boolean;
  /** Custom CSP directives */
  cspDirectives?: Partial<CSPDirectives>;
  /** Enable CSP report-only mode (default: false) */
  cspReportOnly?: boolean;
  /** CSP report URI for violations */
  cspReportUri?: string;
  /** Custom Permissions-Policy directives */
  permissionsPolicy?: Partial<PermissionsPolicyDirectives>;
  /** Referrer-Policy value */
  referrerPolicy?: ReferrerPolicyValue;
  /** Additional custom headers */
  customHeaders?: Record<string, string>;
}

/**
 * Content Security Policy directives
 */
export interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'media-src': string[];
  'object-src': string[];
  'frame-src': string[];
  'frame-ancestors': string[];
  'form-action': string[];
  'base-uri': string[];
  'upgrade-insecure-requests': boolean;
  'block-all-mixed-content': boolean;
  'report-uri': string[];
}

/**
 * Permissions Policy directives
 */
export interface PermissionsPolicyDirectives {
  accelerometer: string[];
  'ambient-light-sensor': string[];
  autoplay: string[];
  battery: string[];
  camera: string[];
  'cross-origin-isolated': string[];
  'display-capture': string[];
  'document-domain': string[];
  'encrypted-media': string[];
  'execution-while-not-rendered': string[];
  'execution-while-out-of-viewport': string[];
  fullscreen: string[];
  geolocation: string[];
  gyroscope: string[];
  'keyboard-map': string[];
  magnetometer: string[];
  microphone: string[];
  midi: string[];
  'navigation-override': string[];
  payment: string[];
  'picture-in-picture': string[];
  'publickey-credentials-get': string[];
  'screen-wake-lock': string[];
  'sync-xhr': string[];
  usb: string[];
  'web-share': string[];
  'xr-spatial-tracking': string[];
}

/**
 * Valid Referrer-Policy values
 */
export type ReferrerPolicyValue =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

/**
 * Default CSP directives for a secure legal application
 */
const DEFAULT_CSP_DIRECTIVES: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for UI frameworks
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true,
  'report-uri': []
};

/**
 * Default Permissions Policy - restrictive by default
 */
const DEFAULT_PERMISSIONS_POLICY: Partial<PermissionsPolicyDirectives> = {
  accelerometer: [],
  'ambient-light-sensor': [],
  autoplay: [],
  battery: [],
  camera: [],
  'display-capture': [],
  'document-domain': [],
  'encrypted-media': [],
  fullscreen: ['self'],
  geolocation: [],
  gyroscope: [],
  magnetometer: [],
  microphone: [],
  midi: [],
  payment: [],
  'picture-in-picture': [],
  'publickey-credentials-get': [],
  usb: [],
  'xr-spatial-tracking': []
};

/**
 * Builds CSP header string from directives
 * @param directives - CSP directive configuration
 * @param reportUri - Optional report URI
 * @returns Formatted CSP header value
 */
function buildCSPHeader(directives: CSPDirectives, reportUri?: string): string {
  const parts: string[] = [];

  // Process array directives
  for (const [key, value] of Object.entries(directives)) {
    if (key === 'upgrade-insecure-requests' && value === true) {
      parts.push('upgrade-insecure-requests');
    } else if (key === 'block-all-mixed-content' && value === true) {
      parts.push('block-all-mixed-content');
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${key} ${value.join(' ')}`);
    } else if (Array.isArray(value) && value.length === 0 && key !== 'report-uri') {
      // Empty array means 'none' for most directives
      if (!['report-uri'].includes(key)) {
        // Skip 'none' for optional directives
      }
    }
  }

  // Add report-uri if provided
  if (reportUri) {
    parts.push(`report-uri ${reportUri}`);
  }

  return parts.join('; ');
}

/**
 * Builds Permissions-Policy header string from directives
 * @param directives - Permissions Policy directive configuration
 * @returns Formatted Permissions-Policy header value
 */
function buildPermissionsPolicyHeader(directives: Partial<PermissionsPolicyDirectives>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(directives)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        parts.push(`${key}=()`);
      } else if (value.includes('self')) {
        parts.push(`${key}=(self)`);
      } else if (value.includes('*')) {
        parts.push(`${key}=*`);
      } else {
        const origins = value.map(v => `"${v}"`).join(' ');
        parts.push(`${key}=(${origins})`);
      }
    }
  }

  return parts.join(', ');
}

/**
 * Gets environment-aware configuration
 * @param config - User provided configuration
 * @returns Merged configuration with defaults
 */
function getEnvironmentConfig(config: SecurityHeadersConfig): SecurityHeadersConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    enableHSTS: config.enableHSTS ?? isProduction,
    hstsMaxAge: config.hstsMaxAge ?? 31536000, // 1 year
    hstsIncludeSubDomains: config.hstsIncludeSubDomains ?? true,
    hstsPreload: config.hstsPreload ?? true,
    frameOptions: config.frameOptions ?? 'DENY',
    enableXSSProtection: config.enableXSSProtection ?? true,
    cspDirectives: config.cspDirectives,
    cspReportOnly: config.cspReportOnly ?? false,
    cspReportUri: config.cspReportUri,
    permissionsPolicy: config.permissionsPolicy,
    referrerPolicy: config.referrerPolicy ?? 'strict-origin-when-cross-origin',
    customHeaders: config.customHeaders
  };
}

/**
 * Security Headers Middleware Hook
 * Adds comprehensive security headers to all responses
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @param config - Security headers configuration
 */
export function securityHeadersHook(
  request: FastifyRequest,
  reply: FastifyReply,
  config: SecurityHeadersConfig = {}
): void {
  const mergedConfig = getEnvironmentConfig(config);

  // HSTS - HTTP Strict Transport Security
  // Protects against protocol downgrade attacks and cookie hijacking
  if (mergedConfig.enableHSTS) {
    let hstsValue = `max-age=${mergedConfig.hstsMaxAge}`;
    if (mergedConfig.hstsIncludeSubDomains) {
      hstsValue += '; includeSubDomains';
    }
    if (mergedConfig.hstsPreload) {
      hstsValue += '; preload';
    }
    reply.header('Strict-Transport-Security', hstsValue);
  }

  // X-Frame-Options - Clickjacking protection
  // DENY prevents any framing, SAMEORIGIN allows same-origin framing
  reply.header('X-Frame-Options', mergedConfig.frameOptions || 'DENY');

  // X-Content-Type-Options - MIME sniffing protection
  // Prevents browsers from interpreting files as different MIME types
  reply.header('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection - XSS filter (legacy but still useful)
  // mode=block prevents rendering if XSS attack is detected
  if (mergedConfig.enableXSSProtection) {
    reply.header('X-XSS-Protection', '1; mode=block');
  }

  // Content-Security-Policy - Primary XSS/injection protection
  const cspDirectives: CSPDirectives = {
    ...DEFAULT_CSP_DIRECTIVES,
    ...mergedConfig.cspDirectives
  };

  // Add API connect-src for the current environment
  const apiUrl = process.env.API_URL || process.env.BACKEND_URL;
  if (apiUrl && !cspDirectives['connect-src'].includes(apiUrl)) {
    cspDirectives['connect-src'] = [...cspDirectives['connect-src'], apiUrl];
  }

  const cspHeader = buildCSPHeader(cspDirectives, mergedConfig.cspReportUri);
  const cspHeaderName = mergedConfig.cspReportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';
  reply.header(cspHeaderName, cspHeader);

  // Referrer-Policy - Controls referrer information
  reply.header('Referrer-Policy', mergedConfig.referrerPolicy || 'strict-origin-when-cross-origin');

  // Permissions-Policy - Controls browser features
  const permissionsPolicy: Partial<PermissionsPolicyDirectives> = {
    ...DEFAULT_PERMISSIONS_POLICY,
    ...mergedConfig.permissionsPolicy
  };
  reply.header('Permissions-Policy', buildPermissionsPolicyHeader(permissionsPolicy));

  // X-Permitted-Cross-Domain-Policies - Flash/PDF cross-domain protection
  reply.header('X-Permitted-Cross-Domain-Policies', 'none');

  // X-Download-Options - IE download protection
  reply.header('X-Download-Options', 'noopen');

  // X-DNS-Prefetch-Control - Control DNS prefetching
  reply.header('X-DNS-Prefetch-Control', 'off');

  // Cache-Control for sensitive responses
  // Applied to API responses to prevent caching of sensitive data
  if (request.url.startsWith('/api/')) {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    reply.header('Surrogate-Control', 'no-store');
  }

  // Apply custom headers if provided
  if (mergedConfig.customHeaders) {
    for (const [header, value] of Object.entries(mergedConfig.customHeaders)) {
      reply.header(header, value);
    }
  }
}

/**
 * Creates a Fastify plugin for security headers
 * @param config - Security headers configuration
 * @returns Fastify plugin function
 */
export function createSecurityHeadersPlugin(config: SecurityHeadersConfig = {}) {
  return async function securityHeadersPlugin(
    fastify: FastifyInstance
  ): Promise<void> {
    fastify.addHook('onSend', (
      request: FastifyRequest,
      reply: FastifyReply,
      _payload: unknown,
      done: HookHandlerDoneFunction
    ) => {
      securityHeadersHook(request, reply, config);
      done();
    });

    // Log configuration on startup
    if (process.env.NODE_ENV !== 'test') {
      const mergedConfig = getEnvironmentConfig(config);
      console.info('[Security Headers] Plugin registered');
      console.info(`[Security Headers] HSTS: ${mergedConfig.enableHSTS ? 'enabled' : 'disabled'}`);
      console.info(`[Security Headers] X-Frame-Options: ${mergedConfig.frameOptions}`);
      console.info(`[Security Headers] CSP Mode: ${mergedConfig.cspReportOnly ? 'report-only' : 'enforce'}`);
    }
  };
}

/**
 * Standalone middleware function for use without plugin system
 * @param config - Security headers configuration
 * @returns Middleware function
 */
export function securityHeadersMiddleware(config: SecurityHeadersConfig = {}) {
  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ): void => {
    securityHeadersHook(request, reply, config);
    done();
  };
}

/**
 * Gets a summary of current security header configuration
 * Useful for security audits and debugging
 * @param config - Optional configuration override
 * @returns Summary object of security headers
 */
export function getSecurityHeadersSummary(config: SecurityHeadersConfig = {}): Record<string, string> {
  const mergedConfig = getEnvironmentConfig(config);
  const headers: Record<string, string> = {};

  if (mergedConfig.enableHSTS) {
    let hstsValue = `max-age=${mergedConfig.hstsMaxAge}`;
    if (mergedConfig.hstsIncludeSubDomains) hstsValue += '; includeSubDomains';
    if (mergedConfig.hstsPreload) hstsValue += '; preload';
    headers['Strict-Transport-Security'] = hstsValue;
  }

  headers['X-Frame-Options'] = mergedConfig.frameOptions || 'DENY';
  headers['X-Content-Type-Options'] = 'nosniff';

  if (mergedConfig.enableXSSProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  const cspDirectives = { ...DEFAULT_CSP_DIRECTIVES, ...mergedConfig.cspDirectives };
  headers['Content-Security-Policy'] = buildCSPHeader(cspDirectives, mergedConfig.cspReportUri);
  headers['Referrer-Policy'] = mergedConfig.referrerPolicy || 'strict-origin-when-cross-origin';

  const permissionsPolicy = { ...DEFAULT_PERMISSIONS_POLICY, ...mergedConfig.permissionsPolicy };
  headers['Permissions-Policy'] = buildPermissionsPolicyHeader(permissionsPolicy);

  return headers;
}

export default createSecurityHeadersPlugin;
