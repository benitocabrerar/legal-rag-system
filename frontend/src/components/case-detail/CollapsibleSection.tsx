'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronDown, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CompletionState = 'complete' | 'partial' | 'empty' | 'unknown';

interface Props {
  /** Persistencia por caso — stable string única. */
  storageKey: string;
  title: string;
  /** Subtítulo opcional. */
  description?: string;
  icon?: React.ReactNode;
  /** Estado de completitud. Si es 'partial' o 'empty', muestra warning visible incluso colapsado. */
  completion?: CompletionState;
  /** Mensaje corto (máx ~60 chars) que aparece junto al badge cuando hay partial/empty. */
  completionHint?: string;
  /** Comando externo: 'open' | 'closed' | null. Cuando cambia, se aplica.
   *  Útil para Expandir/Colapsar todo. */
  forceState?: 'open' | 'closed' | null;
  /** Estado inicial cuando no hay valor en localStorage. Default: open. */
  defaultOpen?: boolean;
  /** Acciones extra a la derecha del header (no abren/cierran). */
  rightSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Sección colapsable con indicador de completitud.
 *
 * - Persiste estado open/closed por caso en localStorage.
 * - Expone un comando "open all / close all" vía la prop forceState.
 * - Badge accesible con el estado: completo (✓ verde), parcial (◐ ámbar),
 *   vacío (! rojo), desconocido (○ slate).
 * - Cuando está colapsado y el estado es partial/empty, el header muestra
 *   un sutil acento de color en el borde superior para que el usuario sepa
 *   "ahí falta info" sin tener que abrir.
 */
export function CollapsibleSection({
  storageKey, title, description, icon, completion = 'unknown',
  completionHint, forceState, defaultOpen = true, rightSlot, className, children,
}: Props) {
  const fallbackId = useId();
  const fullKey = `case-section:${storageKey}:${fallbackId.replace(/[^a-z0-9]/gi, '')}`.slice(0, 80);
  // Hydration-safe: primera render es siempre defaultOpen, después leemos LS.
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(`case-section:${storageKey}`);
    if (raw === '1') setOpen(true);
    else if (raw === '0') setOpen(false);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`case-section:${storageKey}`, open ? '1' : '0');
  }, [open, storageKey, hydrated]);

  // Comando externo "expand all / collapse all".
  useEffect(() => {
    if (forceState === 'open') setOpen(true);
    else if (forceState === 'closed') setOpen(false);
  }, [forceState]);

  const palette = COMPLETION_PALETTE[completion];

  return (
    <section
      className={cn(
        'group/sect bg-white rounded-xl border transition-all overflow-hidden',
        completion === 'partial' || completion === 'empty'
          ? `${palette.borderClosed}` : 'border-slate-200',
        className,
      )}
      // Pequeña barra superior de color cuando hay info faltante: visible
      // incluso si la sección está cerrada.
      style={
        completion === 'partial' || completion === 'empty'
          ? { boxShadow: `inset 0 3px 0 0 ${palette.accent}` }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 text-left transition-colors',
          open ? 'bg-white' : 'bg-white hover:bg-slate-50',
        )}
      >
        {icon && (
          <span className={cn('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', palette.iconBg)}>
            {icon}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">{title}</h2>
            <CompletionBadge state={completion} hint={completionHint} />
          </div>
          {description && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>

        {rightSlot && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {rightSlot}
          </div>
        )}

        <ChevronDown
          className={cn(
            'shrink-0 w-4 h-4 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </section>
  );
}

const COMPLETION_PALETTE: Record<CompletionState, {
  iconBg: string;
  borderClosed: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  label: string;
}> = {
  complete: {
    iconBg: 'bg-emerald-50 text-emerald-700',
    borderClosed: 'border-slate-200',
    accent: '#10b981',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    label: 'Completo',
  },
  partial: {
    iconBg: 'bg-amber-50 text-amber-700',
    borderClosed: 'border-amber-200',
    accent: '#f59e0b',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    label: 'Faltan datos',
  },
  empty: {
    iconBg: 'bg-rose-50 text-rose-700',
    borderClosed: 'border-rose-200',
    accent: '#f43f5e',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    label: 'Sin información',
  },
  unknown: {
    iconBg: 'bg-slate-100 text-slate-600',
    borderClosed: 'border-slate-200',
    accent: '#64748b',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-600',
    label: '—',
  },
};

function CompletionBadge({ state, hint }: { state: CompletionState; hint?: string }) {
  if (state === 'unknown') return null;
  const p = COMPLETION_PALETTE[state];
  const Icon = state === 'complete' ? CheckCircle2 : state === 'empty' ? AlertCircle : Circle;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
      p.badgeBg, p.badgeText,
      state === 'complete' && 'border-emerald-200',
      state === 'partial' && 'border-amber-200',
      state === 'empty' && 'border-rose-200',
    )} title={hint}>
      <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
      <span className="truncate max-w-[180px]">{hint ? hint : p.label}</span>
    </span>
  );
}

// ─── Top control bar — Expand/Collapse all ─────────────────

interface ToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  /** Resumen agregado de completitud para el caso completo. */
  totals: { complete: number; partial: number; empty: number };
}

export function SectionsToolbar({ onExpandAll, onCollapseAll, totals }: ToolbarProps) {
  const hasIssues = totals.partial > 0 || totals.empty > 0;
  return (
    <div className={cn(
      'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5',
      hasIssues
        ? 'bg-gradient-to-r from-amber-50 to-rose-50 border-amber-200'
        : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200',
    )}>
      <div className="flex items-center gap-2.5 min-w-0">
        {hasIssues ? (
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        )}
        <div className="text-[12px] font-semibold text-slate-700 leading-snug min-w-0">
          {hasIssues ? (
            <>
              {totals.empty > 0 && (
                <span className="text-rose-700">
                  {totals.empty} sección{totals.empty === 1 ? '' : 'es'} sin información
                </span>
              )}
              {totals.empty > 0 && totals.partial > 0 && <span className="text-slate-400 mx-1">·</span>}
              {totals.partial > 0 && (
                <span className="text-amber-700">
                  {totals.partial} con datos incompletos
                </span>
              )}
              <span className="text-slate-500 ml-1.5 hidden sm:inline">— ábrelas para completarlas.</span>
            </>
          ) : (
            <span className="text-emerald-700">Todas las secciones del caso están completas.</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onExpandAll}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          title="Expandir todo (E)"
        >
          <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          Abrir todo
        </button>
        <button
          onClick={onCollapseAll}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          title="Colapsar todo (Q)"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
          Cerrar todo
        </button>
      </div>
    </div>
  );
}
