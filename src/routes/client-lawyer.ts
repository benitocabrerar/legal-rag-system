/**
 * Endpoints para gestión de:
 *   - Clientes del caso (datos personales y de contacto)
 *   - Perfil del abogado (singleton del user)
 *   - Notificaciones oficiales del caso (juzgados, fiscalías, etc)
 *   - Extracción IA automática de datos del cliente desde documentos del caso
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';

// ============================================================================
// SCHEMAS
// ============================================================================

const ClientSchema = z.object({
  fullName: z.string().min(1).max(200),
  identificationType: z.enum(['CEDULA', 'RUC', 'PASAPORTE']).optional(),
  identificationNumber: z.string().max(50).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.string().max(30).optional().nullable(),
  nationality: z.string().max(50).optional().nullable(),
  maritalStatus: z.string().max(50).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  employer: z.string().max(200).optional().nullable(),
  employerAddress: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const LawyerSchema = z.object({
  fullName: z.string().min(1).max(200),
  identificationType: z.enum(['CEDULA', 'RUC', 'PASAPORTE']).optional(),
  identificationNumber: z.string().max(50).optional().nullable(),
  barNumber: z.string().max(50).optional().nullable(),
  lawFirm: z.string().max(200).optional().nullable(),
  title: z.string().max(50).optional().nullable(),
  specialization: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  officePhone: z.string().max(50).optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  website: z.string().max(200).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
  signatureImageUrl: z.string().optional().nullable(),
  letterheadImageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const NotificationSchema = z.object({
  entityType: z.enum(['JUZGADO', 'FISCALIA', 'CONTRALORIA', 'CONTRAPARTE', 'NOTARIA', 'OTROS']),
  entityName: z.string().min(1).max(300),
  email: z.string().email().optional().nullable().or(z.literal('')),
  additionalEmails: z.array(z.string().email()).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  referenceNumber: z.string().max(100).optional().nullable(),
  contactPerson: z.string().max(200).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// HELPERS
// ============================================================================

function rowToClient(r: any) {
  return {
    id: r.id,
    fullName: r.full_name,
    identificationType: r.identification_type,
    identificationNumber: r.identification_number,
    birthDate: r.birth_date,
    gender: r.gender,
    nationality: r.nationality,
    maritalStatus: r.marital_status,
    occupation: r.occupation,
    address: r.address,
    city: r.city,
    province: r.province,
    country: r.country,
    phone: r.phone,
    mobile: r.mobile,
    email: r.email,
    employer: r.employer,
    employerAddress: r.employer_address,
    notes: r.notes,
    metadata: r.metadata,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToLawyer(r: any) {
  if (!r) return null;
  return {
    userId: r.user_id,
    fullName: r.full_name,
    identificationType: r.identification_type,
    identificationNumber: r.identification_number,
    barNumber: r.bar_number,
    lawFirm: r.law_firm,
    title: r.title,
    specialization: r.specialization,
    address: r.address,
    city: r.city,
    province: r.province,
    country: r.country,
    officePhone: r.office_phone,
    mobile: r.mobile,
    email: r.email,
    website: r.website,
    bankAccount: r.bank_account,
    bankName: r.bank_name,
    signatureImageUrl: r.signature_image_url,
    letterheadImageUrl: r.letterhead_image_url,
    notes: r.notes,
    metadata: r.metadata,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToNotification(r: any) {
  return {
    id: r.id,
    caseId: r.case_id,
    entityType: r.entity_type,
    entityName: r.entity_name,
    email: r.email,
    additionalEmails: r.additional_emails || [],
    phone: r.phone,
    address: r.address,
    referenceNumber: r.reference_number,
    contactPerson: r.contact_person,
    notes: r.notes,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function ensureCaseOwnership(caseId: string, userId: string) {
  const r = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM public.cases WHERE id = $1 AND user_id = $2`,
    caseId,
    userId
  );
  return r.length > 0;
}

// ============================================================================
// ROUTES
// ============================================================================

export async function clientLawyerRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', (fastify as any).authenticate);

  // ---------------------------------------------------------------------------
  // CLIENTES (lista global del user)
  // ---------------------------------------------------------------------------
  fastify.get('/clients', async (request, reply) => {
    const userId = (request as any).user?.id;
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.client_profiles WHERE user_id = $1 ORDER BY full_name`,
      userId
    );
    return reply.send({ clients: rows.map(rowToClient) });
  });

  fastify.post('/clients', async (request, reply) => {
    const userId = (request as any).user?.id;
    let body;
    try { body = ClientSchema.parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const r = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.client_profiles
         (user_id, full_name, identification_type, identification_number, birth_date,
          gender, nationality, marital_status, occupation, address, city, province, country,
          phone, mobile, email, employer, employer_address, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      userId,
      body.fullName,
      body.identificationType || 'CEDULA',
      body.identificationNumber || null,
      body.birthDate || null,
      body.gender || null,
      body.nationality || 'Ecuatoriana',
      body.maritalStatus || null,
      body.occupation || null,
      body.address || null,
      body.city || null,
      body.province || null,
      body.country || 'Ecuador',
      body.phone || null,
      body.mobile || null,
      body.email || null,
      body.employer || null,
      body.employerAddress || null,
      body.notes || null
    );
    return reply.code(201).send({ client: rowToClient(r[0]) });
  });

  fastify.patch('/clients/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    let body;
    try { body = ClientSchema.partial().parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const fieldMap: Record<string, string> = {
      fullName: 'full_name', identificationType: 'identification_type',
      identificationNumber: 'identification_number', birthDate: 'birth_date',
      gender: 'gender', nationality: 'nationality', maritalStatus: 'marital_status',
      occupation: 'occupation', address: 'address', city: 'city', province: 'province',
      country: 'country', phone: 'phone', mobile: 'mobile', email: 'email',
      employer: 'employer', employerAddress: 'employer_address', notes: 'notes',
    };

    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      const col = fieldMap[k];
      if (!col) continue;
      sets.push(`${col} = $${i++}`);
      params.push(v === '' ? null : v);
    }
    if (sets.length === 0) return reply.code(400).send({ error: 'no fields' });
    sets.push(`updated_at = now()`);
    params.push(id, userId);

    const r = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE public.client_profiles SET ${sets.join(', ')}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING *`,
      ...params
    );
    if (r.length === 0) return reply.code(404).send({ error: 'not found' });
    return reply.send({ client: rowToClient(r[0]) });
  });

  fastify.delete('/clients/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    await prisma.$executeRawUnsafe(
      `DELETE FROM public.client_profiles WHERE id = $1 AND user_id = $2`,
      id, userId
    );
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------------------
  // CLIENTES POR CASO
  // ---------------------------------------------------------------------------
  fastify.get('/cases/:caseId/clients', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT cc.id AS link_id, cc.role, cc.authorization_doc_id, cc.authorized_at, cc.notes AS link_notes,
              cp.*
       FROM public.case_clients cc
       JOIN public.client_profiles cp ON cp.id = cc.client_profile_id
       WHERE cc.case_id = $1
       ORDER BY cc.role, cp.full_name`,
      caseId
    );
    return reply.send({
      clients: rows.map(r => ({
        linkId: r.link_id,
        role: r.role,
        authorizationDocId: r.authorization_doc_id,
        authorizedAt: r.authorized_at,
        linkNotes: r.link_notes,
        ...rowToClient(r),
      })),
    });
  });

  // Vincular cliente existente al caso
  fastify.post('/cases/:caseId/clients/:clientId', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId, clientId } = request.params as { caseId: string; clientId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    const body = (request.body as any) || {};
    const role = body.role || 'PRINCIPAL';
    const authDocId = body.authorizationDocId || null;
    const authorizedAt = body.authorizedAt || null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO public.case_clients (case_id, client_profile_id, role, authorization_doc_id, authorized_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (case_id, client_profile_id) DO UPDATE SET
         role = EXCLUDED.role,
         authorization_doc_id = EXCLUDED.authorization_doc_id,
         authorized_at = EXCLUDED.authorized_at,
         updated_at = now()`,
      caseId, clientId, role, authDocId, authorizedAt, body.notes || null
    );
    return reply.send({ ok: true });
  });

  // Desvincular
  fastify.delete('/cases/:caseId/clients/:clientId', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId, clientId } = request.params as { caseId: string; clientId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });
    await prisma.$executeRawUnsafe(
      `DELETE FROM public.case_clients WHERE case_id = $1 AND client_profile_id = $2`,
      caseId, clientId
    );
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------------------
  // PERFIL DEL ABOGADO (singleton)
  // ---------------------------------------------------------------------------
  fastify.get('/lawyer-profile', async (request, reply) => {
    const userId = (request as any).user?.id;
    const r = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.lawyer_profile WHERE user_id = $1`,
      userId
    );
    return reply.send({ profile: rowToLawyer(r[0]) });
  });

  fastify.put('/lawyer-profile', async (request, reply) => {
    const userId = (request as any).user?.id;
    let body;
    try { body = LawyerSchema.parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const r = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.lawyer_profile
         (user_id, full_name, identification_type, identification_number, bar_number,
          law_firm, title, specialization, address, city, province, country,
          office_phone, mobile, email, website, bank_account, bank_name,
          signature_image_url, letterhead_image_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         identification_type = EXCLUDED.identification_type,
         identification_number = EXCLUDED.identification_number,
         bar_number = EXCLUDED.bar_number,
         law_firm = EXCLUDED.law_firm,
         title = EXCLUDED.title,
         specialization = EXCLUDED.specialization,
         address = EXCLUDED.address,
         city = EXCLUDED.city,
         province = EXCLUDED.province,
         country = EXCLUDED.country,
         office_phone = EXCLUDED.office_phone,
         mobile = EXCLUDED.mobile,
         email = EXCLUDED.email,
         website = EXCLUDED.website,
         bank_account = EXCLUDED.bank_account,
         bank_name = EXCLUDED.bank_name,
         signature_image_url = EXCLUDED.signature_image_url,
         letterhead_image_url = EXCLUDED.letterhead_image_url,
         notes = EXCLUDED.notes,
         updated_at = now()
       RETURNING *`,
      userId,
      body.fullName,
      body.identificationType || 'CEDULA',
      body.identificationNumber || null,
      body.barNumber || null,
      body.lawFirm || null,
      body.title || 'Abogado',
      body.specialization || null,
      body.address || null,
      body.city || null,
      body.province || null,
      body.country || 'Ecuador',
      body.officePhone || null,
      body.mobile || null,
      body.email || null,
      body.website || null,
      body.bankAccount || null,
      body.bankName || null,
      body.signatureImageUrl || null,
      body.letterheadImageUrl || null,
      body.notes || null
    );
    return reply.send({ profile: rowToLawyer(r[0]) });
  });

  // ---------------------------------------------------------------------------
  // NOTIFICACIONES OFICIALES POR CASO
  // ---------------------------------------------------------------------------
  fastify.get('/cases/:caseId/notifications', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.case_notifications WHERE case_id = $1 ORDER BY entity_type, entity_name`,
      caseId
    );
    return reply.send({ notifications: rows.map(rowToNotification) });
  });

  fastify.post('/cases/:caseId/notifications', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    let body;
    try { body = NotificationSchema.parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    const r = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.case_notifications
         (case_id, entity_type, entity_name, email, additional_emails, phone,
          address, reference_number, contact_person, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      caseId,
      body.entityType,
      body.entityName,
      body.email || null,
      body.additionalEmails || null,
      body.phone || null,
      body.address || null,
      body.referenceNumber || null,
      body.contactPerson || null,
      body.notes || null,
      body.isActive ?? true
    );
    return reply.code(201).send({ notification: rowToNotification(r[0]) });
  });

  fastify.patch('/notifications/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    let body;
    try { body = NotificationSchema.partial().parse(request.body); }
    catch (e: any) { return reply.code(400).send({ error: 'Validation', details: e.errors }); }

    // Verificar ownership a través del caso
    const owner = await prisma.$queryRawUnsafe<any[]>(
      `SELECT cn.id FROM public.case_notifications cn
       JOIN public.cases c ON c.id = cn.case_id
       WHERE cn.id = $1 AND c.user_id = $2`,
      id, userId
    );
    if (owner.length === 0) return reply.code(404).send({ error: 'not found' });

    const map: Record<string, string> = {
      entityType: 'entity_type', entityName: 'entity_name', email: 'email',
      additionalEmails: 'additional_emails', phone: 'phone', address: 'address',
      referenceNumber: 'reference_number', contactPerson: 'contact_person',
      notes: 'notes', isActive: 'is_active',
    };
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      const col = map[k];
      if (!col) continue;
      sets.push(`${col} = $${i++}`);
      params.push(v === '' ? null : v);
    }
    if (sets.length === 0) return reply.code(400).send({ error: 'no fields' });
    sets.push(`updated_at = now()`);
    params.push(id);

    const r = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE public.case_notifications SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      ...params
    );
    return reply.send({ notification: rowToNotification(r[0]) });
  });

  fastify.delete('/notifications/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as { id: string };
    await prisma.$executeRawUnsafe(
      `DELETE FROM public.case_notifications cn USING public.cases c
       WHERE cn.id = $1 AND cn.case_id = c.id AND c.user_id = $2`,
      id, userId
    );
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------------------
  // EXTRACCIÓN IA: leer documentos del caso → datos del cliente
  // ---------------------------------------------------------------------------
  fastify.post('/cases/:caseId/extract-client-data', {
    bodyLimit: 10485760,
    schema: { body: { type: 'object', additionalProperties: true } },
  }, async (request, reply) => {
    const userId = (request as any).user?.id;
    const { caseId } = request.params as { caseId: string };
    if (!(await ensureCaseOwnership(caseId, userId))) return reply.code(404).send({ error: 'Case not found' });

    // Tomar últimos N documentos (text content cap por seguridad)
    const docs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT title, LEFT(content, 6000) AS excerpt
       FROM public.documents
       WHERE case_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 6`,
      caseId, userId
    );
    if (docs.length === 0) return reply.code(400).send({ error: 'No hay documentos para extraer datos' });

    const caseRow = await prisma.$queryRawUnsafe<any[]>(
      `SELECT title, description, client_name FROM public.cases WHERE id = $1`,
      caseId
    );
    const caseInfo = caseRow[0];

    const systemPrompt = `Eres un asistente legal experto en derecho ecuatoriano. Vas a extraer datos del CLIENTE (la persona representada por el abogado) y entidades de notificación oficial desde documentos legales. Devuelve EXCLUSIVAMENTE un JSON válido con esta forma exacta:

{
  "clients": [
    {
      "fullName": "Nombre completo o null",
      "identificationType": "CEDULA | RUC | PASAPORTE",
      "identificationNumber": "número de identificación o null",
      "birthDate": "YYYY-MM-DD o null",
      "gender": "Masculino | Femenino | Otro o null",
      "nationality": "Ecuatoriana o lo que corresponda",
      "maritalStatus": "Soltero/a | Casado/a | Divorciado/a | Viudo/a | Unión de hecho o null",
      "occupation": "profesión o null",
      "address": "dirección domiciliaria completa o null",
      "city": "ciudad o null",
      "province": "provincia o null",
      "phone": "teléfono fijo o null",
      "mobile": "celular o null",
      "email": "correo electrónico o null",
      "employer": "empleador o null",
      "role": "PRINCIPAL | CO_ACTOR | DEMANDADO | TERCERO"
    }
  ],
  "notifications": [
    {
      "entityType": "JUZGADO | FISCALIA | CONTRALORIA | CONTRAPARTE | NOTARIA | OTROS",
      "entityName": "nombre exacto del juzgado/fiscalía/etc",
      "email": "correo o null",
      "phone": "teléfono o null",
      "address": "dirección o null",
      "referenceNumber": "número de proceso o referencia o null",
      "contactPerson": "nombre del juez/fiscal/etc o null"
    }
  ]
}

Si un campo no aparece en los documentos, usa null. NO inventes información. NO incluyas markdown ni texto fuera del JSON.`;

    const userPrompt = `# Caso
- Título: ${caseInfo?.title || ''}
- Cliente preliminar: ${caseInfo?.client_name || 'No especificado'}
- Descripción: ${caseInfo?.description || ''}

# Documentos del caso (extractos)

${docs.map((d, i) => `## Documento ${i + 1}: ${d.title}\n${d.excerpt}`).join('\n\n')}

Extrae los datos del cliente y las entidades a notificar (juzgado, fiscalía, etc) en JSON.`;

    try {
      const aiClient = await getAiClient();
      const completion = await aiClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });
      const raw = completion.choices?.[0]?.message?.content || '';
      let parsed: any;
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return reply.code(500).send({ error: 'IA no devolvió JSON válido', raw: raw.slice(0, 500) });
      }
      return reply.send({
        extracted: parsed,
        model: aiClient.model,
        provider: aiClient.provider,
      });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: e.message || 'Internal error' });
    }
  });
}
