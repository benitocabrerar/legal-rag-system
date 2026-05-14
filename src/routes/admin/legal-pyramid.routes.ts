/**
 * Admin · Legal Pyramid Routes
 *
 *   GET /admin/legal-pyramid?country=EC
 *       Estructura jerárquica del corpus por país siguiendo la pirámide
 *       de Kelsen ecuatoriana (art. 425 Constitución). Devuelve niveles
 *       con count de normas y sample de cada uno.
 *
 *   GET /admin/legal-pyramid/level/:hierarchy?country=EC&limit=&offset=
 *       Lista paginada completa de normas de un nivel específico.
 *
 *   GET /admin/legal-pyramid/document/:id
 *       Detalle de una norma específica con metadata y URL del PDF.
 *
 *   GET /admin/legal-pyramid/document/:id/content
 *       Contenido completo del doc (con todos los chunks ordenados) para preview.
 *
 *   GET /admin/legal-pyramid/countries
 *       Lista de country_codes con normas activas en el corpus.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

export async function legalPyramidRoutes(fastify: FastifyInstance) {
  const requireAdmin = async (request: any, reply: any) => {
    const user = request.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: 'Admin role required' });
      return false;
    }
    return true;
  };

  // ─── GET /admin/legal-pyramid/countries ────────────────────────────
  fastify.get(
    '/admin/legal-pyramid/countries',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const rows = await prisma.$queryRawUnsafe<Array<{ country_code: string; total: bigint }>>(
        `SELECT COALESCE(country_code, 'XX') AS country_code,
                COUNT(*)::bigint AS total
           FROM public.legal_documents
          WHERE is_active = true
          GROUP BY country_code
          ORDER BY total DESC`,
      );
      const countries = rows.map((r) => ({
        code: r.country_code,
        name: COUNTRY_NAMES[r.country_code] || r.country_code,
        flag: COUNTRY_FLAGS[r.country_code] || '🌐',
        total: Number(r.total),
      }));
      return reply.send({ countries });
    },
  );

  // ─── GET /admin/legal-pyramid ──────────────────────────────────────
  fastify.get<{ Querystring: { country?: string } }>(
    '/admin/legal-pyramid',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const country = (request.query.country || 'EC').toUpperCase();

      // Counts por jerarquía
      const counts = await prisma.$queryRawUnsafe<Array<{ hierarchy: string; n: bigint }>>(
        `SELECT legal_hierarchy::text AS hierarchy, COUNT(*)::bigint AS n
           FROM public.legal_documents
          WHERE country_code = $1 AND is_active = true
          GROUP BY legal_hierarchy`,
        country,
      );
      const countMap = new Map<string, number>();
      counts.forEach((c) => countMap.set(c.hierarchy, Number(c.n)));

      // Top 5 muestras por nivel para preview
      const samples = await prisma.$queryRawUnsafe<Array<{
        legal_hierarchy: string;
        id: string;
        title: string;
        norm_title: string | null;
        publication_date: Date | null;
        publication_number: string | null;
        category: string | null;
        has_pdf: boolean;
      }>>(
        `SELECT legal_hierarchy::text AS legal_hierarchy,
                id, title, norm_title,
                publication_date, publication_number, category,
                (metadata->>'editionPdfUrl' IS NOT NULL
                 OR metadata->>'canonicalPdfUrl' IS NOT NULL) AS has_pdf
           FROM (
             SELECT *,
                    ROW_NUMBER() OVER (
                      PARTITION BY legal_hierarchy
                      ORDER BY publication_date DESC NULLS LAST, title
                    ) AS rn
               FROM public.legal_documents
              WHERE country_code = $1 AND is_active = true
           ) sub
          WHERE rn <= 5`,
        country,
      );

      const samplesByHier = new Map<string, any[]>();
      samples.forEach((s) => {
        const list = samplesByHier.get(s.legal_hierarchy) || [];
        list.push({
          id: s.id,
          title: s.title,
          normTitle: s.norm_title,
          publicationDate: s.publication_date,
          publicationNumber: s.publication_number,
          category: s.category,
          hasPdf: s.has_pdf,
        });
        samplesByHier.set(s.legal_hierarchy, list);
      });

      const levels = PYRAMID_LEVELS.map((level) => {
        let count = 0;
        const samples: any[] = [];
        for (const hier of level.hierarchies) {
          count += countMap.get(hier) || 0;
          const hs = samplesByHier.get(hier) || [];
          samples.push(...hs);
        }
        return {
          id: level.id,
          tier: level.tier,
          title: level.title,
          description: level.description,
          icon: level.icon,
          color: level.color,
          hierarchies: level.hierarchies,
          count,
          samples: samples.slice(0, 5),
        };
      });

      const total = levels.reduce((s, l) => s + l.count, 0);

      return reply.send({
        country: {
          code: country,
          name: COUNTRY_NAMES[country] || country,
          flag: COUNTRY_FLAGS[country] || '🌐',
        },
        total,
        levels,
        catalogStructure: PYRAMID_LEVELS,
      });
    },
  );

  // ─── GET /admin/legal-pyramid/level/:hierarchy ─────────────────────
  fastify.get<{
    Params: { hierarchy: string };
    Querystring: { country?: string; limit?: string; offset?: string; q?: string };
  }>(
    '/admin/legal-pyramid/level/:hierarchy',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const country = (request.query.country || 'EC').toUpperCase();
      const hierarchy = request.params.hierarchy.toUpperCase();
      const limit  = Math.min(200, Math.max(10, parseInt(request.query.limit  || '50', 10)));
      const offset = Math.max(0, parseInt(request.query.offset || '0', 10));
      const q = (request.query.q || '').trim();

      // Mapear `hierarchy` del cliente al/los enum values internos
      const internalHiers: string[] = HIERARCHY_GROUP_MAP[hierarchy] || [hierarchy];

      const conditions: string[] = [
        'country_code = $1',
        'is_active = true',
        `legal_hierarchy::text = ANY($2::text[])`,
      ];
      const params: any[] = [country, internalHiers];
      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(title ILIKE $${params.length} OR norm_title ILIKE $${params.length})`);
      }

      params.push(limit);
      params.push(offset);

      const items = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT id, title, norm_title,
                norm_type::text AS norm_type,
                legal_hierarchy::text AS legal_hierarchy,
                publication_type::text AS publication_type,
                publication_date, publication_number, category,
                last_reform_date,
                COALESCE(metadata->>'editionPdfUrl', metadata->>'canonicalPdfUrl') AS pdf_url,
                metadata->>'editionUrl' AS edition_url,
                metadata->>'aiSummary' AS ai_summary
           FROM public.legal_documents
          WHERE ${conditions.join(' AND ')}
          ORDER BY publication_date DESC NULLS LAST, title
          LIMIT $${params.length - 1} OFFSET $${params.length}`,
        ...params,
      );

      const countParams = params.slice(0, params.length - 2);
      const totalRows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT COUNT(*)::bigint AS n
           FROM public.legal_documents
          WHERE ${conditions.join(' AND ')}`,
        ...countParams,
      );

      return reply.send({
        items,
        total: Number(totalRows[0]?.n || 0),
        pagination: { limit, offset },
      });
    },
  );

  // ─── GET /admin/legal-pyramid/document/:id ─────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/legal-pyramid/document/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const docs = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT ld.id, ld.title, ld.norm_title,
                ld.norm_type::text AS norm_type,
                ld.legal_hierarchy::text AS legal_hierarchy,
                ld.publication_type::text AS publication_type,
                ld.publication_number, ld.publication_date,
                ld.last_reform_date, ld.jurisdiction, ld.country_code,
                ld.category, ld.metadata, ld.created_at, ld.updated_at,
                LENGTH(ld.content) AS content_length,
                (SELECT COUNT(*)::int FROM public.legal_document_chunks
                  WHERE legal_document_id = ld.id) AS total_chunks,
                (SELECT COUNT(*)::int FROM public.legal_document_chunks
                  WHERE legal_document_id = ld.id AND embedding_v IS NOT NULL) AS vectorized_chunks
           FROM public.legal_documents ld
          WHERE ld.id = $1 AND ld.is_active = true`,
        request.params.id,
      );
      if (docs.length === 0) return reply.code(404).send({ error: 'Documento no encontrado' });
      const d = docs[0];
      return reply.send({
        document: {
          ...d,
          pdf_url: d.metadata?.editionPdfUrl || d.metadata?.canonicalPdfUrl || null,
          edition_url: d.metadata?.editionUrl || null,
          ai_summary: d.metadata?.aiSummary || null,
          ai_keywords: d.metadata?.aiKeywords || [],
          source: d.metadata?.source || 'manual',
        },
      });
    },
  );

  // ─── GET /admin/legal-pyramid/document/:id/content ─────────────────
  // Contenido completo del documento concatenando los chunks ordenados.
  // Para preview rápido en el modal.
  fastify.get<{ Params: { id: string }; Querystring: { maxChars?: string } }>(
    '/admin/legal-pyramid/document/:id/content',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const maxChars = Math.min(100_000, Math.max(2000, parseInt(request.query.maxChars || '40000', 10)));

      const chunks = await prisma.$queryRawUnsafe<Array<{ content: string; chunk_index: number }>>(
        `SELECT content, chunk_index
           FROM public.legal_document_chunks
          WHERE legal_document_id = $1
          ORDER BY chunk_index ASC`,
        request.params.id,
      );

      // Reconstruir el texto. Cada chunk tiene overlap de 150 chars con el
      // siguiente, así que para evitar duplicar, tomamos el chunk completo
      // del primero y de los siguientes saltamos los primeros 150 chars
      // (donde está el overlap).
      let fullText = '';
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        if (i === 0) {
          fullText += c.content;
        } else {
          fullText += c.content.slice(150);
        }
        if (fullText.length >= maxChars) {
          fullText = fullText.slice(0, maxChars) + '\n…[contenido truncado para preview]';
          break;
        }
      }

      return reply.send({
        content: fullText,
        totalChunks: chunks.length,
        truncated: fullText.endsWith('…[contenido truncado para preview]'),
      });
    },
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PYRAMID STRUCTURE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Pirámide de Kelsen del Ecuador (art. 425 de la Constitución 2008).
 * Los `hierarchies` son los enum values del campo `legal_hierarchy`
 * que se agrupan en cada nivel visual de la pirámide.
 */
