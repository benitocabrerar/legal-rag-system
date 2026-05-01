'use client';

import { useEffect, useState } from 'react';
import {
  Video, MapPin, Clock, FileText, KeyRound, Copy, Check, ExternalLink, Calendar, Radio,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LitigationEvent } from '@/lib/api';
import { cn } from '@/lib/utils';

const PROVIDER_STYLE: Record<string, { label: string; emoji: string; gradient: string }> = {
  zoom:      { label: 'Zoom',             emoji: '🎥', gradient: 'from-sky-500 to-blue-600' },
  teams:     { label: 'Microsoft Teams',  emoji: '💼', gradient: 'from-indigo-500 to-violet-600' },
  meet:      { label: 'Google Meet',      emoji: '📹', gradient: 'from-emerald-500 to-teal-600' },
  webex:     { label: 'Cisco Webex',      emoji: '🛰️', gradient: 'from-orange-500 to-amber-600' },
  jitsi:     { label: 'Jitsi Meet',       emoji: '🟦', gradient: 'from-cyan-500 to-sky-600' },
  whereby:   { label: 'Whereby',          emoji: '🟪', gradient: 'from-violet-500 to-fuchsia-600' },
  skype:     { label: 'Skype',            emoji: '🔵', gradient: 'from-sky-400 to-blue-500' },
  in_person: { label: 'Audiencia presencial', emoji: '🏛️', gradient: 'from-amber-600 to-orange-700' },
  other:     { label: 'Videollamada',     emoji: '📡', gradient: 'from-slate-600 to-slate-800' },
};

interface Props {
  event: LitigationEvent;
}

export function HearingJoinCard({ event }: Props) {
  const start = parseISO(event.startTime);
  const end = parseISO(event.endTime);
  const provider = (event.convocatoria?.provider ?? 'other').toLowerCase();
  const style = PROVIDER_STYLE[provider] ?? PROVIDER_STYLE.other;
  const conv = event.convocatoria;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Status: upcoming | imminent (≤15 min) | live (between start-end) | ended.
  const msToStart = start.getTime() - now.getTime();
  const status: 'upcoming' | 'imminent' | 'live' | 'ended' =
    now > end ? 'ended'
    : now >= start ? 'live'
    : msToStart <= 15 * 60 * 1000 ? 'imminent'
    : 'upcoming';

  const countdown = (() => {
    const total = Math.max(0, Math.floor(msToStart / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  })();

  const [copied, setCopied] = useState<'link' | 'pass' | null>(null);
  const copy = (text: string, kind: 'link' | 'pass') => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className={cn(
      'relative rounded-2xl border-2 overflow-hidden shadow-2xl',
      status === 'ended'    && 'border-slate-700 opacity-70',
      status === 'imminent' && 'border-amber-400/60 ring-4 ring-amber-500/20 animate-pulse-slow',
      status === 'live'     && 'border-rose-400/70 ring-4 ring-rose-500/30',
      status === 'upcoming' && 'border-slate-600/60',
    )}>
      <div className={cn('absolute inset-0 opacity-30 bg-gradient-to-br', style.gradient)} />
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />

      <div className="relative p-4 lg:p-5 text-slate-100 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
                status === 'live'     && 'bg-rose-500/20 text-rose-200 border border-rose-400/40',
                status === 'imminent' && 'bg-amber-500/20 text-amber-200 border border-amber-400/40',
                status === 'upcoming' && 'bg-slate-700/50 text-slate-200 border border-slate-500/40',
                status === 'ended'    && 'bg-slate-800/70 text-slate-400 border border-slate-700',
              )}>
                {status === 'live' && <Radio className="w-3 h-3 animate-pulse" />}
                {status === 'live'     ? 'En curso'
                  : status === 'imminent' ? 'Inminente'
                  : status === 'upcoming' ? 'Próxima'
                  : 'Finalizada'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300/80">
                Convocatoria · {style.emoji} {style.label}
              </span>
            </div>
            <h3 className="text-lg lg:text-xl font-black leading-tight">{event.title}</h3>
            <p className="text-[12px] text-slate-300 mt-0.5 capitalize">
              <Calendar className="inline w-3 h-3 mr-1" />
              {format(start, "EEEE d 'de' MMMM, yyyy", { locale: es })}
              <span className="mx-2 text-slate-500">·</span>
              <Clock className="inline w-3 h-3 mr-1" />
              {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
            </p>
          </div>

          {status !== 'ended' && (
            <div className="text-right shrink-0">
              <div className={cn(
                'text-[10px] font-bold uppercase tracking-widest',
                status === 'live' ? 'text-rose-300' : status === 'imminent' ? 'text-amber-300' : 'text-slate-400',
              )}>
                {status === 'live' ? 'Comenzó hace' : 'Empieza en'}
              </div>
              <div className={cn(
                'font-mono font-black tabular-nums tracking-tight',
                status === 'live'     ? 'text-rose-200 text-2xl' :
                status === 'imminent' ? 'text-amber-200 text-2xl' :
                                        'text-slate-100 text-xl',
              )}>
                {status === 'live'
                  ? formatLive(now.getTime() - start.getTime())
                  : countdown}
              </div>
            </div>
          )}
        </div>

        {conv?.source && (
          <div className="flex items-start gap-2 rounded-xl bg-slate-900/60 border border-slate-700/60 p-2.5">
            <FileText className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Fuente de la convocatoria</div>
              <p className="text-[12px] text-slate-200 mt-0.5 leading-relaxed">{conv.source}</p>
            </div>
          </div>
        )}

        {event.location && provider === 'in_person' && (
          <div className="flex items-start gap-2 rounded-xl bg-slate-900/60 border border-slate-700/60 p-2.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-300 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Lugar</div>
              <p className="text-[12px] text-slate-200 mt-0.5 leading-relaxed">{event.location}</p>
            </div>
          </div>
        )}

        {conv?.passcode && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-700/60 px-2.5 py-2">
            <KeyRound className="w-3.5 h-3.5 text-violet-300 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Código / Contraseña</div>
              <code className="text-sm font-bold font-mono text-slate-100 tabular-nums">{conv.passcode}</code>
            </div>
            <button
              onClick={() => copy(conv.passcode!, 'pass')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/70 text-slate-200 hover:bg-slate-700 text-[10px] font-bold transition-colors"
              title="Copiar código"
            >
              {copied === 'pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied === 'pass' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {event.meetingLink ? (
            <>
              <a
                href={event.meetingLink}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'group/join inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg',
                  status === 'live'     && 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/40 animate-pulse',
                  status === 'imminent' && 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/40',
                  status === 'upcoming' && 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/40',
                  status === 'ended'    && 'bg-slate-700 text-slate-300 cursor-not-allowed pointer-events-none',
                )}
              >
                <Video className="w-4 h-4" />
                {status === 'ended'    ? 'Enlace caducado'
                  : status === 'live'     ? 'Unirse ahora'
                  : status === 'imminent' ? 'Unirse a la audiencia'
                  : 'Unirse cuando comience'}
                <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover/join:opacity-100" />
              </a>
              <button
                onClick={() => copy(event.meetingLink!, 'link')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold transition-colors"
                title="Copiar enlace de la audiencia"
              >
                {copied === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'link' ? 'Copiado' : 'Copiar enlace'}
              </button>
            </>
          ) : provider === 'in_person' ? (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-100 font-bold text-sm">
              <MapPin className="w-4 h-4" />
              Audiencia presencial
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Sin enlace de videollamada en la convocatoria.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatLive(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
