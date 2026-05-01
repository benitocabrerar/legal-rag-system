'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Briefcase, Hash, User, Clock, MapPin, Video, Calendar } from 'lucide-react';
import type { LitigationBrief } from '@/lib/api';

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

      {next && (
        <div className="rounded-xl bg-gradient-to-br from-rose-950/60 via-rose-900/40 to-orange-900/40 border border-rose-500/40 p-3 shadow-lg shadow-rose-500/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300 mb-1.5">Próxima audiencia</div>
          <div className="text-sm font-bold text-rose-50">{next.title}</div>
          <div className="mt-1.5 space-y-1 text-[11px] text-rose-200">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              <span className="capitalize">
                {format(parseISO(next.startTime), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {format(parseISO(next.startTime), 'HH:mm')} – {format(parseISO(next.endTime), 'HH:mm')}
            </div>
            {next.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{next.location}</span>
              </div>
            )}
            {next.meetingLink && (
              <a href={next.meetingLink} target="_blank" rel="noreferrer"
                 className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition-colors">
                <Video className="w-3 h-3" />
                Unirse a la videollamada
              </a>
            )}
          </div>
        </div>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center bg-slate-800/40 rounded-lg py-1.5">
      <div className="text-base font-bold text-slate-100 tabular-nums">{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
