/**
 * Helper para rutas SSE (Server-Sent Events) que escriben directo en reply.raw.
 *
 * El plugin @fastify/cors solo intercepta respuestas Fastify normales. Cuando
 * un handler hace `reply.raw.setHeader('Content-Type', 'text/event-stream')` y
 * luego `reply.raw.write(...)`, el plugin CORS ya no inyecta sus headers.
 *
 * Resultado: el browser ve la respuesta sin `Access-Control-Allow-Origin` y
 * bloquea el fetch ("No 'Access-Control-Allow-Origin' header is present").
 *
 * Solución: setear manualmente CORS + SSE headers de forma centralizada.
 * Importante mantener la lista de orígenes permitidos en sincronía con
 * server.ts (mismo regex/allowlist).
 */
import type { FastifyRequest, FastifyReply } from 'fastify';

const CORS_RAW = process.env.CORS_ORIGIN || '';
const CORS_ALLOWLIST: string[] = CORS_RAW === '*'
  ? []
  : CORS_RAW.split(',').map((s) => s.trim()).filter(Boolean);
const isWildcard = CORS_RAW === '*' || CORS_RAW === '';

function isOriginAllowed(origin: string): boolean {
  if (isWildcard) return true;
  if (CORS_ALLOWLIST.includes(origin)) return true;
  // Vercel preview deploys del proyecto poweria-legal
  if (/^https:\/\/poweria-legal-[a-z0-9]+-benitos-projects-eadee50c\.vercel\.app$/.test(origin)) {
    return true;
  }
  // Localhost en dev
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }
  return false;
}

/**
 * Setea CORS + SSE headers en reply.raw para rutas que streamean. Llamar
 * UNA VEZ al inicio del handler SSE, antes del primer write.
 */
export function setSseHeaders(request: FastifyRequest, reply: FastifyReply): void {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : '';

  // CORS — sólo si el browser envió un Origin válido
  if (origin && isOriginAllowed(origin)) {
    reply.raw.setHeader('Access-Control-Allow-Origin', origin);
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    reply.raw.setHeader('Vary', 'Origin');
  }

  // SSE
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('X-Accel-Buffering', 'no');
  reply.raw.flushHeaders?.();

  // Preámbulo: comentario SSE de 2KB que fuerza a Render/nginx a desbufferar
  // y enviar headers + primer chunk al cliente inmediatamente, antes de que
  // arranquen operaciones lentas (embedding, RAG, IA). Sin esto, algunos
  // proxies esperan a tener ~4KB acumulados antes de iniciar la entrega,
  // dejando al cliente colgado en "Iniciando…" sin ver progreso.
  try {
    reply.raw.write(`: ${'#'.repeat(2048)}\n\n`);
  } catch { /* client gone */ }
}
