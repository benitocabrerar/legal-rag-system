'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { User, Settings, CreditCard, LogOut, ChevronDown, Calendar, CheckSquare, DollarSign, Briefcase } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
                Legal RAG
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  Casos
                </Link>
                <Link
                  href="/dashboard/calendar"
                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Calendario
                </Link>
                <Link
                  href="/dashboard/tasks"
                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Tareas
                </Link>
                <Link
                  href="/dashboard/finance"
                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Finanzas
                </Link>
                <Link
                  href="/pricing"
                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  Planes
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  Seguridad
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    Administración
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Menu Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/account"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      Mi Cuenta
                    </Link>
                    <Link
                      href="/account/billing"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      Facturación
                    </Link>
                    <Link
                      href="/account/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-500" />
                      Configuración
                    </Link>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
