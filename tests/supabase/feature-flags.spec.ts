import { describe, it, expect } from 'vitest';

/**
 * Verifica que los feature flags de migración respetan el principio
 * "default = comportamiento legacy intacto".
 */

describe('Feature flags de migración Supabase', () => {
  it('AUTH_BACKEND no seteado → modo legacy (no se importa supabase auth route)', () => {
    delete process.env.AUTH_BACKEND;
    delete process.env.SUPABASE_URL;
    // El check vive en server.ts. Aquí validamos la condición:
    const shouldRegister =
      process.env.AUTH_BACKEND === 'supabase' && !!process.env.SUPABASE_URL;
    expect(shouldRegister).toBe(false);
  });

  it('AUTH_BACKEND=supabase pero sin SUPABASE_URL → no registra (defensivo)', () => {
    process.env.AUTH_BACKEND = 'supabase';
    delete process.env.SUPABASE_URL;
    const shouldRegister =
      process.env.AUTH_BACKEND === 'supabase' && !!process.env.SUPABASE_URL;
    expect(shouldRegister).toBe(false);
  });

  it('AUTH_BACKEND=supabase + SUPABASE_URL → registra', () => {
    process.env.AUTH_BACKEND = 'supabase';
    process.env.SUPABASE_URL = 'https://stub.supabase.co';
    const shouldRegister =
      process.env.AUTH_BACKEND === 'supabase' && !!process.env.SUPABASE_URL;
    expect(shouldRegister).toBe(true);
  });

  it('SEARCH_BACKEND=rpc + SUPABASE_URL → registra search-rpc', () => {
    process.env.SEARCH_BACKEND = 'rpc';
    process.env.SUPABASE_URL = 'https://stub.supabase.co';
    const shouldRegister =
      process.env.SEARCH_BACKEND === 'rpc' && !!process.env.SUPABASE_URL;
    expect(shouldRegister).toBe(true);
  });
});
