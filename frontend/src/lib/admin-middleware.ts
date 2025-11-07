/**
 * Admin Middleware - Role-based access control for admin routes
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const ROLES = {
  ADMIN: 'admin',
  LAWYER: 'lawyer',
  CLIENT: 'client',
} as const;

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === ROLES.ADMIN;
}

/**
 * Check if user has lawyer or admin role
 */
export function isLawyer(user: User | null): boolean {
  return user?.role === ROLES.LAWYER || user?.role === ROLES.ADMIN;
}

/**
 * Get admin navigation items based on user role
 */
export function getAdminNavItems(user: User | null) {
  if (!isAdmin(user)) return [];

  return [
    {
      name: 'Biblioteca Legal',
      href: '/admin/legal-library',
      icon: '📚',
      description: 'Gestión de documentos legales base',
    },
    {
      name: 'Carga Masiva',
      href: '/admin/bulk-upload',
      icon: '📤',
      description: 'Subir múltiples documentos',
    },
    {
      name: 'Usuarios',
      href: '/admin/users',
      icon: '👥',
      description: 'Gestión de usuarios y permisos',
    },
    {
      name: 'Embeddings',
      href: '/admin/embeddings',
      icon: '🧠',
      description: 'Control de vectorización',
    },
    {
      name: 'Analíticas',
      href: '/admin/analytics',
      icon: '📊',
      description: 'Métricas y estadísticas',
    },
  ];
}
