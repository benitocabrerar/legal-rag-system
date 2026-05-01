/**
 * Task augmentation endpoints — AI suggestions, workload insights, templates.
 * Sits next to src/routes/tasks.ts so the core CRUD stays untouched.
 */
import { FastifyInstance } from 'fastify';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';

const suggestSubtasksSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  caseType: z.string().optional(),
  jurisdiction: z.string().optional(),
});

interface SubtaskSuggestion {
  title: string;
  estimatedHours?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

const TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  tasks: Array<{ title: string; priority: TaskPriority; estimatedHours?: number; daysFromStart?: number }>;
}> = [
  {
    id: 'demanda-civil',
    name: 'Demanda Civil',
    description: 'Flujo completo desde recepción del caso hasta presentación',
    icon: '⚖️',
    tasks: [
      { title: 'Entrevista inicial con el cliente', priority: 'HIGH', estimatedHours: 1, daysFromStart: 0 },
      { title: 'Recopilar documentación probatoria', priority: 'HIGH', estimatedHours: 4, daysFromStart: 1 },
      { title: 'Análisis jurídico y estrategia', priority: 'HIGH', estimatedHours: 3, daysFromStart: 3 },
      { title: 'Redacción del escrito de demanda', priority: 'HIGH', estimatedHours: 6, daysFromStart: 5 },
      { title: 'Revisión del escrito por socio senior', priority: 'MEDIUM', estimatedHours: 1, daysFromStart: 7 },
      { title: 'Presentación en el tribunal competente', priority: 'URGENT', estimatedHours: 2, daysFromStart: 8 },
    ],
  },
  {
    id: 'audiencia-preliminar',
    name: 'Audiencia preliminar',
    description: 'Preparación previa a la audiencia',
    icon: '🎙️',
    tasks: [
      { title: 'Repaso del expediente completo', priority: 'HIGH', estimatedHours: 2, daysFromStart: 0 },
      { title: 'Memorando de objeciones a la prueba contraria', priority: 'HIGH', estimatedHours: 3, daysFromStart: 1 },
      { title: 'Coordinar testigos y peritos', priority: 'MEDIUM', estimatedHours: 1, daysFromStart: 2 },
      { title: 'Ensayo de exposición oral', priority: 'MEDIUM', estimatedHours: 2, daysFromStart: 3 },
      { title: 'Confirmación al cliente día previo', priority: 'URGENT', estimatedHours: 0.5, daysFromStart: 4 },
    ],
  },
  {
    id: 'contrato-revision',
    name: 'Revisión contractual',
    description: 'Due diligence sobre un contrato entrante',
    icon: '📄',
    tasks: [
      { title: 'Lectura completa y mapa de cláusulas', priority: 'HIGH', estimatedHours: 2, daysFromStart: 0 },
      { title: 'Análisis de riesgos y desviaciones', priority: 'HIGH', estimatedHours: 3, daysFromStart: 1 },
      { title: 'Marcado de cláusulas a renegociar', priority: 'MEDIUM', estimatedHours: 1, daysFromStart: 2 },
      { title: 'Reunión de feedback con el cliente', priority: 'HIGH', estimatedHours: 1, daysFromStart: 3 },
    ],
  },
  {
    id: 'recurso-apelacion',
    name: 'Recurso de apelación',
    description: 'Impugnación de sentencia desfavorable',
    icon: '📜',
    tasks: [
      { title: 'Identificar errores in iudicando / in procedendo', priority: 'HIGH', estimatedHours: 3, daysFromStart: 0 },
      { title: 'Citar jurisprudencia de la sala superior', priority: 'HIGH', estimatedHours: 4, daysFromStart: 2 },
      { title: 'Redactar fundamentación', priority: 'HIGH', estimatedHours: 6, daysFromStart: 4 },
      { title: 'Presentar dentro del término legal', priority: 'URGENT', estimatedHours: 1, daysFromStart: 7 },
    ],
  },
];

