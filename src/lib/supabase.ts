/**
 * Supabase clients para el BACKEND (Fastify).
 *
 * Reglas:
 *  1. NUNCA usar `serviceRoleClient` desde código que sea reachable por el cliente.
 *  2. Usar `serviceRoleClient` sólo en workers, jobs cron, migraciones y rutas
 *     internas (admin) que ya verifican rol vía JWT.
 *  3. Para operar EN NOMBRE DEL USUARIO (respetando RLS), usar
 *     `userScopedClient(accessToken)` con el JWT del request.
 *
 * Durante la migración, este módulo COEXISTE con `src/lib/prisma.ts`.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  // Lazy: sólo lanzar cuando se invoque, no al import. Hay scripts que cargan
  // este archivo sin necesitar conexión real (tests, type-check).
  // throw new Error('SUPABASE_URL no configurada');
}

let _serviceRole: SupabaseClient | null = null;

/**
 * Cliente con SERVICE_ROLE: bypassa RLS. Sólo backend.
 * Usar en: workers BullMQ, jobs de embedding, migrations, rutas admin
 * que ya validaron rol vía JWT custom claim.
 */
export function serviceRoleClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
  }
  if (!_serviceRole) {
    _serviceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-client-info': 'legal-rag-backend/service-role' },
      },
    });
  }
  return _serviceRole;
}

/**
 * Cliente que opera bajo el JWT de un usuario concreto. RLS ACTIVO.
 * Pasar el `Authorization: Bearer <jwt>` del request del usuario.
 */
export function userScopedClient(accessToken: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_ANON_KEY son requeridas');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-client-info': 'legal-rag-backend/user-scoped',
      },
    },
  });
}

/**
 * Helper: extraer y validar el JWT del header de un request Fastify.
 * Devuelve el user.id (UUID) o lanza.
 */
export async function getAuthUserId(accessToken: string): Promise<string> {
  const client = userScopedClient(accessToken);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error(`JWT inválido: ${error?.message ?? 'sin user'}`);
  }
  return data.user.id;
}
