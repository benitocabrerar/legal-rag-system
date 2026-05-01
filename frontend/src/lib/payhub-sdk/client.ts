/**
 * Payments Hub SDK · Cliente Supabase
 *
 * Dos clientes:
 *  - publicClient: anon/publishable key (lectura de bank_accounts, plans)
 *  - adminClient:  service_role (escrituras, webhooks, aprobar pagos)
 *
 * El adminClient SOLO debe usarse desde el backend (server-only),
 * nunca desde el cliente del navegador.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PAYHUB_URL = process.env.PAYHUB_SUPABASE_URL || process.env.NEXT_PUBLIC_PAYHUB_SUPABASE_URL;
const PAYHUB_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_PAYHUB_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_PAYHUB_SUPABASE_ANON_KEY;
const PAYHUB_SERVICE_ROLE_KEY = process.env.PAYHUB_SUPABASE_SERVICE_ROLE_KEY;

// Tipados como any porque el schema 'payhub' no encaja en el genérico default.
// Las funciones del SDK exponen tipos fuertes sobre la respuesta.
let _public: any = null;
let _admin: any = null;

/** Cliente público (anon / publishable). Seguro para frontend. */
export function payhubPublicClient(): SupabaseClient {
  if (!PAYHUB_URL || !PAYHUB_PUBLISHABLE_KEY) {
    throw new Error(
      'payhub-sdk: faltan PAYHUB_SUPABASE_URL y/o NEXT_PUBLIC_PAYHUB_SUPABASE_PUBLISHABLE_KEY en el .env'
    );
  }
  if (!_public) {
    // Schema 'public' — el SDK usa wrappers public.payhub_* que delegan al
    // schema 'payhub' vía SECURITY DEFINER (Supabase managed solo expone
    // 'public' por default).
    _public = createClient(PAYHUB_URL, PAYHUB_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-client-info': 'payhub-sdk/public' } },
    });
  }
  return _public;
}

/** Cliente admin (service_role). SOLO server-side. */
export function payhubAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('payhub-sdk: payhubAdminClient() no puede llamarse desde el navegador.');
  }
  if (!PAYHUB_URL || !PAYHUB_SERVICE_ROLE_KEY) {
    throw new Error(
      'payhub-sdk: faltan PAYHUB_SUPABASE_URL y/o PAYHUB_SUPABASE_SERVICE_ROLE_KEY en el .env del backend'
    );
  }
  if (!_admin) {
    _admin = createClient(PAYHUB_URL, PAYHUB_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-client-info': 'payhub-sdk/admin' } },
    });
  }
  return _admin;
}

/** Resetea los clientes (útil para tests). */
export function resetPayhubClients() {
  _public = null;
  _admin = null;
}