export async function taskAiRoutes(fastify: FastifyInstance) {
  /**
   * POST /tasks/suggest-subtasks
   * Use the dynamic aiClient to break a task into 4-7 actionable subtasks.
   */
  fastify.post('/tasks/suggest-subtasks', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = suggestSubtasksSchema.parse(request.body);

    const aiClient = await getAiClient();
    const systemPrompt = `Eres un asistente legal experto. Cuando recibas un título y descripción de tarea, responde con 4-7 subtareas accionables que un abogado realizaría para completarla.
Devuelve ÚNICAMENTE JSON válido con la forma:
{"subtasks":[{"title":"...","estimatedHours":1.5,"priority":"HIGH"}]}
- title: imperativo, conciso (máx 80 chars)
- estimatedHours: número decimal, realista (0.5 a 8)
- priority: LOW | MEDIUM | HIGH | URGENT
Sin markdown, sin texto adicional.`;

    const userPrompt = [
      `Tarea: ${body.title}`,
      body.description ? `Descripción: ${body.description}` : '',
      body.caseType ? `Tipo de caso: ${body.caseType}` : '',
      body.jurisdiction ? `Jurisdicción: ${body.jurisdiction}` : '',
    ].filter(Boolean).join('\n');

    try {
      const completion = await aiClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 600,
      });

      const raw = completion.choices?.[0]?.message?.content || '';
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      let parsed: { subtasks: SubtaskSuggestion[] };
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return reply.code(502).send({ error: 'AI_INVALID_JSON', raw: cleaned.slice(0, 400) });
      }

      const subtasks = (parsed.subtasks || []).slice(0, 8).map((s) => ({
        title: String(s.title ?? '').slice(0, 200),
        estimatedHours: typeof s.estimatedHours === 'number' ? s.estimatedHours : undefined,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(s.priority || '') ? s.priority : 'MEDIUM',
      }));

      return reply.send({ subtasks });
    } catch (err: any) {
      request.log.error({ err }, 'suggest-subtasks failed');
      return reply.code(500).send({ error: 'AI_FAILED', message: err?.message ?? 'Unknown error' });
    }
  });

  /**
   * GET /tasks/insights
   * Workload metrics for the authenticated user. One DB round-trip per metric.
   */
  fastify.get('/tasks/insights', { onRequest: [fastify.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekEnd = new Date(todayEnd);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const baseFilter: import('@prisma/client').Prisma.TaskWhereInput = {
      OR: [{ assignedTo: userId }, { createdBy: userId }],
      status: { not: TaskStatus.CANCELLED },
    };

    const [overdue, dueToday, dueThisWeek, urgent, unassigned, inProgress, completedThisWeek, total] =
      await Promise.all([
        prisma.task.count({
          where: { ...baseFilter, dueDate: { lt: now }, status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] } },
        }),
        prisma.task.count({
          where: {
            ...baseFilter,
            dueDate: { gte: now, lte: todayEnd },
            status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          },
        }),
        prisma.task.count({
          where: {
            ...baseFilter,
            dueDate: { gte: now, lte: weekEnd },
            status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          },
        }),
        prisma.task.count({
          where: { ...baseFilter, priority: TaskPriority.URGENT, status: { not: TaskStatus.COMPLETED } },
        }),
        prisma.task.count({
          where: { createdBy: userId, assignedTo: null, status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] } },
        }),
        prisma.task.count({ where: { ...baseFilter, status: TaskStatus.IN_PROGRESS } }),
        prisma.task.count({
          where: {
            ...baseFilter,
            status: TaskStatus.COMPLETED,
            completedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.task.count({ where: baseFilter }),
      ]);

    return {
      overdue,
      dueToday,
      dueThisWeek,
      urgent,
      unassigned,
      inProgress,
      completedThisWeek,
      total,
      generatedAt: new Date().toISOString(),
    };
  });

  /**
   * GET /tasks/templates
   * Read-only list of curated legal task templates.
   */
  fastify.get('/tasks/templates', { onRequest: [fastify.authenticate] }, async () => {
    return { templates: TEMPLATES };
  });

  /**
   * POST /tasks/from-template
   * Materialize a template into real Task rows (optionally tied to a case).
   */
  fastify.post('/tasks/from-template', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = z
      .object({
        templateId: z.string(),
        caseId: z.string().uuid().optional(),
        startDate: z.string().datetime().optional(),
      })
      .parse(request.body);

    const tpl = TEMPLATES.find((t) => t.id === body.templateId);
    if (!tpl) return reply.code(404).send({ error: 'TEMPLATE_NOT_FOUND' });

    const userId = (request.user as any).id;
    const start = body.startDate ? new Date(body.startDate) : new Date();

    const created = await prisma.$transaction(
      tpl.tasks.map((t) => {
        const due = new Date(start);
        if (typeof t.daysFromStart === 'number') {
          due.setDate(due.getDate() + t.daysFromStart);
        }
        return prisma.task.create({
          data: {
            title: t.title,
            priority: t.priority,
            estimatedHours: t.estimatedHours,
            dueDate: due,
            createdBy: userId,
            caseId: body.caseId,
            tags: ['template', tpl.id],
          },
        });
      }),
    );

    return reply.code(201).send({ created: created.length, tasks: created, template: tpl.name });
  });
}
