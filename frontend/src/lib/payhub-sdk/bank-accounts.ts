/**
 * Payments Hub SDK · Bank accounts
 *
 * Lista las cuentas bancarias activas de una app (lectura pública).
 * Nunca devuelve el número completo, solo last4 + instrucciones.
 */
import { payhubPublicClient } from './client.js';
import type { BankAccount } from './types.js';

/**
 * Devuelve todas las cuentas bancarias activas para una app.
 *
 * @example
 *   const banks = await listBankAccounts('poweria-legal');
 *   // → [{ bank_name: 'Banco del Pichincha', account_holder: 'COGNITEX S.A.S.',
 *   //      account_last4: '9416', currency: 'USD', country_code: 'EC', ... }]
 */
export async function listBankAccounts(appSlug: string): Promise<BankAccount[]> {
  const sb = payhubPublicClient();
  const { data, error } = await sb.rpc('payhub_list_bank_accounts', { p_app_slug: appSlug });
  if (error) throw new Error(`payhub: list_bank_accounts(${appSlug}) → ${error.message}`);
  // El wrapper devuelve SETOF JSONB (cada fila es un objeto)
  return (data as BankAccount[]) || [];
}
