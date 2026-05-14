'use client';

/**
 * CorpusUpdatesCard — card prominente en el dashboard que muestra las
 * últimas normas agregadas al corpus legal (ej: leyes, decretos
 * publicados en el Registro Oficial e ingresadas al RAG).
 *
 * Llama a GET /notifications/corpus-updates que devuelve las 5 más
 * recientes notificaciones type='corpus_update' del usuario actual,
 * leídas o no. Click → navega al action_url (catálogo normativo).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, Calendar, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

interface CorpusNotif {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  action_url: string | null;
  metadata: {
    legalDocId?: string;
    normTitle?: string;
    normType?: string;
    legalHierarchy?: string;
    publicationDate?: string;
    editionPdfUrl?: string | null;
    editionNumber?: string | null;
    aiSummary?: string | null;
  };
  created_at: string;
}

const HIERARCHY_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  CONSTITUCION:       { label: 'Constitución',     bg: 'bg-amber-100',  text: 'text-amber-800' },
  CODIGOS_ORGANICOS:  { label: 'Código Orgánico',  bg: 'bg-violet-100', text: 'text-violet-800' },
  LEYES_ORGANICAS:    { label: 'Ley Orgánica',     bg: 'bg-rose-100',   text: 'text-rose-800' },
  CODIGOS_ORDINARIOS: { label: 'Código Ordinario', bg: 'bg-cyan-100',   text: 'text-cyan-800' },
  LEYES_ORDINARIAS:   { label: 'Ley Ordinaria',    bg: 'bg-sky-100',    text: 'text-sky-800' },
};

export function CorpusUpdatesCard() {
  const [items, setItems] = useState<CorpusNotif[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get<{ items: CorpusNotif[] }>('/notifications/corpus-updates');
        setItems(r.data.items || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading || !items || items.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-200/60 bg-gradient-to-r from-violet-100/60 to-fuchsia-100/40 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center shadow-md">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-violet-900">📚 Nuevas normativas publicadas</h3>
          <p className="text-[11px] text-violet-700/80">
            Recién incorporadas al corpus desde el Registro Oficial Ecuador. Revisa si afectan tus casos en curso.
          </p>
        </div>
        <Link
          href="/admin/registro-oficial?tab=norm-catalog"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900 hover:underline"
        >
          Ver catálogo
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <ul className="divide-y divide-violet-100/60">
        {items.map((n) => {
          const hier = n.metadata?.legalHierarchy || '';
          const meta = HIERARCHY_LABEL[hier];
          const date = n.metadata?.publicationDate
            ? new Date(n.metadata.publicationDate)
            : new Date(n.created_at);
          const dateLabel = date.toLocaleDateString('es-EC', {
            day: '2-digit', month: 'short', year: 'numeric',
          });
          const ago = nicelyAgo(new Date(n.created_at));

          return (
            <li key={n.id} className={`p-3 sm:p-4 flex items-start gap-3 hover:bg-violet-50/40 transition ${!n.is_read ? 'bg-violet-50/30' : ''}`}>
              <div className="w-10 h-10 rounded-lg bg-white border border-violet-200 grid place-items-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                  {meta && (
                    <span className={`inline-block text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>
                      {meta.label}
                    </span>
                  )}
                  {!n.is_read && (
                    <span className="inline-block text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                      NUEVA
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{ago}</span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                  {n.metadata?.normTitle || n.title}
                </p>
                {n.metadata?.aiSummary && (
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 italic">
                    {n.metadata.aiSummary}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px]">
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Calendar className="w-3 h-3" />
                    Publicada {dateLabel}
                  </span>
                  {n.metadata?.editionNumber && (
                    <span className="text-slate-500">
                      RO Nº {n.metadata.editionNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {n.action_url && (
                    <Link
                      href={n.action_url}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-violet-600 text-white hover:bg-violet-700 transition"
                    >
                      Ver en catálogo
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                  {n.metadata?.editionPdfUrl && (
                    <a
                      href={n.metadata.editionPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 transition"
                    >
                      <Download className="w-3 h-3" />
                      PDF oficial
                    </a>
                  )}
                  <a
                    href="https://www.registroficial.gob.ec/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-violet-700 transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    RO oficial
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function nicelyAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'ahora';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}