const PYRAMID_LEVELS = [
  {
    id: 'constitucion',
    tier: 1,
    title: 'Constitución',
    description: 'Norma suprema. Base del ordenamiento jurídico ecuatoriano (1998 reformada en 2008).',
    icon: '🏛️',
    color: 'amber',
    hierarchies: ['CONSTITUCION'],
  },
  {
    id: 'tratados',
    tier: 2,
    title: 'Tratados y Convenios Internacionales',
    description: 'Instrumentos internacionales ratificados, especialmente de Derechos Humanos (bloque de constitucionalidad).',
    icon: '🌐',
    color: 'rose',
    hierarchies: ['TRATADOS_INTERNACIONALES_DDHH'],
  },
  {
    id: 'leyes-organicas',
    tier: 3,
    title: 'Leyes Orgánicas y Códigos Orgánicos',
    description: 'Regulan organización y ejercicio de los poderes públicos, derechos y garantías constitucionales, garantías jurisdiccionales.',
    icon: '⚖️',
    color: 'violet',
    hierarchies: ['CODIGOS_ORGANICOS', 'LEYES_ORGANICAS'],
  },
  {
    id: 'leyes-ordinarias',
    tier: 4,
    title: 'Leyes Ordinarias y Códigos Ordinarios',
    description: 'Materias no reservadas a leyes orgánicas. Mayoría de la legislación civil, mercantil, etc.',
    icon: '📜',
    color: 'sky',
    hierarchies: ['CODIGOS_ORDINARIOS', 'LEYES_ORDINARIAS'],
  },
  {
    id: 'decretos-reglamentos',
    tier: 5,
    title: 'Decretos y Reglamentos',
    description: 'Decretos ejecutivos, decretos-leyes y reglamentos generales emitidos por la Función Ejecutiva.',
    icon: '⚙️',
    color: 'indigo',
    hierarchies: ['REGLAMENTOS'],
  },
  {
    id: 'ordenanzas',
    tier: 6,
    title: 'Ordenanzas',
    description: 'Normas de aplicación territorial: municipales, metropolitanas y provinciales (GADs).',
    icon: '🏘️',
    color: 'teal',
    hierarchies: ['ORDENANZAS'],
  },
  {
    id: 'resoluciones-acuerdos',
    tier: 7,
    title: 'Acuerdos, Resoluciones y Actos Administrativos',
    description: 'Actos de menor jerarquía emitidos por entidades del sector público.',
    icon: '📋',
    color: 'slate',
    hierarchies: ['RESOLUCIONES', 'ACUERDOS_ADMINISTRATIVOS'],
  },
];

