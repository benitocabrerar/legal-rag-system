/**
 * Super-administrador — control de acceso exclusivo.
 *
 * Algunas funciones de la operación (la gestión de precios, por ejemplo)
 * son exclusivas del super-administrador, no de cualquier admin. El
 * super-admin se identifica por correo: la lista vive en la variable de
 * entorno SUPER_ADMIN_EMAILS (separada por comas) y por defecto es la
 * cuenta del dueño del producto.
 *
 * Se identifica por correo —y no por un rol nuevo— a propósito: cambiar
 * el rol del dueño rompería los chequeos `role === 'admin'` del resto del
 * panel. Esta capa se suma sin tocar las existentes.
 */

const DEFAULT_SUPER_ADMINS = ['benitocabrerar@gmail.com'];

function superAdminEmails(): string[] {
  const raw = (process.env.SUPER_ADMIN_EMAILS || '').trim();
  const list = raw
    ? raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_SUPER_ADMINS;
  return list;
}

/** True si el usuario autenticado es super-administrador. */
export function isSuperAdmin(user: { email?: string | null; role?: string | null } | null | undefined): boolean {
  const email = (user?.email || '').trim().toLowerCase();
  if (!email) return false;
  return superAdminEmails().includes(email);
}

/**
 * Guard de Fastify para rutas exclusivas del super-admin.
 * Úsese en `onRequest` después de `fastify.authenticate`.
 */
export function requireSuperAdmin(request: any, reply: any): boolean {
  if (!isSuperAdmin(request.user)) {
    reply.code(403).send({ error: 'Acceso exclusivo del super-administrador.' });
    return false;
  }
  return true;
}
