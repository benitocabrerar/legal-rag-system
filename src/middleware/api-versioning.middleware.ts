/**
 * API Versioning Middleware
 *
 * Provides flexible API versioning support for Fastify routes.
 * Supports both header-based and URL-based versioning strategies.
 *
 * Versioning Strategies:
 * 1. Header-based: X-API-Version: 1, X-API-Version: 2
 * 2. URL-based: /api/v1/resource, /api/v2/resource
 * 3. Accept header: Accept: application/vnd.api.v1+json
 *
 * Features:
 * - Version negotiation
 * - Deprecation warnings
 * - Sunset headers for deprecated versions
 * - Default version fallback
 * - Version validation
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { BadRequestError } from '../errors/http-errors';
import { logger } from '../utils/logger';

/**
 * API version configuration
 */
export interface VersionConfig {
  /**
   * Current/latest version
   */
  current: number;

  /**
   * Minimum supported version
   */
  min: number;

  /**
   * Maximum supported version
   */
  max: number;

  /**
   * Default version when none specified
   */
  default: number;

  /**
   * Deprecated versions with sunset dates
   */
  deprecated?: Map<number, Date>;
}

/**
 * Versioning strategy
 */
export enum VersioningStrategy {
  HEADER = 'header',
  URL = 'url',
  ACCEPT = 'accept',
}

/**
 * Augment Fastify request type to include API version
 */
declare module 'fastify' {
  interface FastifyRequest {
    apiVersion?: number;
  }
}

/**
 * Default version configuration
 */
const DEFAULT_VERSION_CONFIG: VersionConfig = {
  current: 1,
  min: 1,
  max: 1,
  default: 1,
  deprecated: new Map(),
};

/**
 * Global version configuration
 */
let globalVersionConfig: VersionConfig = { ...DEFAULT_VERSION_CONFIG };

/**
 * Sets the global API version configuration
 *
 * @param config - Version configuration
 */
export function setVersionConfig(config: Partial<VersionConfig>): void {
  globalVersionConfig = {
    ...DEFAULT_VERSION_CONFIG,
    ...config,
  };

  logger.info('API version configuration updated', {
    current: globalVersionConfig.current,
    min: globalVersionConfig.min,
    max: globalVersionConfig.max,
    default: globalVersionConfig.default,
  });
}

/**
 * Extracts version from X-API-Version header
 *
 * @param request - Fastify request
 * @returns Version number or undefined
 */
function extractVersionFromHeader(request: FastifyRequest): number | undefined {
  const header = request.headers['x-api-version'];

  if (!header) {
    return undefined;
  }

  const version = parseInt(String(header), 10);
  return isNaN(version) ? undefined : version;
}

/**
 * Extracts version from URL path (e.g., /api/v1/resource)
 *
 * @param request - Fastify request
 * @returns Version number or undefined
 */
