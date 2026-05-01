/**
 * Script 03 — Test suite de aislamiento RLS (Fase 2).
 *
 * Crea 2 usuarios de prueba (A y B), cada uno con su Case y Document.
 * Verifica que A NUNCA puede ver datos de B vía RLS.
 *
 * Cubre los 5 patterns de migrations/0003_rls_policies.sql:
 *   A · ownership directo (cases, notifications, payments, etc.)
 *   B · ownership transitivo (document_chunks → documents)
 *   C · lectura pública (legal_documents)
 *   D · admin override (negativo: user normal NO ve como admin)
 *   E · service_role bypass (positivo: con service key todo es accesible)
 *
 * Uso:
 *   tsx scripts/migrate-to-supabase/03-rls-test-suite.ts
 *
 * Exit code 0 → todas las assertions pasaron; ≠0 → al menos una falló.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = need('SUPABASE_URL');
const ANON_KEY = need('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');

interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
  caseId?: string;
  documentId?: string;
}

const failures: string[] = [];
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures.push(`✗ ${msg}`);
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function main() {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Creando usuarios de prueba A y B...');
  const a = await provisionUser(adminClient, 'rls-test-a@example.com');
  const b = await provisionUser(adminClient, 'rls-test-b@example.com');

  try {
    console.log('\nPattern A · ownership directo (cases)');
    a.caseId = await createCase(a.client, 'Caso de A');
    b.caseId = await createCase(b.client, 'Caso de B');

    {
      const { data: aSeesAll } = await a.client.from('cases').select('id, title');
      const ids = (aSeesAll ?? []).map((c) => c.id);
      assert(ids.includes(a.caseId!), 'A ve su propio caso');
      assert(!ids.includes(b.caseId!), 'A NO ve el caso de B');
    }

    console.log('\nPattern B · ownership transitivo (document_chunks)');
    a.documentId = await createDocument(adminClient, a.id, a.caseId!, 'Doc privado de A');
    await insertChunk(adminClient, a.documentId!, 'contenido secreto de A');

    {
      const { data: bChunks, error } = await b.client
        .from('document_chunks')
        .select('id, content')
        .eq('document_id', a.documentId!);
      assert(!error || error.code === 'PGRST116', 'B querying chunks de A no rompe (RLS filtra)');
      assert((bChunks ?? []).length === 0, 'B NO ve chunks del documento de A');
    }

    console.log('\nPattern C · lectura pública (legal_documents)');
    {
      const { data: aLegal } = await a.client.from('legal_documents').select('id').limit(1);
      const { data: bLegal } = await b.client.from('legal_documents').select('id').limit(1);
      assert(Array.isArray(aLegal), 'A puede leer legal_documents activos');
      assert(Array.isArray(bLegal), 'B puede leer legal_documents activos');
    }

    console.log('\nPattern D · admin override (negativo)');
    {
      const { data: othersData } = await a.client.from('users').select('id').neq('id', a.id);
      assert((othersData ?? []).length === 0, 'A (no admin) NO puede ver otros users');
    }

    console.log('\nPattern E · service_role bypass');
    {
      const { data: allCases } = await adminClient.from('cases').select('id');
      assert(
        (allCases ?? []).some((c) => c.id === a.caseId) &&
        (allCases ?? []).some((c) => c.id === b.caseId),
        'service_role ve casos de A y B'
      );
    }
  } finally {
    console.log('\nLimpiando usuarios de prueba...');
    await cleanup(adminClient, a);
    await cleanup(adminClient, b);
  }

  console.log(`\n${failures.length === 0 ? '✓ TODAS LAS ASSERTIONS PASARON' : `✗ ${failures.length} FALLOS`}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

async function provisionUser(admin: SupabaseClient, email: string): Promise<TestUser> {
  const password = 'test-' + Math.random().toString(36).slice(2);

  // Borrar si existe (de una corrida anterior)
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) throw new Error(`provision ${email}: ${error?.message}`);

  // Login para obtener JWT del usuario
  const tmp = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn, error: signInErr } = await tmp.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) throw new Error(`signIn ${email}: ${signInErr?.message}`);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
  });

  return { id: data.user.id, email, client };
}

async function createCase(client: SupabaseClient, title: string): Promise<string> {
  const { data, error } = await client.from('cases').insert({ title }).select('id').single();
  if (error) throw new Error(`createCase: ${error.message}`);
  return data.id as string;
}

async function createDocument(
  admin: SupabaseClient, userId: string, caseId: string, title: string
): Promise<string> {
  const { data, error } = await admin.from('documents').insert({
    user_id: userId, case_id: caseId, title, content: 'placeholder',
  }).select('id').single();
  if (error) throw new Error(`createDocument: ${error.message}`);
  return data.id as string;
}

async function insertChunk(admin: SupabaseClient, documentId: string, content: string) {
  const { error } = await admin.from('document_chunks').insert({
    document_id: documentId, content, chunk_index: 0,
  });
  if (error) throw new Error(`insertChunk: ${error.message}`);
}

async function cleanup(admin: SupabaseClient, u: TestUser) {
  if (u.caseId) await admin.from('cases').delete().eq('id', u.caseId);
  await admin.auth.admin.deleteUser(u.id);
}

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} es requerida`);
  return v;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
