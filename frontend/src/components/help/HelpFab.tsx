'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, BookOpen, Map, Keyboard, X, Play } from 'lucide-react';
import { useTour, TOURS } from './TourProvider';
import { cn } from '@/lib/utils';

/** FAB inferior-derecho con menú de ayuda. */
export function HelpFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const ref = useRef<HTMLDivElement>(null);
  const { start, isCompleted } = useTour();

  // Tour aplicable a la ruta actual.
  const currentTourId = pickTourForRoute(pathname);
  const currentTour = currentTourId ? TOURS[currentTourId] : null;

  // Auto-trigger del tour de dashboard la primera vez.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/dashboard') return;
    if (isCompleted('dashboard')) return;
    // Esperamos un tick para que el navbar haya montado los data-tour.
    const t = setTimeout(() => {
      try { start('dashboard'); } catch { /* */ }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Click outside cierra.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="absolute bottom-14 right-0 w-72 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600">
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/80">¿Necesitas ayuda?</div>
            <div className="text-sm font-bold text-white">Centro de ayuda y tours</div>
          </div>
          <div className="p-2 space-y-0.5">
            {currentTour && (
              <button
                onClick={() => { setOpen(false); start(currentTour.id); }}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-violet-50 text-left transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5 text-white" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-slate-900">Iniciar tour de esta página</div>
                  <div className="text-[11px] text-slate-500">{currentTour.label} · {currentTour.steps.length} pasos</div>
                </div>
              </button>
            )}

            <Link
              href="/help"
              onClick={() => setOpen(false)}
              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-slate-900">Centro de ayuda</div>
                <div className="text-[11px] text-slate-500">22 artículos sobre todo el producto</div>
              </div>
            </Link>

            <button
              onClick={() => {
                setOpen(false);
                const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true });
                window.dispatchEvent(ev);
              }}
              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                <Keyboard className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-slate-900">Comandos rápidos (⌘K)</div>
                <div className="text-[11px] text-slate-500">Crear, navegar, atajos</div>
              </div>
            </button>

            <Link
              href="/help#atajos-globales"
              onClick={() => setOpen(false)}
              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                <Map className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-slate-900">Mapa de atajos</div>
                <div className="text-[11px] text-slate-500">Todos los shortcuts en un lugar</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-white transition-all',
          open
            ? 'bg-slate-900 hover:bg-slate-800 rotate-45'
            : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:scale-110 shadow-violet-500/40',
        )}
        title="Ayuda"
        aria-label="Centro de ayuda"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </button>
    </div>
  );
}

function pickTourForRoute(pathname: string): string | null {
  if (pathname.startsWith('/admin/auth-events')) return 'admin-auth-events';
  if (pathname.startsWith('/admin/users')) return 'admin-users';
  if (pathname === '/admin' || pathname.startsWith('/admin')) return 'admin-overview';
  if (pathname.includes('/generate-document') || pathname.includes('/document-generator')) return 'doc-generator';
  if (pathname.startsWith('/dashboard/calendar')) return 'calendar';
  if (pathname.startsWith('/dashboard/tasks')) return 'tasks';
  if (pathname.startsWith('/dashboard/finance')) return 'finance';
  if (pathname.includes('/litigation')) return 'litigation';
  if (/\/dashboard\/cases\/[^/]+$/.test(pathname)) return 'case-detail';
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return 'dashboard';
  return null;
}
