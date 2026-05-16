/**
 * Sala de Razonamiento Jurídico — rutas.
 *
 * Un espacio donde el abogado escribe su propio análisis y lo debate con la
 * IA. La IA no es complaciente: pone a prueba el planteamiento con argumentos
 * jurídicos. Pero la decisión es del abogado — si insiste, queda registrado.
 *
 * Cuatro modos de sesión (el abogado elige):
 *   tesis        — Tesis del Caso        (la IA pone la tesis a prueba)
 *   razonamiento — Razonamiento del Abogado (la IA acompaña y afila)
 *   estrategia   — Mesa de Estrategia    (la IA evalúa la conveniencia)
 *   deliberacion — Deliberación Jurídica (la IA hace de abogado del diablo)
 *
 *   POST /cases/:id/reasoning-debate — un turno de debate con la IA
 *   POST /cases/:id/reasoning-save   — guarda el resultado en el cerebro del caso
 */
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';
import { synthesizeCaseBrain } from './documents.js';

const SHARED_PERSONA = `Sos un jurista senior ecuatoriano que acompaña a un abogado en
el razonamiento de su caso. NO sos un asistente complaciente: cuando el abogado plantea
algo, lo ponés a prueba con argumentos jurídicos sólidos — la objeción más fuerte que
enfrentará, normas o jurisprudencia en contra, riesgos procesales, debilidades
probatorias. Pero la decisión final es del abogado: si tras tu objeción insiste,
lo registrás sin trabarte ("Queda registrado. Bajo tu criterio profesional, si decidís
proceder, considerá…") y seguís aportando valor. Citás normativa ecuatoriana cuando
corresponde. Respondés en español, conciso y directo, sin relleno ni saludos.`;

const ENTRY_TYPES: Record<string, { label: string; persona: string }> = {
  tesis: {
    label: 'Tesis del Caso',
    persona: 'MODO — Tesis del Caso. El abogado sostiene una tesis jurídica. Tu rol: ' +
      'poné la tesis a prueba. Señalá la objeción más fuerte que enfrentará, qué normas ' +
      'o jurisprudencia podrían oponerse, y qué necesita la tesis para sostenerse.',
  },
  razonamiento: {
    label: 'Razonamiento del Abogado',
    persona: 'MODO — Razonamiento del Abogado. El abogado razona un punto del caso en ' +
      'voz alta. Tu rol: acompañá y afilá el razonamiento — qué falta considerar, qué ' +
      'fundamento normativo lo respalda, qué consecuencia procesal no está viendo.',
  },
  estrategia: {
    label: 'Mesa de Estrategia',
    persona: 'MODO — Mesa de Estrategia. El abogado evalúa una decisión estratégica o ' +
      'una diligencia a solicitar (una pericia, una investigación, un peritaje). Tu rol: ' +
      'evaluá la conveniencia procesal, el costo-beneficio, los riesgos y el momento ' +
      'oportuno para hacerlo.',
  },
  deliberacion: {
    label: 'Deliberación Jurídica',
    persona: 'MODO — Deliberación Jurídica. El abogado plantea un punto controvertido. ' +
      'Tu rol: actuá como abogado del diablo — traé los argumentos más fuertes en ' +
      'contra, para que la posición final del abogado salga blindada.',
  },
};

function resolveType(key?: string) {
  return (key && ENTRY_TYPES[key]) ? { key, ...ENTRY_TYPES[key] } : { key: 'tesis', ...ENTRY_TYPES.tesis };
}

export async function caseReasoningRoutes(fastify: FastifyInstance) {
  // ─── POST /cases/:id/reasoning-debate ────────────────────────────────
  fastify.post<{
    Params: { id: string };
    Body: { entryType?: string; messages?: Array<{ role?: string; content?: string }> };
  }>(
    '/cases/:id/reasoning-debate',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const caseId = request.params.id;
      const c = await prisma.case.findFirst({
        where: { id: caseId, userId },
        select: { id: true, title: true, description: true, status: true },
      });
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const type = resolveType(request.body?.entryType);
      const raw = Array.isArray(request.body?.messages) ? request.body!.messages! : [];
      const convo = raw
        .slice(-20)
        .map((m) => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: String(m.content || '').trim().slice(0, 8_000),
        }))
        .filter((m) => m.content.length > 0);
      if (convo.length === 0) {
        return reply.code(400).send({ error: 'Escribí tu planteamiento para iniciar el debate.' });
      }

      const system = [
        SHARED_PERSONA,
        type.persona,
        `CONTEXTO DEL CASO:\nTítulo: ${c.title}\nEstado: ${c.status || '—'}\n` +
        `${c.description ? `Descripción: ${String(c.description).slice(0, 2_000)}` : ''}`,
      ].join('\n\n');

      try {
        const ai = await getAiClient();
        const completion = await ai.chat.completions.create({
          messages: [{ role: 'system', content: system }, ...convo],
          max_tokens: 1_400,
        });
        const text = completion.choices[0]?.message?.content?.trim() || '';
        if (text.length < 2) {
          return reply.code(400).send({ error: 'La IA no devolvió una respuesta utilizable. Reintentá.' });
        }
        return reply.send({ reply: text });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'reasoning-debate failed');
        return reply.code(400).send({ error: e?.message || 'No se pudo debatir con la IA.' });
      }
    },
  );

  // ─── POST /cases/:id/reasoning-save ──────────────────────────────────
  fastify.post<{
    Params: { id: string };
    Body: { entryType?: string; title?: string; content?: string };
  }>(
    '/cases/:id/reasoning-save',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const caseId = request.params.id;
      const c = await prisma.case.findFirst({
        where: { id: caseId, userId }, select: { id: true },
      });
      if (!c) return reply.code(404).send({ error: 'CASE_NOT_FOUND' });

      const type = resolveType(request.body?.entryType);
      const content = String(request.body?.content || '').trim();
      if (content.length < 20) {
        return reply.code(400).send({ error: 'El documento está vacío — no hay nada que guardar.' });
      }
      const title = (String(request.body?.title || '').trim() || type.label).slice(0, 180);
      const documentId = randomUUID();
      const now = new Date().toISOString();

      // Se guarda como documento kind='ai_analysis' — así el cerebro del caso
      // lo incorpora y la generación de documentos lo usa como contexto.
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.documents
           (id, case_id, user_id, title, content, mime_type, kind, ai_generation_meta, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'text/markdown', 'ai_analysis', $6::jsonb, $7::jsonb, now(), now())`,
        documentId, caseId, userId, title, content,
        JSON.stringify({ generator: 'lawyer_reasoning', entryType: type.key, generatedAt: now }),
        JSON.stringify({
          aiGenerated: true, kind: 'ai_analysis', generator: 'lawyer_reasoning',
          entryType: type.key, entryLabel: type.label,
        }),
      );

      // El razonamiento guardado actualiza el cerebro del caso (fire-and-forget).
      synthesizeCaseBrain(caseId).catch((err: any) =>
        fastify.log.warn({ err: err?.message }, 'reasoning-save: brain re-sync failed'));

      return reply.send({ ok: true, documentId, entryLabel: type.label });
    },
  );
}
