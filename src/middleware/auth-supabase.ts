/**
 * Middleware de autenticación que verifica JWTs emitidos por Supabase Auth.
 * Feature-flag: solo se registra en server.ts si AUTH_BACKEND='supabase'.
 *
 * Diferencias con `middleware/auth.ts` (legacy):
 *  - No verifica firma con `JWT_SECRET` local — delega en Supabase via getUser().
 *  - Lee `user_role` y `plan_tier` del JWT (custom_access_token_hook).
 *  - Sigue cargando el row de public.users para tener el resto del perfil.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { userScopedClient } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

export interface SupabaseAuthUser {
  id: string;
  email: string;
  role: string;
  planTier: string;
  isActive: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    supabaseUser?: SupabaseAuthUser;
    supabaseAccessToken?: string;
  }
}

export async function requireSupabaseAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Missing bearer token' });
    return;
  }
  const token = auth.slice(7);

  try {
    const supabase = userScopedClient(token);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
      return;
    }

    const u = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { id: true, email: true, role: true, planTier: true, isActive: true },
    });

    if (!u || !u.isActive) {
      reply.code(401).send({ error: 'Unauthorized', message: 'User not found or inactive' });
      return;
    }

    request.supabaseUser = u;
    request.supabaseAccessToken = token;
    // Compat con código legacy que lee request.user
    (request as unknown as { user: SupabaseAuthUser }).user = u;
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: err instanceof Error ? err.message : 'auth failed',
    });
  }
}

export async function requireSupabaseAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireSupabaseAuth(request, reply);
  if (reply.sent) return;
  if (request.supabaseUser?.role !== 'admin') {
    reply.code(403).send({ error: 'Forbidden', message: 'Admin only' });
  }
}
