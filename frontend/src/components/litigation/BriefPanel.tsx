'use client';

import { Briefcase, Hash, User } from 'lucide-react';
import type { LitigationBrief } from '@/lib/api';
import { HearingJoinCard } from './HearingJoinCard';

export function BriefPanel({ data }: { data: LitigationBrief }) {
  const c = data.case;
  const next = data.nextHearing;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1.5">Caso</div>
        <h2 className="text-sm font-bold text-slate-100 leading-snug">{c.title}</h2>
        {c.description && (
          <p className="mt-1 text-[12px] text-slate-400 leading-relaxed line-clamp-3">{c.description}</p>
        )}
        <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[11px]">
          {c.caseNumber && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Hash className="w-3 h-3 text-slate-500" />
              <span className="font-mono">{c.caseNumber}</span>
            </div>
          )}
          {c.clientName && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="w-3 h-3 text-slate-500" />
              {c.clientName}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Briefcase className="w-3 h-3 text-slate-500" />
            <span className="capitalize">{c.status}</span>
          </div>
        </div>
      </div>

      {next ? (
        <HearingJoinCard event={next} />
      ) : (
        <EmptyConvocatoria />
      )}

      <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Resumen</div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Documentos" value={data.counts.documents} />
          <Stat label="Eventos"    value={data.counts.events} />
          <Stat label="Tareas"     value={data.counts.tasks} />
        </div>
      </div>

      {data.finance && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Finanzas</div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <div className="text-slate-500 text-[10px]">Facturado</div>
              <div className="font-semibold text-slate-100 tabular-nums">${data.finance.totalBilled.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">Cobrado</div>
              <div className="font-semibold text-emerald-300 tabular-nums">${data.finance.totalPaid.toFixed(0)}</div>
            </div>
            <div className="col-span-2">
              <div className="text-slate-500 text-[10px]">Saldo</div>
              <div className="font-bold text-amber-300 text-base tabular-nums">${data.finance.totalOutstanding.toFixed(0)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyConvocatoria() {
  return (
    <div className="rounded-xl bg-amber-950/30 border-2 border-dashed border-amber-500/40 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">
        Sin convocatoria registrada
      </div>
      <p className="text-[11px] text-amber-100/80 leading-relaxed">
        Este caso aún no tiene un evento con enlace de audiencia.
        Para que aparezca aquí el botón "Unirse" debes crear un evento
        en el calendario y rellenar el bloque <span className="font-bold">"Convocatoria a la audiencia"</span>{' '}
        (fuente, proveedor, código y enlace).
      </p>
      <a
        href="/dashboard/calendar?new=1"
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 hover:text-amber-50 underline"
      >
        Ir a calendario →
      </a>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center bg-slate-800/40 rounded-lg py-1.5">
      <div className="text-base font-bold text-slate-100 tabular-nums">{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
