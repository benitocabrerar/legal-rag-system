/**
 * Rutas de auth feature-flagged para Supabase Auth.
 * Se registran SOLO si AUTH_BACKEND='supabase' (ver server.ts).
 *
 * En esa modalidad, el frontend ya hace login directo contra Supabase
 * (vía @supabase/supabase-js). Estas rutas son helpers para flujos
 * que aún viven server-side: 2FA enrollment, OAuth callbacks
 * server-side, validación de session, sync con public.users.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { serviceRoleClient } from '../lib/supabase.js';
import { requireSupabaseAuth } from '../middleware/auth-supabase.js';
import { prisma } from '../lib/prisma.js';

export async function supabaseAuthRoutes(fastify: FastifyInstance) {
  /**
   * GET /auth/me — devuelve el perfil cargado por el middleware
   * (ya validó el JWT y trajo el row de public.users).
   */
  fastify.get(
    '/auth/supabase/me',
    { preHandler: requireSupabaseAuth },
    async (request) => {
      return { user: request.supabaseUser };
    }
  );

  /**
   * POST /auth/supabase/sync — fuerza re-sync del row de public.users
   * con metadata fresca de auth.users. Útil tras cambios de avatar/nombre.
   */
  fastify.post(
    '/auth/supabase/sync',
    { preHandler: requireSupabaseAuth },
    async (request, reply) => {
      const userId = request.supabaseUser!.id;
      const supabase = serviceRoleClient();
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error || !data.user) {
        return reply.code(404).send({ error: 'auth.users no encontrado' });
      }

      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          email: data.user.email ?? request.supabaseUser!.email,
          name: typeof meta.name === 'string' ? meta.name : undefined,
          avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
          lastLogin: new Date(),
        },
        select: { id: true, email: true, name: true, role: true, planTier: true },
      });
      return { user: updated };
    }
  );

  /**
   * POST /auth/supabase/admin/invite — invitar usuario por email (solo admin).
   * Útil mientras se prepara el envío masivo de magic-links a usuarios existentes.
   */
  const inviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(['user', 'admin']).default('user'),
    redirectTo: z.string().url().optional(),
  });

  fastify.post('/auth/supabase/admin/invite', async (request, reply) => {
    await requireSupabaseAuth(request, reply);
    if (reply.sent) return;
    if (request.supabaseUser?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin only' });
    }
    const body = inviteSchema.parse(request.body);
    const supabase = serviceRoleClient();
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(body.email, {
      redirectTo: body.redirectTo,
    });
    if (error) return reply.code(400).send({ error: error.message });

    if (data.user && body.role === 'admin') {
      await prisma.user.update({
        where: { id: data.user.id },
        data: { role: 'admin' },
      });
    }
    return { invited: data.user?.email ?? body.email };
  });
}
