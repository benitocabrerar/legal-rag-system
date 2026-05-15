'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isAdmin, getAdminNavItems } from '@/lib/admin-middleware';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const navItems = getAdminNavItems(user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin(user)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Cerrar sidebar al navegar en mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-700"
                aria-label="Abrir menú"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link
                href="/admin"
                className="text-base sm:text-xl font-bold text-indigo-600 truncate"
              >
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Legal RAG Admin</span>
              </Link>
            </div>

            <Link
              href="/dashboard"
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <span className="sm:hidden">← Dashboard</span>
              <span className="hidden sm:inline">← Volver al Dashboard</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Backdrop mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-14 sm:top-16 left-0 z-40
            w-72 lg:w-64 bg-white border-r
            h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]
            overflow-y-auto p-4 lg:p-6
            transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-[11px] text-gray-500 line-clamp-1">{item.description}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
