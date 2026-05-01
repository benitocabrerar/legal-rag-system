'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import CountrySelector from '@/components/CountrySelector';
import { User, Settings, CreditCard, LogOut, ChevronDown, Calendar, CheckSquare, DollarSign, Briefcase, Command as CommandIcon, Menu, X, Scale, Shield, Sparkles } from 'lucide-react';
import { CommandPaletteProvider } from '@/components/CommandPalette';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { user, logout, loading } = useAuth();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Highlight active section. /dashboard exact, lo demás por prefix.
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // Iniciales del usuario para el avatar — más profesional que el ícono genérico.
  const initials = (user?.name ?? user?.email ?? '?')
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || '?';

  const navItems: Array<{ href: string; label: string; icon: typeof Calendar; admin?: boolean }> = [
    { href: '/dashboard',          label: t('navigation.cases'),    icon: Briefcase },
    { href: '/dashboard/calendar', label: t('navigation.calendar'), icon: Calendar },
    { href: '/dashboard/tasks',    label: t('navigation.tasks'),    icon: CheckSquare },
    { href: '/dashboard/finance',  label: t('navigation.finance'),  icon: DollarSign },
  ];

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
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Top navigation — sobrio, ejecutivo, con barra de acento al pie. */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70 shadow-[0_1px_0_0_rgba(15,23,42,0.04)]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-7">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Brand + nav */}
            <div className="flex items-center gap-3 sm:gap-6 min-w-0">
              {/* Mobile hamburger */}
              <button
                onClick={() => setShowMobileNav((v) => !v)}
                className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Abrir navegación"
              >
                {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Brand */}
              <Link href="/dashboard" className="flex items-center gap-2 group/brand shrink-0">
                <span className="relative inline-flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white items-center justify-center shadow-sm ring-1 ring-slate-900/10 group-hover/brand:ring-slate-900/20 transition">
                  <Scale className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.2} />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-[15px] sm:text-base font-bold tracking-tight text-slate-900">Poweria <span className="text-slate-500 font-semibold">Legal</span></span>
                  <span className="hidden sm:block text-[9px] uppercase tracking-[0.18em] text-slate-400 font-semibold mt-0.5">por COGNITEX</span>
                </span>
              </Link>

              {/* Primary nav */}
              <div className="hidden md:flex items-center gap-0.5 ml-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group/nav relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors',
                        active
                          ? 'text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
                      )}
                    >
                      <Icon className={cn('w-4 h-4 transition-colors', active ? 'text-indigo-600' : 'text-slate-400 group-hover/nav:text-slate-500')} strokeWidth={2.2} />
                      {item.label}
                      {active && (
                        <span className="absolute -bottom-[10px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" />
                      )}
                    </Link>
                  );
                })}

                {user.role === 'admin' && (
                  <div className="ml-1.5 pl-2 border-l border-slate-200 flex items-center gap-0.5">
                    <Link
                      href="/admin"
                      className={cn(
                        'group/adm relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors',
                        isActive('/admin') && !isActive('/admin/payhub')
                          ? 'text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
                      )}
                    >
                      <Shield className={cn('w-4 h-4', isActive('/admin') && !isActive('/admin/payhub') ? 'text-amber-600' : 'text-slate-400 group-hover/adm:text-slate-500')} strokeWidth={2.2} />
                      {t('navigation.admin')}
                      {isActive('/admin') && !isActive('/admin/payhub') && (
                        <span className="absolute -bottom-[10px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-amber-500 to-rose-500" />
                      )}
                    </Link>
                    <Link
                      href="/admin/payhub"
                      className={cn(
                        'group/adm relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors',
                        isActive('/admin/payhub')
                          ? 'text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
                      )}
                    >
                      <CreditCard className={cn('w-4 h-4', isActive('/admin/payhub') ? 'text-emerald-600' : 'text-slate-400 group-hover/adm:text-slate-500')} strokeWidth={2.2} />
                      Payhub
                      {isActive('/admin/payhub') && (
                        <span className="absolute -bottom-[10px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                      )}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Cmd+K trigger */}
              <button
                onClick={() => {
                  const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true });
                  window.dispatchEvent(ev);
                }}
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50/80 hover:bg-white hover:text-slate-700 rounded-lg border border-slate-200/70 transition-all hover:shadow-sm"
                title="Buscar y comandos rápidos (⌘K)"
              >
                <CommandIcon className="w-3.5 h-3.5" />
                <span>Buscar…</span>
                <kbd className="ml-1 font-mono font-semibold bg-white border border-slate-200 px-1 rounded text-[10px] text-slate-500">⌘K</kbd>
              </button>

              {/* Country */}
              <CountrySelector variant="compact" />

              {/* User dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className={cn(
                    'flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl border transition-all',
                    showUserMenu
                      ? 'border-slate-300 bg-white shadow-sm'
                      : 'border-transparent hover:border-slate-200 hover:bg-white',
                  )}
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                >
                  <span
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-[12px] font-bold flex items-center justify-center shadow-sm ring-1 ring-white/30"
                    aria-hidden
                  >
                    {initials}
                  </span>
                  <span className="text-left hidden lg:flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900 truncate max-w-[150px]">{user.name}</span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[150px] flex items-center gap-1">
                      {user.role === 'admin' && <Shield className="w-2.5 h-2.5 text-amber-500" />}
                      {user.role === 'admin' ? 'Administrador' : user.email}
                    </span>
                  </span>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform hidden md:block', showUserMenu && 'rotate-180')} />
                </button>

                {showUserMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/5 border border-slate-200/70 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-4 py-3 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-sm font-bold flex items-center justify-center shadow-sm ring-1 ring-white/30 shrink-0">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                          {user.role === 'admin' && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              <Shield className="w-2.5 h-2.5" />
                              Administrador
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        {t('navigation.account')}
                      </Link>
                      <Link
                        href="/account/billing"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        {t('navigation.billing')}
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        {t('common.settings')}
                      </Link>
                      <Link
                        href="/pricing"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        <span>{t('navigation.pricing')}</span>
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">Pro</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100">
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await logout();
                          router.replace('/');
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('common.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer — más limpio, con sección activa resaltada. */}
      {showMobileNav && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowMobileNav(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-14 sm:top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-2xl py-2 px-3 space-y-0.5 max-h-[calc(100vh-3.5rem)] overflow-y-auto"
          >
            {[
              ...navItems,
              { href: '/dashboard/settings', label: t('settings.security'), icon: Settings },
              { href: '/pricing',            label: t('navigation.pricing'), icon: CreditCard },
            ].map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  onClick={() => setShowMobileNav(false)}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors',
                    active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-slate-400')} />
                  {item.label}
                </Link>
              );
            })}
            {user.role === 'admin' && (
              <>
                <div className="my-1.5 border-t border-slate-200" />
                <Link onClick={() => setShowMobileNav(false)} href="/admin"
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors',
                    isActive('/admin') && !isActive('/admin/payhub')
                      ? 'bg-amber-50 text-amber-900' : 'text-slate-700 hover:bg-slate-100',
                  )}>
                  <Shield className="w-4 h-4 text-amber-600" />{t('navigation.admin')}
                </Link>
                <Link onClick={() => setShowMobileNav(false)} href="/admin/payhub"
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors',
                    isActive('/admin/payhub')
                      ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700 hover:bg-slate-100',
                  )}>
                  <CreditCard className="w-4 h-4 text-emerald-600" />Payhub
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>

      {/* Cmd+K command palette — global */}
      <CommandPaletteProvider />
    </div>
  );
}
