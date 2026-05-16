'use client';

/**
 * Aviso de prueba — visible en el dashboard mientras el usuario está en la
 * prueba gratuita. Lee /me/entitlements; si la prueba está activa muestra
 * los días restantes, y si venció, un llamado a activar un plan.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface TrialInfo {
  trial: { active: boolean; expired: boolean; daysLeft: number | null; days: number };
}

export function TrialBanner() {
  const [info, setInfo] = useState<TrialInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<TrialInfo>('/me/entitlements')
      .then((r) => { if (!cancelled) setInfo(r.data); })
      .catch(() => { /* sin banner si falla */ });
    return () => { cancelled = true; };
  }, []);

  if (!info?.trial?.active) return null;

  const { expired, daysLeft } = info.trial;

  if (expired) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
        <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0" />
        <div className="flex-1 text-sm text-rose-800">
          <strong>Tu prueba gratuita finalizó.</strong> Activá un plan para seguir
          creando casos y usando las herramientas de IA.
        </div>
        <Link href="/pricing"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition whitespace-nowrap">
          Ver planes <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const days = daysLeft ?? 0;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
      <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 text-sm text-amber-900">
        <strong>Prueba gratuita.</strong> Te {days === 1 ? 'queda 1 día' : `quedan ${Math.max(0, days)} días`} de
        acceso completo. Elegí un plan cuando quieras para no perder tu trabajo.
      </div>
      <Link href="/pricing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition whitespace-nowrap">
        Ver planes <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
