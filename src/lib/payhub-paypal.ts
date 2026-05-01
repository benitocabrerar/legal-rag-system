/**
 * PayPal REST API wrapper para el Payments Hub.
 *
 * Cubre el flujo Orders v2 (one-time + suscripciones) + webhook signature
 * verification. Token de OAuth cacheado en módulo (refresh automático).
 *
 * Server-only — nunca importar desde el frontend.
 */
const MODE = (process.env.PAYPAL_MODE || 'live').toLowerCase();
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

const BASE_URL = MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const tokenCache: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

export async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET no configurados');
  }
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`paypal oauth: ${res.status} ${await res.text()}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + (data.expires_in * 1000);
  return data.access_token;
}

async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`paypal ${path} → ${res.status} ${errBody.slice(0, 400)}`);
  }
  if (res.status === 204) return null as unknown as T;
  return res.json() as Promise<T>;
}

// =====================================================================
// Orders v2 (one-time payments)
// =====================================================================
export interface CreateOrderInput {
  amount: string;          // "49.00"
  currency: string;        // "USD"
  description: string;     // "Poweria Legal · Pro Monthly"
  referenceId: string;     // payhub payment_id
  returnUrl: string;       // post-approval redirect
  cancelUrl: string;
  payerEmail?: string;
}

export interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ rel: string; href: string; method: string }>;
}

export async function createOrder(input: CreateOrderInput): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: input.referenceId,
        description: input.description.slice(0, 127),
        amount: { currency_code: input.currency, value: input.amount },
        custom_id: input.referenceId,
      }],
      payer: input.payerEmail ? { email_address: input.payerEmail } : undefined,
      application_context: {
        brand_name: 'COGNITEX',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });
}

export interface CapturedOrder {
  id: string;
  status: string;             // 'COMPLETED'
  purchase_units: Array<{
    reference_id?: string;
    payments?: { captures?: Array<{ id: string; status: string; amount: { currency_code: string; value: string } }> };
  }>;
  payer?: { email_address?: string; payer_id?: string };
}

export async function captureOrder(orderId: string): Promise<CapturedOrder> {
  return paypalFetch<CapturedOrder>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    body: '{}',
  });
}

export async function getOrder(orderId: string): Promise<CapturedOrder> {
  return paypalFetch<CapturedOrder>(`/v2/checkout/orders/${orderId}`);
}

// =====================================================================
// Webhook signature verification
// =====================================================================
export interface WebhookHeaders {
  'paypal-auth-algo'?: string;
  'paypal-cert-url'?: string;
  'paypal-transmission-id'?: string;
  'paypal-transmission-sig'?: string;
  'paypal-transmission-time'?: string;
}

/**
 * Verifica la firma de un webhook contra la API de PayPal.
 * Devuelve true si VERIFIED, false si FAILURE.
 */
export async function verifyWebhookSignature(
  headers: WebhookHeaders,
  bodyJson: unknown,
): Promise<boolean> {
  if (!WEBHOOK_ID) return false;
  try {
    const data = await paypalFetch<{ verification_status: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: WEBHOOK_ID,
          webhook_event: bodyJson,
        }),
      }
    );
    return data.verification_status === 'SUCCESS';
  } catch (_err) {
    return false;
  }
}

export function paypalDashboardUrl(orderId: string): string {
  return MODE === 'live'
    ? `https://www.paypal.com/activity/payment/${orderId}`
    : `https://www.sandbox.paypal.com/activity/payment/${orderId}`;
}

export const PAYPAL_MODE = MODE;
