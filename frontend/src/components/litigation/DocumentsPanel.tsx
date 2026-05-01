'use client';

import { useState } from 'react';
import { FileText, ChevronRight, X } from 'lucide-react';
import type { LitigationBrief } from '@/lib/api';
import { cn } from '@/lib/utils';

export function DocumentsPanel({ documents }: { documents: LitigationBrief['documents'] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? documents.find((d) => d.id === openId) : null;

  if (documents.length === 0) {
    return (
      <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 text-center">
        <p className="text-xs text-slate-500">Sin documentos en el caso</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Documentos</div>
        <span className="text-[10px] text-slate-500">{documents.length}</span>
      </div>
      <ul className="space-y-1 max-h-[40vh] overflow-y-auto">
        {documents.map((d) => (
          <li key={d.id}>
            <button
              onClick={() => setOpenId((p) => (p === d.id ? null : d.id))}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors group/doc',
                openId === d.id ? 'bg-emerald-500/10' : 'hover:bg-slate-800/60',
              )}
            >
              <FileText className="w-3.5 h-3.5 text-slate-500 group-hover/doc:text-emerald-400 shrink-0" />
              <span className="flex-1 truncate text-[12px] text-slate-200">{d.title}</span>
              <ChevronRight className={cn('w-3 h-3 text-slate-600 transition-transform', openId === d.id && 'rotate-90')} />
            </button>
            {openId === d.id && (
              <div className="mt-1 mx-2 px-2 py-1.5 bg-slate-800/40 border-l-2 border-emerald-500/50 rounded-r text-[11px] text-slate-300 leading-relaxed">
                {d.excerpt || <span className="italic text-slate-500">(sin contenido)</span>}
                {d.contentLength > 600 && (
                  <div className="text-[10px] text-slate-500 mt-1">— extracto, {d.contentLength.toLocaleString()} caracteres en total —</div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {open && false && <X />}
    </div>
  );
}
