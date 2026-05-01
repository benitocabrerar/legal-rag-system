/**
 * GET    /api/v1/admin/ai-settings  — config actual (sin la API key real)
 * PATCH  /api/v1/admin/ai-settings  — actualizar provider/model/api_key
 * GET    /api/v1/admin/ai-settings/public — público (provider+model)
 *
 * La API key se almacena CIFRADA via pgcrypto pgp_sym_encrypt usando
 * AI_SETTINGS_ENCRYPTION_KEY del entorno como passphrase.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { invalidateAiCache } from '../../lib/ai-client.js';

const ENC_KEY = process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-fallback-key';

export const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o',       label: 'GPT-4o · multimodal flagship' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o mini · rápido y económico' },
    { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
    { id: 'gpt-4.1',      label: 'GPT-4.1 · razonamiento mejorado' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { id: 'gpt-5',        label: 'GPT-5 (si tu cuenta tiene acceso)' },
    { id: 'gpt-5-mini',   label: 'GPT-5 mini' },
    { id: 'o1-preview',   label: 'o1-preview · razonamiento profundo' },
    { id: 'o1-mini',      label: 'o1-mini' },
  ],
  anthropic: [
    { id: 'claude-opus-4-7',   label: 'Claude Opus 4.7 · máxima capacidad' },
    { id: 'claude-opus-4-6',   label: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 · balanceado' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5 · más rápido' },
  ],
};

const PatchSchema = z.object({
  provider: z.enum(['openai', 'anthropic']).optional(),
  model: z.string().min(1).max(100).optional(),
  embedding_model: z.string().min(1).max(100).optional(),
  api_key: z.string().min(10).max(500).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(100).max(64000).optional(),
});

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const user = (request as any).user || (request as any).supabaseUser;
  if (!user || user.role !== 'admin') {
    reply.code(403).send({ error: 'Admin only' });
    return false;
  }
  return true;
}

async function getSettings() {
  const r = await prisma.$queryRawUnsafe<any[]>(
    `SELECT provider, model, embedding_model, temperature, max_tokens,
            api_key_hint, (api_key_encrypted IS NOT NULL) AS api_key_set,
            updated_by, updated_at
     FROM public.ai_settings WHERE id = 'default'`
  );
  return r[0] || null;
}

export async function adminAiSettingsRoutes(fastify: FastifyInstance) {
  // PUBLIC — fuera del hook authenticate global (lo registramos antes)
  fastify.get('/admin/ai-settings/public', async (_req, reply) => {
    const r = await prisma.$queryRawUnsafe<any[]>(
      `SELECT provider, model FROM public.ai_settings WHERE id='default'`
    );
    return reply.send(r[0] || { provider: 'openai', model: 'gpt-4o-mini' });
  });

  // Hook authenticate solo para el resto
  fastify.register(async (instance) => {
    instance.addHook('onRequest', (instance as any).authenticate);

    instance.get('/admin/ai-settings', async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      try {
        return reply.send({
          settings: await getSettings(),
          availableModels: AVAILABLE_MODELS,
        });
      } catch (e: any) {
        fastify.log.error(e);
        return reply.code(500).send({ error: e.message });
      }
    });

    instance.patch('/admin/ai-settings', async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      let body;
      try {
        body = PatchSchema.parse(request.body);
      } catch (err: any) {
        return reply.code(400).send({ error: 'Validation', details: err.errors });
      }

      try {
        const sets: string[] = [];
        const params: any[] = [];
        let i = 1;
        for (const k of ['provider', 'model', 'embedding_model', 'temperature', 'max_tokens'] as const) {
          if (body[k] !== undefined) {
            sets.push(`${k} = $${i++}`);
            params.push(body[k]);
          }
        }
        if (body.api_key) {
          sets.push(`api_key_encrypted = pgp_sym_encrypt($${i}::text, $${i + 1}::text)`);
          params.push(body.api_key);
          params.push(ENC_KEY);
          i += 2;
          sets.push(`api_key_hint = $${i++}`);
          params.push('…' + body.api_key.slice(-4));
        }
        sets.push(`updated_at = now()`);
        const userId =
          (request as any).user?.id ||
          (request as any).supabaseUser?.id ||
          'unknown';
        sets.push(`updated_by = $${i++}`);
        params.push(userId);

        if (sets.length === 1) {
          return reply.code(400).send({ error: 'no fields to update' });
        }

        const sql = `UPDATE public.ai_settings SET ${sets.join(', ')} WHERE id = 'default'`;
        await prisma.$executeRawUnsafe(sql, ...params);

        invalidateAiCache();
        return reply.send({ settings: await getSettings() });
      } catch (e: any) {
        fastify.log.error(e);
        return reply.code(500).send({ error: e.message });
      }
    });
  });
}
