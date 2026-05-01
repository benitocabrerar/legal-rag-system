import { describe, it, expect, beforeEach } from 'vitest';

describe('Supabase clients (backend)', () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('serviceRoleClient lanza si faltan vars', async () => {
    const { serviceRoleClient } = await import('../../src/lib/supabase.js');
    expect(() => serviceRoleClient()).toThrow(/SUPABASE_URL/);
  });

  it('userScopedClient construye con anon key', async () => {
    process.env.SUPABASE_URL = 'https://stub.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-stub';
    const { userScopedClient } = await import('../../src/lib/supabase.js');
    const c = userScopedClient('fake-jwt');
    expect(c).toBeDefined();
    expect(c.auth).toBeDefined();
  });

  it('serviceRoleClient construye y reusa instancia', async () => {
    process.env.SUPABASE_URL = 'https://stub.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-stub';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-stub';
    const mod = await import('../../src/lib/supabase.js');
    const a = mod.serviceRoleClient();
    const b = mod.serviceRoleClient();
    expect(a).toBe(b); // singleton
  });
});
