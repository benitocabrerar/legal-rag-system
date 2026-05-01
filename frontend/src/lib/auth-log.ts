/**
 * auth-log: fire-and-forget reporter to /api/v1/auth-events.
 * Never throws, never blocks the auth flow.
 */

export type AuthEventType =
  | 'signup_attempt'
  | 'signup_success'
  | 'signup_error'
  | 'login_attempt'
  | 'login_success'
  | 'login_error'
  | 'oauth_init'
  | 'oauth_callback'
  | 'oauth_error'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'password_reset_error'
  | 'magic_link_request'
  | 'magic_link_success'
  | 'session_start'
  | 'session_end'
  | 'unknown';

export interface AuthEventPayload {
  eventType: AuthEventType;
  provider?: string | null;
  success?: boolean;
  email?: string | null;
  userId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function logAuthEvent(payload: AuthEventPayload): Promise<void> {
  if (typeof window === 'undefined') return;
  const url = window.location.href;

  // Always log to console for local debugging
  // eslint-disable-next-line no-console
  console.info('[auth-log]', payload.eventType, {
    provider: payload.provider,
    success: payload.success,
    email: payload.email,
    errorCode: payload.errorCode,
    errorMessage: payload.errorMessage,
  });

  try {
    await fetch(`${API_URL}/api/v1/auth-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        success: payload.success ?? false,
        url,
      }),
      keepalive: true, // survive tab unload (e.g. OAuth redirect)
    });
  } catch {
    // swallow — auth-log should never break the auth flow
  }
}