const HIERARCHY_GROUP_MAP: Record<string, string[]> = {
  CONSTITUCION:       ['CONSTITUCION'],
  TRATADOS:           ['TRATADOS_INTERNACIONALES_DDHH'],
  TRATADOS_INTERNACIONALES_DDHH: ['TRATADOS_INTERNACIONALES_DDHH'],
  ORGANICAS:          ['CODIGOS_ORGANICOS', 'LEYES_ORGANICAS'],
  CODIGOS_ORGANICOS:  ['CODIGOS_ORGANICOS'],
  LEYES_ORGANICAS:    ['LEYES_ORGANICAS'],
  ORDINARIAS:         ['CODIGOS_ORDINARIOS', 'LEYES_ORDINARIAS'],
  CODIGOS_ORDINARIOS: ['CODIGOS_ORDINARIOS'],
  LEYES_ORDINARIAS:   ['LEYES_ORDINARIAS'],
  REGLAMENTOS:        ['REGLAMENTOS'],
  ORDENANZAS:         ['ORDENANZAS'],
  RESOLUCIONES:       ['RESOLUCIONES', 'ACUERDOS_ADMINISTRATIVOS'],
  ACUERDOS:           ['ACUERDOS_ADMINISTRATIVOS'],
  // Aliases por id del nivel
  CONSTITUCION_TIER:  ['CONSTITUCION'],
  TRATADOS_TIER:      ['TRATADOS_INTERNACIONALES_DDHH'],
  'LEYES-ORGANICAS':  ['CODIGOS_ORGANICOS', 'LEYES_ORGANICAS'],
  'LEYES-ORDINARIAS': ['CODIGOS_ORDINARIOS', 'LEYES_ORDINARIAS'],
  'DECRETOS-REGLAMENTOS': ['REGLAMENTOS'],
  'RESOLUCIONES-ACUERDOS': ['RESOLUCIONES', 'ACUERDOS_ADMINISTRATIVOS'],
};

const COUNTRY_NAMES: Record<string, string> = {
  EC: 'Ecuador',
  CO: 'Colombia',
  PE: 'Perú',
  BO: 'Bolivia',
  CL: 'Chile',
  AR: 'Argentina',
  MX: 'México',
  ES: 'España',
  XX: 'Sin código',
};

const COUNTRY_FLAGS: Record<string, string> = {
  EC: '🇪🇨',
  CO: '🇨🇴',
  PE: '🇵🇪',
  BO: '🇧🇴',
  CL: '🇨🇱',
  AR: '🇦🇷',
  MX: '🇲🇽',
  ES: '🇪🇸',
  XX: '🌐',
};
