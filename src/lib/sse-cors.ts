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

  // Disable Nagle's algorithm — TCP_NODELAY. Sin esto, Node junta paquetes
  // chicos durante ~40ms antes de enviarlos, lo que rompe la entrega
  // progresiva de los eventos SSE (chunks <1KB suelen quedarse).
  try {
    (reply.raw.socket as any)?.setNoDelay?.(true);
  } catch { /* socket gone */ }

  // Preámbulo: comentario SSE de 4KB que fuerza a Render/nginx/cualquier
  // proxy a desbufferar y enviar headers + primer chunk al cliente
  // inmediatamente, antes de que arranquen operaciones lentas (embedding,
  // RAG, IA). Sin esto, varios proxies acumulan hasta 4KB antes de iniciar
  // la entrega, dejando al cliente colgado en "Iniciando…" sin ver progreso.
  try {
    reply.raw.write(`: ${'#'.repeat(4096)}\n\n`);
  } catch { /* client gone */ }
}

/**
 * Arranca un keepalive SSE que escribe un comentario `: ping\n\n` cada
 * `intervalMs` ms al stream. Devuelve un cleanup que cancela el intervalo.
 *
 * Usar en endpoints SSE largos: garantiza que el cliente reciba algún byte
 * cada N ms aunque las operaciones internas (RAG, IA) sean silenciosas,
 * evitando que Render cierre la conexión por idle timeout o que el browser
 * marque la respuesta como "stalled".
 */
export function startSseKeepalive(
  reply: FastifyReply,
  intervalMs: number = 1000,
): () => void {
  const handle = setInterval(() => {
    try {
      reply.raw.write(`: ka ${Date.now()}\n\n`);
    } catch {
      clearInterval(handle);
    }
  }, intervalMs);
  return () => clearInterval(handle);
}
