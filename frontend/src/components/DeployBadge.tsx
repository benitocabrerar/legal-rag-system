'use client';

/**
 * DeployBadge — pequeña pastilla fija (bottom-left) que muestra el commit SHA
 * y la fecha del build actual. Click → expande y permite copiar al clipboard
 * el identificador completo del deploy para reportar al equipo de ingeniería.
 *
 * Lee variables inyectadas en build-time:
 *   - NEXT_PUBLIC_GIT_SHA      (commit SHA largo)
 *   - NEXT_PUBLIC_BUILD_TIME   (ISO timestamp del build)
 *   - NEXT_PUBLIC_VERCEL_ENV   (production | preview | development)
 *
 * En Vercel: configurar como Build Environment Variables vinculadas a las
 * variables nativas:
 *   NEXT_PUBLIC_GIT_SHA    = $VERCEL_GIT_COMMIT_SHA
 *   NEXT_PUBLIC_BUILD_TIME = $VERCEL_BUILD_TIME  (o usar new Date() en build)
 *   NEXT_PUBLIC_VERCEL_ENV = $VERCEL_ENV
 *
 * Si las vars no existen, se hace fallback graceful sin romper la UI.
 */

import { useState } from 'react';
import { Check, Copy, GitCommit, X } from 'lucide-react';

const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA || '';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || '';
const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV || '';

const sha7 = GIT_SHA ? GIT_SHA.slice(0, 7) : 'local';
const buildDate = (() => {
  if (!BUILD_TIME) return '';
  try {
    const d = new Date(BUILD_TIME);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return ''; }
})();

const ENV_COLOR: Record<string, string> = {
  production: 'text-emerald-300',
  preview: 'text-amber-300',
  development: 'text-blue-300',
};

export default function DeployBadge() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!GIT_SHA && !BUILD_TIME && !VERCEL_ENV) {
    // En local sin las vars: NO renderizar nada.
    return null;
  }

  const fullId = `commit=${GIT_SHA || 'unknown'} build=${BUILD_TIME || 'unknown'} env=${VERCEL_ENV || 'unknown'}`;

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Información del deploy actual"
        className="
          fixed bottom-3 left-3 z-40
          inline-flex items-center gap-1.5 px-2.5 py-1.5
          rounded-full bg-slate-900/85 hover:bg-slate-900 backdrop-blur-sm
          text-[11px] font-mono text-slate-200 shadow-lg
          ring-1 ring-white/10 hover:ring-white/20
          transition-all hover:scale-[1.02]
        "
      >
        <GitCommit className="w-3 h-3 opacity-70" />
        <span className="font-semibold">{sha7}</span>
        {VERCEL_ENV && (
          <span className={`uppercase text-[9px] tracking-wider font-bold ${ENV_COLOR[VERCEL_ENV] || 'text-slate-400'}`}>
            {VERCEL_ENV === 'production' ? 'prod' : VERCEL_ENV.slice(0, 4)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="
        fixed bottom-3 left-3 z-40
        w-[300px] rounded-xl bg-slate-900 text-slate-100 shadow-2xl
        ring-1 ring-white/10 overflow-hidden
        animate-in fade-in slide-in-from-bottom-2 duration-200
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
          <GitCommit className="w-3 h-3" />
          Deploy info
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rows */}
      <div className="p-3 space-y-2.5 text-xs">
        <Row label="Commit" value={GIT_SHA || '—'} onCopy={() => onCopy(GIT_SHA)} mono />
        <Row label="Short SHA" value={sha7} onCopy={() => onCopy(sha7)} mono />
        <Row label="Build" value={buildDate || BUILD_TIME || '—'} onCopy={() => onCopy(BUILD_TIME)} />
        <Row label="Env"   value={VERCEL_ENV || '—'} mono colorClass={ENV_COLOR[VERCEL_ENV] || 'text-slate-300'} />

        {/* Copy all */}
        <button
          onClick={() => onCopy(fullId)}
          className="
            w-full mt-1 inline-flex items-center justify-center gap-1.5
            px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10
            text-xs font-semibold text-slate-200 border border-white/10
            transition
          "
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '¡Copiado!' : 'Copiar todo'}
        </button>
      </div>
    </div>
  );
}

function Row({
  label, value, mono = false, colorClass = 'text-slate-100', onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  colorClass?: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 w-16 flex-shrink-0">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${colorClass} flex-1 truncate`} title={value}>
        {value}
      </span>
      {onCopy && (
        <button
          onClick={onCopy}
          aria-label={`Copiar ${label}`}
          className="opacity-30 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition"
        >
          <Copy className="w-3 h-3 text-slate-400" />
        </button>
      )}
    </div>
  );
}
