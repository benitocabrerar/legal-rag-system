/**
 * Auth Events — audit log of signup/login/OAuth flows.
 *
 * - POST /api/v1/auth-events       (public, rate-limited): frontend reports an event
 * - GET  /api/v1/admin/auth-events (admin only)         : list with filters
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const ALLOWED_TYPES = [
  'signup_attempt',
  'signup_success',
  'signup_error',
  'login_attempt',
  'login_success',
  'login_error',
  'oauth_init',
  'oauth_callback',
  'oauth_error',
  'password_reset_request',
  'password_reset_success',
  'password_reset_error',
  'magic_link_request',
  'magic_link_success',
  'session_start',
  'session_end',
  'unknown',
] as const;

const ingestSchema = z.object({
  eventType: z.enum(ALLOWED_TYPES),
  provider: z.string().max(40).optional().nullable(),
  success: z.boolean().optional().default(false),
  email: z.string().email().max(254).optional().nullable(),
  userId: z.string().max(64).optional().nullable(),
  errorCode: z.string().max(120).optional().nullable(),
  errorMessage: z.string().max(2000).optional().nullable(),
  url: z.string().max(2048).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

async function requireAdmin(request: any, reply: any) {
  if (!request.user || request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden' });
  }
}

export async function authEventsRoutes(fastify: FastifyInstance) {
  // Public ingest — anyone can post, but heavily limited.
  fastify.post('/auth-events', {
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
  }, async (request, reply) => {
    try {
      const body = ingestSchema.parse(request.body);
      const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || request.ip
        || null;
      const userAgent = (request.headers['user-agent'] as string) || null;

      await prisma.$executeRawUnsafe(
        `INSERT INTO public.auth_events
         (event_type, provider, success, email, user_id,
          error_code, error_message, ip, user_agent, url, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
        body.eventType,
        body.provider ?? null,
        body.success,
        body.email ?? null,
        body.userId ?? null,
        body.errorCode ?? null,
        body.errorMessage ?? null,
        ip,
        userAgent,
        body.url ?? null,
        JSON.stringify(body.metadata || {}),
      );

      // Always log to stdout too (Render captures this)
      const logFn = body.success ? fastify.log.info : fastify.log.warn;
      logFn.call(fastify.log, {
        msg: `[auth-event] ${body.eventType}`,
        provider: body.provider,
        success: body.success,
        email: body.email,
        errorCode: body.errorCode,
        errorMessage: body.errorMessage,
        ip,
      });

      return reply.code(201).send({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'invalid event', details: error.errors });
      }
      fastify.log.error({ err: error }, 'auth-event ingest failed');
      return reply.code(500).send({ error: 'ingest failed' });
    }
  });

  // Admin list — filters: eventType, provider, success, email, since, until, limit
  fastify.get('/admin/auth-events', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const q = request.query as Record<string, string | undefined>;
      const limit = Math.min(parseInt(q.limit || '100', 10) || 100, 500);
      const offset = parseInt(q.offset || '0', 10) || 0;

      const where: string[] = [];
      const params: any[] = [];
      let i = 1;
      if (q.eventType) { where.push(`event_type = $${i++}`); params.push(q.eventType); }
      if (q.provider)  { where.push(`provider = $${i++}`); params.push(q.provider); }
      if (q.success === 'true' || q.success === 'false') {
        where.push(`success = $${i++}`); params.push(q.success === 'true');
      }
      if (q.email) { where.push(`email ILIKE $${i++}`); params.push(`%${q.email}%`); }
      if (q.since) { where.push(`created_at >= $${i++}`); params.push(q.since); }
      if (q.until) { where.push(`created_at <= $${i++}`); params.push(q.until); }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const sql = `
        SELECT id, created_at, event_type, provider, success, email, user_id,
               error_code, error_message, ip, user_agent, url, metadata
        FROM public.auth_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

      const countSql = `SELECT COUNT(*)::int AS total FROM public.auth_events ${whereClause}`;
      const totalRow = await prisma.$queryRawUnsafe<any[]>(countSql, ...params);

      return reply.send({
        events: rows.map((r) => ({
          id: r.id,
          createdAt: r.created_at,
          eventType: r.event_type,
          provider: r.provider,
          success: r.success,
          email: r.email,
          userId: r.user_id,
          errorCode: r.error_code,
          errorMessage: r.error_message,
          ip: r.ip,
          userAgent: r.user_agent,
          url: r.url,
          metadata: r.metadata,
        })),
        total: totalRow[0]?.total ?? 0,
        limit,
        offset,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'auth-events list failed');
      return reply.code(500).send({ error: 'list failed' });
    }
  });

  // Admin summary — counts by event_type and success in last 24h / 7d
  fastify.get('/admin/auth-events/summary', {
    onRequest: [fastify.authenticate, requireAdmin],
  }, async (request, reply) => {
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          event_type,
          success,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS last_24h,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int  AS last_7d,
          COUNT(*)::int AS total
        FROM public.auth_events
        GROUP BY event_type, success
        ORDER BY event_type, success
      `);
      return reply.send({ summary: rows });
    } catch (error) {
      fastify.log.error({ err: error }, 'auth-events summary failed');
      return reply.code(500).send({ error: 'summary failed' });
    }
  });
}
