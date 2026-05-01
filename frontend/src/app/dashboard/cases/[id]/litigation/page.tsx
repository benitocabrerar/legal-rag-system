'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Maximize2, Minimize2, Loader2, AlertTriangle } from 'lucide-react';
import { litigationAPI } from '@/lib/api';
import { BriefPanel } from '@/components/litigation/BriefPanel';
import { TimelinePanel } from '@/components/litigation/TimelinePanel';
import { ArgumentsPanel } from '@/components/litigation/ArgumentsPanel';
import { NotesPanel } from '@/components/litigation/NotesPanel';
import { DocumentsPanel } from '@/components/litigation/DocumentsPanel';
import { ArticleLookupPanel } from '@/components/litigation/ArticleLookupPanel';
import { ArgumentDeck } from '@/components/litigation/ArgumentDeck';
import { AudienceTimer } from '@/components/litigation/AudienceTimer';
import { LitigationChat } from '@/components/litigation/LitigationChat';
import { cn } from '@/lib/utils';

type CenterTab = 'deck' | 'arguments' | 'documents' | 'article';

export default function LitigationPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;
  const [centerTab, setCenterTab] = useState<CenterTab>('deck');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingArticleRef, setPendingArticleRef] = useState<string | null>(null);

  const lookupArticle = (ref: string) => {
    setPendingArticleRef(ref);
    setCenterTab('article');
    setTimeout(() => {
      const el = document.getElementById('litigation-article-input') as HTMLInputElement | null;
      if (el) {
        el.value = ref;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
      }
    }, 50);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['litigation-brief', caseId],
    queryFn: () => litigationAPI.brief(caseId),
    enabled: !!caseId,
    refetchOnWindowFocus: false,
  });

  // Fullscreen toggle.
  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch { /* user cancelled */ }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard shortcuts: Cmd+/ focuses article lookup; Esc exits fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) {
        // Cmd+/ should still work even from inputs.
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
          e.preventDefault();
          setCenterTab('article');
          setTimeout(() => document.getElementById('litigation-article-input')?.focus(), 30);
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setCenterTab('article');
        setTimeout(() => document.getElementById('litigation-article-input')?.focus(), 30);
      } else if (e.key === '1') setCenterTab('deck');
      else if (e.key === '2') setCenterTab('arguments');
      else if (e.key === '3') setCenterTab('documents');
      else if (e.key === '4') setCenterTab('article');
      else if (e.key === 'f' && !e.metaKey && !e.ctrlKey) toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden flex flex-col">
      {/* Top bar — wraps onto two rows on phones so nothing gets clipped. */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-y-1 px-3 py-2 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push(`/dashboard/cases/${caseId}`)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Salir</span>
          </button>
          <span className="hidden sm:inline text-slate-600">/</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-violet-400">Sala de Litigación</span>
          {data?.case?.title && (
            <span className="text-sm font-semibold text-slate-100 truncate ml-1 sm:ml-2 min-w-0">{data.case.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AudienceTimer />
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 transition-colors"
            title="Pantalla completa (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isFullscreen ? 'Salir' : 'Pantalla completa'}</span>
          </button>
        </div>
      </header>

      {/* Loading / Error */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : error || !data ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-rose-400">
          <AlertTriangle className="w-8 h-8" />
          <p className="text-sm font-semibold">No pudimos cargar el caso</p>
          <button onClick={() => router.push('/dashboard')} className="text-xs underline hover:text-rose-300">
            Volver al dashboard
          </button>
        </div>
      ) : (
        <main className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-y-auto md:overflow-hidden">
          {/* Left column: Brief + Timeline */}
          <aside className="col-span-12 md:col-span-3 flex flex-col gap-3 md:overflow-y-auto">
            <BriefPanel data={data} />
            <TimelinePanel events={data.timeline} />
          </aside>

          {/* Center column: tabbed work area */}
          <section className="col-span-12 md:col-span-6 flex flex-col gap-3 md:overflow-hidden">
            <CenterTabBar tab={centerTab} setTab={setCenterTab} />

            <div className="flex-1 md:overflow-y-auto space-y-3">
              {centerTab === 'deck' && (
                <ArgumentDeck caseId={caseId} onLookupArticle={lookupArticle} />
              )}
              {centerTab === 'arguments' && (
                <>
                  <ArgumentsPanel caseId={caseId} />
                  <NotesPanel caseId={caseId} />
                </>
              )}
              {centerTab === 'documents' && <DocumentsPanel documents={data.documents} />}
              {centerTab === 'article' && <ArticleLookupPanel />}
            </div>
          </section>

          {/* Right column: AI chat — keeps a usable height on phones. */}
          <aside className="col-span-12 md:col-span-3 rounded-xl bg-slate-900/40 border border-slate-700/50 overflow-hidden flex flex-col min-h-[60vh] md:min-h-0">
            <LitigationChat
              caseId={caseId}
              suggestions={[
                'Resumen del caso en 3 frases',
                '¿Qué artículo aplica al hecho principal?',
                'Posibles objeciones a esperar',
                'Cita jurisprudencia relevante',
              ]}
            />
          </aside>
        </main>
      )}

      {/* Footer — keyboard hints hidden on phones (no physical keyboard). */}
      <footer className="shrink-0 px-3 py-1 border-t border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-500 flex items-center justify-between">
        <div className="hidden lg:flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">1</kbd> tarjetas</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">2</kbd> notas</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">3</kbd> docs</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">4</kbd> art.</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">←/→</kbd> navegar mazo</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">␣</kbd> marcar expuesta</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">P</kbd> presentador</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">F</kbd> fullscreen</span>
        </div>
        <span className="text-[10px]">Sala de Litigación · Poweria Legal</span>
      </footer>
    </div>
  );
}

function CenterTabBar({ tab, setTab }: { tab: CenterTab; setTab: (t: CenterTab) => void }) {
  const tabs: Array<{ id: CenterTab; label: string; short: string; hint: string }> = [
    { id: 'deck',       label: '🎴 Tarjetas IA',       short: '🎴 Tarjetas',  hint: '1' },
    { id: 'arguments',  label: 'Argumentos & notas',   short: 'Argumentos',   hint: '2' },
    { id: 'documents',  label: 'Documentos',           short: 'Docs',         hint: '3' },
    { id: 'article',    label: 'Buscar artículo',      short: 'Artículo',     hint: '4' },
  ];
  return (
    <div className="inline-flex items-center bg-slate-900/60 border border-slate-700/50 rounded-xl p-1 self-start shadow-sm overflow-x-auto max-w-full">
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all',
              active
                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100',
            )}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.short}</span>
            <kbd className="hidden lg:inline opacity-50 font-mono text-[9px]">{t.hint}</kbd>
          </button>
        );
      })}
    </div>
  );
}