function extractVersionFromUrl(request: FastifyRequest): number | undefined {
  const match = request.url.match(/\/v(\d+)\//);
  if (!match) {
    return undefined;
  }

  const version = parseInt(match[1], 10);
  return isNaN(version) ? undefined : version;
}

/**
 * Extracts version from Accept header (e.g., application/vnd.api.v1+json)
 *
 * @param request - Fastify request
 * @returns Version number or undefined
 */
function extractVersionFromAccept(request: FastifyRequest): number | undefined {
  const accept = request.headers.accept;

  if (!accept) {
    return undefined;
  }

  const match = accept.match(/vnd\.api\.v(\d+)\+json/);
  if (!match) {
    return undefined;
  }

  const version = parseInt(match[1], 10);
  return isNaN(version) ? undefined : version;
}

/**
 * Extracts API version from request using all strategies
 *
 * @param request - Fastify request
 * @returns Version number
 */
function extractVersion(request: FastifyRequest): number {
  // Try header first (most explicit)
  const headerVersion = extractVersionFromHeader(request);
  if (headerVersion !== undefined) {
    return headerVersion;
  }

  // Try URL
  const urlVersion = extractVersionFromUrl(request);
  if (urlVersion !== undefined) {
    return urlVersion;
  }

  // Try Accept header
  const acceptVersion = extractVersionFromAccept(request);
  if (acceptVersion !== undefined) {
    return acceptVersion;
  }

  // Fall back to default
  return globalVersionConfig.default;
}

/**
 * Validates if a version is supported
 *
 * @param version - Version number to validate
 * @returns true if valid
 */
function isValidVersion(version: number): boolean {
  return version >= globalVersionConfig.min && version <= globalVersionConfig.max;
}

/**
 * Checks if a version is deprecated
 *
 * @param version - Version number
 * @returns Sunset date if deprecated, undefined otherwise
 */
function getDeprecationInfo(version: number): Date | undefined {
  return globalVersionConfig.deprecated?.get(version);
}

/**
 * Adds deprecation warning headers
 *
 * @param reply - Fastify reply
 * @param version - Deprecated version
 * @param sunsetDate - When version will be removed
 */
function addDeprecationHeaders(reply: FastifyReply, version: number, sunsetDate: Date): void {
  // Deprecation header (RFC 8594)
  reply.header('Deprecation', 'true');

  // Sunset header (RFC 8594)
  reply.header('Sunset', sunsetDate.toUTCString());

  // Link to migration guide
  reply.header(
    'Link',
    `</api/v${globalVersionConfig.current}/docs>; rel="successor-version"`
  );

  // Warning header (RFC 7234)
  reply.header(
    'Warning',
    `299 - "API version ${version} is deprecated and will be removed on ${sunsetDate.toLocaleDateString()}"`
  );
}

/**
 * API versioning middleware
 *
 * Extracts, validates, and enforces API versioning
 *
 * @param request - Fastify request
 * @param reply - Fastify reply
 */
export async function apiVersioningMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extract version from request
  const version = extractVersion(request);

  // Validate version
  if (!isValidVersion(version)) {
    throw new BadRequestError(
      `Unsupported API version: ${version}. Supported versions: ${globalVersionConfig.min}-${globalVersionConfig.max}`,
      {
        requestedVersion: version,
        supportedVersions: {
          min: globalVersionConfig.min,
          max: globalVersionConfig.max,
          current: globalVersionConfig.current,
        },
      }
    );
  }

  // Store version in request
  request.apiVersion = version;

  // Add version to response headers
  reply.header('X-API-Version', String(version));

  // Check for deprecation
  const sunsetDate = getDeprecationInfo(version);
  if (sunsetDate) {
    addDeprecationHeaders(reply, version, sunsetDate);

    logger.warn('Deprecated API version accessed', {
      requestId: request.id,
      version,
      sunsetDate,
      url: request.url,
    });
  }

  // Log version usage for analytics
  if (version !== globalVersionConfig.current) {
    logger.debug('Non-current API version used', {
      requestId: request.id,
      version,
      current: globalVersionConfig.current,
      url: request.url,
    });
  }
}

/**
 * Fastify plugin for API versioning
 *
 * @param fastify - Fastify instance
 * @param config - Version configuration
 */
export async function apiVersioningPlugin(
  fastify: any,
  config?: Partial<VersionConfig>
): Promise<void> {
  // Set configuration if provided
  if (config) {
    setVersionConfig(config);
  }

  // Add onRequest hook
  fastify.addHook('onRequest', apiVersioningMiddleware);

  // Decorate request with apiVersion
  if (!fastify.hasRequestDecorator('apiVersion')) {
    fastify.decorateRequest('apiVersion', null);
  }

  logger.info('API versioning middleware registered');
}

/**
 * Helper to get API version from request
 *
 * @param request - Fastify request
 * @returns API version number
 */
export function getApiVersion(request: FastifyRequest): number {
  return request.apiVersion || globalVersionConfig.default;
}

/**
 * Helper to check if request is using current API version
 *
 * @param request - Fastify request
 * @returns true if using current version
 */
export function isCurrentVersion(request: FastifyRequest): boolean {
  return getApiVersion(request) === globalVersionConfig.current;
}

/**
 * Helper to check if request is using deprecated version
 *
 * @param request - Fastify request
 * @returns true if using deprecated version
 */
export function isDeprecatedVersion(request: FastifyRequest): boolean {
  const version = getApiVersion(request);
  return globalVersionConfig.deprecated?.has(version) ?? false;
}

/**
 * Route constraint for versioned routes
 * Can be used with Fastify's constraint feature
 *
 * @param version - Required version for the route
 * @returns Constraint function
 *
 * @example
 * fastify.get('/resource', {
 *   constraints: { version: versionConstraint(2) }
 * }, handler);
 */
export function versionConstraint(version: number) {
  return (request: FastifyRequest): boolean => {
    return getApiVersion(request) === version;
  };
}

/**
 * Deprecates an API version
 *
 * @param version - Version to deprecate
 * @param sunsetDate - When the version will be removed
 */
export function deprecateVersion(version: number, sunsetDate: Date): void {
  if (!globalVersionConfig.deprecated) {
    globalVersionConfig.deprecated = new Map();
  }

  globalVersionConfig.deprecated.set(version, sunsetDate);

  logger.warn('API version deprecated', {
    version,
    sunsetDate,
  });
}

/**
 * Gets current version configuration
 *
 * @returns Version configuration
 */
export function getVersionConfig(): Readonly<VersionConfig> {
  return { ...globalVersionConfig };
}
