'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tour catalog ───────────────────────────────────────────

export interface TourStep {
  /** Selector CSS al elemento real a resaltar. Si no se encuentra, el paso se muestra centrado sin spotlight. */
  target?: string;
  title: string;
  body: string;
  /** Posición preferida del tooltip respecto al target. */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface Tour {
  id: string;
  label: string;
  steps: TourStep[];
}

export const TOURS: Record<string, Tour> = {
  'dashboard': {
    id: 'dashboard',
    label: 'Tour del dashboard',
    steps: [
      { title: '👋 Bienvenido a Poweria Legal',
        body: 'Te muestro en 60 segundos lo esencial del dashboard. Puedes saltar este tour cuando quieras.',
        placement: 'center' },
      { target: '[data-tour="nav-cases"]', placement: 'bottom',
        title: 'Tus casos',
        body: 'Aquí ves todos los casos. El número activo se muestra en el navbar superior.' },
      { target: '[data-tour="nav-calendar"]', placement: 'bottom',
        title: 'Calendario',
        body: 'Mes, semana, día y agenda con drag-and-drop. Atajos rápidos: M S D A T.' },
      { target: '[data-tour="nav-tasks"]', placement: 'bottom',
        title: 'Tareas',
        body: 'Kanban con sub-tareas, plantillas legales y sugerencias IA. Workload insights al tope.' },
      { target: '[data-tour="nav-finance"]', placement: 'bottom',
        title: 'Finanzas',
        body: 'CFO virtual con aging, forecast 4 semanas y "Facturar desde tareas" en un click.' },
      { target: '[data-tour="cmdk-trigger"]', placement: 'bottom',
        title: 'Cmd+K — atajo rey',
        body: 'Abre la paleta para crear tareas, eventos, navegar o ejecutar acciones rápidas en cualquier pantalla.' },
      { target: '[data-tour="user-menu"]', placement: 'bottom',
        title: 'Tu cuenta',
        body: 'Settings, billing, pricing y cerrar sesión. Si eres administrador, verás un chip "Administrador" en el avatar.' },
      { title: '🎯 Listo',
        body: 'Para volver a este tour usa el botón ? abajo a la derecha o ⌘K → "Iniciar tour de esta página". También tienes el Centro de ayuda en /help.',
        placement: 'center' },
    ],
  },
  'calendar': {
    id: 'calendar',
    label: 'Tour del calendario',
    steps: [
      { title: '🗓️ Calendario en 30 segundos',
        body: 'Un calendar real, no una agenda de papel digitalizada.', placement: 'center' },
      { title: 'Vistas',
        body: 'Mes (M), Semana (S), Día (D), Agenda (A). T te lleva a hoy.',
        placement: 'center' },
      { title: 'Drag-and-drop',
        body: 'En vista mes, arrastra eventos entre días — la hora se preserva.',
        placement: 'center' },
      { title: 'Convocatoria desde providencia',
        body: 'Al crear un evento, sube el PDF de la providencia y la IA llena fecha, hora, link y código automáticamente. ✨',
        placement: 'center' },
    ],
  },
  'tasks': {
    id: 'tasks',
    label: 'Tour de tareas',
    steps: [
      { title: '⚡ Tareas Kanban',
        body: 'Drag-drop entre TODO / IN_PROGRESS / DONE. Quick-add inline. Plantillas legales.', placement: 'center' },
      { title: 'Sugerir subtareas con IA',
        body: 'Dentro del TaskDialog, botón ✨ "Sugerir con IA" — la IA divide la tarea en 4-7 sub-pasos accionables.',
        placement: 'center' },
      { title: 'Plantillas legales',
        body: 'Botón ✨ Plantillas: Demanda Civil, Audiencia preliminar, Revisión contractual, Recurso de apelación.',
        placement: 'center' },
      { title: 'Workload insights',
        body: '8 KPIs arriba: vencidas, hoy, esta semana, urgentes, sin asignar, en progreso, completadas en 7d, total.',
        placement: 'center' },
    ],
  },
  'finance': {
    id: 'finance',
    label: 'Tour de finanzas',
    steps: [
      { title: '💼 Tu CFO virtual',
        body: 'No es solo facturas: es momentum, aging, forecast y la mayor preocupación accionable interpretada por IA.',
        placement: 'center' },
      { title: 'Resumen / Cobranza / Reportes',
        body: 'Tres pestañas. Cobranza muestra vencidas con barras de severidad por antigüedad.',
        placement: 'center' },
      { title: 'Facturar desde tareas',
        body: 'Botón violeta "Facturar desde tareas" — selecciona tareas DONE, ajusta tarifa e IVA, genera factura + PDF al instante.',
        placement: 'center' },
      { title: 'Lectura del CFO',
        body: 'El card violeta interpreta tus métricas en 2-3 frases. Refresca cuando cambien tus números.',
        placement: 'center' },
    ],
  },
  'litigation': {
    id: 'litigation',
    label: 'Tour de Sala de Litigación',
    steps: [
      { title: '⚖️ Sala de Litigación',
        body: 'Pantalla completa para usar durante la audiencia: cronómetro, brief, cronología, tarjetas IA y chat con el caso pre-cargado.',
        placement: 'center' },
      { title: 'Tarjetas argumentales (1)',
        body: 'Apertura, hechos, fundamento, prueba, refutación, réplica, cierre — generadas por IA con citas verificables.',
        placement: 'center' },
      { title: 'Buscar artículo (4)',
        body: 'Cita "Art. 76 Constitución" o "234 COIP" y obtén el contenido completo en un segundo, leído en voz alta opcional.',
        placement: 'center' },
      { title: 'Atajos',
        body: '1/2/3/4 cambia tab · ⌘/ busca artículo · F fullscreen · ←/→ navega tarjetas · ␣ marca expuesta · P modo presentador.',
        placement: 'center' },
    ],
  },
};

// ─── Provider ───────────────────────────────────────────────

interface TourContextValue {
  start: (tourId: string) => void;
  isCompleted: (tourId: string) => boolean;
  reset: (tourId?: string) => void;
}

const TourContext = createContext<TourContextValue | null>(null);
const STORAGE = 'poweria-tours-completed';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const completed = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE);
      if (raw) completed.current = new Set(JSON.parse(raw));
    } catch { /* */ }
  }, []);

  const persistCompleted = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE, JSON.stringify(Array.from(completed.current)));
  };

  const start = useCallback((tourId: string) => {
    if (!TOURS[tourId]) return;
    setStepIdx(0);
    setActiveId(tourId);
  }, []);

  // Permite que Cmd+K dispare un tour vía CustomEvent.
  useEffect(() => {
    const onStart = (e: any) => {
      const id = e?.detail?.id as string | undefined;
      if (id) start(id);
    };
    window.addEventListener('poweria-start-tour', onStart as any);
    return () => window.removeEventListener('poweria-start-tour', onStart as any);
  }, [start]);

  const isCompleted = useCallback((tourId: string) => completed.current.has(tourId), []);
  const reset = useCallback((tourId?: string) => {
    if (tourId) completed.current.delete(tourId);
    else completed.current.clear();
    persistCompleted();
  }, []);

  const close = useCallback((mark: boolean) => {
    if (mark && activeId) {
      completed.current.add(activeId);
      persistCompleted();
    }
    setActiveId(null);
    setStepIdx(0);
  }, [activeId]);

  const tour = activeId ? TOURS[activeId] : null;
  const step = tour?.steps[stepIdx];

  // Keyboard nav
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'ArrowRight') {
        if (stepIdx < tour.steps.length - 1) setStepIdx((i) => i + 1);
        else close(true);
      } else if (e.key === 'ArrowLeft') setStepIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour, stepIdx, close]);

  const ctx = useMemo<TourContextValue>(() => ({ start, isCompleted, reset }), [start, isCompleted, reset]);

  return (
    <TourContext.Provider value={ctx}>
      {children}
      {tour && step && (
        <TourOverlay
          tour={tour}
          stepIdx={stepIdx}
          step={step}
          onPrev={() => setStepIdx((i) => Math.max(0, i - 1))}
          onNext={() => {
            if (stepIdx < tour.steps.length - 1) setStepIdx((i) => i + 1);
            else close(true);
          }}
          onSkip={() => close(false)}
          onFinish={() => close(true)}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
}

// ─── Overlay rendering ──────────────────────────────────────

function TourOverlay({
  tour, stepIdx, step, onPrev, onNext, onSkip, onFinish,
}: {
  tour: Tour;
  stepIdx: number;
  step: TourStep;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Recalcula el target al cambiar de step o al re-layout.
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (!step.target) { setRect(null); return; }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // Wait a tick for the scroll to land before measuring.
      requestAnimationFrame(() => {
        if (cancelled) return;
        setRect(el.getBoundingClientRect());
      });
    };
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [step.target, stepIdx]);

  const isLast = stepIdx === tour.steps.length - 1;

  // Posicionamiento del popover.
  const popoverStyle: React.CSSProperties = (() => {
    const margin = 16;
    const w = 360;
    const h = 200;
    if (!rect || step.placement === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: w,
      };
    }
    const placement = step.placement ?? 'bottom';
    let top = 0, left = 0;
    if (placement === 'bottom') { top = rect.bottom + margin; left = rect.left + rect.width / 2 - w / 2; }
    else if (placement === 'top') { top = rect.top - h - margin; left = rect.left + rect.width / 2 - w / 2; }
    else if (placement === 'left') { top = rect.top + rect.height / 2 - h / 2; left = rect.left - w - margin; }
    else if (placement === 'right') { top = rect.top + rect.height / 2 - h / 2; left = rect.right + margin; }
    // Clamp viewport.
    if (typeof window !== 'undefined') {
      left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
    }
    return { position: 'fixed' as const, top, left, width: w };
  })();

  // SVG mask que oscurece todo menos el rect del target.
  return (
    <div className="fixed inset-0 z-[100]">
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={onSkip}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && step.target && step.placement !== 'center' && (
              <rect
                x={rect.left - 8}
                y={rect.top - 8}
                width={rect.width + 16}
                height={rect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(15,23,42,0.7)" mask="url(#tour-mask)" />
        {rect && step.target && step.placement !== 'center' && (
          <rect
            x={rect.left - 8}
            y={rect.top - 8}
            width={rect.width + 16}
            height={rect.height + 16}
            rx="12"
            fill="none"
            stroke="rgba(167,139,250,0.9)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Popover */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-700">
            <Sparkles className="w-3 h-3" />
            {tour.label}
          </div>
          <button onClick={onSkip} className="text-slate-400 hover:text-slate-700 p-1 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          <h3 className="text-base font-black text-slate-900 leading-tight">{step.title}</h3>
          <p className="text-[13px] text-slate-600 leading-relaxed">{step.body}</p>
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {tour.steps.map((_, i) => (
              <span
                key={i}
                className={cn('w-1.5 h-1.5 rounded-full',
                  i === stepIdx ? 'bg-violet-600 w-4' : 'bg-slate-300',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {stepIdx > 0 && (
              <button
                onClick={onPrev}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
            )}
            {!isLast ? (
              <button
                onClick={onNext}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md hover:shadow-lg"
              >
                Siguiente
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-br from-emerald-600 to-teal-600 shadow-md"
              >
                Listo ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
